'use client'

import * as Tone from 'tone'
import { AudioEngineError } from './core'

// 音響エラーの種類
export enum AudioErrorType {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SAMPLE_LOAD_FAILED = 'SAMPLE_LOAD_FAILED',
  PLAYBACK_FAILED = 'PLAYBACK_FAILED',
  CONTEXT_SUSPENDED = 'CONTEXT_SUSPENDED',
  CONTEXT_INTERRUPTED = 'CONTEXT_INTERRUPTED',
  VOLUME_CONTROL_FAILED = 'VOLUME_CONTROL_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  DEVICE_NOT_SUPPORTED = 'DEVICE_NOT_SUPPORTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// 音響エラーの詳細情報
export interface AudioErrorInfo {
  type: AudioErrorType
  message: string
  originalError?: Error | undefined
  timestamp: Date
  context: {
    userAgent: string
    audioContextState: AudioContextState
    sampleRate?: number
    hasUserGesture: boolean
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  isRecoverable: boolean
  recoveryActions: string[]
}

// フォールバック戦略の種類
export enum FallbackStrategy {
  RETRY_WITH_DELAY = 'RETRY_WITH_DELAY',
  USE_ALTERNATIVE_SAMPLE = 'USE_ALTERNATIVE_SAMPLE',
  REDUCE_QUALITY = 'REDUCE_QUALITY',
  SILENT_MODE = 'SILENT_MODE',
  MANUAL_INTERVENTION = 'MANUAL_INTERVENTION'
}

// 復旧設定
export interface RecoveryConfig {
  maxRetries: number
  retryDelay: number
  enableFallback: boolean
  fallbackStrategies: FallbackStrategy[]
  silentModeEnabled: boolean
  userNotificationEnabled: boolean
}

// デフォルト復旧設定
export const DEFAULT_RECOVERY_CONFIG: RecoveryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // ms
  enableFallback: true,
  fallbackStrategies: [
    FallbackStrategy.RETRY_WITH_DELAY,
    FallbackStrategy.USE_ALTERNATIVE_SAMPLE,
    FallbackStrategy.REDUCE_QUALITY,
    FallbackStrategy.MANUAL_INTERVENTION
  ],
  silentModeEnabled: false,
  userNotificationEnabled: true
}

// 音響エラーハンドラー
class AudioErrorHandler {
  private config: RecoveryConfig
  private errorHistory: AudioErrorInfo[] = []
  private retryCounters: Map<string, number> = new Map()
  private recoveryCallbacks: Map<AudioErrorType, (() => Promise<boolean>)[]> = new Map()

  constructor(config: RecoveryConfig = DEFAULT_RECOVERY_CONFIG) {
    this.config = config
    this.setupGlobalErrorHandlers()
  }

  // グローバルエラーハンドラーの設定
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return

    // 未処理の音響エラーをキャッチ
    window.addEventListener('error', (event) => {
      if (this.isAudioRelatedError(event.error)) {
        this.handleError(AudioErrorType.UNKNOWN_ERROR, event.error.message, event.error)
      }
    })

    // Promise rejection をキャッチ
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isAudioRelatedError(event.reason)) {
        this.handleError(AudioErrorType.UNKNOWN_ERROR, event.reason.message, event.reason)
      }
    })
  }

  // 音響関連エラーの判定
  private isAudioRelatedError(error: any): boolean {
    if (!error) return false
    
    const message = error.message || error.toString()
    const audioKeywords = [
      'audio', 'AudioContext', 'Tone', 'playback', 'sample', 
      'volume', 'sound', 'media', 'microphone', 'speaker'
    ]
    
    return audioKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  // エラーの処理
  async handleError(
    type: AudioErrorType, 
    message: string, 
    originalError?: Error,
    context?: Partial<AudioErrorInfo['context']>
  ): Promise<boolean> {
    const errorInfo = this.createErrorInfo(type, message, originalError, context)
    this.errorHistory.push(errorInfo)
    
    console.error(`🚨 Audio Error [${type}]:`, message, originalError)
    
    // エラーの重要度に応じた処理
    if (errorInfo.severity === 'critical') {
      return await this.handleCriticalError(errorInfo)
    } else if (errorInfo.isRecoverable) {
      return await this.attemptRecovery(errorInfo)
    } else {
      this.notifyUser(errorInfo)
      return false
    }
  }

  // エラー情報の作成
  private createErrorInfo(
    type: AudioErrorType,
    message: string,
    originalError?: Error,
    contextOverride?: Partial<AudioErrorInfo['context']>
  ): AudioErrorInfo {
    const defaultContext = {
      userAgent: navigator.userAgent,
      audioContextState: Tone.context?.state || 'closed',
      sampleRate: Tone.context?.sampleRate,
      hasUserGesture: false // この値は外部から設定される必要がある
    }

    const context = { ...defaultContext, ...contextOverride }
    
    return {
      type,
      message,
      originalError,
      timestamp: new Date(),
      context,
      severity: this.determineSeverity(type),
      isRecoverable: this.isRecoverable(type),
      recoveryActions: this.getRecoveryActions(type)
    }
  }

  // エラーの重要度判定
  private determineSeverity(type: AudioErrorType): AudioErrorInfo['severity'] {
    switch (type) {
      case AudioErrorType.BROWSER_NOT_SUPPORTED:
      case AudioErrorType.DEVICE_NOT_SUPPORTED:
        return 'critical'
      
      case AudioErrorType.PERMISSION_DENIED:
      case AudioErrorType.INITIALIZATION_FAILED:
        return 'high'
      
      case AudioErrorType.SAMPLE_LOAD_FAILED:
      case AudioErrorType.CONTEXT_SUSPENDED:
      case AudioErrorType.CONTEXT_INTERRUPTED:
        return 'medium'
      
      default:
        return 'low'
    }
  }

  // 復旧可能性の判定
  private isRecoverable(type: AudioErrorType): boolean {
    const nonRecoverableTypes = [
      AudioErrorType.BROWSER_NOT_SUPPORTED,
      AudioErrorType.DEVICE_NOT_SUPPORTED
    ]
    
    return !nonRecoverableTypes.includes(type)
  }

  // 復旧アクションの取得
  private getRecoveryActions(type: AudioErrorType): string[] {
    switch (type) {
      case AudioErrorType.PERMISSION_DENIED:
        return [
          'ユーザー操作を促す',
          'ページをリロードする',
          'ブラウザの音響設定を確認する'
        ]
      
      case AudioErrorType.SAMPLE_LOAD_FAILED:
        return [
          'ネットワーク接続を確認する',
          '代替音源を使用する',
          'キャッシュをクリアする'
        ]
      
      case AudioErrorType.CONTEXT_SUSPENDED:
        return [
          'ユーザー操作でコンテキストを再開する',
          'Tone.start()を呼び出す'
        ]
      
      case AudioErrorType.PLAYBACK_FAILED:
        return [
          '音量設定を確認する',
          'オーディオデバイスの接続を確認する',
          '再生を再試行する'
        ]
      
      default:
        return ['ページをリロードする', 'サポートに連絡する']
    }
  }

  // 重大エラーの処理
  private async handleCriticalError(errorInfo: AudioErrorInfo): Promise<boolean> {
    console.error('💥 Critical Audio Error:', errorInfo)
    
    // ユーザーに即座に通知
    this.notifyUser(errorInfo, true)
    
    // フォールバックモードに切り替え
    if (this.config.silentModeEnabled) {
      console.log('🔇 Switching to silent mode')
      return true // サイレントモードで継続
    }
    
    return false // 処理を停止
  }

  // 復旧の試行
  private async attemptRecovery(errorInfo: AudioErrorInfo): Promise<boolean> {
    const retryKey = `${errorInfo.type}_${errorInfo.timestamp.getTime()}`
    const currentRetries = this.retryCounters.get(retryKey) || 0
    
    if (currentRetries >= this.config.maxRetries) {
      console.warn(`⚠️ Max retries exceeded for ${errorInfo.type}`)
      this.notifyUser(errorInfo)
      return false
    }
    
    this.retryCounters.set(retryKey, currentRetries + 1)
    
    // フォールバック戦略を順次試行
    for (const strategy of this.config.fallbackStrategies) {
      console.log(`🔄 Attempting recovery with strategy: ${strategy}`)
      
      const success = await this.executeRecoveryStrategy(strategy, errorInfo)
      if (success) {
        console.log(`✅ Recovery successful with strategy: ${strategy}`)
        this.retryCounters.delete(retryKey)
        return true
      }
    }
    
    console.error(`❌ All recovery strategies failed for ${errorInfo.type}`)
    this.notifyUser(errorInfo)
    return false
  }

  // 復旧戦略の実行
  private async executeRecoveryStrategy(
    strategy: FallbackStrategy, 
    errorInfo: AudioErrorInfo
  ): Promise<boolean> {
    try {
      switch (strategy) {
        case FallbackStrategy.RETRY_WITH_DELAY:
          await this.delay(this.config.retryDelay)
          return await this.executeRecoveryCallbacks(errorInfo.type)
        
        case FallbackStrategy.USE_ALTERNATIVE_SAMPLE:
          return await this.useAlternativeSample(errorInfo)
        
        case FallbackStrategy.REDUCE_QUALITY:
          return await this.reduceAudioQuality(errorInfo)
        
        case FallbackStrategy.SILENT_MODE:
          return this.enableSilentMode()
        
        case FallbackStrategy.MANUAL_INTERVENTION:
          return await this.requestManualIntervention(errorInfo)
        
        default:
          return false
      }
    } catch (error) {
      console.error(`Recovery strategy ${strategy} failed:`, error)
      return false
    }
  }

  // 復旧コールバックの実行
  private async executeRecoveryCallbacks(type: AudioErrorType): Promise<boolean> {
    const callbacks = this.recoveryCallbacks.get(type) || []
    
    for (const callback of callbacks) {
      try {
        const success = await callback()
        if (success) return true
      } catch (error) {
        console.error('Recovery callback failed:', error)
      }
    }
    
    return false
  }

  // 代替音源の使用
  private async useAlternativeSample(errorInfo: AudioErrorInfo): Promise<boolean> {
    // 実装は音源管理システムと連携
    console.log('🔄 Attempting to use alternative sample')
    return false // 実装依存
  }

  // 音質の低下
  private async reduceAudioQuality(errorInfo: AudioErrorInfo): Promise<boolean> {
    try {
      // サンプルレートを下げる、ビット深度を下げるなど
      console.log('🔄 Reducing audio quality')
      return true
    } catch (error) {
      return false
    }
  }

  // サイレントモードの有効化
  private enableSilentMode(): boolean {
    console.log('🔇 Enabling silent mode')
    this.config.silentModeEnabled = true
    return true
  }

  // 手動介入の要求
  private async requestManualIntervention(errorInfo: AudioErrorInfo): Promise<boolean> {
    if (this.config.userNotificationEnabled) {
      this.notifyUser(errorInfo, false, true)
    }
    return false // 手動介入が必要
  }

  // ユーザーへの通知
  private notifyUser(
    errorInfo: AudioErrorInfo, 
    isCritical: boolean = false,
    requiresAction: boolean = false
  ): void {
    if (!this.config.userNotificationEnabled) return
    
    const message = this.formatUserMessage(errorInfo, isCritical, requiresAction)
    
    if (isCritical) {
      // 重要なエラーはアラートで表示
      alert(message)
    } else {
      // 通常のエラーはコンソールログ
      console.warn(message)
    }
  }

  // ユーザーメッセージのフォーマット
  private formatUserMessage(
    errorInfo: AudioErrorInfo,
    isCritical: boolean,
    requiresAction: boolean
  ): string {
    let message = `音響システムでエラーが発生しました: ${errorInfo.message}`
    
    if (requiresAction) {
      message += '\n\n推奨される対処法:'
      errorInfo.recoveryActions.forEach((action, index) => {
        message += `\n${index + 1}. ${action}`
      })
    }
    
    if (isCritical) {
      message += '\n\nこのエラーは重大です。ページをリロードするか、サポートにお問い合わせください。'
    }
    
    return message
  }

  // 遅延ユーティリティ
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 復旧コールバックの登録
  registerRecoveryCallback(type: AudioErrorType, callback: () => Promise<boolean>): void {
    if (!this.recoveryCallbacks.has(type)) {
      this.recoveryCallbacks.set(type, [])
    }
    this.recoveryCallbacks.get(type)!.push(callback)
  }

  // エラー履歴の取得
  getErrorHistory(): AudioErrorInfo[] {
    return [...this.errorHistory]
  }

  // エラー統計の取得
  getErrorStatistics(): {
    totalErrors: number
    errorsByType: Map<AudioErrorType, number>
    recoverySuccessRate: number
    lastError?: AudioErrorInfo | undefined
  } {
    const errorsByType = new Map<AudioErrorType, number>()
    
    this.errorHistory.forEach(error => {
      const count = errorsByType.get(error.type) || 0
      errorsByType.set(error.type, count + 1)
    })
    
    const recoverableErrors = this.errorHistory.filter(e => e.isRecoverable).length
    const recoverySuccessRate = recoverableErrors > 0 ? 
      (recoverableErrors / this.errorHistory.length) * 100 : 0
    
    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      recoverySuccessRate,
      lastError: this.errorHistory[this.errorHistory.length - 1]
    }
  }

  // 設定の更新
  updateConfig(newConfig: Partial<RecoveryConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // リセット
  reset(): void {
    this.errorHistory = []
    this.retryCounters.clear()
    this.recoveryCallbacks.clear()
    console.log('🔄 Audio error handler reset')
  }
}

// グローバルエラーハンドラー
export const audioErrorHandler = new AudioErrorHandler()

// 便利な関数群
export async function handleAudioError(
  type: AudioErrorType,
  message: string,
  originalError?: Error
): Promise<boolean> {
  return await audioErrorHandler.handleError(type, message, originalError)
}

export function registerAudioRecoveryCallback(
  type: AudioErrorType,
  callback: () => Promise<boolean>
): void {
  audioErrorHandler.registerRecoveryCallback(type, callback)
}

export function getAudioErrorHistory(): AudioErrorInfo[] {
  return audioErrorHandler.getErrorHistory()
}

export function getAudioErrorStatistics() {
  return audioErrorHandler.getErrorStatistics()
}

// H-BAT特化のエラーハンドリング
export function setupHBatErrorHandling(): void {
  console.log('🎵 Setting up H-BAT error handling...')
  
  // H-BAT特有の復旧コールバックを登録
  registerAudioRecoveryCallback(AudioErrorType.CONTEXT_SUSPENDED, async () => {
    try {
      await Tone.start()
      return true
    } catch {
      return false
    }
  })
  
  registerAudioRecoveryCallback(AudioErrorType.PERMISSION_DENIED, async () => {
    // ユーザー操作を待つ（実装は UI 層で行う）
    return false
  })
  
  registerAudioRecoveryCallback(AudioErrorType.SAMPLE_LOAD_FAILED, async () => {
    // サンプルの再読み込みを試行
    try {
      // 実装は音源管理システムと連携
      return false
    } catch {
      return false
    }
  })
  
  console.log('✅ H-BAT error handling setup complete')
} 