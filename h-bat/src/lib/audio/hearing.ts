'use client'

import * as Tone from 'tone'

// 聴力測定用の周波数設定
export const HEARING_FREQUENCIES = [1000, 2000, 4000] as const
export type HearingFrequency = typeof HEARING_FREQUENCIES[number]

// 聴力測定設定
export interface HearingTestConfig {
  frequency: HearingFrequency
  duration: number // ミリ秒
  fadeTime: number // 立ち上がり/立ち下がり時間（ミリ秒）
  minLevel: number // 最小音圧レベル（dB SPL）
  maxLevel: number // 最大音圧レベル（dB SPL）
  initialLevel: number // 初期音圧レベル（dB SPL）
}

// デフォルト設定
export const DEFAULT_HEARING_CONFIG: HearingTestConfig = {
  frequency: 1000,
  duration: 500,
  fadeTime: 50,
  minLevel: 0,
  maxLevel: 80,
  initialLevel: 40
}

// 純音ジェネレータークラス
export class PureToneGenerator {
  private oscillator: Tone.Oscillator | null = null
  private gainNode: Tone.Gain | null = null
  private envelope: Tone.AmplitudeEnvelope | null = null
  private isInitialized = false
  private currentLevel = 0 // dB SPL

  constructor(private config: HearingTestConfig = DEFAULT_HEARING_CONFIG) {}

  // 初期化
  async initialize(): Promise<void> {
    try {
      // Tone.jsコンテキストの開始
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }

      // オシレーター作成
      this.oscillator = new Tone.Oscillator({
        frequency: this.config.frequency,
        type: 'sine'
      })

      // ゲインノード作成（音量制御用）
      this.gainNode = new Tone.Gain(0)

      // エンベロープ作成（立ち上がり/立ち下がり制御）
      this.envelope = new Tone.AmplitudeEnvelope({
        attack: this.config.fadeTime / 1000,
        decay: 0,
        sustain: 1,
        release: this.config.fadeTime / 1000
      })

      // 接続: Oscillator -> Envelope -> Gain -> Destination
      this.oscillator.connect(this.envelope)
      this.envelope.connect(this.gainNode)
      this.gainNode.toDestination()

      this.isInitialized = true
    } catch (error) {
      console.error('PureToneGenerator initialization failed:', error)
      throw new Error(`Failed to initialize pure tone generator: ${error}`)
    }
  }

  // 周波数設定
  setFrequency(frequency: HearingFrequency): void {
    if (!this.oscillator) {
      throw new Error('Generator not initialized')
    }
    this.oscillator.frequency.value = frequency
    this.config.frequency = frequency
  }

  // 音圧レベル設定（dB SPL）
  setLevel(dbSPL: number): void {
    if (!this.gainNode) {
      throw new Error('Generator not initialized')
    }

    // dB SPLを線形ゲインに変換
    // 基準: 0 dB SPL = -60 dB gain, 80 dB SPL = 0 dB gain
    const clampedLevel = Math.max(this.config.minLevel, Math.min(this.config.maxLevel, dbSPL))
    const normalizedLevel = clampedLevel / this.config.maxLevel // 0-1
    const gainDb = (normalizedLevel - 1) * 60 // -60 to 0 dB
    const linearGain = Tone.dbToGain(gainDb)

    this.gainNode.gain.value = linearGain
    this.currentLevel = clampedLevel
  }

  // 純音再生
  async playTone(dbSPL?: number): Promise<void> {
    if (!this.isInitialized || !this.oscillator || !this.envelope) {
      throw new Error('Generator not initialized')
    }

    try {
      // 音圧レベル設定
      if (dbSPL !== undefined) {
        this.setLevel(dbSPL)
      }

      // オシレーター開始（まだ聞こえない）
      if (this.oscillator.state === 'stopped') {
        this.oscillator.start()
      }

      // エンベロープトリガー（音が聞こえ始める）
      this.envelope.triggerAttackRelease(this.config.duration / 1000)

      // 再生完了まで待機
      await new Promise(resolve => {
        setTimeout(resolve, this.config.duration + this.config.fadeTime)
      })

    } catch (error) {
      console.error('Pure tone playback failed:', error)
      throw new Error(`Failed to play pure tone: ${error}`)
    }
  }

  // 再生停止
  stop(): void {
    if (this.envelope) {
      this.envelope.triggerRelease()
    }
  }

  // リソース解放
  dispose(): void {
    if (this.oscillator) {
      this.oscillator.dispose()
      this.oscillator = null
    }
    if (this.gainNode) {
      this.gainNode.dispose()
      this.gainNode = null
    }
    if (this.envelope) {
      this.envelope.dispose()
      this.envelope = null
    }
    this.isInitialized = false
  }

  // 現在の設定取得
  getCurrentLevel(): number {
    return this.currentLevel
  }

  getFrequency(): HearingFrequency {
    return this.config.frequency
  }

  isReady(): boolean {
    return this.isInitialized
  }
}

// 聴力測定コントローラー
export class HearingTestController {
  private generators: Map<HearingFrequency, PureToneGenerator> = new Map()
  private currentFrequency: HearingFrequency = 1000
  private isInitialized = false

  constructor(private config: Partial<HearingTestConfig> = {}) {}

  // 初期化
  async initialize(): Promise<void> {
    try {
      // 各周波数のジェネレーターを作成
      for (const frequency of HEARING_FREQUENCIES) {
        const generatorConfig = { ...DEFAULT_HEARING_CONFIG, ...this.config, frequency }
        const generator = new PureToneGenerator(generatorConfig)
        await generator.initialize()
        this.generators.set(frequency, generator)
      }

      this.isInitialized = true
    } catch (error) {
      console.error('HearingTestController initialization failed:', error)
      throw new Error(`Failed to initialize hearing test controller: ${error}`)
    }
  }

  // 周波数切り替え
  setFrequency(frequency: HearingFrequency): void {
    if (!this.generators.has(frequency)) {
      throw new Error(`Frequency ${frequency} Hz not supported`)
    }
    this.currentFrequency = frequency
  }

  // 純音再生
  async playTone(dbSPL: number): Promise<void> {
    const generator = this.generators.get(this.currentFrequency)
    if (!generator) {
      throw new Error(`Generator for ${this.currentFrequency} Hz not found`)
    }

    await generator.playTone(dbSPL)
  }

  // 再生停止
  stop(): void {
    const generator = this.generators.get(this.currentFrequency)
    if (generator) {
      generator.stop()
    }
  }

  // 全ジェネレーター停止
  stopAll(): void {
    this.generators.forEach(generator => generator.stop())
  }

  // リソース解放
  dispose(): void {
    this.generators.forEach(generator => generator.dispose())
    this.generators.clear()
    this.isInitialized = false
  }

  // 現在の状態取得
  getCurrentFrequency(): HearingFrequency {
    return this.currentFrequency
  }

  getCurrentLevel(): number {
    const generator = this.generators.get(this.currentFrequency)
    return generator?.getCurrentLevel() || 0
  }

  isReady(): boolean {
    return this.isInitialized && this.generators.size === HEARING_FREQUENCIES.length
  }

  // サポートされている周波数一覧
  getSupportedFrequencies(): readonly HearingFrequency[] {
    return HEARING_FREQUENCIES
  }
}

// ファクトリー関数
export function createHearingTestController(config?: Partial<HearingTestConfig>): HearingTestController {
  return new HearingTestController(config)
}

// ユーティリティ関数
export function dbSPLToGain(dbSPL: number, maxLevel = 80): number {
  const normalizedLevel = Math.max(0, Math.min(1, dbSPL / maxLevel))
  const gainDb = (normalizedLevel - 1) * 60 // -60 to 0 dB
  return Tone.dbToGain(gainDb)
}

export function gainToDbSPL(gain: number, maxLevel = 80): number {
  const gainDb = Tone.gainToDb(gain)
  const normalizedLevel = (gainDb + 60) / 60 // 0 to 1
  return normalizedLevel * maxLevel
}

// 聴力測定用設定プリセット
export const HEARING_TEST_PRESETS = {
  clinical: {
    duration: 1000,
    fadeTime: 100,
    minLevel: 0,
    maxLevel: 80,
    initialLevel: 40
  },
  research: {
    duration: 500,
    fadeTime: 50,
    minLevel: 0,
    maxLevel: 80,
    initialLevel: 40
  },
  screening: {
    duration: 750,
    fadeTime: 75,
    minLevel: 10,
    maxLevel: 70,
    initialLevel: 35
  }
} as const 