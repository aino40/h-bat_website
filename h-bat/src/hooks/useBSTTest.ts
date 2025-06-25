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
  const configRef = useRef(config)
  configRef.current = config

  // エラーハンドリング
  const handleError = useCallback((err: Error) => {
    console.error('BST test error:', err)
    setError(err)
    setState('error')
    configRef.current.onError?.(err)
  }, [])

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
    configRef.current.onProgress?.(newProgress)
  }, [])

  // 初期化
  const initialize = useCallback(async () => {
    try {
      setState('initializing')
      setError(null)

      // オーディオジェネレーター初期化
      const audioGenerator = new BSTAudioGenerator({
        strongBeatLevel: configRef.current.hearingThreshold + 30,
        ...configRef.current.audioConfig
      })
      await audioGenerator.initialize()
      audioGeneratorRef.current = audioGenerator

      // ステアケースコントローラー初期化
      const staircaseController = new BSTStaircaseController(
        configRef.current.sessionId,
        configRef.current.profileId,
        configRef.current.hearingThreshold
      )
      staircaseControllerRef.current = staircaseController

      // 初期進捗更新
      updateProgress()
      setState('ready')

    } catch (err) {
      handleError(err as Error)
    }
  }, [handleError, updateProgress])

  // 新しい試行開始
  const startTrial = useCallback(async () => {
    const audioGenerator = audioGeneratorRef.current
    const staircaseController = staircaseControllerRef.current

    console.log('startTrial called:', { 
      state, 
      hasAudioGenerator: !!audioGenerator, 
      hasController: !!staircaseController 
    })

    if (!audioGenerator || !staircaseController) {
      console.log('startTrial early return: missing dependencies')
      return
    }

    // 状態が初期化中やエラー状態の場合は実行しない
    if (state === 'initializing' || state === 'error' || state === 'completed') {
      console.log('startTrial early return: invalid state:', state)
      return
    }

    try {
      console.log('Starting new trial...')
      
      // ランダムパターン生成
      const patternType = audioGenerator.generateRandomPattern()
      console.log('Generated pattern:', patternType)
      
      // 音響設定更新
      const volumeDifference = staircaseController.getCurrentVolumeDifference()
      const strongBeatLevel = staircaseController.getStrongBeatLevel()
      
      console.log('Audio settings:', { volumeDifference, strongBeatLevel })
      
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
      
      console.log('Trial started successfully:', { patternType, volumeDifference })

    } catch (err) {
      console.error('startTrial error:', err)
      handleError(err as Error)
    }
  }, [state, handleError])

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
    
    console.log('submitAnswer called:', { userAnswer, state, currentTrial })
    
    if (!staircaseController || !currentTrial.patternType || state !== 'waiting-response') {
      console.log('submitAnswer early return:', { 
        hasController: !!staircaseController, 
        hasPattern: !!currentTrial.patternType, 
        state 
      })
      return
    }

    try {
      setState('processing')
      console.log('Processing answer...')

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

      console.log('Recording BST trial:', {
        trial,
        currentState: staircaseController.getDebugInfo?.()
      })

      // 試行完了コールバック
      configRef.current.onTrialComplete?.(trial)

      // フィードバック表示
      const isCorrect = trial.correct
      setFeedback({
        show: true,
        isCorrect,
        message: isCorrect ? '正解！' : 'もう一度'
      })

      console.log('Feedback set:', { isCorrect })

      // 進捗更新
      updateProgress()

      // フィードバック表示時間
      feedbackTimerRef.current = setTimeout(() => {
        console.log('Feedback timeout triggered')
        setFeedback({ show: false, isCorrect: null, message: '' })
        
        // 収束判定
        const isConverged = staircaseController.isConverged()
        console.log('Convergence check:', { 
          isConverged, 
          debugInfo: staircaseController.getDebugInfo?.() 
        })
        
        if (isConverged) {
          console.log('Test completed - converged')
          setState('completed')
        } else {
          console.log('Starting next trial...')
          // 次の試行開始（状態をreadyに戻してから）
          setState('ready')
          // 少し遅延してstartTrialを呼ぶ
          setTimeout(async () => {
            console.log('Calling startTrial...')
            
            // startTrial関数の内容を直接実行（循環依存回避）
            const audioGenerator = audioGeneratorRef.current
            const controller = staircaseControllerRef.current
            
            if (!audioGenerator || !controller) {
              console.log('Missing dependencies for next trial')
              return
            }
            
            try {
              const patternType = audioGenerator.generateRandomPattern()
              const volumeDifference = controller.getCurrentVolumeDifference()
              const strongBeatLevel = controller.getStrongBeatLevel()
              
              audioGenerator.setPattern(patternType)
              audioGenerator.setVolumeDifference(volumeDifference)
              audioGenerator.setStrongBeatLevel(strongBeatLevel)

              setCurrentTrial({
                patternType,
                startTime: Date.now(),
                isPlaying: false
              })

              updateProgress()
              console.log('Next trial prepared:', { patternType, volumeDifference })
              
            } catch (err) {
              console.error('Next trial preparation error:', err)
              handleError(err as Error)
            }
          }, 100)
        }
      }, 1500)

    } catch (err) {
      console.error('submitAnswer error:', err)
      handleError(err as Error)
    }
  }, [currentTrial, state, handleError, updateProgress])

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
  }, [state, currentTrial.patternType])

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