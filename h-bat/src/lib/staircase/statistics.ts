'use client'

import { StaircaseTrial, StaircaseResult } from './core'

// 統計計算のオプション
export interface StatisticsConfig {
  method: 'mean' | 'median' | 'trimmed_mean'
  trimPercent?: number // trimmed_mean用（0-50%）
  confidenceLevel: number // 信頼度レベル（0-1）
  minSamples: number // 最小サンプル数
  outlierDetection: boolean // 外れ値除去
  outlierThreshold: number // 外れ値閾値（標準偏差の倍数）
}

// デフォルト統計設定
export const DEFAULT_STATISTICS_CONFIG: StatisticsConfig = {
  method: 'mean',
  trimPercent: 20,
  confidenceLevel: 0.95,
  minSamples: 4,
  outlierDetection: true,
  outlierThreshold: 2.5
}

// 統計結果
export interface StatisticsResult {
  threshold: number
  confidence: number
  standardError: number
  standardDeviation: number
  variance: number
  sampleSize: number
  outliers: number[]
  confidenceInterval: {
    lower: number
    upper: number
  }
  method: string
}

// 基本統計関数
export class StaircaseStatistics {
  private config: StatisticsConfig

  constructor(config: Partial<StatisticsConfig> = {}) {
    this.config = { ...DEFAULT_STATISTICS_CONFIG, ...config }
  }

  // 反転点から閾値を計算
  calculateThresholdFromReversals(reversalPoints: number[]): StatisticsResult {
    if (reversalPoints.length < this.config.minSamples) {
      throw new Error(`Insufficient reversal points: ${reversalPoints.length} < ${this.config.minSamples}`)
    }

    let cleanedData = [...reversalPoints]

    // 外れ値除去
    if (this.config.outlierDetection) {
      cleanedData = this.removeOutliers(cleanedData)
    }

    if (cleanedData.length < this.config.minSamples) {
      throw new Error(`Insufficient data after outlier removal: ${cleanedData.length}`)
    }

    // 閾値計算
    const threshold = this.calculateCentralTendency(cleanedData)
    
    // 統計指標計算
    const stats = this.calculateBasicStatistics(cleanedData)
    const confidenceInterval = this.calculateConfidenceInterval(cleanedData, threshold, stats.standardError)
    
    // 信頼度計算（変動係数の逆数ベース）
    const confidence = this.calculateConfidence(stats.standardDeviation, threshold)
    
    // 除去された外れ値
    const outliers = reversalPoints.filter(val => !cleanedData.includes(val))

    return {
      threshold,
      confidence,
      standardError: stats.standardError,
      standardDeviation: stats.standardDeviation,
      variance: stats.variance,
      sampleSize: cleanedData.length,
      outliers,
      confidenceInterval,
      method: this.config.method
    }
  }

  // 試行履歴から学習曲線を分析
  analyzeLearningCurve(trials: StaircaseTrial[]): {
    learningRate: number
    stabilityIndex: number
    convergencePoint: number
    trendDirection: 'improving' | 'stable' | 'declining'
  } {
    if (trials.length < 10) {
      return {
        learningRate: 0,
        stabilityIndex: 0,
        convergencePoint: trials.length,
        trendDirection: 'stable'
      }
    }

    const levels = trials.map(t => t.level)
    const firstHalf = levels.slice(0, Math.floor(levels.length / 2))
    const secondHalf = levels.slice(Math.floor(levels.length / 2))

    // 学習率（前半と後半の変動の差）
    const firstHalfVariance = this.calculateVariance(firstHalf)
    const secondHalfVariance = this.calculateVariance(secondHalf)
    const learningRate = Math.max(0, (firstHalfVariance - secondHalfVariance) / firstHalfVariance)

    // 安定性指標（後半の変動係数の逆数）
    const secondHalfMean = this.calculateMean(secondHalf)
    const secondHalfCV = Math.sqrt(secondHalfVariance) / secondHalfMean
    const stabilityIndex = Math.max(0, Math.min(1, 1 - secondHalfCV))

    // 収束点（変動が閾値以下になった最初の点）
    const convergencePoint = this.findConvergencePoint(trials)

    // トレンド方向
    const trendDirection = this.analyzeTrend(levels)

    return {
      learningRate,
      stabilityIndex,
      convergencePoint,
      trendDirection
    }
  }

  // パフォーマンス指標計算
  calculatePerformanceMetrics(trials: StaircaseTrial[]): {
    accuracy: number
    reactionConsistency: number
    adaptationRate: number
    errorPattern: 'random' | 'systematic' | 'learning'
  } {
    if (trials.length === 0) {
      return {
        accuracy: 0,
        reactionConsistency: 0,
        adaptationRate: 0,
        errorPattern: 'random'
      }
    }

    // 精度（正答率）
    const correctTrials = trials.filter(t => t.response).length
    const accuracy = correctTrials / trials.length

    // 反応一貫性（レベル変化に対する反応の一貫性）
    const reactionConsistency = this.calculateReactionConsistency(trials)

    // 適応率（レベル変化への適応速度）
    const adaptationRate = this.calculateAdaptationRate(trials)

    // エラーパターン分析
    const errorPattern = this.analyzeErrorPattern(trials)

    return {
      accuracy,
      reactionConsistency,
      adaptationRate,
      errorPattern
    }
  }

  // 複数セッションの比較分析
  compareSessionResults(results: StaircaseResult[]): {
    improvement: number
    consistency: number
    reliability: number
    trend: 'improving' | 'stable' | 'declining'
  } {
    if (results.length < 2) {
      return {
        improvement: 0,
        consistency: 1,
        reliability: 1,
        trend: 'stable'
      }
    }

    const thresholds = results.map(r => r.threshold)
    
    // 改善度（最初と最後の比較）
    const improvement = (thresholds[0]! - thresholds[thresholds.length - 1]!) / thresholds[0]!

    // 一貫性（閾値の変動係数の逆数）
    const mean = this.calculateMean(thresholds)
    const cv = Math.sqrt(this.calculateVariance(thresholds)) / mean
    const consistency = Math.max(0, Math.min(1, 1 - cv))

    // 信頼性（平均信頼度）
    const reliability = results.reduce((sum, r) => sum + r.confidence, 0) / results.length

    // トレンド
    const trend = this.analyzeTrend(thresholds)

    return {
      improvement,
      consistency,
      reliability,
      trend
    }
  }

  // プライベートメソッド

  private calculateCentralTendency(data: number[]): number {
    switch (this.config.method) {
      case 'mean':
        return this.calculateMean(data)
      case 'median':
        return this.calculateMedian(data)
      case 'trimmed_mean':
        return this.calculateTrimmedMean(data, this.config.trimPercent || 20)
      default:
        return this.calculateMean(data)
    }
  }

  private calculateMean(data: number[]): number {
    return data.reduce((sum, val) => sum + val, 0) / data.length
  }

  private calculateMedian(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1]! + sorted[mid]!) / 2 
      : sorted[mid]!
  }

  private calculateTrimmedMean(data: number[], trimPercent: number): number {
    const sorted = [...data].sort((a, b) => a - b)
    const trimCount = Math.floor(sorted.length * trimPercent / 100)
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount)
    return this.calculateMean(trimmed)
  }

  private calculateBasicStatistics(data: number[]): {
    mean: number
    variance: number
    standardDeviation: number
    standardError: number
  } {
    const mean = this.calculateMean(data)
    const variance = this.calculateVariance(data)
    const standardDeviation = Math.sqrt(variance)
    const standardError = standardDeviation / Math.sqrt(data.length)

    return {
      mean,
      variance,
      standardDeviation,
      standardError
    }
  }

  private calculateVariance(data: number[], mean?: number): number {
    const dataMean = mean || this.calculateMean(data)
    const squaredDiffs = data.map(val => Math.pow(val - dataMean, 2))
    return this.calculateMean(squaredDiffs)
  }

  private calculateConfidenceInterval(data: number[], mean: number, standardError: number): {
    lower: number
    upper: number
  } {
    // t分布を使用（簡略化してz分布で近似）
    const zScore = this.getZScore(this.config.confidenceLevel)
    const margin = zScore * standardError

    return {
      lower: mean - margin,
      upper: mean + margin
    }
  }

  private getZScore(confidenceLevel: number): number {
    // 一般的な信頼度レベルのz値
    const zScores: { [key: number]: number } = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    }

    return zScores[confidenceLevel] || 1.96
  }

  private calculateConfidence(standardDeviation: number, mean: number): number {
    if (mean === 0) return 0
    const coefficientOfVariation = standardDeviation / Math.abs(mean)
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation))
  }

  private removeOutliers(data: number[]): number[] {
    const mean = this.calculateMean(data)
    const stdDev = Math.sqrt(this.calculateVariance(data, mean))
    const threshold = this.config.outlierThreshold * stdDev

    return data.filter(val => Math.abs(val - mean) <= threshold)
  }

  private findConvergencePoint(trials: StaircaseTrial[]): number {
    if (trials.length < 10) return trials.length

    const windowSize = 5
    const stabilityThreshold = 0.1 // 10%の変動以下で安定とみなす

    for (let i = windowSize; i <= trials.length; i++) {
      const window = trials.slice(i - windowSize, i)
      const levels = window.map(t => t.level)
      const mean = this.calculateMean(levels)
      const cv = Math.sqrt(this.calculateVariance(levels)) / mean

      if (cv <= stabilityThreshold) {
        return i
      }
    }

    return trials.length
  }

  private analyzeTrend(data: number[]): 'improving' | 'stable' | 'declining' {
    if (data.length < 3) return 'stable'

    // 線形回帰の傾き計算（簡略版）
    const n = data.length
    const sumX = (n * (n - 1)) / 2 // 0, 1, 2, ... n-1の合計
    const sumY = data.reduce((sum, val) => sum + val, 0)
    const sumXY = data.reduce((sum, val, idx) => sum + val * idx, 0)
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6 // 0², 1², 2², ... (n-1)²の合計

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

    if (Math.abs(slope) < 0.01) return 'stable'
    return slope < 0 ? 'improving' : 'declining'
  }

  private calculateReactionConsistency(trials: StaircaseTrial[]): number {
    if (trials.length < 2) return 1

    let consistentReactions = 0
    let totalComparisons = 0

    for (let i = 1; i < trials.length; i++) {
      const prevTrial = trials[i - 1]!
      const currTrial = trials[i]!

      // レベル変化と反応の一貫性をチェック
      const levelIncreased = currTrial.level > prevTrial.level
      const respondedCorrectly = currTrial.response

      // レベルが上がって正答、またはレベルが下がって誤答の場合は一貫
      if ((levelIncreased && respondedCorrectly) || (!levelIncreased && !respondedCorrectly)) {
        consistentReactions++
      }
      totalComparisons++
    }

    return totalComparisons > 0 ? consistentReactions / totalComparisons : 1
  }

  private calculateAdaptationRate(trials: StaircaseTrial[]): number {
    if (trials.length < 5) return 0

    const reversalTrials = trials.filter(t => t.isReversal)
    if (reversalTrials.length < 2) return 0

    // 反転間隔の平均（短いほど適応が早い）
    const intervals: number[] = []
    for (let i = 1; i < reversalTrials.length; i++) {
      intervals.push(reversalTrials[i]!.trialIndex - reversalTrials[i - 1]!.trialIndex)
    }

    const meanInterval = this.calculateMean(intervals)
    // 正規化（1-10試行の範囲で0-1にマッピング）
    return Math.max(0, Math.min(1, (10 - meanInterval) / 9))
  }

  private analyzeErrorPattern(trials: StaircaseTrial[]): 'random' | 'systematic' | 'learning' {
    if (trials.length < 10) return 'random'

    const errors = trials.filter(t => !t.response)
    if (errors.length === 0) return 'random'

    // エラーの分布を分析
    const firstHalfErrors = errors.filter(t => t.trialIndex < trials.length / 2).length
    const secondHalfErrors = errors.filter(t => t.trialIndex >= trials.length / 2).length

    const firstHalfRate = firstHalfErrors / (trials.length / 2)
    const secondHalfRate = secondHalfErrors / (trials.length / 2)

    // 学習パターン（後半でエラー率が大幅に減少）
    if (firstHalfRate - secondHalfRate > 0.2) return 'learning'

    // 系統的パターン（特定のレベルでエラーが集中）
    const errorLevels = errors.map(t => t.level)
    const uniqueLevels = [...new Set(errorLevels)]
    const maxErrorsAtLevel = Math.max(...uniqueLevels.map(level => 
      errorLevels.filter(l => Math.abs(l - level) < 0.1).length
    ))

    if (maxErrorsAtLevel / errors.length > 0.5) return 'systematic'

    return 'random'
  }
}

// 便利関数
export function calculateThreshold(reversalPoints: number[], config?: Partial<StatisticsConfig>): StatisticsResult {
  const stats = new StaircaseStatistics(config)
  return stats.calculateThresholdFromReversals(reversalPoints)
}

export function analyzeTrialHistory(trials: StaircaseTrial[], config?: Partial<StatisticsConfig>) {
  const stats = new StaircaseStatistics(config)
  return {
    learningCurve: stats.analyzeLearningCurve(trials),
    performance: stats.calculatePerformanceMetrics(trials)
  }
}

export function compareResults(results: StaircaseResult[], config?: Partial<StatisticsConfig>) {
  const stats = new StaircaseStatistics(config)
  return stats.compareSessionResults(results)
} 