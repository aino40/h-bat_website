'use client'

import { 
  StaircaseController, 
  StaircaseConfig, 
  StaircaseTrial, 
  StaircaseResult 
} from '@/lib/staircase/core'
import { 
  ConvergenceDetector,
  ConvergenceConfig, 
  DEFAULT_CONVERGENCE_CONFIG 
} from '@/lib/staircase/convergence'
// Note: BSTConfig and DEFAULT_BST_CONFIG imported but not used in this version

// BST専用のステアケース設定
export interface BSTStaircaseConfig extends StaircaseConfig {
  initialVolumeDifference: number // 初期音量差（dB）
  minVolumeDifference: number // 最小音量差（dB）
  maxVolumeDifference: number // 最大音量差（dB）
  volumeStepSizes: number[] // 音量差ステップサイズ（dB）
  convergenceConfig: ConvergenceConfig
}

// BST試行データ
export interface BSTTrial extends StaircaseTrial {
  volumeDifference: number // 音量差（dB）
  patternType: '2beat' | '3beat' // 実際のパターン
  userAnswer: '2beat' | '3beat' // ユーザーの回答
  correct: boolean // 正解フラグ
  reactionTime: number | undefined // 反応時間（ms）
  strongBeatLevel: number // 強拍レベル（dB SPL）
  weakBeatLevel: number // 弱拍レベル（dB SPL）
}

// BST結果データ
export interface BSTResult extends StaircaseResult {
  volumeDifferenceThreshold: number // 音量差閾値（dB）
  trials: BSTTrial[] // 試行履歴
  patternAccuracy: {
    '2beat': { correct: number; total: number; accuracy: number }
    '3beat': { correct: number; total: number; accuracy: number }
    overall: { correct: number; total: number; accuracy: number }
  }
  convergenceAnalysis: {
    isConverged: boolean
    reversalCount: number
    finalReversals: number[]
    confidence: number
  }
}

// デフォルトBSTステアケース設定
export const DEFAULT_BST_STAIRCASE_CONFIG: BSTStaircaseConfig = {
  initialLevel: 20, // 初期音量差20dB
  minLevel: 0.5, // 最小音量差0.5dB
  maxLevel: 40, // 最大音量差40dB
  initialStepSize: 8, // 初期ステップサイズ
  stepSizes: [8, 4, 2], // ステップサイズ配列
  targetReversals: 6,
  minTrials: 6,
  maxTrials: 30,
  startDirection: 'down',
  rule: '2down1up',
  initialVolumeDifference: 20,
  minVolumeDifference: 0.5,
  maxVolumeDifference: 40,
  volumeStepSizes: [8, 4, 2],
  convergenceConfig: {
    ...DEFAULT_CONVERGENCE_CONFIG,
    targetReversals: 6,
    minReversals: 6
  }
}

// BST専用ステアケースコントローラー
export class BSTStaircaseController {
  private controller: StaircaseController
  private convergenceDetector: ConvergenceDetector
  private config: BSTStaircaseConfig
  private sessionId: string
  private profileId: string
  private startTime: Date
  private hearingThreshold: number // 聴力閾値（平均）

  constructor(
    sessionId: string,
    profileId: string,
    hearingThreshold: number,
    config: Partial<BSTStaircaseConfig> = {}
  ) {
    this.sessionId = sessionId
    this.profileId = profileId
    this.hearingThreshold = hearingThreshold
    this.config = { ...DEFAULT_BST_STAIRCASE_CONFIG, ...config }
    this.startTime = new Date()
    
    // ステアケースコントローラー初期化
    this.controller = new StaircaseController(this.config)
    this.convergenceDetector = new ConvergenceDetector(this.config.convergenceConfig)
  }

  // 現在の音量差取得
  getCurrentVolumeDifference(): number {
    return this.controller.getCurrentLevel()
  }

  // 強拍レベル計算（聴力閾値+30dB）
  getStrongBeatLevel(): number {
    return this.hearingThreshold + 30
  }

  // 弱拍レベル計算
  getWeakBeatLevel(): number {
    const volumeDifference = this.getCurrentVolumeDifference()
    return this.getStrongBeatLevel() - volumeDifference
  }

  // 応答記録
  recordResponse(
    patternType: '2beat' | '3beat',
    userAnswer: '2beat' | '3beat',
    reactionTime?: number
  ): BSTTrial {
    const correct = patternType === userAnswer
    const volumeDifference = this.getCurrentVolumeDifference()
    
    // ステアケース内部での試行記録
    const trial = this.controller.recordTrial(correct)
    
    // BST専用の試行データを作成
    const bstTrial: BSTTrial = {
      ...trial,
      volumeDifference,
      patternType,
      userAnswer,
      correct,
      reactionTime,
      strongBeatLevel: this.getStrongBeatLevel(),
      weakBeatLevel: this.getWeakBeatLevel()
    }

    return bstTrial
  }

  // 進捗状況取得
  getProgress(): {
    trialsCompleted: number
    reversalsCount: number
    isConverged: boolean
    currentVolumeDifference: number
    estimatedRemainingTrials: number
  } {
    const state = this.controller.getState()
    const convergence = this.convergenceDetector.checkConvergence(
      state.trialHistory, 
      this.startTime, 
      state.currentLevel
    )

    return {
      trialsCompleted: state.totalTrials,
      reversalsCount: state.totalReversals,
      isConverged: convergence.isConverged,
      currentVolumeDifference: state.currentLevel,
      estimatedRemainingTrials: Math.max(0, this.config.targetReversals - state.totalReversals) * 2
    }
  }

  // 収束判定
  isConverged(): boolean {
    const state = this.controller.getState()
    const convergence = this.convergenceDetector.checkConvergence(
      state.trialHistory, 
      this.startTime, 
      state.currentLevel
    )
    
    if (process.env.NODE_ENV === 'development') {
      console.log('BST Convergence check:', {
        totalTrials: state.totalTrials,
        totalReversals: state.totalReversals,
        targetReversals: this.config.targetReversals,
        isConverged: convergence.isConverged,
        confidence: convergence.confidence,
        reversalPoints: state.reversalPoints
      })
    }
    
    return convergence.isConverged
  }

  // 結果取得
  getResult(): BSTResult | null {
    const state = this.controller.getState()
    const convergence = this.convergenceDetector.checkConvergence(
      state.trialHistory, 
      this.startTime, 
      state.currentLevel
    )
    const result = this.controller.getResult()
    
    if (!result || state.totalTrials === 0) return null

    // BST専用の試行データに変換
    const bstTrials: BSTTrial[] = state.trialHistory.map(trial => ({
      ...trial,
      volumeDifference: trial.level,
      patternType: '2beat', // 実際の値は記録時に設定
      userAnswer: '2beat', // 実際の値は記録時に設定
      correct: trial.response,
      reactionTime: undefined,
      strongBeatLevel: this.getStrongBeatLevel(),
      weakBeatLevel: this.getStrongBeatLevel() - trial.level
    }))

    // パターン別精度計算
    const patternAccuracy = this.calculatePatternAccuracy(bstTrials)

    return {
      ...result,
      volumeDifferenceThreshold: result.threshold,
      trials: bstTrials,
      patternAccuracy,
      convergenceAnalysis: {
        isConverged: convergence.isConverged,
        reversalCount: state.totalReversals,
        finalReversals: state.reversalPoints.slice(-6),
        confidence: convergence.confidence
      }
    }
  }

  // パターン別精度計算
  private calculatePatternAccuracy(trials: BSTTrial[]): BSTResult['patternAccuracy'] {
    const stats = {
      '2beat': { correct: 0, total: 0 },
      '3beat': { correct: 0, total: 0 }
    }

    trials.forEach(trial => {
      const pattern = trial.patternType
      stats[pattern].total++
      if (trial.correct) {
        stats[pattern].correct++
      }
    })

    const totalCorrect = stats['2beat'].correct + stats['3beat'].correct
    const totalTrials = stats['2beat'].total + stats['3beat'].total

    return {
      '2beat': {
        ...stats['2beat'],
        accuracy: stats['2beat'].total > 0 ? stats['2beat'].correct / stats['2beat'].total : 0
      },
      '3beat': {
        ...stats['3beat'],
        accuracy: stats['3beat'].total > 0 ? stats['3beat'].correct / stats['3beat'].total : 0
      },
      overall: {
        correct: totalCorrect,
        total: totalTrials,
        accuracy: totalTrials > 0 ? totalCorrect / totalTrials : 0
      }
    }
  }

  // リセット
  reset(): void {
    this.controller.reset(this.config)
    this.startTime = new Date()
  }

  // 設定更新
  updateConfig(config: Partial<BSTStaircaseConfig>): void {
    this.config = { ...this.config, ...config }
    this.controller.updateConfig(config)
  }

  // デバッグ情報取得
  getDebugInfo(): {
    config: BSTStaircaseConfig
    state: any
    hearingThreshold: number
    strongBeatLevel: number
    weakBeatLevel: number
    progress: any
  } {
    const state = this.controller.getState()
    const progress = this.getProgress()

    return {
      config: this.config,
      state,
      hearingThreshold: this.hearingThreshold,
      strongBeatLevel: this.getStrongBeatLevel(),
      weakBeatLevel: this.getWeakBeatLevel(),
      progress
    }
  }
}

// BST用ユーティリティ関数

// 音量差の適応制御
export function adaptVolumeDifference(
  currentDifference: number,
  isCorrect: boolean,
  stepSize: number,
  consecutiveCorrect: number = 0
): {
  newDifference: number
  newStepSize: number
} {
  let newDifference = currentDifference
  const newStepSize = stepSize

  // 2-down-1-up ルール
  if (isCorrect && consecutiveCorrect >= 1) {
    // 2連続正答で難化（音量差を減少）
    newDifference = Math.max(0.5, currentDifference - stepSize)
  } else if (!isCorrect) {
    // 1誤答で易化（音量差を増加）
    newDifference = Math.min(40, currentDifference + stepSize)
  }

  return {
    newDifference: Math.round(newDifference * 10) / 10, // 小数点1桁
    newStepSize
  }
}

// BST閾値の品質評価
export function evaluateBSTQuality(result: BSTResult): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  score: number
  feedback: string
} {
  const { confidence } = result.convergenceAnalysis
  const { accuracy } = result.patternAccuracy.overall
  const threshold = result.volumeDifferenceThreshold

  // スコア計算（信頼度50% + 精度30% + 閾値20%）
  const confidenceScore = confidence * 50
  const accuracyScore = accuracy * 30
  const thresholdScore = Math.max(0, (10 - threshold) / 10) * 20 // 閾値が低いほど高得点
  
  const totalScore = confidenceScore + accuracyScore + thresholdScore

  let grade: 'A' | 'B' | 'C' | 'D' | 'F'
  let feedback: string

  if (totalScore >= 85) {
    grade = 'A'
    feedback = '優秀な拍子知覚能力です'
  } else if (totalScore >= 70) {
    grade = 'B'
    feedback = '良好な拍子知覚能力です'
  } else if (totalScore >= 55) {
    grade = 'C'
    feedback = '平均的な拍子知覚能力です'
  } else if (totalScore >= 40) {
    grade = 'D'
    feedback = '拍子知覚にやや困難があります'
  } else {
    grade = 'F'
    feedback = '拍子知覚に困難があります'
  }

  return {
    grade,
    score: Math.round(totalScore),
    feedback
  }
}

// BST結果のエクスポート用データ変換
export function formatBSTResultForExport(result: BSTResult): {
  summary: Record<string, any>
  trials: Record<string, any>[]
} {
  const summary = {
    sessionId: result.threshold, // セッションIDは別途設定
    volumeDifferenceThreshold: result.volumeDifferenceThreshold,
    totalTrials: result.totalTrials,
    totalReversals: result.totalReversals,
    confidence: result.convergenceAnalysis.confidence,
    accuracy2beat: result.patternAccuracy['2beat'].accuracy,
    accuracy3beat: result.patternAccuracy['3beat'].accuracy,
    overallAccuracy: result.patternAccuracy.overall.accuracy,
    duration: result.duration,
    isConverged: result.convergenceAnalysis.isConverged
  }

  const trials = result.trials.map((trial, index) => ({
    trialIndex: index + 1,
    volumeDifference: trial.volumeDifference,
    patternType: trial.patternType,
    userAnswer: trial.userAnswer,
    correct: trial.correct,
    reactionTime: trial.reactionTime,
    strongBeatLevel: trial.strongBeatLevel,
    weakBeatLevel: trial.weakBeatLevel,
    isReversal: trial.isReversal,
    timestamp: trial.timestamp.toISOString()
  }))

  return { summary, trials }
} 