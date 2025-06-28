'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import * as Tone from 'tone'
import { BITAudioGenerator } from '@/lib/audio/bit'
import { 
  BITStaircaseController, 
  BITTrial, 
  BITResult,
  evaluateBITQuality 
} from '@/lib/bit/staircaseController'

// BITテスト設定
export interface BITTestConfig {
  sessionId: string
  profileId: string
  hearingThreshold: number
  onTrialComplete?: (trial: BITTrial) => void
  onTestComplete?: (result: BITResult) => void
  onError?: (error: Error) => void
}

// BITテスト状態
export interface BITTestState {
  // 基本状態
  isInitialized: boolean
  isPlaying: boolean
  isCompleted: boolean
  hasError: boolean
  errorMessage: string | null

  // テスト進捗
  currentTrial: number
  trialsCompleted: number
  reversalsCount: number
  isConverged: boolean
  currentSlopeK: number
  estimatedRemainingTrials: number

  // 現在の試行
  currentDirection: 'accelerando' | 'ritardando' | null
  lastAnswer: 'accelerando' | 'ritardando' | null
  lastResult: boolean | null
  reactionTime: number | null

  // 結果
  finalResult: BITResult | null
  qualityEvaluation: {
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    score: number
    feedback: string
  } | null
}

// BITテスト操作
export interface BITTestActions {
  // 基本操作
  initialize: () => Promise<void>
  reset: () => void
  dispose: () => void

  // 音声操作
  playAudio: () => Promise<void>
  stopAudio: () => void

  // 回答操作
  submitAnswer: (answer: 'accelerando' | 'ritardando') => void

  // 状態取得
  getProgress: () => {
    trialProgress: number
    reversalProgress: number
    overallProgress: number
    isNearCompletion: boolean
  }
  getDebugInfo: () => any
}

// BITテストフック
export function useBITTest(config: BITTestConfig): [BITTestState, BITTestActions] {
  // 内部参照
  const audioGeneratorRef = useRef<BITAudioGenerator | null>(null)
  const staircaseControllerRef = useRef<BITStaircaseController | null>(null)
  const reactionStartTimeRef = useRef<number | null>(null)

  // 状態管理
  const [state, setState] = useState<BITTestState>({
    isInitialized: false,
    isPlaying: false,
    isCompleted: false,
    hasError: false,
    errorMessage: null,
    currentTrial: 0,
    trialsCompleted: 0,
    reversalsCount: 0,
    isConverged: false,
    currentSlopeK: 5,
    estimatedRemainingTrials: 20,
    currentDirection: null,
    lastAnswer: null,
    lastResult: null,
    reactionTime: null,
    finalResult: null,
    qualityEvaluation: null
  })

  // エラーハンドリング
  const handleError = useCallback((error: Error, message: string) => {
    console.error('BIT Test Error:', error)
    setState(prev => ({
      ...prev,
      hasError: true,
      errorMessage: message,
      isPlaying: false
    }))
    config.onError?.(error)
  }, [config])

  // 進捗更新
  const updateProgress = useCallback(() => {
    const controller = staircaseControllerRef.current
    if (!controller) return

    const progress = controller.getProgress()
    setState(prev => ({
      ...prev,
      trialsCompleted: progress.trialsCompleted,
      reversalsCount: progress.reversalsCount,
      isConverged: progress.isConverged,
      currentSlopeK: progress.currentSlopeK,
      estimatedRemainingTrials: progress.estimatedRemainingTrials
    }))

    // 収束判定
    if (progress.isConverged && !state.isCompleted) {
      completeTest()
    }
  }, [state.isCompleted])

  // テスト完了処理
  const completeTest = useCallback(() => {
    const controller = staircaseControllerRef.current
    if (!controller) return

    try {
      const result = controller.getResult()
      if (result) {
        const quality = evaluateBITQuality(result)
        
        setState(prev => ({
          ...prev,
          isCompleted: true,
          finalResult: result,
          qualityEvaluation: quality
        }))

        config.onTestComplete?.(result)
      }
    } catch (error) {
      handleError(error as Error, 'テストの完了処理に失敗しました')
    }
  }, [config, handleError])

  // 初期化
  const initialize = useCallback(async () => {
    try {
      console.log('Initializing BIT test...')
      setState(prev => ({ ...prev, hasError: false, errorMessage: null }))

      // 聴力閾値の検証
      const validHearingThreshold = isFinite(config.hearingThreshold) && config.hearingThreshold > 0 
        ? config.hearingThreshold 
        : 50 // デフォルト値

      console.log('BIT: Using hearing threshold:', validHearingThreshold)

      // 既存のリソースを解放
      if (audioGeneratorRef.current) {
        audioGeneratorRef.current.dispose()
        audioGeneratorRef.current = null
      }

      // オーディオジェネレータ初期化
      const audioGenerator = new BITAudioGenerator({
        soundLevel: validHearingThreshold + 30
      })
      
      console.log('Initializing BIT audio generator...')
      await audioGenerator.initialize()
      audioGeneratorRef.current = audioGenerator

      // ステアケースコントローラー初期化
      const staircaseController = new BITStaircaseController(
        config.sessionId,
        config.profileId,
        validHearingThreshold
      )
      staircaseControllerRef.current = staircaseController

      setState(prev => ({
        ...prev,
        isInitialized: true,
        currentSlopeK: staircaseController.getCurrentSlopeK()
      }))
      
      console.log('BIT test initialized successfully')
    } catch (error) {
      console.error('BIT test initialization error:', error)
      handleError(error as Error, 'BIT audio initialization failed')
    }
  }, [config, handleError])

  // リセット
  const reset = useCallback(() => {
    const controller = staircaseControllerRef.current
    if (controller) {
      controller.reset()
    }

    setState({
      isInitialized: true,
      isPlaying: false,
      isCompleted: false,
      hasError: false,
      errorMessage: null,
      currentTrial: 0,
      trialsCompleted: 0,
      reversalsCount: 0,
      isConverged: false,
      currentSlopeK: controller?.getCurrentSlopeK() || 5,
      estimatedRemainingTrials: 20,
      currentDirection: null,
      lastAnswer: null,
      lastResult: null,
      reactionTime: null,
      finalResult: null,
      qualityEvaluation: null
    })
  }, [])

  // リソース解放
  const dispose = useCallback(() => {
    if (audioGeneratorRef.current) {
      audioGeneratorRef.current.dispose()
      audioGeneratorRef.current = null
    }
    staircaseControllerRef.current = null
  }, [])

  // 音声再生
  const playAudio = useCallback(async () => {
    const audioGenerator = audioGeneratorRef.current
    const staircaseController = staircaseControllerRef.current
    
    console.log('BIT: playAudio called', {
      hasAudioGenerator: !!audioGenerator,
      hasStaircaseController: !!staircaseController,
      isPlaying: state.isPlaying,
      isInitialized: audioGenerator?.isReady() || false
    })
    
    if (!audioGenerator || !staircaseController || state.isPlaying) {
      console.warn('BIT: playAudio called but conditions not met', {
        hasAudioGenerator: !!audioGenerator,
        hasStaircaseController: !!staircaseController,
        isPlaying: state.isPlaying
      })
      return
    }

    try {
      console.log('BIT: Starting audio playback')
      setState(prev => ({ ...prev, isPlaying: true, lastAnswer: null, lastResult: null }))

      // ユーザー操作によるTone.js開始を確実に実行
      console.log('BIT: Ensuring Tone.js context is running...')
      if (Tone.context.state !== 'running') {
        console.log('BIT: Tone.js context not running, starting with user gesture...')
        await Tone.start()
        console.log('BIT: Tone.js context started successfully')
      }

      // 現在のIOI変化率を取得
      const currentSlopeK = staircaseController.getCurrentSlopeK()
      console.log('BIT: Current slope K:', currentSlopeK)
      
      // 値の安全性チェック
      if (!isFinite(currentSlopeK) || currentSlopeK <= 0) {
        throw new Error(`Invalid slope K value: ${currentSlopeK}`)
      }
      
      // ランダムな方向を生成
      const direction = audioGenerator.generateRandomDirection()
      console.log('BIT: Generated direction:', direction)

      // 聴力閾値の検証
      const validHearingThreshold = isFinite(config.hearingThreshold) && config.hearingThreshold > 0 
        ? config.hearingThreshold 
        : 50

      console.log('BIT: Setting audio parameters...', {
        slopeK: currentSlopeK,
        direction,
        soundLevel: validHearingThreshold + 30
      })

      // 音源設定
      audioGenerator.setSlopeK(currentSlopeK)
      audioGenerator.setDirection(direction)
      audioGenerator.setSoundLevel(validHearingThreshold + 30)

      console.log('BIT: Starting pattern playback...')
      // 音声再生
      await audioGenerator.playPattern()
      
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        currentDirection: direction 
      }))
      
      reactionStartTimeRef.current = Date.now()
      console.log('BIT: Audio playback completed, waiting for user response')
    } catch (error) {
      console.error('BIT: Audio playback error:', error)
      setState(prev => ({ ...prev, isPlaying: false }))
      
      // より詳細なエラー情報
      const errorDetails = {
        errorMessage: error instanceof Error ? error.message : String(error),
        toneContextState: Tone.context.state,
        audioGeneratorInitialized: audioGenerator?.isReady() || false,
        hearingThreshold: config.hearingThreshold
      }
      console.error('BIT: Detailed error information:', errorDetails)
      
      handleError(error as Error, `音声の再生に失敗しました: ${errorDetails.errorMessage}`)
    }
  }, [config.hearingThreshold, handleError, state.isPlaying])

  // 音声停止
  const stopAudio = useCallback(() => {
    const audioGenerator = audioGeneratorRef.current
    if (audioGenerator) {
      audioGenerator.stopPattern()
      setState(prev => ({ ...prev, isPlaying: false }))
    }
  }, [])

  // 回答送信
  const submitAnswer = useCallback((answer: 'accelerando' | 'ritardando') => {
    const audioGenerator = audioGeneratorRef.current
    const staircaseController = staircaseControllerRef.current
    
    if (!audioGenerator || !staircaseController || !state.currentDirection) return

    try {
      // 反応時間計算
      const reactionTime = reactionStartTimeRef.current 
        ? Date.now() - reactionStartTimeRef.current 
        : undefined

      const correct = state.currentDirection === answer
      const ioiSequence = audioGenerator.getCurrentIOISequence()

      // 試行記録
      const trial = staircaseController.recordResponse(
        state.currentDirection,
        answer,
        ioiSequence,
        reactionTime
      )

             setState(prev => ({
         ...prev,
         currentTrial: prev.currentTrial + 1,
         lastAnswer: answer,
         lastResult: correct,
         reactionTime: reactionTime ?? null
       }))

      // 試行完了コールバック
      config.onTrialComplete?.(trial)

      // 進捗更新
      updateProgress()
    } catch (error) {
      handleError(error as Error, '回答の記録に失敗しました')
    }
  }, [config, handleError, state.currentDirection, updateProgress])

  // 進捗取得
  const getProgress = useCallback(() => {
    const reversalProgress = Math.min((state.reversalsCount / 6) * 100, 100)
    const trialProgress = Math.min((state.trialsCompleted / 30) * 100, 100)
    const overallProgress = (reversalProgress * 0.7) + (trialProgress * 0.3)
    const isNearCompletion = state.reversalsCount >= 5

    return {
      trialProgress,
      reversalProgress,
      overallProgress,
      isNearCompletion
    }
  }, [state.reversalsCount, state.trialsCompleted])

  // デバッグ情報取得
  const getDebugInfo = useCallback(() => {
    const controller = staircaseControllerRef.current
    return controller ? controller.getDebugInfo() : null
  }, [])

  // 初期化効果
  useEffect(() => {
    initialize()
    return () => {
      dispose()
    }
  }, [initialize, dispose])

  // アクション定義
  const actions: BITTestActions = {
    initialize,
    reset,
    dispose,
    playAudio,
    stopAudio,
    submitAnswer,
    getProgress,
    getDebugInfo
  }

  return [state, actions]
}

// BITテスト結果フック
export function useBITTestResult(result: BITResult | null) {
  const [analysis, setAnalysis] = useState<{
    summary: string
    strengths: string[]
    improvements: string[]
    recommendations: string[]
  } | null>(null)

  useEffect(() => {
    if (!result) {
      setAnalysis(null)
      return
    }

    const { directionAccuracy, convergenceAnalysis } = result
    const overall = directionAccuracy.overall
    const accelerando = directionAccuracy.accelerando
    const ritardando = directionAccuracy.ritardando

    // 分析生成
    const strengths: string[] = []
    const improvements: string[] = []
    const recommendations: string[] = []

    // 全体精度の評価
    if (overall.accuracy >= 0.8) {
      strengths.push('優秀なテンポ方向判定能力')
    } else if (overall.accuracy >= 0.6) {
      strengths.push('良好なテンポ方向判定能力')
    } else {
      improvements.push('テンポ方向判定の精度向上')
    }

    // 方向別精度の評価
    if (accelerando.accuracy > ritardando.accuracy + 0.2) {
      strengths.push('加速パターンの検出が得意')
      improvements.push('減速パターンの検出精度')
      recommendations.push('減速パターンに特化した練習')
    } else if (ritardando.accuracy > accelerando.accuracy + 0.2) {
      strengths.push('減速パターンの検出が得意')
      improvements.push('加速パターンの検出精度')
      recommendations.push('加速パターンに特化した練習')
    } else {
      strengths.push('バランスの取れた方向判定能力')
    }

    // 収束性の評価
    if (convergenceAnalysis.confidence >= 0.8) {
      strengths.push('安定した測定結果')
    } else {
      improvements.push('測定の安定性')
      recommendations.push('より集中した状態でのテスト実施')
    }

    // 閾値の評価
    if (result.slopeThreshold <= 2) {
      strengths.push('非常に敏感なテンポ知覚')
    } else if (result.slopeThreshold <= 5) {
      strengths.push('良好なテンポ知覚感度')
    } else {
      improvements.push('テンポ知覚の感度')
      recommendations.push('リズム感向上のための練習')
    }

    // サマリー生成
    let summary = ''
    if (overall.accuracy >= 0.8) {
      summary = 'テンポ方向判定能力が優秀です。'
    } else if (overall.accuracy >= 0.6) {
      summary = 'テンポ方向判定能力は良好です。'
    } else {
      summary = 'テンポ方向判定能力に改善の余地があります。'
    }

    setAnalysis({
      summary,
      strengths,
      improvements,
      recommendations
    })
  }, [result])

  return analysis
} 