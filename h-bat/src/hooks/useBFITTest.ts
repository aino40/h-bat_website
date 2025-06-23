'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { BFITAudioGenerator, BFITConfig } from '@/lib/audio/bfit'
import { 
  BFITStaircaseController, 
  BFITTrial, 
  BFITResult,
  DEFAULT_BFIT_STAIRCASE_CONFIG,
  evaluateBFITQuality 
} from '@/lib/bfit/staircaseController'

// BFIT測定状態
export type BFITTestState = 
  | 'initializing' 
  | 'ready' 
  | 'playing' 
  | 'beat-finding'
  | 'tempo-judgment'
  | 'waiting' 
  | 'feedback' 
  | 'completed' 
  | 'error'

// BFIT測定設定
export interface BFITTestConfig extends BFITConfig {
  onStateChange?: (state: BFITTestState) => void
  onProgress?: (progress: BFITTestProgress) => void
  onTrialComplete?: (trial: BFITTrial) => void
  onTestComplete?: (result: BFITResult) => void
  onError?: (error: Error) => void
}

// BFIT測定進捗
export interface BFITTestProgress {
  currentTrial: number
  totalTrials: number
  trialsCompleted: number
  reversalsCount: number
  targetReversals: number
  currentSlopeK: number
  isConverged: boolean
  accuracy: number
  estimatedRemainingTrials: number
  phaseProgress: {
    beatFinding: number
    tempoJudgment: number
    overall: number
  }
}

// BFIT測定結果詳細
export interface BFITTestResultDetail extends BFITResult {
  quality: {
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    score: number
    feedback: string
  }
  summary: {
    totalDuration: number
    averageReactionTime: number
    beatFindingAccuracy: number
    tempoJudgmentAccuracy: number
    convergenceQuality: number
  }
}

// BFIT測定フック
export function useBFITTest(config: BFITTestConfig) {
  // 状態管理
  const [state, setState] = useState<BFITTestState>('initializing')
  const [progress, setProgress] = useState<BFITTestProgress>({
    currentTrial: 0,
    totalTrials: 25,
    trialsCompleted: 0,
    reversalsCount: 0,
    targetReversals: 6,
    currentSlopeK: 8.0,
    isConverged: false,
    accuracy: 0,
    estimatedRemainingTrials: 0,
    phaseProgress: { beatFinding: 0, tempoJudgment: 0, overall: 0 }
  })
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<BFITTestResultDetail | null>(null)

  // 内部状態
  const audioGeneratorRef = useRef<BFITAudioGenerator | null>(null)
  const staircaseControllerRef = useRef<BFITStaircaseController | null>(null)
  const currentTrialRef = useRef<{
    direction: 'accelerando' | 'ritardando'
    startTime: number
    beatFoundTime?: number
    ioiSequence: number[]
    patternId: string
  } | null>(null)

  // 状態変更通知
  const updateState = useCallback((newState: BFITTestState) => {
    setState(newState)
    config.onStateChange?.(newState)
  }, [config])

  // 進捗更新通知
  const updateProgress = useCallback((updates: Partial<BFITTestProgress>) => {
    setProgress(prev => {
      const newProgress = { ...prev, ...updates }
      config.onProgress?.(newProgress)
      return newProgress
    })
  }, [config])

  // エラー処理
  const handleError = useCallback((err: Error) => {
    console.error('BFIT Test Error:', err)
    setError(err)
    updateState('error')
    config.onError?.(err)
  }, [config, updateState])

  // 初期化
  const initialize = useCallback(async () => {
    try {
      updateState('initializing')

      // 音響生成器初期化
      const audioGenerator = new BFITAudioGenerator({
        ...config,
        baseTempo: 120,
        patternDuration: 8,
        repetitions: 3
      })
      await audioGenerator.initialize()
      audioGeneratorRef.current = audioGenerator

      // ステアケースコントローラー初期化
      const staircaseController = new BFITStaircaseController(
        config.sessionId,
        config.profileId,
        config.hearingThreshold,
        DEFAULT_BFIT_STAIRCASE_CONFIG
      )
      staircaseControllerRef.current = staircaseController

      // 初期進捗設定
      updateProgress({
        currentTrial: 1,
        currentSlopeK: staircaseController.getCurrentSlopeK(),
        totalTrials: DEFAULT_BFIT_STAIRCASE_CONFIG.maxTrials
      })

      updateState('ready')
    } catch (err) {
      handleError(err as Error)
    }
  }, [config, updateState, updateProgress, handleError])

  // 次の試行開始
  const startNextTrial = useCallback(async () => {
    if (!audioGeneratorRef.current || !staircaseControllerRef.current) {
      handleError(new Error('Audio generator or staircase controller not initialized'))
      return
    }

    try {
      updateState('playing')

      // 方向をランダムに決定
      const direction = Math.random() > 0.5 ? 'accelerando' : 'ritardando'
      const currentSlopeK = staircaseControllerRef.current.getCurrentSlopeK()

      // Generate pattern for current trial
      const _pattern = audioGeneratorRef.current.generatePattern(
        currentSlopeK,
        direction,
        'default'
      )

      // 試行データ初期化
      currentTrialRef.current = {
        direction,
        startTime: Date.now(),
        ioiSequence: _pattern.ioiSequence,
        patternId: 'default'
      }

      // 再生開始
      await audioGeneratorRef.current.playPattern()
      updateState('beat-finding')

    } catch (err) {
      handleError(err as Error)
    }
  }, [updateState, handleError])

  // ビート発見完了
  const handleBeatFound = useCallback(() => {
    if (state !== 'beat-finding' || !currentTrialRef.current) return

    currentTrialRef.current.beatFoundTime = Date.now()
    updateState('tempo-judgment')

    // ビート発見フェーズの進捗更新
    updateProgress({
      phaseProgress: {
        ...progress.phaseProgress,
        beatFinding: 1.0,
        overall: 0.5
      }
    })
  }, [state, progress.phaseProgress, updateState, updateProgress])

  // テンポ方向判定
  const handleTempoJudgment = useCallback((userAnswer: 'accelerando' | 'ritardando') => {
    if (state !== 'tempo-judgment' || !currentTrialRef.current || !staircaseControllerRef.current) {
      return
    }

    try {
      const currentTrial = currentTrialRef.current
      const endTime = Date.now()
      const reactionTime = currentTrial.beatFoundTime 
        ? endTime - currentTrial.beatFoundTime 
        : endTime - currentTrial.startTime

      // ステアケースコントローラーに記録
      const trial = staircaseControllerRef.current.recordResponse(
        currentTrial.direction,
        userAnswer,
        currentTrial.ioiSequence,
        reactionTime
      )

      // 再生停止
      audioGeneratorRef.current?.stopPlayback()

      // 試行完了通知
      config.onTrialComplete?.(trial)

      // 進捗更新
      const staircaseProgress = staircaseControllerRef.current.getProgress()
      const newAccuracy = staircaseProgress.trialsCompleted > 0 
        ? (progress.accuracy * (staircaseProgress.trialsCompleted - 1) + (trial.correct ? 1 : 0)) / staircaseProgress.trialsCompleted
        : 0

      updateProgress({
        currentTrial: staircaseProgress.trialsCompleted + 1,
        trialsCompleted: staircaseProgress.trialsCompleted,
        reversalsCount: staircaseProgress.reversalsCount,
        currentSlopeK: staircaseProgress.currentSlopeK,
        isConverged: staircaseProgress.isConverged,
        accuracy: newAccuracy,
        estimatedRemainingTrials: staircaseProgress.estimatedRemainingTrials,
        phaseProgress: {
          beatFinding: 1.0,
          tempoJudgment: 1.0,
          overall: 1.0
        }
      })

      updateState('feedback')

      // 収束判定
      if (staircaseProgress.isConverged || staircaseProgress.trialsCompleted >= progress.totalTrials) {
        setTimeout(() => completeTest(), 1500)
      } else {
        setTimeout(() => {
          updateProgress({
            phaseProgress: { beatFinding: 0, tempoJudgment: 0, overall: 0 }
          })
          startNextTrial()
        }, 1500)
      }

    } catch (err) {
      handleError(err as Error)
    }
  }, [state, progress, config, updateState, updateProgress, handleError, startNextTrial])

  // テスト完了
  const completeTest = useCallback(() => {
    if (!staircaseControllerRef.current) {
      handleError(new Error('Staircase controller not initialized'))
      return
    }

    try {
      const staircaseResult = staircaseControllerRef.current.getResult()
      if (!staircaseResult) {
        handleError(new Error('Failed to get staircase result'))
        return
      }

      // 品質評価
      const quality = evaluateBFITQuality(staircaseResult)

      // 結果詳細計算
      const summary = calculateTestSummary(staircaseResult)

      const testResult: BFITTestResultDetail = {
        ...staircaseResult,
        quality,
        summary
      }

      setResult(testResult)
      updateState('completed')
      config.onTestComplete?.(staircaseResult)

    } catch (err) {
      handleError(err as Error)
    }
  }, [config, updateState, handleError])

  // テスト概要計算
  const calculateTestSummary = useCallback((result: BFITResult) => {
    const trials = result.trials
    const validReactionTimes = trials
      .map(t => t.reactionTime)
      .filter((rt): rt is number => rt !== undefined && rt > 0)

    const totalDuration = result.duration
    const averageReactionTime = validReactionTimes.length > 0 
      ? validReactionTimes.reduce((sum, rt) => sum + rt, 0) / validReactionTimes.length
      : 0

    // ビート発見精度（仮定：全試行でビートが発見されたとする）
    const beatFindingAccuracy = 1.0

    // テンポ判定精度
    const tempoJudgmentAccuracy = result.directionAccuracy.overall.accuracy

    // 収束品質
    const convergenceQuality = result.convergenceAnalysis.confidence

    return {
      totalDuration,
      averageReactionTime,
      beatFindingAccuracy,
      tempoJudgmentAccuracy,
      convergenceQuality
    }
  }, [])

  // リセット
  const reset = useCallback(() => {
    // 音響停止
    audioGeneratorRef.current?.stopPlayback()

    // ステアケースリセット
    staircaseControllerRef.current?.reset()

    // 状態リセット
    setState('ready')
    setError(null)
    setResult(null)
    currentTrialRef.current = null

    // 進捗リセット
    const initialSlopeK = staircaseControllerRef.current?.getCurrentSlopeK() || 8.0
    setProgress({
      currentTrial: 1,
      totalTrials: 25,
      trialsCompleted: 0,
      reversalsCount: 0,
      targetReversals: 6,
      currentSlopeK: initialSlopeK,
      isConverged: false,
      accuracy: 0,
      estimatedRemainingTrials: 0,
      phaseProgress: { beatFinding: 0, tempoJudgment: 0, overall: 0 }
    })
  }, [])

  // クリーンアップ
  const cleanup = useCallback(() => {
    audioGeneratorRef.current?.dispose()
    audioGeneratorRef.current = null
    staircaseControllerRef.current = null
    currentTrialRef.current = null
  }, [])

  // 初期化実行
  useEffect(() => {
    initialize()
    return cleanup
  }, [initialize, cleanup])

  return {
    // 状態
    state,
    progress,
    error,
    result,

    // アクション
    startNextTrial,
    handleBeatFound,
    handleTempoJudgment,
    reset,
    cleanup,

    // 内部状態（デバッグ用）
    getCurrentTrial: () => currentTrialRef.current,
    getAudioGenerator: () => audioGeneratorRef.current,
    getStaircaseController: () => staircaseControllerRef.current
  }
}

// BFIT結果分析フック
export function useBFITTestResult(result: BFITTestResultDetail | null) {
  const [analysis, setAnalysis] = useState<{
    thresholdAnalysis: any
    directionAnalysis: any
    patternAnalysis: any
    recommendations: string[]
  } | null>(null)

  useEffect(() => {
    if (!result) {
      setAnalysis(null)
      return
    }

    // 閾値分析
    const thresholdAnalysis = {
      slopeThreshold: result.slopeThreshold,
      percentile: calculatePercentile(result.slopeThreshold),
      interpretation: interpretThreshold(result.slopeThreshold)
    }

    // 方向別分析
    const directionAnalysis = {
      accelerando: result.directionAccuracy.accelerando,
      ritardando: result.directionAccuracy.ritardando,
      bias: calculateDirectionBias(result.directionAccuracy),
      consistency: calculateDirectionConsistency(result.trials)
    }

    // パターン分析
    const patternAnalysis = {
      reactionTime: result.summary.averageReactionTime,
      beatFindingEfficiency: result.summary.beatFindingAccuracy,
      tempoSensitivity: result.summary.tempoJudgmentAccuracy,
      complexity: calculateComplexityHandling(result.trials)
    }

    // 推奨事項
    const recommendations = generateRecommendations(result)

    setAnalysis({
      thresholdAnalysis,
      directionAnalysis,
      patternAnalysis,
      recommendations
    })
  }, [result])

  return analysis
}

// ヘルパー関数
function calculatePercentile(threshold: number): number {
  // 仮の正規化（実際のデータに基づいて調整が必要）
  const normalizedThreshold = Math.max(0, Math.min(100, (20 - threshold) / 20 * 100))
  return Math.round(normalizedThreshold)
}

function interpretThreshold(threshold: number): string {
  if (threshold < 2) return '非常に高い感度'
  if (threshold < 5) return '高い感度'
  if (threshold < 8) return '平均的な感度'
  if (threshold < 12) return '低い感度'
  return '非常に低い感度'
}

function calculateDirectionBias(directionAccuracy: BFITResult['directionAccuracy']): string {
  const accelerandoAcc = directionAccuracy.accelerando.accuracy
  const ritardandoAcc = directionAccuracy.ritardando.accuracy
  const diff = accelerandoAcc - ritardandoAcc

  if (Math.abs(diff) < 0.1) return 'バランス良好'
  if (diff > 0.1) return '加速傾向の検出が得意'
  return '減速傾向の検出が得意'
}

function calculateDirectionConsistency(trials: BFITTrial[]): number {
  // 連続する試行での一貫性を計算
  let consistentCount = 0
  for (let i = 1; i < trials.length; i++) {
    const currentTrial = trials[i]
    const previousTrial = trials[i-1]
    if (currentTrial && previousTrial && currentTrial.correct === previousTrial.correct) {
      consistentCount++
    }
  }
  return trials.length > 1 ? consistentCount / (trials.length - 1) : 0
}

function calculateComplexityHandling(trials: BFITTrial[]): number {
  // 複雑なパターンでの成功率を計算
  const complexTrials = trials.filter(t => t.slopeK < 5) // 小さな変化率は複雑
  const complexCorrect = complexTrials.filter(t => t.correct).length
  return complexTrials.length > 0 ? complexCorrect / complexTrials.length : 0
}

function generateRecommendations(result: BFITTestResultDetail): string[] {
  const recommendations: string[] = []

  if (result.quality.score < 70) {
    recommendations.push('複雑リズムの練習を継続することをお勧めします')
  }

  if (result.directionAccuracy.overall.accuracy < 0.7) {
    recommendations.push('テンポ変化の聞き取り練習が効果的です')
  }

  if (result.summary.averageReactionTime > 3000) {
    recommendations.push('迅速な判断力向上のための訓練をお勧めします')
  }

  if (result.slopeThreshold > 10) {
    recommendations.push('微細なテンポ変化の感知能力向上を目指しましょう')
  }

  if (recommendations.length === 0) {
    recommendations.push('優秀な複雑リズム知覚能力です。現在のレベルを維持してください')
  }

  return recommendations
} 