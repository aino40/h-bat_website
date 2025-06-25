'use client'

import { 
  StaircaseController, 
  StaircaseConfig, 
  StaircaseResult 
} from '@/lib/staircase/core'
import { 
  ConvergenceDetector,
  ConvergenceConfig, 
  DEFAULT_CONVERGENCE_CONFIG 
} from '@/lib/staircase/convergence'

// BIT専用のステアケース設定
export interface BITStaircaseConfig extends StaircaseConfig {
  initialSlopeK: number // 初期IOI変化率 k (ms/beat)
  minSlopeK: number // 最小IOI変化率 (ms/beat)
  maxSlopeK: number // 最大IOI変化率 (ms/beat)
  slopeStepSizes: number[] // IOI変化率ステップサイズ (ms/beat)
  convergenceConfig: ConvergenceConfig
}

// BIT試行データ
export interface BITTrial {
  trialIndex: number // 試行番号
  level: number // IOI変化率レベル (ms/beat)
  slopeK: number // IOI変化率 (ms/beat)
  direction: 'accelerando' | 'ritardando' // 実際の方向
  userAnswer: 'accelerando' | 'ritardando' // ユーザーの回答
  correct: boolean // 正解フラグ
  response: boolean // ステアケース用の応答（correctと同じ）
  reactionTime: number | undefined // 反応時間 (ms)
  ioiSequence: number[] // IOIシーケンス
  soundLevel: number // 音圧レベル (dB SPL)
  isReversal: boolean // 反転フラグ
  timestamp: Date // 記録時刻
}

// BIT結果データ
export interface BITResult extends StaircaseResult {
  slopeThreshold: number // IOI変化率閾値 (ms/beat)
  trials: BITTrial[] // 試行履歴
  directionAccuracy: {
    'accelerando': { correct: number; total: number; accuracy: number }
    'ritardando': { correct: number; total: number; accuracy: number }
    overall: { correct: number; total: number; accuracy: number }
  }
  convergenceAnalysis: {
    isConverged: boolean
    reversalCount: number
    finalReversals: number[]
    confidence: number
  }
}

// デフォルトBITステアケース設定
export const DEFAULT_BIT_STAIRCASE_CONFIG: BITStaircaseConfig = {
  initialLevel: 5, // 初期IOI変化率 5ms/beat
  minLevel: 0.1, // 最小IOI変化率 0.1ms/beat
  maxLevel: 20, // 最大IOI変化率 20ms/beat
  initialStepSize: 2, // 初期ステップサイズ
  stepSizes: [2, 1, 0.5], // ステップサイズ配列
  targetReversals: 6,
  minTrials: 6,
  maxTrials: 30,
  startDirection: 'down',
  rule: '2down1up',
  initialSlopeK: 5,
  minSlopeK: 0.1,
  maxSlopeK: 20,
  slopeStepSizes: [2, 1, 0.5],
  convergenceConfig: {
    ...DEFAULT_CONVERGENCE_CONFIG,
    targetReversals: 6,
    minReversals: 6
  }
}

// BIT専用ステアケースコントローラー
export class BITStaircaseController {
  private controller: StaircaseController
  private config: BITStaircaseConfig
  private sessionId: string
  private profileId: string
  private startTime: Date
  private hearingThreshold: number // 聴力閾値（平均）

  constructor(
    sessionId: string,
    profileId: string,
    hearingThreshold: number,
    config: Partial<BITStaircaseConfig> = {}
  ) {
    this.sessionId = sessionId
    this.profileId = profileId
    this.hearingThreshold = hearingThreshold
    this.config = { ...DEFAULT_BIT_STAIRCASE_CONFIG, ...config }
    this.startTime = new Date()
    
    // ステアケースコントローラー初期化
    this.controller = new StaircaseController(this.config)
  }

  // 現在のIOI変化率取得
  getCurrentSlopeK(): number {
    return this.controller.getCurrentLevel()
  }

  // 音圧レベル計算（聴力閾値+30dB）
  getSoundLevel(): number {
    return this.hearingThreshold + 30
  }

  // 応答記録
  recordResponse(
    direction: 'accelerando' | 'ritardando',
    userAnswer: 'accelerando' | 'ritardando',
    ioiSequence: number[],
    reactionTime?: number
  ): BITTrial {
    const correct = direction === userAnswer
    const slopeK = this.getCurrentSlopeK()
    
    console.log('BIT: Recording response in staircase controller:', {
      direction,
      userAnswer,
      correct,
      slopeK,
      currentState: this.controller.getState()
    })
    
    // ステアケース内部での試行記録
    const trial = this.controller.recordTrial(correct)
    
    console.log('BIT: Staircase trial recorded:', trial)
    
    // BIT専用の試行データを作成
    const bitTrial: BITTrial = {
      trialIndex: trial.trialIndex,
      level: trial.level,
      slopeK,
      direction,
      userAnswer,
      correct,
      response: correct,
      reactionTime,
      ioiSequence: [...ioiSequence],
      soundLevel: this.getSoundLevel(),
      isReversal: trial.isReversal,
      timestamp: trial.timestamp
    }

    console.log('BIT: Final trial data:', bitTrial)
    return bitTrial
  }

  // 進捗状況取得
  getProgress(): {
    trialsCompleted: number
    reversalsCount: number
    isConverged: boolean
    currentSlopeK: number
    estimatedRemainingTrials: number
  } {
    const state = this.controller.getState()
    const isConverged = this.isConverged()

    return {
      trialsCompleted: state.totalTrials,
      reversalsCount: state.totalReversals,
      isConverged,
      currentSlopeK: state.currentLevel,
      estimatedRemainingTrials: Math.max(0, this.config.targetReversals - state.totalReversals) * 2
    }
  }

  // 収束判定
  isConverged(): boolean {
    const state = this.controller.getState()
    const hasEnoughReversals = state.totalReversals >= this.config.targetReversals
    const hasMinTrials = state.totalTrials >= this.config.minTrials
    const hasMaxTrials = state.totalTrials >= this.config.maxTrials
    const staircaseConverged = this.controller.isConverged()
    
    console.log('BIT: Convergence check:', {
      totalReversals: state.totalReversals,
      targetReversals: this.config.targetReversals,
      totalTrials: state.totalTrials,
      minTrials: this.config.minTrials,
      maxTrials: this.config.maxTrials,
      hasEnoughReversals,
      hasMinTrials,
      hasMaxTrials,
      staircaseConverged
    })
    
    return (hasEnoughReversals && hasMinTrials) || hasMaxTrials || staircaseConverged
  }

  // 結果取得
  getResult(): BITResult | null {
    const state = this.controller.getState()
    const result = this.controller.getResult()
    
    if (!result || state.totalTrials === 0) return null

    // BIT専用の試行データに変換
    const bitTrials: BITTrial[] = state.trialHistory.map(trial => ({
      trialIndex: trial.trialIndex,
      level: trial.level,
      slopeK: trial.level,
      direction: 'accelerando', // 実際の値は記録時に設定
      userAnswer: 'accelerando', // 実際の値は記録時に設定
      correct: trial.response,
      response: trial.response,
      reactionTime: undefined,
      ioiSequence: [],
      soundLevel: this.getSoundLevel(),
      isReversal: trial.isReversal,
      timestamp: trial.timestamp
    }))

    // 方向別精度計算
    const directionAccuracy = this.calculateDirectionAccuracy(bitTrials)

    return {
      ...result,
      slopeThreshold: result.threshold,
      trials: bitTrials,
      directionAccuracy,
      convergenceAnalysis: {
        isConverged: this.isConverged(),
        reversalCount: state.totalReversals,
        finalReversals: state.reversalPoints.slice(-6),
        confidence: result.confidence
      }
    }
  }

  // 方向別精度計算
  private calculateDirectionAccuracy(trials: BITTrial[]): BITResult['directionAccuracy'] {
    const stats = {
      'accelerando': { correct: 0, total: 0 },
      'ritardando': { correct: 0, total: 0 }
    }

    trials.forEach(trial => {
      const direction = trial.direction
      stats[direction].total++
      if (trial.correct) {
        stats[direction].correct++
      }
    })

    const totalCorrect = stats['accelerando'].correct + stats['ritardando'].correct
    const totalTrials = stats['accelerando'].total + stats['ritardando'].total

    return {
      'accelerando': {
        ...stats['accelerando'],
        accuracy: stats['accelerando'].total > 0 ? stats['accelerando'].correct / stats['accelerando'].total : 0
      },
      'ritardando': {
        ...stats['ritardando'],
        accuracy: stats['ritardando'].total > 0 ? stats['ritardando'].correct / stats['ritardando'].total : 0
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
  updateConfig(config: Partial<BITStaircaseConfig>): void {
    this.config = { ...this.config, ...config }
    this.controller.updateConfig(config)
  }

  // デバッグ情報取得
  getDebugInfo(): {
    config: BITStaircaseConfig
    state: any
    hearingThreshold: number
    soundLevel: number
    progress: any
  } {
    const state = this.controller.getState()
    const progress = this.getProgress()

    return {
      config: this.config,
      state,
      hearingThreshold: this.hearingThreshold,
      soundLevel: this.getSoundLevel(),
      progress
    }
  }
}

// BIT用ユーティリティ関数

// IOI変化率の適応制御
export function adaptSlopeK(
  currentSlopeK: number,
  isCorrect: boolean,
  stepSize: number,
  consecutiveCorrect: number = 0
): {
  newSlopeK: number
  newStepSize: number
} {
  let newSlopeK = currentSlopeK
  const newStepSize = stepSize

  // 2-down-1-up ルール
  if (isCorrect && consecutiveCorrect >= 1) {
    // 2連続正答で難化（IOI変化率を減少）
    newSlopeK = Math.max(0.1, currentSlopeK - stepSize)
  } else if (!isCorrect) {
    // 1誤答で易化（IOI変化率を増加）
    newSlopeK = Math.min(20, currentSlopeK + stepSize)
  }

  return {
    newSlopeK: Math.round(newSlopeK * 10) / 10, // 小数点1桁
    newStepSize
  }
}

// BIT閾値の品質評価
export function evaluateBITQuality(result: BITResult): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  score: number
  feedback: string
} {
  const { confidence } = result.convergenceAnalysis
  const { accuracy } = result.directionAccuracy.overall
  const threshold = result.slopeThreshold

  // スコア計算（信頼度50% + 精度30% + 閾値20%）
  const confidenceScore = confidence * 50
  const accuracyScore = accuracy * 30
  const thresholdScore = Math.max(0, (10 - threshold) / 10) * 20 // 閾値が低いほど高得点
  
  const totalScore = confidenceScore + accuracyScore + thresholdScore

  let grade: 'A' | 'B' | 'C' | 'D' | 'F'
  let feedback: string

  if (totalScore >= 85) {
    grade = 'A'
    feedback = '優秀なテンポ知覚能力です'
  } else if (totalScore >= 70) {
    grade = 'B'
    feedback = '良好なテンポ知覚能力です'
  } else if (totalScore >= 55) {
    grade = 'C'
    feedback = '平均的なテンポ知覚能力です'
  } else if (totalScore >= 40) {
    grade = 'D'
    feedback = 'テンポ知覚にやや困難があります'
  } else {
    grade = 'F'
    feedback = 'テンポ知覚に困難があります'
  }

  return {
    grade,
    score: Math.round(totalScore),
    feedback
  }
}

// BIT結果のエクスポート用データ変換
export function formatBITResultForExport(result: BITResult): {
  summary: Record<string, any>
  trials: Record<string, any>[]
} {
  const summary = {
    sessionId: result.threshold, // セッションIDは別途設定
    slopeThreshold: result.slopeThreshold,
    totalTrials: result.totalTrials,
    totalReversals: result.totalReversals,
    confidence: result.convergenceAnalysis.confidence,
    accuracyAccelerando: result.directionAccuracy['accelerando'].accuracy,
    accuracyRitardando: result.directionAccuracy['ritardando'].accuracy,
    overallAccuracy: result.directionAccuracy.overall.accuracy,
    duration: result.duration,
    isConverged: result.convergenceAnalysis.isConverged
  }

  const trials = result.trials.map((trial, index) => ({
    trialIndex: index + 1,
    slopeK: trial.slopeK,
    direction: trial.direction,
    userAnswer: trial.userAnswer,
    correct: trial.correct,
    reactionTime: trial.reactionTime,
    soundLevel: trial.soundLevel,
    isReversal: trial.isReversal,
    timestamp: trial.timestamp.toISOString()
  }))

  return { summary, trials }
} 