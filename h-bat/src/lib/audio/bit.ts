'use client'

import * as Tone from 'tone'

// BIT設定インターフェース
export interface BITConfig {
  baseTempo: number // 基準テンポ (BPM)
  baseIOI: number // 基準IOI (ms)
  slopeK: number // IOI変化率 k (ms/beat)
  direction: 'accelerando' | 'ritardando' // テンポ方向
  duration: number // 再生時間 (秒)
  numBeats: number // 拍数
  soundLevel: number // 音圧レベル (dB SPL)
}

// デフォルトBIT設定
export const DEFAULT_BIT_CONFIG: BITConfig = {
  baseTempo: 120, // BPM
  baseIOI: 500, // ms (120 BPMに相当)
  slopeK: 5, // ms/beat (初期値)
  direction: 'accelerando',
  duration: 6, // 6秒間
  numBeats: 12, // 12拍
  soundLevel: 70 // dB SPL
}

// IOI計算関数: IOI_n = IOI_0 ± k * n
export function calculateIOI(
  baseIOI: number,
  slopeK: number,
  beatIndex: number,
  direction: 'accelerando' | 'ritardando'
): number {
  const sign = direction === 'accelerando' ? -1 : 1 // 加速は負の傾き
  return Math.max(100, baseIOI + sign * slopeK * beatIndex) // 最小IOI 100ms
}

// テンポ変化パターン生成
export function generateIOISequence(config: BITConfig): number[] {
  const sequence: number[] = []
  
  for (let i = 0; i < config.numBeats; i++) {
    const ioi = calculateIOI(
      config.baseIOI,
      config.slopeK,
      i,
      config.direction
    )
    sequence.push(ioi)
  }
  
  return sequence
}

// BPMからIOIへの変換
export function bpmToIOI(bpm: number): number {
  return (60 * 1000) / bpm // ms
}

// IOIからBPMへの変換
export function ioiToBPM(ioi: number): number {
  return (60 * 1000) / ioi
}

// テンポ方向の判定
export function detectTempoDirection(ioiSequence: number[]): 'accelerando' | 'ritardando' | 'steady' {
  if (ioiSequence.length < 2) return 'steady'
  
  const firstIOI = ioiSequence[0]!
  const lastIOI = ioiSequence[ioiSequence.length - 1]!
  
  const threshold = 10 // ms
  
  if (lastIOI < firstIOI - threshold) {
    return 'accelerando'
  } else if (lastIOI > firstIOI + threshold) {
    return 'ritardando'
  } else {
    return 'steady'
  }
}

// BIT音源生成クラス
export class BITAudioGenerator {
  private kickSynth: Tone.MembraneSynth | null = null
  private snareSynth: Tone.NoiseSynth | null = null
  private part: Tone.Part | null = null
  private isInitialized = false
  private config: BITConfig
  private currentIOISequence: number[] = []

  constructor(config: Partial<BITConfig> = {}) {
    this.config = { ...DEFAULT_BIT_CONFIG, ...config }
    console.log('BIT: AudioGenerator created with config:', this.config)
  }

  // 初期化
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('BIT: Already initialized, skipping')
      return
    }

    try {
      console.log('BIT: Starting audio initialization...')
      
      // Tone.js開始
      if (Tone.context.state !== 'running') {
        console.log('BIT: Starting Tone.js context...')
        await Tone.start()
        console.log('BIT: Tone.js context started')
      }

      // 既存の音源を破棄
      if (this.kickSynth) {
        console.log('BIT: Disposing existing kick synth')
        this.kickSynth.dispose()
        this.kickSynth = null
      }
      if (this.snareSynth) {
        console.log('BIT: Disposing existing snare synth')
        this.snareSynth.dispose()
        this.snareSynth = null
      }

      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 50))

      // 合成音源初期化
      console.log('BIT: Creating kick synth...')
      this.kickSynth = new Tone.MembraneSynth({
        envelope: {
          attack: 0.001,
          decay: 0.3,
          sustain: 0,
          release: 0.3
        },
        volume: this.dbToGain(this.config.soundLevel)
      }).toDestination()

      console.log('BIT: Creating snare synth...')
      this.snareSynth = new Tone.NoiseSynth({
        noise: {
          type: 'white'
        },
        envelope: {
          attack: 0.001,
          decay: 0.2,
          sustain: 0,
          release: 0.2
        },
        volume: this.dbToGain(this.config.soundLevel)
      }).toDestination()

      // 初期化完了
      this.isInitialized = true
      console.log('BIT: Audio system initialized successfully')
    } catch (error) {
      console.error('BIT: Audio initialization failed:', error)
      this.isInitialized = false
      
      // リソースクリーンアップ
      if (this.kickSynth) {
        this.kickSynth.dispose()
        this.kickSynth = null
      }
      if (this.snareSynth) {
        this.snareSynth.dispose()
        this.snareSynth = null
      }
      
      throw new Error(`BIT audio initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // dBからゲインへの変換（適切な範囲に調整）
  private dbToGain(db: number): number {
    // dB SPLを適切な音量レベルに変換（-40～0dBの範囲）
    const normalizedDb = Math.max(-40, Math.min(0, db - 70))
    return Math.pow(10, normalizedDb / 20)
  }

  // BITパターン設定
  setConfig(config: Partial<BITConfig>): void {
    this.config = { ...this.config, ...config }
    this.updateSoundLevel()
  }

  // 音圧レベル更新
  private updateSoundLevel(): void {
    if (this.kickSynth) {
      this.kickSynth.volume.value = this.dbToGain(this.config.soundLevel)
    }
    if (this.snareSynth) {
      this.snareSynth.volume.value = this.dbToGain(this.config.soundLevel)
    }
  }

  // 傾きK設定
  setSlopeK(k: number): void {
    this.config.slopeK = Math.max(0.1, Math.min(50, k)) // 0.1-50ms/beat範囲
  }

  // テンポ方向設定
  setDirection(direction: 'accelerando' | 'ritardando'): void {
    this.config.direction = direction
  }

  // 音圧レベル設定
  setSoundLevel(level: number): void {
    this.config.soundLevel = level
    this.updateSoundLevel()
  }

  // IOIシーケンス生成
  generateIOISequence(): number[] {
    this.currentIOISequence = generateIOISequence(this.config)
    return this.currentIOISequence
  }

  // ランダム方向生成
  generateRandomDirection(): 'accelerando' | 'ritardando' {
    return Math.random() < 0.5 ? 'accelerando' : 'ritardando'
  }

  // BITパターン再生
  async playPattern(): Promise<void> {
    if (!this.isInitialized || !this.kickSynth || !this.snareSynth) {
      console.error('BIT audio generator not initialized', {
        isInitialized: this.isInitialized,
        kickSynth: !!this.kickSynth,
        snareSynth: !!this.snareSynth
      })
      throw new Error('BIT audio generator not initialized')
    }

    try {
      // 既存のパートを停止・破棄
      if (this.part) {
        this.part.stop()
        this.part.dispose()
        this.part = null
      }

      // Tone.js コンテキストの確認
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }

      // IOIシーケンス生成
      const ioiSequence = this.generateIOISequence()
      console.log('BIT: Generated IOI sequence:', ioiSequence)
      
      // パート作成
      const events: Array<{ time: string; ioi: number; index: number }> = []
      let cumulativeTime = 0

      for (let i = 0; i < ioiSequence.length; i++) {
        events.push({
          time: `+${cumulativeTime / 1000}`, // 秒に変換
          ioi: ioiSequence[i]!,
          index: i
        })
        cumulativeTime += ioiSequence[i]!
      }

      this.part = new Tone.Part((time, event) => {
        try {
          // キックとスネアを交互に再生
          if (event.index % 2 === 0) {
            this.kickSynth?.triggerAttackRelease('C2', '8n', time)
          } else {
            this.snareSynth?.triggerAttackRelease('8n', time)
          }
        } catch (error) {
          console.error('BIT: Error during sound playback:', error)
        }
      }, events)

      // 再生開始
      this.part.start('+0.1')
      Tone.Transport.start()

      console.log('BIT: Pattern playback started')

      // 指定時間後に自動停止
      setTimeout(() => {
        this.stopPattern()
      }, this.config.duration * 1000)
    } catch (error) {
      console.error('BIT: Error in playPattern:', error)
      throw new Error(`Failed to play BIT pattern: ${error}`)
    }
  }

  // パターン停止
  stopPattern(): void {
    if (this.part) {
      this.part.stop()
      this.part.dispose()
      this.part = null
    }
    Tone.Transport.stop()
  }

  // 現在の設定取得
  getCurrentConfig(): BITConfig {
    return { ...this.config }
  }

  // 現在のIOIシーケンス取得
  getCurrentIOISequence(): number[] {
    return [...this.currentIOISequence]
  }

  // リソース解放
  dispose(): void {
    this.stopPattern()
    
    if (this.kickSynth) {
      this.kickSynth.dispose()
      this.kickSynth = null
    }
    if (this.snareSynth) {
      this.snareSynth.dispose()
      this.snareSynth = null
    }
    
    this.isInitialized = false
  }
}

// BIT回答チェック関数
export function checkBITAnswer(
  actualDirection: 'accelerando' | 'ritardando',
  userAnswer: 'accelerando' | 'ritardando'
): boolean {
  return actualDirection === userAnswer
}

// BIT進捗計算
export function calculateBITProgress(
  trialsCompleted: number,
  reversalsCount: number,
  targetReversals: number
): {
  trialProgress: number
  reversalProgress: number
  overallProgress: number
  isNearCompletion: boolean
} {
  const reversalProgress = Math.min((reversalsCount / targetReversals) * 100, 100)
  const trialProgress = Math.min((trialsCompleted / 30) * 100, 100) // 最大30試行想定
  const overallProgress = (reversalProgress * 0.7) + (trialProgress * 0.3)
  const isNearCompletion = reversalsCount >= targetReversals - 1

  return {
    trialProgress,
    reversalProgress,
    overallProgress,
    isNearCompletion
  }
}

// BIT閾値品質評価
export function evaluateBITQuality(
  threshold: number,
  confidence: number,
  accuracy: number
): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  score: number
  feedback: string
} {
  // スコア計算（信頼度50% + 精度30% + 閾値20%）
  const confidenceScore = confidence * 50
  const accuracyScore = accuracy * 30
  const thresholdScore = Math.max(0, (20 - threshold) / 20) * 20 // 閾値が低いほど高得点
  
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