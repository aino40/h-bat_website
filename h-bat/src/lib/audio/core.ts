'use client'

import * as Tone from 'tone'

// 音響エンジンの状態管理
export interface AudioEngineState {
  isInitialized: boolean
  isStarted: boolean
  hasUserPermission: boolean
  context: Tone.BaseContext | null
  masterVolume: Tone.Volume | null
  error: string | null
}

// グローバル音響エンジン状態
let audioEngineState: AudioEngineState = {
  isInitialized: false,
  isStarted: false,
  hasUserPermission: false,
  context: null,
  masterVolume: null,
  error: null
}

// 音響エンジンの初期化
export async function initializeAudioEngine(): Promise<boolean> {
  // Server-side safety check
  if (typeof window === 'undefined') {
    return false
  }

  try {
    // 既に初期化済みの場合はスキップ
    if (audioEngineState.isInitialized) {
      return true
    }

    // Tone.jsのコンテキスト設定
    await Tone.start()
    
    // マスターボリュームの設定
    const masterVolume = new Tone.Volume(-10) // デフォルト音量: -10dB
    masterVolume.toDestination()
    
    audioEngineState = {
      ...audioEngineState,
      isInitialized: true,
      isStarted: true,
      context: Tone.getContext(),
      masterVolume,
      error: null
    }

    return true
  } catch (error) {
    console.error('❌ Failed to initialize audio engine:', error)
    audioEngineState.error = error instanceof Error ? error.message : 'Unknown audio error'
    return false
  }
}

// ユーザー操作による音響開始（ブラウザ制限対応）
export async function startAudioWithUserGesture(): Promise<boolean> {
  // Server-side safety check
  if (typeof window === 'undefined') {
    return false
  }

  try {
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }
    
    audioEngineState.hasUserPermission = true
    audioEngineState.isStarted = true
    
    return true
  } catch (error) {
    console.error('❌ Failed to start audio with user gesture:', error)
    audioEngineState.error = error instanceof Error ? error.message : 'Failed to start audio'
    return false
  }
}

// 音響エンジンの停止
export function stopAudioEngine(): void {
  try {
    if (audioEngineState.masterVolume) {
      audioEngineState.masterVolume.dispose()
    }
    
    Tone.Transport.stop()
    Tone.Transport.cancel()
    
    audioEngineState = {
      ...audioEngineState,
      isStarted: false,
      masterVolume: null
    }
    
  } catch (error) {
    console.error('❌ Error stopping audio engine:', error)
  }
}

// 音響エンジンの状態取得
export function getAudioEngineState(): AudioEngineState {
  return { ...audioEngineState }
}

// マスターボリューム設定（dB単位）
export function setMasterVolume(volumeDb: number): void {
  if (audioEngineState.masterVolume) {
    // -60dB ～ 0dB の範囲で制限
    const clampedVolume = Math.max(-60, Math.min(0, volumeDb))
    audioEngineState.masterVolume.volume.value = clampedVolume
  }
}

// マスターボリューム取得
export function getMasterVolume(): number {
  return audioEngineState.masterVolume?.volume.value || -10
}

// dB SPLからTone.jsボリュームへの変換
export function dbSplToToneVolume(dbSpl: number): number {
  // 基準: 60dB SPL = -10dB (Tone.js)
  // 実際の聴力測定では個別キャリブレーションが必要
  const referenceDbSpl = 60
  const referenceToneVolume = -10
  
  return referenceToneVolume + (dbSpl - referenceDbSpl)
}

// Tone.jsボリュームからdB SPLへの変換
export function toneVolumeToDbSpl(toneVolume: number): number {
  const referenceDbSpl = 60
  const referenceToneVolume = -10
  
  return referenceDbSpl + (toneVolume - referenceToneVolume)
}

// 音響コンテキストの状態確認
export function checkAudioContextState(): {
  state: AudioContextState
  sampleRate: number
  currentTime: number
} {
  const context = Tone.getContext()
  return {
    state: context.state,
    sampleRate: context.sampleRate,
    currentTime: context.currentTime
  }
}

// ブラウザ音響サポート確認
export function checkAudioSupport(): {
  hasWebAudio: boolean
  hasAudioContext: boolean
  hasToneJs: boolean
  supportedFormats: string[]
} {
  // Server-side safety check
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      hasWebAudio: false,
      hasAudioContext: false,
      hasToneJs: false,
      supportedFormats: []
    }
  }

  const audio = document.createElement('audio')
  
  return {
    hasWebAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
    hasAudioContext: !!window.AudioContext || !!((window as unknown as { webkitAudioContext?: AudioContext }).webkitAudioContext),
    hasToneJs: typeof Tone !== 'undefined',
    supportedFormats: [
      audio.canPlayType('audio/wav') ? 'wav' : '',
      audio.canPlayType('audio/mp3') ? 'mp3' : '',
      audio.canPlayType('audio/ogg') ? 'ogg' : '',
      audio.canPlayType('audio/webm') ? 'webm' : ''
    ].filter(Boolean)
  }
}

// 音響エンジンのヘルスチェック
export function performAudioHealthCheck(): {
  isHealthy: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  
  const state = getAudioEngineState()
  const contextState = checkAudioContextState()
  const support = checkAudioSupport()
  
  // 基本的なチェック
  if (!state.isInitialized) {
    issues.push('Audio engine not initialized')
    recommendations.push('Call initializeAudioEngine()')
  }
  
  if (!state.hasUserPermission) {
    issues.push('No user permission for audio')
    recommendations.push('Require user interaction before starting audio')
  }
  
  if (contextState.state !== 'running') {
    issues.push(`Audio context state: ${contextState.state}`)
    recommendations.push('Ensure user has interacted with the page')
  }
  
  if (!support.hasWebAudio) {
    issues.push('Web Audio API not supported')
    recommendations.push('Use a modern browser with Web Audio support')
  }
  
  if (contextState.sampleRate < 44100) {
    issues.push(`Low sample rate: ${contextState.sampleRate}Hz`)
    recommendations.push('Consider using a device with higher sample rate')
  }
  
  return {
    isHealthy: issues.length === 0,
    issues,
    recommendations
  }
} 