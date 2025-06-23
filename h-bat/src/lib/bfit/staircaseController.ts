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

// BFIT専用のステアケース設定
export interface BFITStaircaseConfig extends StaircaseConfig {
  initialSlopeK: number // 初期IOI変化率 k (ms/beat)
  minSlopeK: number // 最小IOI変化率 (ms/beat)
  maxSlopeK: number // 最大IOI変化率 (ms/beat)
  slopeStepSizes: number[] // IOI変化率ステップサイズ (ms/beat)
  convergenceConfig: ConvergenceConfig
  patternId: string // リズムパターンID
  baseTempo: number // 基準テンポ (BPM)
  repetitions: number // パターン反復回数
}

// BFIT試行データ
export interface BFITTrial {
  trialIndex: number // 試行番号
  level: number // IOI変化率レベル (ms/beat)
  slopeK: number // IOI変化率 (ms/beat)
  direction: 'accelerando' | 'ritardando' // 実際の方向
  userAnswer: 'accelerando' | 'ritardando' // ユーザーの回答
  correct: boolean // 正解フラグ
  response: boolean // ステアケース用の応答（correctと同じ）
  reactionTime: number | undefined // 反応時間 (ms)
  ioiSequence: number[] // IOIシーケンス
  patternId: string // 使用したリズムパターンID
  soundLevel: number // 音圧レベル (dB SPL)
  isReversal: boolean // 反転フラグ
  timestamp: Date // 記録時刻
}

// BFIT結果データ
export interface BFITResult extends StaircaseResult {
  slopeThreshold: number // IOI変化率閾値 (ms/beat)
  trials: BFITTrial[] // 試行履歴
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
  patternAnalysis: {
    patternId: string
    averageReactionTime: number
    patternAccuracy: number
  }
}

// デフォルトBFITステアケース設定
export const DEFAULT_BFIT_STAIRCASE_CONFIG: BFITStaircaseConfig = {
  initialLevel: 8, // 初期IOI変化率 8ms/beat
  minLevel: 0.5, // 最小IOI変化率 0.5ms/beat
  maxLevel: 30, // 最大IOI変化率 30ms/beat
  initialStepSize: 3, // 初期ステップサイズ
  stepSizes: [3, 1.5, 0.75], // ステップサイズ配列
  targetReversals: 6,
  minTrials: 8,
  maxTrials: 35,
  startDirection: 'down',
  rule: '2down1up',
  initialSlopeK: 8,
  minSlopeK: 0.5,
  maxSlopeK: 30,
  slopeStepSizes: [3, 1.5, 0.75],
  convergenceConfig: {
    ...DEFAULT_CONVERGENCE_CONFIG,
    targetReversals: 6,
    minReversals: 6
  },
  patternId: 'default',
  baseTempo: 120,
  repetitions: 3
}

// BFIT専用ステアケースコントローラー
export class BFITStaircaseController {
  private controller: StaircaseController
  private convergenceDetector: ConvergenceDetector
  private config: BFITStaircaseConfig
  private sessionId: string
  private profileId: string
  private startTime: Date
  private hearingThreshold: number // 聴力閾値（平均）

  constructor(
    sessionId: string,
    profileId: string,
    hearingThreshold: number,
    config: Partial<BFITStaircaseConfig> = {}
  ) {
    this.sessionId = sessionId
    this.profileId = profileId
    this.hearingThreshold = hearingThreshold
    this.config = { ...DEFAULT_BFIT_STAIRCASE_CONFIG, ...config }
    this.startTime = new Date()
    
    // ステアケースコントローラー初期化
    this.controller = new StaircaseController(this.config)
    this.convergenceDetector = new ConvergenceDetector(this.config.convergenceConfig)
  }

  // 現在のIOI変化率取得
  getCurrentSlopeK(): number {
    return this.controller.getCurrentLevel()
  }

  // 音圧レベル計算（聴力閾値+30dB）
  getSoundLevel(): number {
    return this.hearingThreshold + 30
  }

  // 基準テンポ取得
  getBaseTempo(): number {
    return this.config.baseTempo
  }

  // パターンID取得
  getPatternId(): string {
    return this.config.patternId
  }

  // 反復回数取得
  getRepetitions(): number {
    return this.config.repetitions
  }

  // 応答記録
  recordResponse(
    direction: 'accelerando' | 'ritardando',
    userAnswer: 'accelerando' | 'ritardando',
    ioiSequence: number[],
    reactionTime?: number
  ): BFITTrial {
    const correct = direction === userAnswer
    const slopeK = this.getCurrentSlopeK()
    
    // ステアケース内部での試行記録
    const trial = this.controller.recordTrial(correct)
    
    // BFIT専用の試行データを作成
    const bfitTrial: BFITTrial = {
      trialIndex: trial.trialIndex,
      level: trial.level,
      slopeK,
      direction,
      userAnswer,
      correct,
      response: correct,
      reactionTime,
      ioiSequence: [...ioiSequence],
      patternId: this.config.patternId,
      soundLevel: this.getSoundLevel(),
      isReversal: trial.isReversal,
      timestamp: trial.timestamp
    }

    return bfitTrial
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
    const convergence = this.convergenceDetector.checkConvergence(
      state.trialHistory, 
      this.startTime, 
      state.currentLevel
    )

    return {
      trialsCompleted: state.totalTrials,
      reversalsCount: state.totalReversals,
      isConverged: convergence.isConverged,
      currentSlopeK: state.currentLevel,
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
    return convergence.isConverged
  }

  // 結果取得
  getResult(): BFITResult | null {
    const state = this.controller.getState()
    const convergence = this.convergenceDetector.checkConvergence(
      state.trialHistory, 
      this.startTime, 
      state.currentLevel
    )
    const result = this.controller.getResult()
    
    if (!result || state.totalTrials === 0) return null

    // BFIT専用の試行データに変換
    const bfitTrials: BFITTrial[] = state.trialHistory.map(trial => ({
      trialIndex: trial.trialIndex,
      level: trial.level,
      slopeK: trial.level,
      direction: 'accelerando', // 実際の値は記録時に設定
      userAnswer: 'accelerando', // 実際の値は記録時に設定
      correct: trial.response,
      response: trial.response,
      reactionTime: undefined,
      ioiSequence: [],
      patternId: this.config.patternId,
      soundLevel: this.getSoundLevel(),
      isReversal: trial.isReversal,
      timestamp: trial.timestamp
    }))

    // 方向別精度計算
    const directionAccuracy = this.calculateDirectionAccuracy(bfitTrials)

    // パターン分析
    const patternAnalysis = this.calculatePatternAnalysis(bfitTrials)

    const bfitResult: BFITResult = {
      ...result,
      slopeThreshold: result.threshold,
      trials: bfitTrials,
      directionAccuracy,
      convergenceAnalysis: {
        isConverged: convergence.isConverged,
        reversalCount: state.totalReversals,
        finalReversals: state.reversalPoints.slice(-6),
        confidence: convergence.confidence
      },
      patternAnalysis
    }

    return bfitResult
  }

  // 方向別精度計算
  private calculateDirectionAccuracy(trials: BFITTrial[]): BFITResult['directionAccuracy'] {
    const accelerandoTrials = trials.filter(t => t.direction === 'accelerando')
    const ritardandoTrials = trials.filter(t => t.direction === 'ritardando')

    const accelerandoCorrect = accelerandoTrials.filter(t => t.correct).length
    const ritardandoCorrect = ritardandoTrials.filter(t => t.correct).length
    const totalCorrect = trials.filter(t => t.correct).length

    return {
      accelerando: {
        correct: accelerandoCorrect,
        total: accelerandoTrials.length,
        accuracy: accelerandoTrials.length > 0 ? accelerandoCorrect / accelerandoTrials.length : 0
      },
      ritardando: {
        correct: ritardandoCorrect,
        total: ritardandoTrials.length,
        accuracy: ritardandoTrials.length > 0 ? ritardandoCorrect / ritardandoTrials.length : 0
      },
      overall: {
        correct: totalCorrect,
        total: trials.length,
        accuracy: trials.length > 0 ? totalCorrect / trials.length : 0
      }
    }
  }

  // パターン分析計算
  private calculatePatternAnalysis(trials: BFITTrial[]): BFITResult['patternAnalysis'] {
    const validReactionTimes = trials
      .map(t => t.reactionTime)
      .filter((rt): rt is number => rt !== undefined && rt > 0)

    const averageReactionTime = validReactionTimes.length > 0 
      ? validReactionTimes.reduce((sum, rt) => sum + rt, 0) / validReactionTimes.length
      : 0

    const correctTrials = trials.filter(t => t.correct).length
    const patternAccuracy = trials.length > 0 ? correctTrials / trials.length : 0

    return {
      patternId: this.config.patternId,
      averageReactionTime,
      patternAccuracy
    }
  }

  // リセット
  reset(): void {
    this.controller.reset()
    this.convergenceDetector = new ConvergenceDetector(this.config.convergenceConfig)
    this.startTime = new Date()
  }

  // 設定更新
  updateConfig(config: Partial<BFITStaircaseConfig>): void {
    this.config = { ...this.config, ...config }
    // コントローラーの設定も更新
    this.controller.updateConfig(this.config)
  }

  // デバッグ情報取得
  getDebugInfo(): {
    config: BFITStaircaseConfig
    state: any
    hearingThreshold: number
    soundLevel: number
    progress: any
  } {
    return {
      config: this.config,
      state: this.controller.getState(),
      hearingThreshold: this.hearingThreshold,
      soundLevel: this.getSoundLevel(),
      progress: this.getProgress()
    }
  }
}

// IOI変化率適応関数
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
  let newStepSize = stepSize

  if (isCorrect && consecutiveCorrect >= 1) {
    // 2連続正答で難化（IOI変化率を小さく）
    newSlopeK = Math.max(0.5, currentSlopeK - stepSize)
  } else if (!isCorrect) {
    // 1誤答で易化（IOI変化率を大きく）
    newSlopeK = Math.min(30, currentSlopeK + stepSize)
  }

  // ステップサイズ調整（反転後に小さくする）
  if ((isCorrect && consecutiveCorrect >= 1) || !isCorrect) {
    if (stepSize > 0.75) {
      newStepSize = stepSize / 2
    }
  }

  return { newSlopeK, newStepSize }
}

// BFIT品質評価
export function evaluateBFITQuality(result: BFITResult): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  score: number
  feedback: string
} {
  const { slopeThreshold, directionAccuracy, patternAnalysis, convergenceAnalysis } = result

  // 各要素のスコア計算
  const thresholdScore = Math.max(0, 100 - (slopeThreshold * 8)) // 低い閾値ほど高スコア
  const accuracyScore = directionAccuracy.overall.accuracy * 100
  const patternScore = patternAnalysis.patternAccuracy * 100
  const convergenceScore = convergenceAnalysis.confidence * 100

  // 重み付き総合スコア
  const totalScore = (
    thresholdScore * 0.4 + 
    accuracyScore * 0.3 + 
    patternScore * 0.2 + 
    convergenceScore * 0.1
  )

  let grade: 'A' | 'B' | 'C' | 'D' | 'F'
  let feedback: string

  if (totalScore >= 90) {
    grade = 'A'
    feedback = '優秀な複雑リズム知覚・ビート発見能力です'
  } else if (totalScore >= 80) {
    grade = 'B'
    feedback = '良好な複雑リズム知覚・ビート発見能力です'
  } else if (totalScore >= 70) {
    grade = 'C'
    feedback = '平均的な複雑リズム知覚・ビート発見能力です'
  } else if (totalScore >= 60) {
    grade = 'D'
    feedback = '複雑リズム知覚・ビート発見能力に改善の余地があります'
  } else {
    grade = 'F'
    feedback = '複雑リズム知覚・ビート発見能力の向上が必要です'
  }

  return { grade, score: Math.round(totalScore), feedback }
}

// BFITエクスポート用データフォーマット
export function formatBFITResultForExport(result: BFITResult): {
  summary: Record<string, any>
  trials: Record<string, any>[]
} {
  const summary = {
    slopeThreshold: result.slopeThreshold,
    totalTrials: result.totalTrials,
    totalReversals: result.totalReversals,
    duration: result.duration,
    overallAccuracy: result.directionAccuracy.overall.accuracy,
    accelerandoAccuracy: result.directionAccuracy.accelerando.accuracy,
    ritardandoAccuracy: result.directionAccuracy.ritardando.accuracy,
    patternId: result.patternAnalysis.patternId,
    averageReactionTime: result.patternAnalysis.averageReactionTime,
    patternAccuracy: result.patternAnalysis.patternAccuracy,
    convergenceConfidence: result.convergenceAnalysis.confidence,
    isConverged: result.convergenceAnalysis.isConverged
  }

  const trials = result.trials.map(trial => ({
    trialIndex: trial.trialIndex,
    slopeK: trial.slopeK,
    direction: trial.direction,
    userAnswer: trial.userAnswer,
    correct: trial.correct,
    reactionTime: trial.reactionTime,
    patternId: trial.patternId,
    soundLevel: trial.soundLevel,
    isReversal: trial.isReversal,
    timestamp: trial.timestamp.toISOString()
  }))

  return { summary, trials }
} 