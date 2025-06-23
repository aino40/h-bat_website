'use client'

import * as Tone from 'tone'

// BFIT設定インターフェース
export interface BFITConfig {
  sessionId: string
  profileId: string
  hearingThreshold: number // 平均聴力閾値 (dB SPL)
  baseTempo: number // 基準テンポ (BPM)
  patternDuration: number // パターン再生時間 (秒)
  repetitions: number // パターン反復回数
  onTrialComplete?: (trial: BFITTrialData) => void
  onTestComplete?: (result: BFITResult) => void
  onError?: (error: Error) => void
}

// BFIT試行データ
export interface BFITTrialData {
  trialIndex: number
  patternId: string
  slopeK: number // IOI変化率 (ms/beat)
  direction: 'accelerando' | 'ritardando'
  userAnswer: 'accelerando' | 'ritardando'
  correct: boolean
  reactionTime?: number
  ioiSequence: number[]
  patternNotes: BFITNote[]
  soundLevel: number
  timestamp: Date
}

// BFIT結果データ
export interface BFITResult {
  slopeThreshold: number
  totalTrials: number
  accuracy: number
  reactionTimes: number[]
  duration: number
}

// BFIT音符データ
export interface BFITNote {
  time: string // Tone.js時間表記 (e.g., "0:0:0")
  duration: string // 音符の長さ (e.g., "4n", "8n", "4n.")
  velocity: number // 音量 (0-1)
}

// 不等間隔8音符パターン: [♩ ♪♪♩. ♪ | ♩ ♪♪♩. ♪]
export const BFIT_RHYTHM_PATTERN: BFITNote[] = [
  // 1小節目: ♩ ♪♪♩. ♪
  { time: "0:0:0", duration: "4n", velocity: 1.0 },      // ♩ (4分音符)
  { time: "0:1:0", duration: "8n", velocity: 0.8 },      // ♪ (8分音符)
  { time: "0:1:2", duration: "8n", velocity: 0.8 },      // ♪ (8分音符)
  { time: "0:2:0", duration: "4n.", velocity: 1.0 },     // ♩. (付点4分音符)
  { time: "0:3:2", duration: "8n", velocity: 0.8 },      // ♪ (8分音符)
  
  // 2小節目: ♩ ♪♪♩. ♪
  { time: "1:0:0", duration: "4n", velocity: 1.0 },      // ♩ (4分音符)
  { time: "1:1:0", duration: "8n", velocity: 0.8 },      // ♪ (8分音符)
  { time: "1:1:2", duration: "8n", velocity: 0.8 },      // ♪ (8分音符)
  { time: "1:2:0", duration: "4n.", velocity: 1.0 },     // ♩. (付点4分音符)
  { time: "1:3:2", duration: "8n", velocity: 0.8 },      // ♪ (8分音符)
]

// IOI計算関数: IOI_n = IOI_0 ± k × n
export function calculateIOISequence(
  baseIOI: number, // 基準IOI (ms)
  slopeK: number, // 変化率 (ms/beat)
  direction: 'accelerando' | 'ritardando',
  noteCount: number
): number[] {
  const sequence: number[] = []
  const sign = direction === 'accelerando' ? -1 : 1 // 加速は負の勾配
  
  for (let n = 0; n < noteCount; n++) {
    const ioi = baseIOI + (sign * slopeK * n)
    // IOIが極端に小さくならないよう制限
    sequence.push(Math.max(ioi, baseIOI * 0.5))
  }
  
  return sequence
}

// パターンIDからリズムパターンを取得
export function getRhythmPattern(patternId: string): BFITNote[] {
  // 現在は1つのパターンのみサポート
  return BFIT_RHYTHM_PATTERN
}

// テンポからIOIを計算
export function tempoToIOI(bpm: number): number {
  return (60 / bpm) * 1000 // ms
}

// IOIからテンポを計算
export function ioiToTempo(ioi: number): number {
  return (60 * 1000) / ioi // BPM
}

// BFIT音響生成クラス
export class BFITAudioGenerator {
  private sampler: Tone.Sampler | null = null
  private part: Tone.Part | null = null
  private isInitialized = false
  private config: BFITConfig
  private currentPattern: BFITNote[] = []
  private currentIOISequence: number[] = []

  constructor(config: BFITConfig) {
    this.config = config
  }

  // 初期化
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Tone.jsコンテキスト開始
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }

      // Snareサンプラー作成（BFITはSnareのみ使用）
      this.sampler = new Tone.Sampler({
        urls: {
          'C4': '/audio/snare.wav'
        },
        baseUrl: '',
        onload: () => {
          console.log('BFIT: Snare sample loaded')
        }
      }).toDestination()

      // サンプル読み込み完了を待機
      await this.waitForSamplerLoad()

      // 音量設定（聴力閾値+30dB）
      const targetLevel = this.config.hearingThreshold + 30
      this.sampler.volume.value = this.dbToGain(targetLevel)

      this.isInitialized = true
      console.log('BFIT: Audio generator initialized')
    } catch (error) {
      console.error('BFIT: Failed to initialize audio generator:', error)
      throw error
    }
  }

  // サンプラー読み込み完了を待機
  private async waitForSamplerLoad(): Promise<void> {
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (this.sampler?.loaded) {
          resolve()
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
    })
  }

  // dBからゲインに変換
  private dbToGain(db: number): number {
    return Math.pow(10, db / 20)
  }

  // 複雑リズムパターンを生成
  generatePattern(
    slopeK: number,
    direction: 'accelerando' | 'ritardando',
    patternId: string = 'default'
  ): { pattern: BFITNote[], ioiSequence: number[] } {
    const pattern = getRhythmPattern(patternId)
    const baseIOI = tempoToIOI(this.config.baseTempo)
    const ioiSequence = calculateIOISequence(baseIOI, slopeK, direction, pattern.length)

    // IOI変化を適用したパターンを生成
    const modifiedPattern = this.applyIOIChanges(pattern, ioiSequence)

    this.currentPattern = modifiedPattern
    this.currentIOISequence = ioiSequence

    return { pattern: modifiedPattern, ioiSequence }
  }

  // IOI変化をパターンに適用
  private applyIOIChanges(pattern: BFITNote[], ioiSequence: number[]): BFITNote[] {
    const modifiedPattern: BFITNote[] = []
    let cumulativeTime = 0

    for (let i = 0; i < pattern.length; i++) {
      const note = pattern[i]
      if (!note) continue
      
      const ioi = ioiSequence[i] || ioiSequence[ioiSequence.length - 1] || 500

      // 累積時間を計算
      const timeInSeconds = cumulativeTime / 1000
      const bars = Math.floor(timeInSeconds / (4 * 60 / this.config.baseTempo))
      const beats = Math.floor((timeInSeconds % (4 * 60 / this.config.baseTempo)) / (60 / this.config.baseTempo))
      const sixteenths = Math.floor(((timeInSeconds % (60 / this.config.baseTempo)) / (60 / this.config.baseTempo)) * 4)

      modifiedPattern.push({
        time: `${bars}:${beats}:${sixteenths}`,
        duration: note.duration,
        velocity: note.velocity
      })

      cumulativeTime += ioi
    }

    return modifiedPattern
  }

  // パターンを再生
  async playPattern(): Promise<void> {
    if (!this.isInitialized || !this.sampler) {
      throw new Error('BFIT: Audio generator not initialized')
    }

    try {
      // 既存のパートを停止・削除
      if (this.part) {
        this.part.stop()
        this.part.dispose()
      }

      // 新しいパートを作成
      this.part = new Tone.Part((time, note: BFITNote) => {
        if (this.sampler) {
          this.sampler.triggerAttackRelease('C4', note.duration, time, note.velocity)
        }
      }, this.currentPattern)

      // パターンをループ設定
      this.part.loop = true
      this.part.loopEnd = `${this.config.repetitions * 2}:0:0` // 2小節 × 反復回数

      // Transport設定
      Tone.Transport.bpm.value = this.config.baseTempo

      // 再生開始
      this.part.start(0)
      Tone.Transport.start()

      console.log('BFIT: Pattern playback started')
    } catch (error) {
      console.error('BFIT: Failed to play pattern:', error)
      throw error
    }
  }

  // 再生停止
  stopPlayback(): void {
    try {
      if (this.part) {
        this.part.stop()
      }
      Tone.Transport.stop()
      Tone.Transport.cancel()
      console.log('BFIT: Playback stopped')
    } catch (error) {
      console.error('BFIT: Failed to stop playback:', error)
    }
  }

  // 音量設定
  setVolume(dbLevel: number): void {
    if (this.sampler) {
      this.sampler.volume.value = this.dbToGain(dbLevel)
    }
  }

  // 現在のパターン情報取得
  getCurrentPattern(): { pattern: BFITNote[], ioiSequence: number[] } {
    return {
      pattern: [...this.currentPattern],
      ioiSequence: [...this.currentIOISequence]
    }
  }

  // リソース解放
  dispose(): void {
    try {
      this.stopPlayback()
      
      if (this.part) {
        this.part.dispose()
        this.part = null
      }
      
      if (this.sampler) {
        this.sampler.dispose()
        this.sampler = null
      }
      
      this.isInitialized = false
      console.log('BFIT: Audio generator disposed')
    } catch (error) {
      console.error('BFIT: Failed to dispose audio generator:', error)
    }
  }
}

// BFIT進捗計算
export function calculateBFITProgress(
  currentTrial: number,
  totalTrials: number,
  reversalCount: number,
  targetReversals: number
): {
  trialProgress: number
  reversalProgress: number
  overallProgress: number
  estimatedRemainingTrials: number
} {
  const trialProgress = Math.min(currentTrial / totalTrials, 1)
  const reversalProgress = Math.min(reversalCount / targetReversals, 1)
  const overallProgress = (trialProgress + reversalProgress) / 2
  const estimatedRemainingTrials = Math.max(0, targetReversals - reversalCount) * 2

  return {
    trialProgress,
    reversalProgress,
    overallProgress,
    estimatedRemainingTrials
  }
}

// BFIT品質評価
export function evaluateBFITQuality(result: BFITResult): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  score: number
  feedback: string
} {
  const { slopeThreshold, accuracy, totalTrials } = result

  // 閾値とアキュラシーから総合スコアを計算
  const thresholdScore = Math.max(0, 100 - (slopeThreshold * 10)) // 低い閾値ほど高スコア
  const accuracyScore = accuracy * 100
  const trialScore = Math.min(totalTrials / 20, 1) * 100 // 試行数ボーナス

  const totalScore = (thresholdScore * 0.5 + accuracyScore * 0.4 + trialScore * 0.1)

  let grade: 'A' | 'B' | 'C' | 'D' | 'F'
  let feedback: string

  if (totalScore >= 90) {
    grade = 'A'
    feedback = '優秀な複雑リズム知覚能力です'
  } else if (totalScore >= 80) {
    grade = 'B'
    feedback = '良好な複雑リズム知覚能力です'
  } else if (totalScore >= 70) {
    grade = 'C'
    feedback = '平均的な複雑リズム知覚能力です'
  } else if (totalScore >= 60) {
    grade = 'D'
    feedback = '複雑リズム知覚能力に改善の余地があります'
  } else {
    grade = 'F'
    feedback = '複雑リズム知覚能力の向上が必要です'
  }

  return { grade, score: Math.round(totalScore), feedback }
} 