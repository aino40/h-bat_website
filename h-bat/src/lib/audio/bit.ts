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

      // 安全な音量レベルを計算
      const safeVolume = this.dbToGain(this.config.soundLevel)
      console.log('BIT: Safe volume calculated:', safeVolume)

      // 合成音源初期化
      console.log('BIT: Creating kick synth...')
      this.kickSynth = new Tone.MembraneSynth({
        envelope: {
          attack: 0.001,
          decay: 0.3,
          sustain: 0,
          release: 0.3
        },
        volume: safeVolume
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
        volume: safeVolume
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

  // dBからゲインへの安全な変換
  private dbToGain(db: number): number {
    try {
      // 入力値の検証
      if (!isFinite(db) || isNaN(db)) {
        console.warn('BIT: Invalid dB value, using default:', db)
        db = 70 // デフォルト値
      }

      // dB SPLを適切な音量レベルに変換（-40～0dBの範囲）
      const normalizedDb = Math.max(-40, Math.min(0, db - 70))
      const gain = Math.pow(10, normalizedDb / 20)
      
      // ゲイン値の検証
      if (!isFinite(gain) || isNaN(gain) || gain < 0) {
        console.warn('BIT: Invalid gain calculated, using safe default:', gain)
        return 0.1 // 安全なデフォルト値
      }
      
      // 範囲制限
      const safeGain = Math.max(0.001, Math.min(1.0, gain))
      console.log('BIT: dB to gain conversion:', { db, normalizedDb, gain, safeGain })
      
      return safeGain
    } catch (error) {
      console.error('BIT: Error in dbToGain conversion:', error)
      return 0.1 // エラー時のフォールバック
    }
  }

  // BITパターン設定
  setConfig(config: Partial<BITConfig>): void {
    this.config = { ...this.config, ...config }
    this.updateSoundLevel()
  }

  // 音圧レベル更新（安全な設定）
  private updateSoundLevel(): void {
    try {
      const safeVolume = this.dbToGain(this.config.soundLevel)
      
      if (this.kickSynth && this.kickSynth.volume) {
        this.kickSynth.volume.value = safeVolume
        console.log('BIT: Updated kick synth volume:', safeVolume)
      }
      if (this.snareSynth && this.snareSynth.volume) {
        this.snareSynth.volume.value = safeVolume
        console.log('BIT: Updated snare synth volume:', safeVolume)
      }
    } catch (error) {
      console.error('BIT: Error updating sound level:', error)
    }
  }

  // 傾きK設定（安全な範囲制限）
  setSlopeK(k: number): void {
    if (!isFinite(k) || isNaN(k)) {
      console.warn('BIT: Invalid slope K value, using default:', k)
      k = 5
    }
    this.config.slopeK = Math.max(0.1, Math.min(50, k)) // 0.1-50ms/beat範囲
    console.log('BIT: Slope K set to:', this.config.slopeK)
  }

  // テンポ方向設定
  setDirection(direction: 'accelerando' | 'ritardando'): void {
    this.config.direction = direction
  }

  // 音圧レベル設定（安全な設定）
  setSoundLevel(level: number): void {
    if (!isFinite(level) || isNaN(level)) {
      console.warn('BIT: Invalid sound level, using default:', level)
      level = 70
    }
    this.config.soundLevel = Math.max(40, Math.min(100, level)) // 40-100dB範囲
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
      
      // 値の検証
      if (!ioiSequence.every(ioi => isFinite(ioi) && ioi > 0)) {
        throw new Error('Invalid IOI sequence generated')
      }
      
      // パート作成
      const events: Array<{ time: string; ioi: number; index: number }> = []
      let cumulativeTime = 0

      for (let i = 0; i < ioiSequence.length; i++) {
        const ioi = ioiSequence[i]!
        events.push({
          time: `+${cumulativeTime / 1000}`, // 秒に変換
          ioi,
          index: i
        })
        cumulativeTime += ioi
      }

      console.log('BIT: Created events:', events.slice(0, 3), '...')

      this.part = new Tone.Part((time, event) => {
        try {
          // 時間値の検証
          if (!isFinite(time) || time < 0) {
            console.warn('BIT: Invalid time value:', time)
            return
          }

          // キックとスネアを交互に再生
          if (event.index % 2 === 0) {
            if (this.kickSynth) {
              this.kickSynth.triggerAttackRelease('C2', '8n', time)
            }
          } else {
            if (this.snareSynth) {
              this.snareSynth.triggerAttackRelease('8n', time)
            }
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
    try {
      if (this.part) {
        this.part.stop()
        this.part.dispose()
        this.part = null
      }
      Tone.Transport.stop()
      console.log('BIT: Pattern stopped')
    } catch (error) {
      console.error('BIT: Error stopping pattern:', error)
    }
  }

  // 初期化状態確認
  isReady(): boolean {
    const ready = this.isInitialized && 
                  this.kickSynth !== null && 
                  this.snareSynth !== null &&
                  Tone.context.state === 'running'
    
    console.log('BIT: isReady check:', {
      isInitialized: this.isInitialized,
      hasKickSynth: this.kickSynth !== null,
      hasSnareSynth: this.snareSynth !== null,
      contextState: Tone.context.state,
      ready
    })
    
    return ready
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
    try {
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
      console.log('BIT: Audio generator disposed')
    } catch (error) {
      console.error('BIT: Error during disposal:', error)
    }
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