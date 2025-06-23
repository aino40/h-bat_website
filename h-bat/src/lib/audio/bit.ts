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
  private kickSampler: Tone.Sampler | null = null
  private snareSampler: Tone.Sampler | null = null
  private part: Tone.Part | null = null
  private isInitialized = false
  private config: BITConfig
  private currentIOISequence: number[] = []

  constructor(config: Partial<BITConfig> = {}) {
    this.config = { ...DEFAULT_BIT_CONFIG, ...config }
  }

  // 初期化
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Tone.js開始
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }

      // サンプラー初期化
      this.kickSampler = new Tone.Sampler({
        urls: {
          C3: '/audio/kick.wav'
        },
        volume: this.dbToGain(this.config.soundLevel)
      }).toDestination()

      this.snareSampler = new Tone.Sampler({
        urls: {
          C3: '/audio/snare.wav'
        },
        volume: this.dbToGain(this.config.soundLevel)
      }).toDestination()

      // サンプルロード待機
      await Promise.all([
        new Promise<void>(resolve => {
          const checkKickLoaded = () => {
            if (this.kickSampler!.loaded) {
              resolve()
            } else {
              setTimeout(checkKickLoaded, 100)
            }
          }
          checkKickLoaded()
        }),
        new Promise<void>(resolve => {
          const checkSnareLoaded = () => {
            if (this.snareSampler!.loaded) {
              resolve()
            } else {
              setTimeout(checkSnareLoaded, 100)
            }
          }
          checkSnareLoaded()
        })
      ])

      this.isInitialized = true
    } catch (error) {
      console.error('BIT audio initialization failed:', error)
      throw new Error('Failed to initialize BIT audio system')
    }
  }

  // dBからゲインへの変換
  private dbToGain(db: number): number {
    return Math.pow(10, db / 20)
  }

  // BITパターン設定
  setConfig(config: Partial<BITConfig>): void {
    this.config = { ...this.config, ...config }
    this.updateSoundLevel()
  }

  // 音圧レベル更新
  private updateSoundLevel(): void {
    if (this.kickSampler) {
      this.kickSampler.volume.value = this.dbToGain(this.config.soundLevel)
    }
    if (this.snareSampler) {
      this.snareSampler.volume.value = this.dbToGain(this.config.soundLevel)
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
    if (!this.isInitialized || !this.kickSampler || !this.snareSampler) {
      throw new Error('BIT audio generator not initialized')
    }

    // 既存のパートを停止・破棄
    if (this.part) {
      this.part.stop()
      this.part.dispose()
    }

    // IOIシーケンス生成
    const ioiSequence = this.generateIOISequence()
    
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
      // キックとスネアを交互に再生
      const sampler = event.index % 2 === 0 ? this.kickSampler : this.snareSampler
      sampler?.triggerAttackRelease('C3', '8n', time)
    }, events)

    // 再生開始
    this.part.start('+0.1')
    Tone.Transport.start()

    // 指定時間後に自動停止
    setTimeout(() => {
      this.stopPattern()
    }, this.config.duration * 1000)
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
    
    if (this.kickSampler) {
      this.kickSampler.dispose()
      this.kickSampler = null
    }
    if (this.snareSampler) {
      this.snareSampler.dispose()
      this.snareSampler = null
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