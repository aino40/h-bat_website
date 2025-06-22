'use client'

import * as Tone from 'tone'

// 音源サンプルの型定義
export interface AudioSample {
  id: string
  name: string
  url: string
  buffer: Tone.ToneAudioBuffer | null
  player: Tone.Player | null
  isLoaded: boolean
  isLoading: boolean
  error: string | null
}

// 音源サンプルの設定
export const SAMPLE_CONFIG = {
  kick: {
    id: 'kick',
    name: 'Kick Drum',
    url: '/audio/kick.wav',
    volume: -6 // dB
  },
  snare: {
    id: 'snare',
    name: 'Snare Drum',
    url: '/audio/snare.wav',
    volume: -6 // dB
  }
} as const

export type SampleId = keyof typeof SAMPLE_CONFIG

// 音源サンプルの管理クラス
class AudioSampleManager {
  private samples: Map<SampleId, AudioSample> = new Map()
  private loadingPromises: Map<SampleId, Promise<boolean>> = new Map()

  constructor() {
    this.initializeSamples()
  }

  // サンプルの初期化
  private initializeSamples(): void {
    Object.entries(SAMPLE_CONFIG).forEach(([id, config]) => {
      this.samples.set(id as SampleId, {
        id: config.id,
        name: config.name,
        url: config.url,
        buffer: null,
        player: null,
        isLoaded: false,
        isLoading: false,
        error: null
      })
    })
  }

  // 単一サンプルの読み込み
  async loadSample(sampleId: SampleId): Promise<boolean> {
    const sample = this.samples.get(sampleId)
    if (!sample) {
      console.error(`Sample not found: ${sampleId}`)
      return false
    }

    // 既に読み込み済みの場合
    if (sample.isLoaded) {
      return true
    }

    // 読み込み中の場合は既存のPromiseを返す
    if (sample.isLoading && this.loadingPromises.has(sampleId)) {
      return await this.loadingPromises.get(sampleId)!
    }

    // 読み込み開始
    const loadPromise = this.performLoad(sampleId)
    this.loadingPromises.set(sampleId, loadPromise)

    try {
      const success = await loadPromise
      return success
    } finally {
      this.loadingPromises.delete(sampleId)
    }
  }

  // 実際の読み込み処理
  private async performLoad(sampleId: SampleId): Promise<boolean> {
    const sample = this.samples.get(sampleId)!
    const config = SAMPLE_CONFIG[sampleId]

    sample.isLoading = true
    sample.error = null

    try {
      // ToneAudioBufferで音源を読み込み
      const buffer = new Tone.ToneAudioBuffer()
      await buffer.load(config.url)

      // Playerの作成
      const player = new Tone.Player({
        url: buffer,
        volume: config.volume,
        fadeIn: 0.01,
        fadeOut: 0.01
      })

      // 更新
      sample.buffer = buffer
      sample.player = player
      sample.isLoaded = true
      sample.isLoading = false

      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown loading error'
      sample.error = errorMessage
      sample.isLoading = false
      
      console.error(`❌ Failed to load sample ${config.name}:`, errorMessage)
      return false
    }
  }

  // 全サンプルの読み込み
  async loadAllSamples(): Promise<{ success: boolean; loaded: SampleId[]; failed: SampleId[] }> {
    const sampleIds = Object.keys(SAMPLE_CONFIG) as SampleId[]
    const results = await Promise.allSettled(
      sampleIds.map(id => this.loadSample(id))
    )

    const loaded: SampleId[] = []
    const failed: SampleId[] = []

    results.forEach((result, index) => {
      const sampleId = sampleIds[index]
      if (sampleId && result.status === 'fulfilled' && result.value) {
        loaded.push(sampleId)
      } else if (sampleId) {
        failed.push(sampleId)
      }
    })

    const success = failed.length === 0

    return { success, loaded, failed }
  }

  // サンプルの取得
  getSample(sampleId: SampleId): AudioSample | null {
    return this.samples.get(sampleId) || null
  }

  // Playerの取得
  getPlayer(sampleId: SampleId): Tone.Player | null {
    const sample = this.samples.get(sampleId)
    return sample?.player || null
  }

  // Bufferの取得
  getBuffer(sampleId: SampleId): Tone.ToneAudioBuffer | null {
    const sample = this.samples.get(sampleId)
    return sample?.buffer || null
  }

  // 読み込み状態の確認
  getLoadingStatus(): {
    totalSamples: number
    loadedSamples: number
    isAllLoaded: boolean
    isAnyLoading: boolean
    failedSamples: SampleId[]
  } {
    const samples = Array.from(this.samples.values())
    
    return {
      totalSamples: samples.length,
      loadedSamples: samples.filter(s => s.isLoaded).length,
      isAllLoaded: samples.every(s => s.isLoaded),
      isAnyLoading: samples.some(s => s.isLoading),
      failedSamples: samples
        .filter(s => s.error !== null)
        .map(s => s.id as SampleId)
    }
  }

  // サンプルの再読み込み
  async reloadSample(sampleId: SampleId): Promise<boolean> {
    const sample = this.samples.get(sampleId)
    if (!sample) return false

    // 既存のリソースをクリーンアップ
    if (sample.player) {
      sample.player.dispose()
    }
    if (sample.buffer) {
      sample.buffer.dispose()
    }

    // 状態をリセット
    sample.buffer = null
    sample.player = null
    sample.isLoaded = false
    sample.isLoading = false
    sample.error = null

    // 再読み込み
    return await this.loadSample(sampleId)
  }

  // 全サンプルの再読み込み
  async reloadAllSamples(): Promise<{ success: boolean; loaded: SampleId[]; failed: SampleId[] }> {
    // 全サンプルをクリーンアップ
    this.samples.forEach(sample => {
      if (sample.player) sample.player.dispose()
      if (sample.buffer) sample.buffer.dispose()
    })

    // 再初期化
    this.initializeSamples()

    // 全サンプルを再読み込み
    return await this.loadAllSamples()
  }

  // リソースのクリーンアップ
  dispose(): void {
    this.samples.forEach(sample => {
      if (sample.player) {
        sample.player.dispose()
      }
      if (sample.buffer) {
        sample.buffer.dispose()
      }
    })
    this.samples.clear()
    this.loadingPromises.clear()
  }
}

// グローバルサンプルマネージャーのインスタンス
export const sampleManager = new AudioSampleManager()

// 便利な関数群
export async function preloadAudioSamples(): Promise<boolean> {
  const result = await sampleManager.loadAllSamples()
  
  if (result.success) {
    console.warn('✅ All audio samples loaded successfully')
  } else {
    console.warn(`⚠️ Some samples failed to load: ${result.failed.join(', ')}`)
  }
  
  return result.success
}

// 特定サンプルの読み込み
export async function loadSample(sampleId: SampleId): Promise<boolean> {
  return await sampleManager.loadSample(sampleId)
}

// サンプルPlayerの取得
export function getSamplePlayer(sampleId: SampleId): Tone.Player | null {
  return sampleManager.getPlayer(sampleId)
}

// サンプルBufferの取得
export function getSampleBuffer(sampleId: SampleId): Tone.ToneAudioBuffer | null {
  return sampleManager.getBuffer(sampleId)
}

// 読み込み状態の確認
export function getSampleLoadingStatus() {
  return sampleManager.getLoadingStatus()
}

// カスタムサンプルの作成（テスト用）
export function createCustomPlayer(
  sampleId: SampleId,
  volume: number = -6,
  destination?: Tone.ToneAudioNode
): Tone.Player | null {
  const buffer = getSampleBuffer(sampleId)
  if (!buffer) {
    console.error(`Buffer not available for sample: ${sampleId}`)
    return null
  }

  const player = new Tone.Player({
    url: buffer,
    volume,
    fadeIn: 0.01,
    fadeOut: 0.01
  })

  if (destination) {
    player.connect(destination)
  } else {
    player.toDestination()
  }

  return player
}

// 音源ファイルの存在確認
export async function checkSampleFiles(): Promise<{
  available: SampleId[]
  missing: SampleId[]
  errors: { [key in SampleId]?: string }
}> {
  const available: SampleId[] = []
  const missing: SampleId[] = []
  const errors: { [key in SampleId]?: string } = {}

  for (const [sampleId, config] of Object.entries(SAMPLE_CONFIG)) {
    try {
      const response = await fetch(config.url, { method: 'HEAD' })
      if (response.ok) {
        available.push(sampleId as SampleId)
      } else {
        missing.push(sampleId as SampleId)
        errors[sampleId as SampleId] = `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      missing.push(sampleId as SampleId)
      errors[sampleId as SampleId] = error instanceof Error ? error.message : 'Network error'
    }
  }

  return { available, missing, errors }
} 