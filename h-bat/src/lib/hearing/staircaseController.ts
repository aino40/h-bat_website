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
import { HearingFrequency, HEARING_FREQUENCIES } from '@/lib/audio/hearing'

// 聴力測定専用のステアケース設定
export interface HearingStaircaseConfig extends StaircaseConfig {
  minLevel: number // 最小音圧レベル（dB SPL）
  maxLevel: number // 最大音圧レベル（dB SPL）
  initialLevel: number // 初期音圧レベル（dB SPL）
  stepSizes: number[] // ステップサイズ（dB）[初期, 反転後1, 反転後2...]
  convergenceConfig: ConvergenceConfig
}

// 聴力測定試行データ
export interface HearingTrial extends StaircaseTrial {
  frequency: HearingFrequency
  dbLevel: number // 提示音圧レベル（dB SPL）
  correct: boolean // 聞こえた=true, 聞こえなかった=false
  reactionTime: number | undefined // 反応時間（ms）
}

// 聴力測定結果
export interface HearingResult extends StaircaseResult {
  frequency: HearingFrequency
  thresholdDb: number // 閾値（dB SPL）
  trials: HearingTrial[]
  convergenceAnalysis: {
    isConverged: boolean
    reversalCount: number
    finalReversals: number[]
    confidence: number
  }
}

// 聴力測定セッション結果
export interface HearingSessionResult {
  sessionId: string
  profileId: string
  startedAt: Date
  completedAt: Date | undefined
  frequencies: HearingFrequency[]
  results: Map<HearingFrequency, HearingResult>
  isCompleted: boolean
  averageThreshold: number | undefined
}

// デフォルト聴力測定設定
export const DEFAULT_HEARING_STAIRCASE_CONFIG: HearingStaircaseConfig = {
  initialLevel: 40,
  minLevel: 0,
  maxLevel: 80,
  initialStepSize: 8,
  stepSizes: [8, 4, 2], // 初期8dB → 反転後4dB → 最終2dB
  targetReversals: 6,
  minTrials: 6,
  maxTrials: 30,
  startDirection: 'down',
  rule: '2down1up',
  convergenceConfig: {
    ...DEFAULT_CONVERGENCE_CONFIG,
    targetReversals: 6,
    minReversals: 6
  }
}

// 聴力測定用ステアケースコントローラー
export class HearingStaircaseController {
  private controllers: Map<HearingFrequency, StaircaseController> = new Map()
  private convergenceDetectors: Map<HearingFrequency, ConvergenceDetector> = new Map()
  private config: HearingStaircaseConfig
  private currentFrequency: HearingFrequency = 1000
  private sessionId: string
  private profileId: string
  private startTime: Date

  constructor(
    sessionId: string,
    profileId: string,
    config: Partial<HearingStaircaseConfig> = {}
  ) {
    this.sessionId = sessionId
    this.profileId = profileId
    this.config = { ...DEFAULT_HEARING_STAIRCASE_CONFIG, ...config }
    this.startTime = new Date()
    
    this.initializeControllers()
  }

  // 各周波数のステアケースコントローラーを初期化
  private initializeControllers(): void {
    for (const frequency of HEARING_FREQUENCIES) {
      const controller = new StaircaseController(this.config)
      const detector = new ConvergenceDetector(this.config.convergenceConfig)
      this.controllers.set(frequency, controller)
      this.convergenceDetectors.set(frequency, detector)
    }
  }

  // 現在の周波数設定
  setCurrentFrequency(frequency: HearingFrequency): void {
    if (!HEARING_FREQUENCIES.includes(frequency)) {
      throw new Error(`Unsupported frequency: ${frequency}`)
    }
    this.currentFrequency = frequency
  }

  // 現在のステアケースコントローラー取得
  private getCurrentController(): StaircaseController {
    const controller = this.controllers.get(this.currentFrequency)
    if (!controller) {
      throw new Error(`Controller not found for frequency: ${this.currentFrequency}`)
    }
    return controller
  }

  // 現在の収束検出器取得
  private getCurrentDetector(): ConvergenceDetector {
    const detector = this.convergenceDetectors.get(this.currentFrequency)
    if (!detector) {
      throw new Error(`Detector not found for frequency: ${this.currentFrequency}`)
    }
    return detector
  }

  // 現在の音圧レベル取得
  getCurrentLevel(): number {
    const controller = this.getCurrentController()
    const currentLevel = controller.getCurrentLevel()
    
    // ステアケースレベルをdB SPLに変換
    return this.levelToDbSPL(currentLevel)
  }

  // 応答を記録し、次のレベルを計算
  recordResponse(heard: boolean, reactionTime?: number): HearingTrial {
    const controller = this.getCurrentController()
    const currentDbLevel = this.getCurrentLevel()
    
    // ステアケース内部では聞こえた=正答として扱う
    const trial = controller.recordTrial(heard)
    
    // 聴力測定用の試行データを作成
    const hearingTrial: HearingTrial = {
      ...trial,
      frequency: this.currentFrequency,
      dbLevel: currentDbLevel,
      correct: heard,
      reactionTime
    }

    return hearingTrial
  }

  // 現在の周波数の進捗状況取得
  getCurrentProgress(): {
    trialsCompleted: number
    reversalsCount: number
    isConverged: boolean
    currentLevel: number
  } {
    const controller = this.getCurrentController()
    const detector = this.getCurrentDetector()
    const state = controller.getState()
    const convergence = detector.checkConvergence(state.trialHistory, this.startTime, state.currentLevel)
    
    return {
      trialsCompleted: state.totalTrials,
      reversalsCount: state.totalReversals,
      isConverged: convergence.isConverged,
      currentLevel: this.getCurrentLevel()
    }
  }

  // 現在の周波数の結果取得
  getCurrentResult(): HearingResult | null {
    const controller = this.getCurrentController()
    const detector = this.getCurrentDetector()
    const state = controller.getState()
    
    if (state.totalTrials === 0) return null

    const convergence = detector.checkConvergence(state.trialHistory, this.startTime, state.currentLevel)
    const result = controller.getResult()
    
    if (!result) return null

    // 閾値をdB SPLに変換
    const thresholdDb = this.levelToDbSPL(result.threshold)
    
    // 聴力測定用の試行データに変換
    const hearingTrials: HearingTrial[] = state.trialHistory.map(trial => ({
      ...trial,
      frequency: this.currentFrequency,
      dbLevel: this.levelToDbSPL(trial.level),
      correct: trial.response,
      reactionTime: undefined
    }))

    return {
      ...result,
      frequency: this.currentFrequency,
      thresholdDb,
      trials: hearingTrials,
      convergenceAnalysis: {
        isConverged: convergence.isConverged,
        reversalCount: state.totalReversals,
        finalReversals: state.reversalPoints.slice(-6),
        confidence: convergence.confidence
      }
    }
  }

  // セッション全体の結果取得
  getSessionResult(): HearingSessionResult {
    const results = new Map<HearingFrequency, HearingResult>()
    let totalThreshold = 0
    let completedCount = 0

    for (const frequency of HEARING_FREQUENCIES) {
      this.setCurrentFrequency(frequency)
      const result = this.getCurrentResult()
      
      if (result) {
        results.set(frequency, result)
        if (result.convergenceAnalysis.isConverged) {
          totalThreshold += result.thresholdDb
          completedCount++
        }
      }
    }

    const averageThreshold = completedCount > 0 ? totalThreshold / completedCount : undefined
    const isCompleted = completedCount === HEARING_FREQUENCIES.length

    return {
      sessionId: this.sessionId,
      profileId: this.profileId,
      startedAt: this.startTime,
      completedAt: isCompleted ? new Date() : undefined,
      frequencies: HEARING_FREQUENCIES.slice(),
      results,
      isCompleted,
      averageThreshold
    }
  }

  // 現在の周波数がテスト完了かチェック
  isCurrentFrequencyCompleted(): boolean {
    const progress = this.getCurrentProgress()
    return progress.isConverged || progress.trialsCompleted >= this.config.maxTrials
  }

  // 全周波数のテストが完了かチェック
  isSessionCompleted(): boolean {
    return HEARING_FREQUENCIES.every(frequency => {
      this.setCurrentFrequency(frequency)
      return this.isCurrentFrequencyCompleted()
    })
  }

  // 次の周波数に移動
  moveToNextFrequency(): HearingFrequency | null {
    const currentIndex = HEARING_FREQUENCIES.indexOf(this.currentFrequency)
    if (currentIndex === -1) return null
    
    const nextIndex = currentIndex + 1
    
    if (nextIndex >= HEARING_FREQUENCIES.length) {
      return null // 全周波数完了
    }
    
    const nextFrequency = HEARING_FREQUENCIES[nextIndex]
    if (nextFrequency) {
      this.setCurrentFrequency(nextFrequency)
      return nextFrequency
    }
    return null
  }

  // 前の周波数に移動
  moveToPreviousFrequency(): HearingFrequency | null {
    const currentIndex = HEARING_FREQUENCIES.indexOf(this.currentFrequency)
    if (currentIndex === -1) return null
    
    const previousIndex = currentIndex - 1
    
    if (previousIndex < 0) {
      return null // 最初の周波数
    }
    
    const previousFrequency = HEARING_FREQUENCIES[previousIndex]
    if (previousFrequency) {
      this.setCurrentFrequency(previousFrequency)
      return previousFrequency
    }
    return null
  }

  // 現在の周波数をリセット
  resetCurrentFrequency(): void {
    const controller = new StaircaseController(this.config)
    this.controllers.set(this.currentFrequency, controller)
  }

  // 全周波数をリセット
  resetAll(): void {
    this.initializeControllers()
    this.currentFrequency = 1000
    this.startTime = new Date()
  }

  // ステアケースレベルをdB SPLに変換
  private levelToDbSPL(level: number): number {
    // レベル0 = initialLevel, 正の値で音圧増加, 負の値で音圧減少
    const dbSPL = this.config.initialLevel + level
    return Math.max(this.config.minLevel, Math.min(this.config.maxLevel, dbSPL))
  }

  // dB SPLをステアケースレベルに変換
  private dbSPLToLevel(dbSPL: number): number {
    return dbSPL - this.config.initialLevel
  }

  // 現在の設定取得
  getConfig(): HearingStaircaseConfig {
    return { ...this.config }
  }

  // 現在の周波数取得
  getCurrentFrequency(): HearingFrequency {
    return this.currentFrequency
  }

  // サポートされている周波数一覧取得
  getSupportedFrequencies(): readonly HearingFrequency[] {
    return HEARING_FREQUENCIES
  }

  // セッション情報取得
  getSessionInfo(): {
    sessionId: string
    profileId: string
    startedAt: Date
    currentFrequency: HearingFrequency
    frequencies: readonly HearingFrequency[]
  } {
    return {
      sessionId: this.sessionId,
      profileId: this.profileId,
      startedAt: this.startTime,
      currentFrequency: this.currentFrequency,
      frequencies: HEARING_FREQUENCIES
    }
  }
}

// ファクトリー関数
export function createHearingStaircaseController(
  sessionId: string,
  profileId: string,
  config?: Partial<HearingStaircaseConfig>
): HearingStaircaseController {
  return new HearingStaircaseController(sessionId, profileId, config)
}

// ユーティリティ関数

// 聴力損失の分類
export function classifyHearingLoss(thresholdDb: number): {
  level: 'normal' | 'mild' | 'moderate' | 'severe' | 'profound'
  description: string
} {
  if (thresholdDb <= 25) {
    return { level: 'normal', description: '正常' }
  } else if (thresholdDb <= 40) {
    return { level: 'mild', description: '軽度難聴' }
  } else if (thresholdDb <= 70) {
    return { level: 'moderate', description: '中等度難聴' }
  } else if (thresholdDb <= 90) {
    return { level: 'severe', description: '高度難聴' }
  } else {
    return { level: 'profound', description: '重度難聴' }
  }
}

// 周波数間の閾値差分析
export function analyzeThresholdPattern(results: Map<HearingFrequency, HearingResult>): {
  pattern: 'flat' | 'sloping' | 'rising' | 'notched'
  description: string
  maxDifference: number
} {
  const thresholds = HEARING_FREQUENCIES.map(freq => {
    const result = results.get(freq)
    return result ? result.thresholdDb : null
  }).filter((t): t is number => t !== null)

  if (thresholds.length < 2) {
    return { pattern: 'flat', description: 'データ不足', maxDifference: 0 }
  }

  const differences = []
  for (let i = 1; i < thresholds.length; i++) {
    const current = thresholds[i]
    const previous = thresholds[i - 1]
    if (current !== undefined && previous !== undefined) {
      differences.push(current - previous)
    }
  }

  if (differences.length === 0) {
    return { pattern: 'flat', description: 'データ不足', maxDifference: 0 }
  }

  const maxDifference = Math.max(...differences.map(Math.abs))
  const avgDifference = differences.reduce((a, b) => a + b, 0) / differences.length

  if (maxDifference <= 10) {
    return { pattern: 'flat', description: '平坦型', maxDifference }
  } else if (avgDifference > 5) {
    return { pattern: 'sloping', description: '漸傾型（高音域悪化）', maxDifference }
  } else if (avgDifference < -5) {
    return { pattern: 'rising', description: '上昇型（低音域悪化）', maxDifference }
  } else {
    return { pattern: 'notched', description: 'ノッチ型', maxDifference }
  }
}

// 測定信頼性評価
export function evaluateReliability(result: HearingResult): {
  score: number // 0-1
  factors: {
    convergence: number
    consistency: number
    trialCount: number
  }
  overall: 'excellent' | 'good' | 'fair' | 'poor'
} {
  const convergenceScore = result.convergenceAnalysis.confidence
  
  // 試行間の一貫性評価
  const reversalLevels = result.convergenceAnalysis.finalReversals
  const consistencyScore = reversalLevels.length >= 4 
    ? 1 - (Math.max(...reversalLevels) - Math.min(...reversalLevels)) / 40
    : 0.5

  // 試行数評価
  const trialScore = Math.min(result.trials.length / 20, 1)

  const factors = {
    convergence: convergenceScore,
    consistency: Math.max(0, consistencyScore),
    trialCount: trialScore
  }

  const score = (factors.convergence * 0.5 + factors.consistency * 0.3 + factors.trialCount * 0.2)

  let overall: 'excellent' | 'good' | 'fair' | 'poor'
  if (score >= 0.8) overall = 'excellent'
  else if (score >= 0.6) overall = 'good'
  else if (score >= 0.4) overall = 'fair'
  else overall = 'poor'

  return { score, factors, overall }
} 