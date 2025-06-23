'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  BSTAudioGenerator, 
  BSTConfig, 
  calculateBSTProgress 
} from '@/lib/audio/bst'
import { 
  BSTStaircaseController, 
  BSTTrial, 
  BSTResult,
  evaluateBSTQuality 
} from '@/lib/bst/staircaseController'

// BST テスト状態
export type BSTTestState = 
  | 'initializing' 
  | 'ready' 
  | 'playing' 
  | 'waiting-response' 
  | 'processing' 
  | 'completed' 
  | 'error'

// BST テスト進捗情報
export interface BSTProgress {
  trialsCompleted: number
  reversalsCount: number
  targetReversals: number
  currentVolumeDifference: number
  strongBeatLevel: number
  weakBeatLevel: number
  isConverged: boolean
  estimatedRemainingTrials: number
  overallProgress: number
  isNearCompletion: boolean
}

// BST テスト設定
export interface BSTTestConfig {
  sessionId: string
  profileId: string
  hearingThreshold: number
  audioConfig?: Partial<BSTConfig>
  onTrialComplete?: (trial: BSTTrial) => void
  onProgress?: (progress: BSTProgress) => void
  onError?: (error: Error) => void
}

// BST テスト結果
export interface BSTTestResult {
  result: BSTResult
  quality: {
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    score: number
    feedback: string
  }
  summary: {
    threshold: number
    confidence: number
    accuracy: number
    duration: number
  }
}

// BST テスト用React Hook
export function useBSTTest(config: BSTTestConfig) {
  // 基本状態
  const [state, setState] = useState<BSTTestState>('initializing')
  const [error, setError] = useState<Error | null>(null)
  const [progress, setProgress] = useState<BSTProgress>({
    trialsCompleted: 0,
    reversalsCount: 0,
    targetReversals: 6,
    currentVolumeDifference: 20,
    strongBeatLevel: config.hearingThreshold + 30,
    weakBeatLevel: config.hearingThreshold + 10,
    isConverged: false,
    estimatedRemainingTrials: 12,
    overallProgress: 0,
    isNearCompletion: false
  })

  // 現在の試行状態
  const [currentTrial, setCurrentTrial] = useState<{
    patternType: '2beat' | '3beat' | null
    startTime: number | null
    isPlaying: boolean
  }>({
    patternType: null,
    startTime: null,
    isPlaying: false
  })

  // フィードバック状態
  const [feedback, setFeedback] = useState<{
    show: boolean
    isCorrect: boolean | null
    message: string
  }>({
    show: false,
    isCorrect: null,
    message: ''
  })

  // 内部参照
  const audioGeneratorRef = useRef<BSTAudioGenerator | null>(null)
  const staircaseControllerRef = useRef<BSTStaircaseController | null>(null)
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  // エラーハンドリング
  const handleError = useCallback((err: Error) => {
    console.error('BST test error:', err)
    setError(err)
    setState('error')
    config.onError?.(err)
  }, [config])

  // 進捗更新
  const updateProgress = useCallback(() => {
    const controller = staircaseControllerRef.current
    if (!controller) return

    const controllerProgress = controller.getProgress()
    const bstProgress = calculateBSTProgress(
      controllerProgress.trialsCompleted,
      controllerProgress.reversalsCount
    )

    const newProgress: BSTProgress = {
      trialsCompleted: controllerProgress.trialsCompleted,
      reversalsCount: controllerProgress.reversalsCount,
      targetReversals: 6,
      currentVolumeDifference: controllerProgress.currentVolumeDifference,
      strongBeatLevel: controller.getStrongBeatLevel(),
      weakBeatLevel: controller.getWeakBeatLevel(),
      isConverged: controllerProgress.isConverged,
      estimatedRemainingTrials: controllerProgress.estimatedRemainingTrials,
      overallProgress: bstProgress.overallProgress,
      isNearCompletion: bstProgress.isNearCompletion
    }

    setProgress(newProgress)
    config.onProgress?.(newProgress)
  }, [config])

  // 初期化
  const initialize = useCallback(async () => {
    try {
      setState('initializing')
      setError(null)

      // オーディオジェネレーター初期化
      const audioGenerator = new BSTAudioGenerator({
        strongBeatLevel: config.hearingThreshold + 30,
        ...config.audioConfig
      })
      await audioGenerator.initialize()
      audioGeneratorRef.current = audioGenerator

      // ステアケースコントローラー初期化
      const staircaseController = new BSTStaircaseController(
        config.sessionId,
        config.profileId,
        config.hearingThreshold
      )
      staircaseControllerRef.current = staircaseController

      // 初期進捗更新
      updateProgress()
      setState('ready')

    } catch (err) {
      handleError(err as Error)
    }
  }, [config, handleError, updateProgress])

  // 新しい試行開始
  const startTrial = useCallback(async () => {
    const audioGenerator = audioGeneratorRef.current
    const staircaseController = staircaseControllerRef.current

    if (!audioGenerator || !staircaseController || state !== 'ready') {
      return
    }

    try {
      // ランダムパターン生成
      const patternType = audioGenerator.generateRandomPattern()
      
      // 音響設定更新
      const volumeDifference = staircaseController.getCurrentVolumeDifference()
      const strongBeatLevel = staircaseController.getStrongBeatLevel()
      
      audioGenerator.setPattern(patternType)
      audioGenerator.setVolumeDifference(volumeDifference)
      audioGenerator.setStrongBeatLevel(strongBeatLevel)

      // 試行状態更新
      setCurrentTrial({
        patternType,
        startTime: Date.now(),
        isPlaying: false
      })

      setState('ready')
      updateProgress()

    } catch (err) {
      handleError(err as Error)
    }
  }, [state, handleError, updateProgress])

  // 音響再生
  const playAudio = useCallback(async () => {
    const audioGenerator = audioGeneratorRef.current
    
    if (!audioGenerator || state !== 'ready') {
      return
    }

    try {
      setState('playing')
      setCurrentTrial(prev => ({ ...prev, isPlaying: true }))

      // 音響再生開始
      await audioGenerator.playPattern()

      // 6秒後に自動停止
      playbackTimerRef.current = setTimeout(() => {
        audioGenerator.stopPattern()
        setCurrentTrial(prev => ({ ...prev, isPlaying: false }))
        setState('waiting-response')
      }, 6000)

    } catch (err) {
      handleError(err as Error)
    }
  }, [state, handleError])

  // 音響停止
  const stopAudio = useCallback(() => {
    const audioGenerator = audioGeneratorRef.current
    
    if (!audioGenerator) return

    audioGenerator.stopPattern()
    setCurrentTrial(prev => ({ ...prev, isPlaying: false }))
    
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current)
      playbackTimerRef.current = null
    }

    setState('ready')
  }, [])

  // 回答処理
  const submitAnswer = useCallback(async (userAnswer: '2beat' | '3beat') => {
    const staircaseController = staircaseControllerRef.current
    
    if (!staircaseController || !currentTrial.patternType || state !== 'waiting-response') {
      return
    }

    try {
      setState('processing')

      // 反応時間計算
      const reactionTime = currentTrial.startTime 
        ? Date.now() - currentTrial.startTime 
        : undefined

      // 回答記録
      const trial = staircaseController.recordResponse(
        currentTrial.patternType,
        userAnswer,
        reactionTime
      )

      // 試行完了コールバック
      config.onTrialComplete?.(trial)

      // フィードバック表示
      const isCorrect = trial.correct
      setFeedback({
        show: true,
        isCorrect,
        message: isCorrect ? '正解！' : 'もう一度'
      })

      // 進捗更新
      updateProgress()

      // フィードバック表示時間
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback({ show: false, isCorrect: null, message: '' })
        
        // 収束判定
        if (staircaseController.isConverged()) {
          setState('completed')
        } else {
          // 次の試行開始
          startTrial()
        }
      }, 1500)

    } catch (err) {
      handleError(err as Error)
    }
  }, [currentTrial, state, config, updateProgress, startTrial, handleError])

  // 結果取得
  const getResult = useCallback((): BSTTestResult | null => {
    const staircaseController = staircaseControllerRef.current
    
    if (!staircaseController || state !== 'completed') {
      return null
    }

    const result = staircaseController.getResult()
    if (!result) return null

    const quality = evaluateBSTQuality(result)

    return {
      result,
      quality,
      summary: {
        threshold: result.volumeDifferenceThreshold,
        confidence: result.convergenceAnalysis.confidence,
        accuracy: result.patternAccuracy.overall.accuracy,
        duration: result.duration
      }
    }
  }, [state])

  // リセット
  const reset = useCallback(() => {
    // タイマークリア
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current)
      playbackTimerRef.current = null
    }
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }

    // 音響停止
    if (audioGeneratorRef.current) {
      audioGeneratorRef.current.stopPattern()
    }

    // ステアケースリセット
    if (staircaseControllerRef.current) {
      staircaseControllerRef.current.reset()
    }

    // 状態リセット
    setState('ready')
    setError(null)
    setCurrentTrial({
      patternType: null,
      startTime: null,
      isPlaying: false
    })
    setFeedback({
      show: false,
      isCorrect: null,
      message: ''
    })

    updateProgress()
  }, [updateProgress])

  // クリーンアップ
  const cleanup = useCallback(() => {
    // タイマークリア
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current)
    }
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
    }

    // リソース解放
    if (audioGeneratorRef.current) {
      audioGeneratorRef.current.dispose()
      audioGeneratorRef.current = null
    }

    staircaseControllerRef.current = null
  }, [])

  // 初期化（マウント時）
  useEffect(() => {
    initialize()
    return cleanup
  }, [initialize, cleanup])

  // 最初の試行開始
  useEffect(() => {
    if (state === 'ready' && !currentTrial.patternType) {
      startTrial()
    }
  }, [state, currentTrial.patternType, startTrial])

  // デバッグ情報
  const getDebugInfo = useCallback(() => {
    const controller = staircaseControllerRef.current
    return controller ? controller.getDebugInfo() : null
  }, [])

  return {
    // 状態
    state,
    error,
    progress,
    currentTrial,
    feedback,

    // アクション
    initialize,
    startTrial,
    playAudio,
    stopAudio,
    submitAnswer,
    reset,

    // データ
    getResult,
    getDebugInfo,

    // ユーティリティ
    canPlay: state === 'ready',
    canAnswer: state === 'waiting-response',
    isPlaying: currentTrial.isPlaying,
    isCompleted: state === 'completed',
    hasError: state === 'error'
  }
} 