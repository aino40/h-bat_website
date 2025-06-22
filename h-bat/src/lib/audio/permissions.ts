'use client'

import * as Tone from 'tone'

// 音響権限の状態
export interface AudioPermissionState {
  hasUserGesture: boolean
  contextState: AudioContextState
  autoplayAllowed: boolean
  lastUserInteraction: Date | null
  permissionDenied: boolean
  error: string | null
}

// ユーザー操作の種類
export type UserGestureType = 'click' | 'touch' | 'keypress' | 'mousedown' | 'touchstart'

// 音響権限マネージャー
class AudioPermissionManager {
  private state: AudioPermissionState = {
    hasUserGesture: false,
    contextState: 'suspended',
    autoplayAllowed: false,
    lastUserInteraction: null,
    permissionDenied: false,
    error: null
  }

  private gestureEventTypes: UserGestureType[] = ['click', 'touch', 'keypress', 'mousedown', 'touchstart']
  private gestureListeners: Map<UserGestureType, (event: Event) => void> = new Map()
  private isListening = false

  constructor() {
    this.updateContextState()
    this.setupAutoplayDetection()
  }

  // 音響コンテキストの状態を更新
  private updateContextState(): void {
    if (typeof window !== 'undefined' && Tone.context) {
      this.state.contextState = Tone.context.state
    }
  }

  // 自動再生の検出
  private async setupAutoplayDetection(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      // 小さな無音ファイルで自動再生テスト
      const testAudio = new Audio()
      testAudio.volume = 0
      testAudio.muted = true
      
      const playPromise = testAudio.play()
      
      if (playPromise) {
        await playPromise
        this.state.autoplayAllowed = true
        console.log('✅ Autoplay is allowed')
      }
    } catch (error) {
      this.state.autoplayAllowed = false
      console.log('⚠️ Autoplay is blocked')
    }
  }

  // ユーザージェスチャーのリスナーを設定
  startListeningForUserGesture(): void {
    if (this.isListening || typeof window === 'undefined') return

    this.gestureEventTypes.forEach(eventType => {
      const listener = (event: Event) => this.handleUserGesture(event, eventType)
      this.gestureListeners.set(eventType, listener)
      
      // パッシブリスナーで設定（パフォーマンス向上）
      document.addEventListener(eventType, listener, { 
        passive: true, 
        once: false // 複数回の操作に対応
      })
    })

    this.isListening = true
    console.log('👂 Listening for user gestures...')
  }

  // ユーザージェスチャーのリスナーを停止
  stopListeningForUserGesture(): void {
    if (!this.isListening) return

    this.gestureEventTypes.forEach(eventType => {
      const listener = this.gestureListeners.get(eventType)
      if (listener) {
        document.removeEventListener(eventType, listener)
      }
    })

    this.gestureListeners.clear()
    this.isListening = false
    console.log('🔇 Stopped listening for user gestures')
  }

  // ユーザージェスチャーの処理
  private async handleUserGesture(event: Event, gestureType: UserGestureType): Promise<void> {
    console.log(`👆 User gesture detected: ${gestureType}`)
    
    this.state.lastUserInteraction = new Date()
    this.state.hasUserGesture = true
    this.state.error = null

    // 音響コンテキストの開始を試行
    try {
      await this.attemptAudioStart()
    } catch (error) {
      console.error('Failed to start audio after user gesture:', error)
      this.state.error = error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // 音響開始の試行
  private async attemptAudioStart(): Promise<boolean> {
    try {
      if (Tone.context.state !== 'running') {
        await Tone.start()
        console.log('🎵 Audio context started successfully')
      }

      this.updateContextState()
      return true
    } catch (error) {
      console.error('❌ Failed to start audio context:', error)
      this.state.permissionDenied = true
      this.state.error = error instanceof Error ? error.message : 'Audio start failed'
      return false
    }
  }

  // 手動での音響開始要求
  async requestAudioPermission(): Promise<boolean> {
    console.log('🎵 Requesting audio permission...')

    if (!this.state.hasUserGesture) {
      console.warn('⚠️ No user gesture detected. Audio start may fail.')
    }

    try {
      const success = await this.attemptAudioStart()
      
      if (success) {
        console.log('✅ Audio permission granted')
        return true
      } else {
        console.error('❌ Audio permission denied')
        return false
      }
    } catch (error) {
      console.error('❌ Error requesting audio permission:', error)
      this.state.error = error instanceof Error ? error.message : 'Permission request failed'
      return false
    }
  }

  // 音響権限の状態取得
  getPermissionState(): AudioPermissionState {
    this.updateContextState()
    return { ...this.state }
  }

  // 音響再生の準備状況チェック
  isReadyForAudio(): boolean {
    return (
      this.state.hasUserGesture &&
      this.state.contextState === 'running' &&
      !this.state.permissionDenied
    )
  }

  // ユーザー操作なしでの音響テスト（開発用）
  async testAudioWithoutGesture(): Promise<{
    canStart: boolean
    contextState: AudioContextState
    error?: string
  }> {
    try {
      await Tone.start()
      this.updateContextState()
      
      return {
        canStart: true,
        contextState: this.state.contextState
      }
    } catch (error) {
      return {
        canStart: false,
        contextState: this.state.contextState,
        error: error instanceof Error ? error.message : 'Test failed'
      }
    }
  }

  // ブラウザの音響サポート詳細チェック
  checkBrowserAudioSupport(): {
    hasWebAudio: boolean
    hasAudioContext: boolean
    hasMediaDevices: boolean
    supportedCodecs: string[]
    browserInfo: {
      userAgent: string
      isMobile: boolean
      isIOS: boolean
      isAndroid: boolean
      isChrome: boolean
      isSafari: boolean
      isFirefox: boolean
    }
  } {
    const userAgent = navigator.userAgent
    
    return {
      hasWebAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
      hasAudioContext: !!window.AudioContext || !!(window as any).webkitAudioContext,
      hasMediaDevices: 'mediaDevices' in navigator,
      supportedCodecs: this.getSupportedAudioCodecs(),
      browserInfo: {
        userAgent,
        isMobile: /Mobi|Android/i.test(userAgent),
        isIOS: /iPad|iPhone|iPod/.test(userAgent),
        isAndroid: /Android/.test(userAgent),
        isChrome: /Chrome/.test(userAgent),
        isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
        isFirefox: /Firefox/.test(userAgent)
      }
    }
  }

  // サポートされている音響コーデックの取得
  private getSupportedAudioCodecs(): string[] {
    const audio = document.createElement('audio')
    const codecs = [
      { name: 'WAV', type: 'audio/wav' },
      { name: 'MP3', type: 'audio/mpeg' },
      { name: 'OGG', type: 'audio/ogg' },
      { name: 'WEBM', type: 'audio/webm' },
      { name: 'AAC', type: 'audio/mp4; codecs="mp4a.40.2"' },
      { name: 'FLAC', type: 'audio/flac' }
    ]

    return codecs
      .filter(codec => audio.canPlayType(codec.type) !== '')
      .map(codec => codec.name)
  }

  // 権限状態のリセット
  reset(): void {
    this.state = {
      hasUserGesture: false,
      contextState: 'suspended',
      autoplayAllowed: false,
      lastUserInteraction: null,
      permissionDenied: false,
      error: null
    }
    
    this.stopListeningForUserGesture()
    console.log('🔄 Audio permission state reset')
  }

  // 音響権限の診断
  diagnoseAudioIssues(): {
    issues: string[]
    recommendations: string[]
    severity: 'low' | 'medium' | 'high'
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    
    const state = this.getPermissionState()
    const support = this.checkBrowserAudioSupport()

    // 基本的な問題のチェック
    if (!support.hasWebAudio) {
      issues.push('Web Audio API not supported')
      recommendations.push('Use a modern browser that supports Web Audio API')
    }

    if (!state.hasUserGesture) {
      issues.push('No user interaction detected')
      recommendations.push('Click or tap anywhere to enable audio')
    }

    if (state.contextState !== 'running') {
      issues.push(`Audio context is ${state.contextState}`)
      recommendations.push('User interaction is required to start audio')
    }

    if (!state.autoplayAllowed) {
      issues.push('Autoplay is blocked by browser')
      recommendations.push('User interaction is required before playing audio')
    }

    if (state.permissionDenied) {
      issues.push('Audio permission was denied')
      recommendations.push('Check browser audio settings and reload the page')
    }

    // ブラウザ固有の問題
    if (support.browserInfo.isIOS) {
      issues.push('iOS requires user interaction for audio')
      recommendations.push('Tap the screen before starting audio tests')
    }

    if (support.browserInfo.isSafari) {
      issues.push('Safari has strict autoplay policies')
      recommendations.push('Use user interaction before playing audio')
    }

    // 重要度の判定
    let severity: 'low' | 'medium' | 'high' = 'low'
    if (!support.hasWebAudio || state.permissionDenied) {
      severity = 'high'
    } else if (!state.hasUserGesture || state.contextState !== 'running') {
      severity = 'medium'
    }

    return { issues, recommendations, severity }
  }
}

// グローバル音響権限マネージャー
export const audioPermissionManager = new AudioPermissionManager()

// 便利な関数群
export async function requestAudioPermission(): Promise<boolean> {
  return await audioPermissionManager.requestAudioPermission()
}

export function startListeningForUserGesture(): void {
  audioPermissionManager.startListeningForUserGesture()
}

export function stopListeningForUserGesture(): void {
  audioPermissionManager.stopListeningForUserGesture()
}

export function getAudioPermissionState(): AudioPermissionState {
  return audioPermissionManager.getPermissionState()
}

export function isAudioReady(): boolean {
  return audioPermissionManager.isReadyForAudio()
}

export function checkBrowserAudioSupport() {
  return audioPermissionManager.checkBrowserAudioSupport()
}

export function diagnoseAudioIssues() {
  return audioPermissionManager.diagnoseAudioIssues()
}

// H-BAT特化の音響権限チェック
export async function ensureHBatAudioReady(): Promise<{
  isReady: boolean
  issues: string[]
  recommendations: string[]
}> {
  console.log('🎵 Checking H-BAT audio readiness...')
  
  const permissionState = getAudioPermissionState()
  const diagnosis = diagnoseAudioIssues()
  
  // H-BAT特有の要件チェック
  const hbatIssues = [...diagnosis.issues]
  const hbatRecommendations = [...diagnosis.recommendations]
  
  // 精密な音響測定のための追加チェック
  if (permissionState.contextState === 'running') {
    const sampleRate = Tone.context.sampleRate
    if (sampleRate < 44100) {
      hbatIssues.push(`Low sample rate: ${sampleRate}Hz`)
      hbatRecommendations.push('Use a device with 44.1kHz or higher sample rate for accurate measurements')
    }
  }

  const isReady = (
    permissionState.hasUserGesture &&
    permissionState.contextState === 'running' &&
    !permissionState.permissionDenied &&
    hbatIssues.length === 0
  )

  if (isReady) {
    console.log('✅ H-BAT audio is ready')
  } else {
    console.warn('⚠️ H-BAT audio not ready:', hbatIssues)
  }

  return {
    isReady,
    issues: hbatIssues,
    recommendations: hbatRecommendations
  }
} 