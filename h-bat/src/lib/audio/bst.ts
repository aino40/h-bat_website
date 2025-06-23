'use client'

import * as Tone from 'tone'

// BST設定
export interface BSTConfig {
  bpm: number // テンポ（BPM）
  loopDuration: number // ループ時間（秒）
  patternType: '2beat' | '3beat' // 拍子パターン
  strongBeatLevel: number // 強拍音圧レベル（dB SPL）
  volumeDifference: number // 強拍と弱拍の音量差（dB）
  fadeTime: number // 立ち上がり/立ち下がり時間（ms）
}

// デフォルトBST設定
export const DEFAULT_BST_CONFIG: BSTConfig = {
  bpm: 120,
  loopDuration: 6, // 6秒間
  patternType: '2beat',
  strongBeatLevel: 70, // 聴力閾値+30dBで設定される
  volumeDifference: 20, // 初期値20dB
  fadeTime: 50
}

// 拍子パターンの定義
export type BeatPattern = {
  pattern: ('strong' | 'weak')[]
  description: string
}

// 2拍子と3拍子のパターン
export const BEAT_PATTERNS: Record<'2beat' | '3beat', BeatPattern> = {
  '2beat': {
    pattern: ['strong', 'weak'], // 強-弱
    description: '2拍子（強-弱）'
  },
  '3beat': {
    pattern: ['strong', 'weak', 'weak'], // 強-弱-弱
    description: '3拍子（強-弱-弱）'
  }
}

// BST音響ジェネレータークラス
export class BSTAudioGenerator {
  private snarePlayer: Tone.Player | null = null
  private part: Tone.Part | null = null
  private isLoaded: boolean = false
  private config: BSTConfig
  private currentPattern: BeatPattern | null = null

  constructor(config: Partial<BSTConfig> = {}) {
    this.config = { ...DEFAULT_BST_CONFIG, ...config }
  }

  // 初期化
  async initialize(): Promise<void> {
    try {
      // Tone.jsコンテキスト開始
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }

      // Snareサンプルロード
      this.snarePlayer = new Tone.Player({
        url: '/audio/snare.wav',
        volume: this.dbToGain(this.config.strongBeatLevel),
        fadeIn: this.config.fadeTime / 1000,
        fadeOut: this.config.fadeTime / 1000
      }).toDestination()

      // ロード完了を待機
      await Tone.loaded()
      this.isLoaded = true

      // テンポ設定
      Tone.Transport.bpm.value = this.config.bpm

    } catch (error) {
      console.error('BST audio initialization failed:', error)
      throw new Error('Failed to initialize BST audio system')
    }
  }

  // 拍子パターン設定
  setPattern(patternType: '2beat' | '3beat'): void {
    this.currentPattern = BEAT_PATTERNS[patternType]
    this.config.patternType = patternType
  }

  // 音量差設定
  setVolumeDifference(volumeDifference: number): void {
    this.config.volumeDifference = volumeDifference
  }

  // 強拍レベル設定（聴力閾値+30dB）
  setStrongBeatLevel(level: number): void {
    this.config.strongBeatLevel = level
  }

  // 4-beatパターン生成・再生
  async playPattern(): Promise<void> {
    if (!this.isLoaded || !this.snarePlayer || !this.currentPattern) {
      throw new Error('BST audio not initialized or pattern not set')
    }

    try {
      // 既存のパートを停止・削除
      this.stopPattern()

      // 4-beatパターンの生成
      const events = this.generateBeatEvents()

      // Tone.Partでパターン再生
      this.part = new Tone.Part((time, event) => {
        // 音量設定
        const volume = this.calculateBeatVolume(event.beatType)
        this.snarePlayer!.volume.setValueAtTime(volume, time)
        
        // 音再生
        this.snarePlayer!.start(time)
      }, events)

      // ループ設定
      this.part.loop = true
      this.part.loopEnd = `${this.config.loopDuration}s`

      // 再生開始
      this.part.start(0)
      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start()
      }

    } catch (error) {
      console.error('BST pattern playback failed:', error)
      throw new Error('Failed to play BST pattern')
    }
  }

  // パターン停止
  stopPattern(): void {
    if (this.part) {
      this.part.stop()
      this.part.dispose()
      this.part = null
    }
    
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop()
    }
  }

  // 4-beatイベント生成
  private generateBeatEvents(): Array<{ time: string; beatType: 'strong' | 'weak' }> {
    if (!this.currentPattern) {
      throw new Error('No pattern set')
    }

    const events: Array<{ time: string; beatType: 'strong' | 'weak' }> = []
    const pattern = this.currentPattern.pattern
    const beatDuration = 60 / this.config.bpm // 1拍の長さ（秒）
    
    // 6秒間のループで必要な拍数を計算
    const totalBeats = Math.ceil(this.config.loopDuration / beatDuration)
    
    for (let i = 0; i < totalBeats; i++) {
      const patternIndex = i % pattern.length
      const beatType = pattern[patternIndex]!
      const time = (i * beatDuration).toFixed(3)
      
      events.push({
        time: `${time}s`,
        beatType
      })
    }

    return events
  }

  // 拍の音量計算
  private calculateBeatVolume(beatType: 'strong' | 'weak'): number {
    const strongLevel = this.config.strongBeatLevel
    const weakLevel = strongLevel - this.config.volumeDifference
    
    const targetLevel = beatType === 'strong' ? strongLevel : weakLevel
    return this.dbToGain(targetLevel)
  }

  // dB SPLからGain値に変換
  private dbToGain(dbLevel: number): number {
    // 基準レベル（70dB SPL）を0dBとして相対的に計算
    const referenceDb = 70
    const relativeDb = dbLevel - referenceDb
    return relativeDb
  }

  // ランダムパターン生成
  generateRandomPattern(): '2beat' | '3beat' {
    return Math.random() < 0.5 ? '2beat' : '3beat'
  }

  // 設定取得
  getConfig(): BSTConfig {
    return { ...this.config }
  }

  // 現在のパターン取得
  getCurrentPattern(): BeatPattern | null {
    return this.currentPattern
  }

  // リソース解放
  dispose(): void {
    this.stopPattern()
    
    if (this.snarePlayer) {
      this.snarePlayer.dispose()
      this.snarePlayer = null
    }
    
    this.isLoaded = false
  }
}

// BST用ユーティリティ関数

// 音量差をdBからリニア比に変換
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

// リニア比をdBに変換
export function linearToDb(linear: number): number {
  return 20 * Math.log10(linear)
}

// 拍子判定の正解チェック
export function checkBeatAnswer(
  actualPattern: '2beat' | '3beat',
  userAnswer: '2beat' | '3beat'
): boolean {
  return actualPattern === userAnswer
}

// BST結果計算
export function calculateBSTThreshold(
  reversalPoints: number[],
  method: 'mean' | 'median' = 'mean'
): {
  threshold: number
  confidence: number
} {
  if (reversalPoints.length < 6) {
    throw new Error('Insufficient reversal points for threshold calculation')
  }

  // 最後の6回の反転点を使用
  const lastSixReversals = reversalPoints.slice(-6)
  
  let threshold: number
  
  if (method === 'mean') {
    threshold = lastSixReversals.reduce((sum, val) => sum + val, 0) / lastSixReversals.length
  } else {
    const sorted = [...lastSixReversals].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    threshold = sorted.length % 2 === 0 
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!
  }

  // 信頼度計算（変動係数の逆数）
  const mean = threshold
  const variance = lastSixReversals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / lastSixReversals.length
  const standardDeviation = Math.sqrt(variance)
  const coefficientOfVariation = standardDeviation / mean
  const confidence = Math.max(0, Math.min(1, 1 - coefficientOfVariation))

  return {
    threshold: Math.round(threshold * 100) / 100, // 小数点2桁
    confidence: Math.round(confidence * 100) / 100
  }
}

// BST進捗計算
export function calculateBSTProgress(
  trialsCompleted: number,
  reversalsCount: number,
  targetReversals: number = 6
): {
  trialProgress: number
  reversalProgress: number
  overallProgress: number
  isNearCompletion: boolean
} {
  const maxTrials = 30 // 最大試行数
  
  const trialProgress = Math.min(trialsCompleted / maxTrials, 1) * 100
  const reversalProgress = Math.min(reversalsCount / targetReversals, 1) * 100
  const overallProgress = Math.max(trialProgress, reversalProgress)
  const isNearCompletion = reversalsCount >= targetReversals - 2

  return {
    trialProgress: Math.round(trialProgress),
    reversalProgress: Math.round(reversalProgress),
    overallProgress: Math.round(overallProgress),
    isNearCompletion
  }
} 