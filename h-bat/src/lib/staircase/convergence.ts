'use client'

import { StaircaseTrial, StaircaseConfig, StaircaseState } from './core'

// 収束判定の設定
export interface ConvergenceConfig {
  // 基本設定
  targetReversals: number
  minReversals: number
  maxTrials: number
  
  // 安定性判定
  stabilityWindow: number // 安定性をチェックするウィンドウサイズ
  stabilityThreshold: number // 変動係数の閾値
  stabilityMinSamples: number // 安定性判定に必要な最小サンプル数
  
  // 早期収束判定
  earlyConvergence: boolean
  earlyConvergenceTrials: number // 早期収束をチェックする試行数
  earlyConvergenceThreshold: number // 早期収束の閾値
  
  // タイムアウト設定
  maxDuration: number // 最大実行時間（ミリ秒）
  timeoutWarning: number // 警告時間（ミリ秒）
  
  // 品質管理
  minConfidence: number // 最小信頼度
  maxVariability: number // 最大変動性（CV）
  outlierDetection: boolean
}

// デフォルト収束設定
export const DEFAULT_CONVERGENCE_CONFIG: ConvergenceConfig = {
  targetReversals: 6,
  minReversals: 4,
  maxTrials: 50,
  stabilityWindow: 5,
  stabilityThreshold: 0.15, // 15%以下の変動
  stabilityMinSamples: 3,
  earlyConvergence: true,
  earlyConvergenceTrials: 15,
  earlyConvergenceThreshold: 0.1, // 10%以下の変動
  maxDuration: 300000, // 5分
  timeoutWarning: 240000, // 4分
  minConfidence: 0.7,
  maxVariability: 0.3,
  outlierDetection: true
}

// 収束状態
export interface ConvergenceState {
  isConverged: boolean
  convergenceReason: ConvergenceReason
  confidence: number
  stability: number
  quality: ConvergenceQuality
  warnings: ConvergenceWarning[]
  metrics: ConvergenceMetrics
}

// 収束理由
export type ConvergenceReason = 
  | 'target_reversals' 
  | 'early_convergence' 
  | 'max_trials' 
  | 'timeout' 
  | 'stability_achieved'
  | 'quality_threshold'
  | 'manual_stop'

// 収束品質
export type ConvergenceQuality = 'excellent' | 'good' | 'acceptable' | 'poor'

// 収束警告
export type ConvergenceWarning = 
  | 'high_variability'
  | 'low_confidence'
  | 'approaching_timeout'
  | 'too_many_trials'
  | 'unstable_pattern'
  | 'outliers_detected'

// 収束メトリクス
export interface ConvergenceMetrics {
  totalTrials: number
  totalReversals: number
  stabilityIndex: number
  variabilityIndex: number
  efficiencyScore: number
  timeElapsed: number
  convergenceSpeed: number
  dataQuality: number
}

// 反転検出器
export class ReversalDetector {
  private config: ConvergenceConfig

  constructor(config: Partial<ConvergenceConfig> = {}) {
    this.config = { ...DEFAULT_CONVERGENCE_CONFIG, ...config }
  }

  // 反転を検出
  detectReversal(trials: StaircaseTrial[]): boolean {
    if (trials.length < 2) return false

    const currentTrial = trials[trials.length - 1]!
    const previousTrial = trials[trials.length - 2]!

    return currentTrial.direction !== previousTrial.direction
  }

  // 反転点を抽出
  extractReversalPoints(trials: StaircaseTrial[]): number[] {
    const reversalPoints: number[] = []
    
    for (let i = 1; i < trials.length; i++) {
      if (trials[i]!.isReversal) {
        reversalPoints.push(trials[i - 1]!.level) // 反転前のレベル
      }
    }

    return reversalPoints
  }

  // 反転パターンの分析
  analyzeReversalPattern(trials: StaircaseTrial[]): {
    reversalIntervals: number[]
    averageInterval: number
    patternStability: number
    isRegular: boolean
  } {
    const reversalTrials = trials.filter(t => t.isReversal)
    
    if (reversalTrials.length < 2) {
      return {
        reversalIntervals: [],
        averageInterval: 0,
        patternStability: 0,
        isRegular: false
      }
    }

    // 反転間隔を計算
    const intervals: number[] = []
    for (let i = 1; i < reversalTrials.length; i++) {
      intervals.push(reversalTrials[i]!.trialIndex - reversalTrials[i - 1]!.trialIndex)
    }

    const averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length
    
    // パターンの安定性（間隔の変動係数）
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - averageInterval, 2), 0) / intervals.length
    const standardDeviation = Math.sqrt(variance)
    const coefficientOfVariation = standardDeviation / averageInterval
    const patternStability = Math.max(0, 1 - coefficientOfVariation)

    // 規則性の判定（変動係数が0.3以下で規則的とみなす）
    const isRegular = coefficientOfVariation <= 0.3

    return {
      reversalIntervals: intervals,
      averageInterval,
      patternStability,
      isRegular
    }
  }
}

// 収束判定器
export class ConvergenceDetector {
  private config: ConvergenceConfig
  private reversalDetector: ReversalDetector

  constructor(config: Partial<ConvergenceConfig> = {}) {
    this.config = { ...DEFAULT_CONVERGENCE_CONFIG, ...config }
    this.reversalDetector = new ReversalDetector(config)
  }

  // 収束状態をチェック
  checkConvergence(
    trials: StaircaseTrial[], 
    startTime: Date,
    currentLevel: number
  ): ConvergenceState {
    const timeElapsed = Date.now() - startTime.getTime()
    const reversalPoints = this.reversalDetector.extractReversalPoints(trials)
    const totalReversals = reversalPoints.length

    // 基本メトリクス計算
    const metrics = this.calculateMetrics(trials, timeElapsed, reversalPoints)
    
    // 各種判定
    const stabilityCheck = this.checkStability(trials, reversalPoints)
    const qualityCheck = this.checkQuality(reversalPoints, metrics)
    const warnings = this.generateWarnings(trials, timeElapsed, metrics)

    // 収束判定
    const convergenceResult = this.determineConvergence(
      trials, 
      totalReversals, 
      timeElapsed, 
      stabilityCheck,
      qualityCheck
    )

    return {
      isConverged: convergenceResult.isConverged,
      convergenceReason: convergenceResult.reason,
      confidence: qualityCheck.confidence,
      stability: stabilityCheck.stability,
      quality: qualityCheck.quality,
      warnings,
      metrics
    }
  }

  // 早期収束をチェック
  checkEarlyConvergence(trials: StaircaseTrial[]): boolean {
    if (!this.config.earlyConvergence || trials.length < this.config.earlyConvergenceTrials) {
      return false
    }

    // 最近の試行の安定性をチェック
    const recentTrials = trials.slice(-this.config.earlyConvergenceTrials)
    const levels = recentTrials.map(t => t.level)
    
    const mean = levels.reduce((sum, val) => sum + val, 0) / levels.length
    const variance = levels.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / levels.length
    const coefficientOfVariation = Math.sqrt(variance) / mean

    return coefficientOfVariation <= this.config.earlyConvergenceThreshold
  }

  // 安定性チェック
  private checkStability(trials: StaircaseTrial[], reversalPoints: number[]): {
    stability: number
    isStable: boolean
    trend: 'converging' | 'diverging' | 'stable'
  } {
    if (reversalPoints.length < this.config.stabilityMinSamples) {
      return { stability: 0, isStable: false, trend: 'stable' }
    }

    // 最近のウィンドウで安定性をチェック
    const windowSize = Math.min(this.config.stabilityWindow, reversalPoints.length)
    const recentPoints = reversalPoints.slice(-windowSize)
    
    const mean = recentPoints.reduce((sum, val) => sum + val, 0) / recentPoints.length
    const variance = recentPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentPoints.length
    const coefficientOfVariation = Math.sqrt(variance) / Math.abs(mean)
    
    const stability = Math.max(0, 1 - coefficientOfVariation)
    const isStable = coefficientOfVariation <= this.config.stabilityThreshold

    // トレンド分析
    const trend = this.analyzeTrend(recentPoints)

    return { stability, isStable, trend }
  }

  // 品質チェック
  private checkQuality(reversalPoints: number[], metrics: ConvergenceMetrics): {
    quality: ConvergenceQuality
    confidence: number
    variability: number
  } {
    if (reversalPoints.length === 0) {
      return { quality: 'poor', confidence: 0, variability: 1 }
    }

    // 変動性計算
    const mean = reversalPoints.reduce((sum, val) => sum + val, 0) / reversalPoints.length
    const variance = reversalPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / reversalPoints.length
    const variability = Math.sqrt(variance) / Math.abs(mean)

    // 信頼度計算
    const confidence = Math.max(0, Math.min(1, 1 - variability))

    // 品質判定
    let quality: ConvergenceQuality
    if (confidence >= 0.9 && variability <= 0.1) {
      quality = 'excellent'
    } else if (confidence >= 0.8 && variability <= 0.2) {
      quality = 'good'
    } else if (confidence >= 0.7 && variability <= 0.3) {
      quality = 'acceptable'
    } else {
      quality = 'poor'
    }

    return { quality, confidence, variability }
  }

  // 警告生成
  private generateWarnings(
    trials: StaircaseTrial[], 
    timeElapsed: number, 
    metrics: ConvergenceMetrics
  ): ConvergenceWarning[] {
    const warnings: ConvergenceWarning[] = []

    // 高変動性
    if (metrics.variabilityIndex > this.config.maxVariability) {
      warnings.push('high_variability')
    }

    // 低信頼度
    if (metrics.dataQuality < this.config.minConfidence) {
      warnings.push('low_confidence')
    }

    // タイムアウト接近
    if (timeElapsed > this.config.timeoutWarning) {
      warnings.push('approaching_timeout')
    }

    // 試行数過多
    if (trials.length > this.config.maxTrials * 0.8) {
      warnings.push('too_many_trials')
    }

    // 不安定パターン
    if (metrics.stabilityIndex < 0.5) {
      warnings.push('unstable_pattern')
    }

    // 外れ値検出
    if (this.config.outlierDetection && this.hasOutliers(trials)) {
      warnings.push('outliers_detected')
    }

    return warnings
  }

  // 収束判定
  private determineConvergence(
    trials: StaircaseTrial[],
    totalReversals: number,
    timeElapsed: number,
    stabilityCheck: { isStable: boolean },
    qualityCheck: { quality: ConvergenceQuality, confidence: number }
  ): { isConverged: boolean, reason: ConvergenceReason } {
    // タイムアウト
    if (timeElapsed > this.config.maxDuration) {
      return { isConverged: true, reason: 'timeout' }
    }

    // 最大試行数
    if (trials.length >= this.config.maxTrials) {
      return { isConverged: true, reason: 'max_trials' }
    }

    // 目標反転数達成
    if (totalReversals >= this.config.targetReversals) {
      return { isConverged: true, reason: 'target_reversals' }
    }

    // 早期収束
    if (this.checkEarlyConvergence(trials)) {
      return { isConverged: true, reason: 'early_convergence' }
    }

    // 安定性達成
    if (stabilityCheck.isStable && totalReversals >= this.config.minReversals) {
      return { isConverged: true, reason: 'stability_achieved' }
    }

    // 品質閾値達成
    if (qualityCheck.quality === 'excellent' && qualityCheck.confidence >= 0.9) {
      return { isConverged: true, reason: 'quality_threshold' }
    }

    return { isConverged: false, reason: 'target_reversals' }
  }

  // メトリクス計算
  private calculateMetrics(
    trials: StaircaseTrial[], 
    timeElapsed: number, 
    reversalPoints: number[]
  ): ConvergenceMetrics {
    const totalTrials = trials.length
    const totalReversals = reversalPoints.length

    // 安定性指標
    const stabilityIndex = totalReversals > 0 ? this.calculateStabilityIndex(reversalPoints) : 0

    // 変動性指標
    const variabilityIndex = totalReversals > 0 ? this.calculateVariabilityIndex(reversalPoints) : 1

    // 効率スコア（少ない試行で収束するほど高い）
    const efficiencyScore = Math.max(0, 1 - (totalTrials / this.config.maxTrials))

    // 収束速度（反転あたりの試行数の逆数）
    const convergenceSpeed = totalReversals > 0 ? totalReversals / totalTrials : 0

    // データ品質
    const dataQuality = Math.max(0, 1 - variabilityIndex)

    return {
      totalTrials,
      totalReversals,
      stabilityIndex,
      variabilityIndex,
      efficiencyScore,
      timeElapsed,
      convergenceSpeed,
      dataQuality
    }
  }

  // 安定性指標計算
  private calculateStabilityIndex(reversalPoints: number[]): number {
    if (reversalPoints.length < 3) return 0

    const recentPoints = reversalPoints.slice(-Math.min(6, reversalPoints.length))
    const mean = recentPoints.reduce((sum, val) => sum + val, 0) / recentPoints.length
    const variance = recentPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentPoints.length
    const coefficientOfVariation = Math.sqrt(variance) / Math.abs(mean)

    return Math.max(0, 1 - coefficientOfVariation)
  }

  // 変動性指標計算
  private calculateVariabilityIndex(reversalPoints: number[]): number {
    if (reversalPoints.length === 0) return 1

    const mean = reversalPoints.reduce((sum, val) => sum + val, 0) / reversalPoints.length
    const variance = reversalPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / reversalPoints.length
    
    return Math.sqrt(variance) / Math.abs(mean)
  }

  // トレンド分析
  private analyzeTrend(data: number[]): 'converging' | 'diverging' | 'stable' {
    if (data.length < 3) return 'stable'

    // 線形回帰の傾き
    const n = data.length
    const sumX = (n * (n - 1)) / 2
    const sumY = data.reduce((sum, val) => sum + val, 0)
    const sumXY = data.reduce((sum, val, idx) => sum + val * idx, 0)
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

    // 分散の変化
    const firstHalf = data.slice(0, Math.floor(n / 2))
    const secondHalf = data.slice(Math.floor(n / 2))
    
    const firstVariance = this.calculateVariance(firstHalf)
    const secondVariance = this.calculateVariance(secondHalf)

    if (secondVariance < firstVariance * 0.8) {
      return 'converging'
    } else if (secondVariance > firstVariance * 1.2) {
      return 'diverging'
    } else {
      return 'stable'
    }
  }

  // 分散計算
  private calculateVariance(data: number[]): number {
    if (data.length === 0) return 0
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
  }

  // 外れ値検出
  private hasOutliers(trials: StaircaseTrial[]): boolean {
    if (trials.length < 5) return false

    const levels = trials.map(t => t.level)
    const mean = levels.reduce((sum, val) => sum + val, 0) / levels.length
    const variance = this.calculateVariance(levels)
    const stdDev = Math.sqrt(variance)
    const threshold = 2.5 * stdDev

    return levels.some(level => Math.abs(level - mean) > threshold)
  }
}

// 便利関数
export function createConvergenceDetector(config?: Partial<ConvergenceConfig>): ConvergenceDetector {
  return new ConvergenceDetector(config)
}

export function createReversalDetector(config?: Partial<ConvergenceConfig>): ReversalDetector {
  return new ReversalDetector(config)
}

// H-BAT特化の収束設定
export const HEARING_CONVERGENCE_CONFIG: Partial<ConvergenceConfig> = {
  targetReversals: 6,
  minReversals: 4,
  maxTrials: 30,
  stabilityThreshold: 0.2,
  earlyConvergenceThreshold: 0.15
}

export const BST_CONVERGENCE_CONFIG: Partial<ConvergenceConfig> = {
  targetReversals: 6,
  minReversals: 4,
  maxTrials: 40,
  stabilityThreshold: 0.15,
  earlyConvergenceThreshold: 0.1
}

export const BIT_CONVERGENCE_CONFIG: Partial<ConvergenceConfig> = {
  targetReversals: 6,
  minReversals: 4,
  maxTrials: 40,
  stabilityThreshold: 0.15,
  earlyConvergenceThreshold: 0.1
}

export const BFIT_CONVERGENCE_CONFIG: Partial<ConvergenceConfig> = {
  targetReversals: 6,
  minReversals: 4,
  maxTrials: 50,
  stabilityThreshold: 0.2,
  earlyConvergenceThreshold: 0.15
} 