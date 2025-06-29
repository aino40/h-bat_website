'use client'

// ステアケース法の基本設定
export interface StaircaseConfig {
  // 初期設定
  initialLevel: number
  minLevel: number
  maxLevel: number
  
  // ステップサイズ設定
  initialStepSize: number
  stepSizes: number[] // 反転回数に応じたステップサイズ
  
  // 収束判定
  targetReversals: number
  minTrials: number
  maxTrials: number
  
  // 特殊設定
  startDirection: 'up' | 'down'
  rule: '2down1up' | '1down1up' // 2連続正答で難化 or 1正答で難化
}

// ステアケース法の状態
export interface StaircaseState {
  // 現在の状態
  currentLevel: number
  currentDirection: 'up' | 'down'
  currentStepSize: number
  
  // 試行履歴
  trialHistory: StaircaseTrial[]
  reversalPoints: number[]
  
  // 収束状態
  isConverged: boolean
  threshold: number | null
  confidence: number | null
  
  // メタデータ
  totalTrials: number
  totalReversals: number
  startedAt: Date
  completedAt: Date | null
}

// 試行データ
export interface StaircaseTrial {
  trialIndex: number
  level: number
  response: boolean // true: 正答, false: 誤答
  isReversal: boolean
  stepSize: number
  direction: 'up' | 'down'
  timestamp: Date
}

// ステアケース法の結果
export interface StaircaseResult {
  threshold: number
  confidence: number
  totalTrials: number
  totalReversals: number
  convergenceTrials: number[]
  finalLevels: number[]
  duration: number // milliseconds
}

// デフォルト設定
export const DEFAULT_STAIRCASE_CONFIG: StaircaseConfig = {
  initialLevel: 40,
  minLevel: 0,
  maxLevel: 80,
  initialStepSize: 8,
  stepSizes: [8, 8, 4, 4, 2, 2], // 反転回数に応じて減少
  targetReversals: 6,
  minTrials: 6,
  maxTrials: 50,
  startDirection: 'down',
  rule: '2down1up'
}

// 聴力測定用設定
export const HEARING_STAIRCASE_CONFIG: StaircaseConfig = {
  ...DEFAULT_STAIRCASE_CONFIG,
  initialLevel: 40,
  minLevel: 0,
  maxLevel: 80,
  stepSizes: [8, 8, 4, 4, 2, 2],
  targetReversals: 6
}

// BST用設定（音量差）
export const BST_STAIRCASE_CONFIG: StaircaseConfig = {
  ...DEFAULT_STAIRCASE_CONFIG,
  initialLevel: 20,
  minLevel: 1,
  maxLevel: 40,
  stepSizes: [0.7, 0.7, 0.8, 0.8, 0.9, 0.9], // 乗算係数
  targetReversals: 6
}

// BIT/BFIT用設定（時間勾配）
export const BIT_STAIRCASE_CONFIG: StaircaseConfig = {
  ...DEFAULT_STAIRCASE_CONFIG,
  initialLevel: 5,
  minLevel: 0.5,
  maxLevel: 20,
  stepSizes: [0.7, 0.7, 0.8, 0.8, 0.9, 0.9], // 乗算係数
  targetReversals: 6
}

// ステアケース法クラス
export class StaircaseController {
  private config: StaircaseConfig
  private state: StaircaseState

  constructor(config: Partial<StaircaseConfig> = {}) {
    this.config = { ...DEFAULT_STAIRCASE_CONFIG, ...config }
    this.state = this.initializeState()
  }

  private initializeState(): StaircaseState {
    return {
      currentLevel: this.config.initialLevel,
      currentDirection: this.config.startDirection,
      currentStepSize: this.config.initialStepSize,
      trialHistory: [],
      reversalPoints: [],
      isConverged: false,
      threshold: null,
      confidence: null,
      totalTrials: 0,
      totalReversals: 0,
      startedAt: new Date(),
      completedAt: null
    }
  }

  // 次の試行レベルを取得
  getCurrentLevel(): number {
    return this.state.currentLevel
  }

  // 試行結果を記録し、次のレベルを計算
  recordTrial(response: boolean): StaircaseTrial {
    const trial: StaircaseTrial = {
      trialIndex: this.state.totalTrials,
      level: this.state.currentLevel,
      response,
      isReversal: false,
      stepSize: this.state.currentStepSize,
      direction: this.state.currentDirection,
      timestamp: new Date()
    }

    // 次のレベルと方向を計算
    const nextDirection = this.calculateNextDirection(response)
    const isReversal = this.isDirectionReversal(nextDirection)
    
    trial.isReversal = isReversal

    // 反転点の記録
    if (isReversal) {
      this.state.reversalPoints.push(this.state.currentLevel)
      this.state.totalReversals++
    }

    // 次のレベルを計算
    const nextLevel = this.calculateNextLevel(nextDirection, isReversal)
    const nextStepSize = this.getStepSize(this.state.totalReversals)

    // デバッグログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('Staircase Trial:', {
        trialIndex: trial.trialIndex,
        currentLevel: this.state.currentLevel,
        response,
        nextDirection,
        isReversal,
        nextLevel,
        stepSize: this.state.currentStepSize,
        rule: this.config.rule
      })
    }

    // 状態更新
    this.state.trialHistory.push(trial)
    this.state.currentLevel = nextLevel
    this.state.currentDirection = nextDirection
    this.state.currentStepSize = nextStepSize
    this.state.totalTrials++

    // 収束判定
    this.checkConvergence()

    return trial
  }

  private calculateNextDirection(response: boolean): 'up' | 'down' {
    if (this.config.rule === '1down1up') {
      return response ? 'down' : 'up'
    } else { // '2down1up'
      if (!response) {
        // 誤答時は必ず易しくする（'up'方向）
        return 'up'
      }
      
      // 正答時：2連続正答チェック（現在の正答 + 直前の試行も正答）
      const lastTrial = this.state.trialHistory[this.state.trialHistory.length - 1]
      const hasConsecutiveCorrect = lastTrial && lastTrial.response && response
      
      if (hasConsecutiveCorrect) {
        // 2連続正答の場合は難しくする（'down'方向）
        return 'down'
      } else {
        // 1回だけの正答の場合は現在の方向を維持
        return this.state.currentDirection
      }
    }
  }

  private isDirectionReversal(nextDirection: 'up' | 'down'): boolean {
    return this.state.trialHistory.length > 0 && 
           this.state.currentDirection !== nextDirection
  }

  private calculateNextLevel(direction: 'up' | 'down', _isReversal: boolean): number {
    let nextLevel = this.state.currentLevel

    // 現在のレベルの検証
    if (!isFinite(this.state.currentLevel) || isNaN(this.state.currentLevel)) {
      console.warn('Staircase: Invalid current level, using initial level:', this.state.currentLevel)
      nextLevel = this.config.initialLevel
    }

    // ステップサイズの検証
    if (!isFinite(this.state.currentStepSize) || isNaN(this.state.currentStepSize) || this.state.currentStepSize <= 0) {
      console.warn('Staircase: Invalid step size, using initial step size:', this.state.currentStepSize)
      this.state.currentStepSize = this.config.initialStepSize
    }

    // ステップサイズが1未満の場合は乗算方式（BST/BIT/BFIT）、それ以外は加算方式（聴力測定）
    if (this.state.currentStepSize < 1) {
      // 乗算方式
      const multiplier = direction === 'down' ? this.state.currentStepSize : (1 / this.state.currentStepSize)
      
      // 乗数の検証
      if (!isFinite(multiplier) || isNaN(multiplier) || multiplier <= 0) {
        console.warn('Staircase: Invalid multiplier, using safe default:', multiplier)
        nextLevel = direction === 'down' ? this.state.currentLevel * 0.7 : this.state.currentLevel * 1.4
      } else {
        nextLevel = this.state.currentLevel * multiplier
      }
    } else {
      // 加算方式
      const delta = direction === 'down' ? -this.state.currentStepSize : this.state.currentStepSize
      nextLevel = this.state.currentLevel + delta
    }

    // 結果の検証
    if (!isFinite(nextLevel) || isNaN(nextLevel)) {
      console.warn('Staircase: Invalid next level calculated, using current level:', nextLevel)
      nextLevel = this.state.currentLevel
    }

    // 範囲制限
    const clampedLevel = Math.max(this.config.minLevel, Math.min(this.config.maxLevel, nextLevel))
    
    console.log('Staircase: Level calculation:', {
      currentLevel: this.state.currentLevel,
      direction,
      stepSize: this.state.currentStepSize,
      nextLevel,
      clampedLevel
    })

    return clampedLevel
  }

  private getStepSize(reversalCount: number): number {
    const index = Math.min(reversalCount, this.config.stepSizes.length - 1)
    return this.config.stepSizes[index] || this.config.stepSizes[this.config.stepSizes.length - 1]!
  }

  private checkConvergence(): void {
    const hasEnoughReversals = this.state.totalReversals >= this.config.targetReversals
    const hasMinTrials = this.state.totalTrials >= this.config.minTrials
    const hasMaxTrials = this.state.totalTrials >= this.config.maxTrials

    if ((hasEnoughReversals && hasMinTrials) || hasMaxTrials) {
      this.state.isConverged = true
      this.state.completedAt = new Date()
      this.calculateThreshold()
    }
  }

  private calculateThreshold(): void {
    if (this.state.reversalPoints.length < 4) {
      this.state.threshold = this.state.currentLevel
      this.state.confidence = 0.5
      return
    }

    // 最後の6回の反転点（または利用可能な全て）を使用
    const lastReversals = this.state.reversalPoints
      .slice(-Math.min(6, this.state.reversalPoints.length))
      .filter(level => isFinite(level) && !isNaN(level)) // 有効な値のみ

    if (lastReversals.length === 0) {
      console.warn('Staircase: No valid reversal points for threshold calculation')
      this.state.threshold = this.state.currentLevel
      this.state.confidence = 0.1
      return
    }
    
    // 平均値を閾値として計算
    const threshold = lastReversals.reduce((sum, level) => sum + level, 0) / lastReversals.length
    
    // 閾値の検証
    if (!isFinite(threshold) || isNaN(threshold)) {
      console.warn('Staircase: Invalid threshold calculated, using current level:', threshold)
      this.state.threshold = this.state.currentLevel
      this.state.confidence = 0.1
      return
    }
    
    // 信頼度を標準偏差から計算
    const variance = lastReversals.reduce((sum, level) => sum + Math.pow(level - threshold, 2), 0) / lastReversals.length
    const standardDeviation = Math.sqrt(variance)
    
    // 信頼度の安全な計算
    let confidence = 0.5 // デフォルト値
    if (isFinite(standardDeviation) && threshold > 0) {
      confidence = Math.max(0, Math.min(1, 1 - (standardDeviation / threshold)))
    }

    this.state.threshold = threshold
    this.state.confidence = confidence
    
    console.log('Staircase: Threshold calculation:', {
      reversalPoints: lastReversals,
      threshold,
      standardDeviation,
      confidence
    })
  }

  // 現在の状態を取得
  getState(): StaircaseState {
    return { ...this.state }
  }

  // 収束しているかチェック
  isConverged(): boolean {
    return this.state.isConverged
  }

  // 結果を取得
  getResult(): StaircaseResult | null {
    if (!this.state.isConverged || this.state.threshold === null || this.state.confidence === null) {
      return null
    }

    const duration = this.state.completedAt && this.state.startedAt 
      ? this.state.completedAt.getTime() - this.state.startedAt.getTime()
      : 0

    // 収束に使用した試行を取得
    const convergenceTrials = this.state.trialHistory
      .slice(-Math.min(6, this.state.reversalPoints.length))
      .map(t => t.trialIndex)

    const finalLevels = this.state.reversalPoints.slice(-Math.min(6, this.state.reversalPoints.length))

    return {
      threshold: this.state.threshold,
      confidence: this.state.confidence,
      totalTrials: this.state.totalTrials,
      totalReversals: this.state.totalReversals,
      convergenceTrials,
      finalLevels,
      duration
    }
  }

  // リセット
  reset(config?: Partial<StaircaseConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    this.state = this.initializeState()
  }

  // 設定を更新
  updateConfig(config: Partial<StaircaseConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // デバッグ情報
  getDebugInfo(): {
    config: StaircaseConfig
    state: StaircaseState
    lastTrials: StaircaseTrial[]
    progress: number
  } {
    return {
      config: this.config,
      state: this.state,
      lastTrials: this.state.trialHistory.slice(-5),
      progress: this.state.totalReversals / this.config.targetReversals
    }
  }
}

// ユーティリティ関数
export function createStaircaseController(type: 'hearing' | 'bst' | 'bit' | 'bfit', customConfig?: Partial<StaircaseConfig>): StaircaseController {
  let baseConfig: StaircaseConfig

  switch (type) {
    case 'hearing':
      baseConfig = HEARING_STAIRCASE_CONFIG
      break
    case 'bst':
      baseConfig = BST_STAIRCASE_CONFIG
      break
    case 'bit':
    case 'bfit':
      baseConfig = BIT_STAIRCASE_CONFIG
      break
    default:
      baseConfig = DEFAULT_STAIRCASE_CONFIG
  }

  return new StaircaseController({ ...baseConfig, ...customConfig })
}

// 閾値計算ユーティリティ
export function calculateThresholdFromReversals(reversalPoints: number[], method: 'mean' | 'median' = 'mean'): {
  threshold: number
  confidence: number
} {
  if (reversalPoints.length === 0) {
    return { threshold: 0, confidence: 0 }
  }

  const values = [...reversalPoints].sort((a, b) => a - b)
  
  let threshold: number
  if (method === 'median') {
    const mid = Math.floor(values.length / 2)
    threshold = values.length % 2 === 0 
      ? (values[mid - 1]! + values[mid]!) / 2 
      : values[mid]!
  } else {
    threshold = values.reduce((sum, val) => sum + val, 0) / values.length
  }

  // 信頼度計算（変動係数の逆数）
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const standardDeviation = Math.sqrt(variance)
  const coefficientOfVariation = standardDeviation / mean
  const confidence = Math.max(0, Math.min(1, 1 - coefficientOfVariation))

  return { threshold, confidence }
}

// ステアケース進行度計算
export function calculateStaircaseProgress(state: StaircaseState, config: StaircaseConfig): {
  reversalProgress: number
  trialProgress: number
  overallProgress: number
  estimatedRemainingTrials: number
} {
  const reversalProgress = Math.min(1, state.totalReversals / config.targetReversals)
  const trialProgress = Math.min(1, state.totalTrials / config.maxTrials)
  
  // 全体進行度は反転進行度を重視
  const overallProgress = Math.max(reversalProgress * 0.8 + trialProgress * 0.2, trialProgress)
  
  // 残り試行数の推定
  const avgTrialsPerReversal = state.totalReversals > 0 ? state.totalTrials / state.totalReversals : 5
  const remainingReversals = Math.max(0, config.targetReversals - state.totalReversals)
  const estimatedRemainingTrials = Math.round(remainingReversals * avgTrialsPerReversal)

  return {
    reversalProgress,
    trialProgress,
    overallProgress,
    estimatedRemainingTrials
  }
} 