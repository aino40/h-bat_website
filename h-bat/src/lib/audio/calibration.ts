'use client'

import { dbSplToToneVolume } from './core'

// キャリブレーション設定
export interface CalibrationConfig {
  // 基準設定
  referenceFrequency: number // Hz (通常は1000Hz)
  referenceDbSpl: number     // dB SPL (通常は60dB)
  referenceToneVolume: number // Tone.js volume (通常は-10dB)
  
  // 聴力閾値測定範囲
  hearingThresholdRange: {
    min: number // dB SPL (通常は0dB)
    max: number // dB SPL (通常は80dB)
  }
  
  // テスト音量設定
  testVolumeOffset: number // 聴力閾値からのオフセット (通常は+30dB)
  
  // 安全制限
  maxSafeVolume: number // dB SPL (通常は85dB)
  warningVolume: number // dB SPL (通常は75dB)
}

// デフォルトキャリブレーション設定
export const DEFAULT_CALIBRATION: CalibrationConfig = {
  referenceFrequency: 1000,
  referenceDbSpl: 60,
  referenceToneVolume: -10,
  hearingThresholdRange: {
    min: 0,
    max: 80
  },
  testVolumeOffset: 30,
  maxSafeVolume: 85,
  warningVolume: 75
}

// 聴力閾値データ
export interface HearingThreshold {
  frequency: number // Hz
  thresholdDbSpl: number // dB SPL
  measuredAt: Date
  confidence: number // 0-1 (測定の信頼度)
}

// キャリブレーションマネージャー
class AudioCalibrationManager {
  private config: CalibrationConfig
  private hearingThresholds: Map<number, HearingThreshold> = new Map()
  private deviceCalibration: Map<string, number> = new Map() // デバイス固有の補正値

  constructor(config: CalibrationConfig = DEFAULT_CALIBRATION) {
    this.config = config
  }

  // 設定の更新
  updateConfig(newConfig: Partial<CalibrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // 聴力閾値の設定
  setHearingThreshold(frequency: number, thresholdDbSpl: number, confidence: number = 1.0): void {
    // 安全範囲チェック
    const clampedThreshold = Math.max(
      this.config.hearingThresholdRange.min,
      Math.min(this.config.hearingThresholdRange.max, thresholdDbSpl)
    )

    this.hearingThresholds.set(frequency, {
      frequency,
      thresholdDbSpl: clampedThreshold,
      measuredAt: new Date(),
      confidence
    })
  }

  // 聴力閾値の取得
  getHearingThreshold(frequency: number): HearingThreshold | null {
    return this.hearingThresholds.get(frequency) || null
  }

  // 全聴力閾値の取得
  getAllHearingThresholds(): HearingThreshold[] {
    return Array.from(this.hearingThresholds.values())
  }

  // 聴力閾値の補間（測定していない周波数の推定）
  interpolateHearingThreshold(frequency: number): number | null {
    const thresholds = this.getAllHearingThresholds()
    if (thresholds.length === 0) return null

    // 完全一致
    const exact = thresholds.find(t => t.frequency === frequency)
    if (exact) return exact.thresholdDbSpl

    // 線形補間
    const sorted = thresholds.sort((a, b) => a.frequency - b.frequency)
    
    // 範囲外の場合は最近値を使用
    if (sorted.length > 0 && frequency < sorted[0]!.frequency) {
      return sorted[0]!.thresholdDbSpl
    }
    if (sorted.length > 0 && frequency > sorted[sorted.length - 1]!.frequency) {
      return sorted[sorted.length - 1]!.thresholdDbSpl
    }

    // 補間計算
    for (let i = 0; i < sorted.length - 1; i++) {
      const lower = sorted[i]
      const upper = sorted[i + 1]
      
      if (lower && upper && frequency >= lower.frequency && frequency <= upper.frequency) {
        const ratio = (frequency - lower.frequency) / (upper.frequency - lower.frequency)
        return lower.thresholdDbSpl + ratio * (upper.thresholdDbSpl - lower.thresholdDbSpl)
      }
    }

    return null
  }

  // テスト音量の計算（聴力閾値 + オフセット）
  calculateTestVolume(frequency: number): {
    dbSpl: number
    toneVolume: number
    isEstimated: boolean
    isSafe: boolean
  } | null {
    // 聴力閾値の取得または補間
    let thresholdDbSpl: number | null = null
    let isEstimated = false

    const threshold = this.getHearingThreshold(frequency)
    if (threshold) {
      thresholdDbSpl = threshold.thresholdDbSpl
    } else {
      thresholdDbSpl = this.interpolateHearingThreshold(frequency)
      isEstimated = true
    }

    if (thresholdDbSpl === null) {
      console.warn(`No hearing threshold data available for ${frequency}Hz`)
      return null
    }

    // テスト音量の計算
    const testDbSpl = thresholdDbSpl + this.config.testVolumeOffset
    
    // 安全チェック
    const isSafe = testDbSpl <= this.config.maxSafeVolume
    const finalDbSpl = Math.min(testDbSpl, this.config.maxSafeVolume)
    
    // Tone.js音量への変換
    const toneVolume = dbSplToToneVolume(finalDbSpl)

    if (!isSafe) {
      console.warn(`⚠️ Test volume capped for safety: ${testDbSpl}dB → ${finalDbSpl}dB SPL`)
    }

    return {
      dbSpl: finalDbSpl,
      toneVolume,
      isEstimated,
      isSafe
    }
  }

  // 複数周波数のテスト音量計算
  calculateMultipleTestVolumes(frequencies: number[]): Map<number, ReturnType<typeof this.calculateTestVolume>> {
    const results = new Map()
    
    frequencies.forEach(freq => {
      const result = this.calculateTestVolume(freq)
      results.set(freq, result)
    })

    return results
  }

  // 聴力閾値測定用の音量レベル生成（ステアケース法用）
  generateHearingTestLevels(frequency: number, currentLevel: number, direction: 'up' | 'down', stepSize: number): {
    nextLevel: number
    dbSpl: number
    toneVolume: number
    isInRange: boolean
  } {
    // 次のレベル計算
    const nextLevel = direction === 'up' ? 
      currentLevel + stepSize : 
      currentLevel - stepSize

    // 範囲制限
    const clampedLevel = Math.max(
      this.config.hearingThresholdRange.min,
      Math.min(this.config.hearingThresholdRange.max, nextLevel)
    )

    const isInRange = clampedLevel === nextLevel
    const toneVolume = dbSplToToneVolume(clampedLevel)

    return {
      nextLevel: clampedLevel,
      dbSpl: clampedLevel,
      toneVolume,
      isInRange
    }
  }

  // デバイス固有キャリブレーション
  setDeviceCalibration(deviceId: string, offsetDb: number): void {
    this.deviceCalibration.set(deviceId, offsetDb)
  }

  getDeviceCalibration(deviceId: string): number {
    return this.deviceCalibration.get(deviceId) || 0
  }

  // 音量安全チェック
  checkVolumeSafety(dbSpl: number): {
    isSafe: boolean
    isWarning: boolean
    recommendation: string
  } {
    const isSafe = dbSpl <= this.config.maxSafeVolume
    const isWarning = dbSpl >= this.config.warningVolume

    let recommendation = ''
    if (!isSafe) {
      recommendation = `音量が安全限界(${this.config.maxSafeVolume}dB SPL)を超えています`
    } else if (isWarning) {
      recommendation = `音量が高めです(${this.config.warningVolume}dB SPL以上)。注意してください`
    } else {
      recommendation = '音量は安全範囲内です'
    }

    return { isSafe, isWarning, recommendation }
  }

  // キャリブレーションデータのエクスポート
  exportCalibrationData(): {
    config: CalibrationConfig
    hearingThresholds: HearingThreshold[]
    deviceCalibrations: { [deviceId: string]: number }
    exportedAt: Date
  } {
    return {
      config: this.config,
      hearingThresholds: this.getAllHearingThresholds(),
      deviceCalibrations: Object.fromEntries(this.deviceCalibration),
      exportedAt: new Date()
    }
  }

  // キャリブレーションデータのインポート
  importCalibrationData(data: {
    config?: Partial<CalibrationConfig>
    hearingThresholds?: HearingThreshold[]
    deviceCalibrations?: { [deviceId: string]: number }
  }): void {
    if (data.config) {
      this.updateConfig(data.config)
    }

    if (data.hearingThresholds) {
      data.hearingThresholds.forEach(threshold => {
        this.setHearingThreshold(
          threshold.frequency,
          threshold.thresholdDbSpl,
          threshold.confidence
        )
      })
    }

    if (data.deviceCalibrations) {
      Object.entries(data.deviceCalibrations).forEach(([deviceId, offset]) => {
        this.setDeviceCalibration(deviceId, offset)
      })
    }

  }

  // キャリブレーション状態のリセット
  reset(): void {
    this.hearingThresholds.clear()
    this.deviceCalibration.clear()
    this.config = { ...DEFAULT_CALIBRATION }
  }
}

// グローバルキャリブレーションマネージャー
export const calibrationManager = new AudioCalibrationManager()

// 便利な関数群
export function setHearingThreshold(frequency: number, thresholdDbSpl: number, confidence?: number): void {
  calibrationManager.setHearingThreshold(frequency, thresholdDbSpl, confidence)
}

export function getTestVolume(frequency: number) {
  return calibrationManager.calculateTestVolume(frequency)
}

export function getHearingThreshold(frequency: number): HearingThreshold | null {
  return calibrationManager.getHearingThreshold(frequency)
}

export function getAllHearingThresholds(): HearingThreshold[] {
  return calibrationManager.getAllHearingThresholds()
}

export function checkVolumeSafety(dbSpl: number) {
  return calibrationManager.checkVolumeSafety(dbSpl)
}

// H-BAT特化の便利関数
export function setupHBatCalibration(thresholds: { frequency: number; threshold: number }[]): void {
  thresholds.forEach(({ frequency, threshold }) => {
    setHearingThreshold(frequency, threshold, 1.0)
  })
}

export function getHBatTestVolumes(): {
  bst: ReturnType<typeof getTestVolume>
  bit: ReturnType<typeof getTestVolume>
  bfit: ReturnType<typeof getTestVolume>
} {
  // H-BATでは通常1kHzの聴力閾値を基準として使用
  const baseFrequency = 1000
  const testVolume = getTestVolume(baseFrequency)

  return {
    bst: testVolume,   // BST: 1kHz基準
    bit: testVolume,   // BIT: 1kHz基準
    bfit: testVolume   // BFIT: 1kHz基準
  }
} 