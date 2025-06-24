'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { 
  AudioEngineState, 
  initializeAudioEngine, 
  startAudioWithUserGesture, 
  stopAudioEngine,
  getAudioEngineState,
  setMasterVolume,
  getMasterVolume,
  performAudioHealthCheck
} from '@/lib/audio/core'

// 音響コンテキストの型定義
interface AudioContextType {
  // 状態
  state: AudioEngineState
  isLoading: boolean
  
  // 基本操作
  initialize: () => Promise<boolean>
  start: () => Promise<boolean>
  stop: () => void
  
  // 音量制御
  setVolume: (volumeDb: number) => void
  getVolume: () => number
  
  // ヘルスチェック
  healthCheck: () => ReturnType<typeof performAudioHealthCheck>
  
  // 権限要求
  requestUserPermission: () => Promise<boolean>
}

// 音響コンテキストの作成
const AudioContext = createContext<AudioContextType | null>(null)

// 音響プロバイダーのProps
interface AudioProviderProps {
  children: ReactNode
  autoInitialize?: boolean
}

// 音響プロバイダーコンポーネント
export function AudioProvider({ children, autoInitialize = true }: AudioProviderProps) {
  const [state, setState] = useState<AudioEngineState>(() => {
    // Server-side safe initialization
    if (typeof window === 'undefined') {
      return {
        isInitialized: false,
        isStarted: false,
        hasUserPermission: false,
        context: null,
        masterVolume: null,
        error: null
      }
    }
    return getAudioEngineState()
  })
  const [isLoading, setIsLoading] = useState(false)

  // 状態の更新（依存関係を最小化）
  const updateState = useCallback(() => {
    if (typeof window !== 'undefined') {
      setState(getAudioEngineState())
    }
  }, []) // 空の依存配列で安定化

  // 音響エンジンの初期化
  const initialize = useCallback(async (): Promise<boolean> => {
    if (state.isInitialized) {
      return true
    }

    setIsLoading(true)
    try {
      const success = await initializeAudioEngine()
      updateState()
      return success
    } catch (error) {
      console.error('Failed to initialize audio engine:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [state.isInitialized, updateState])

  // ユーザー操作による音響開始
  const start = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      const success = await startAudioWithUserGesture()
      updateState()
      return success
    } catch (error) {
      console.error('Failed to start audio:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [updateState])

  // 音響エンジンの停止
  const stop = useCallback((): void => {
    try {
      stopAudioEngine()
      updateState()
    } catch (error) {
      console.error('Failed to stop audio engine:', error)
    }
  }, [updateState])

  // 音量設定
  const setVolume = useCallback((volumeDb: number): void => {
    try {
      setMasterVolume(volumeDb)
      updateState()
    } catch (error) {
      console.error('Failed to set volume:', error)
    }
  }, [updateState])

  // 音量取得
  const getVolume = useCallback((): number => {
    return getMasterVolume()
  }, [])

  // ヘルスチェック
  const healthCheck = useCallback(() => {
    return performAudioHealthCheck()
  }, [])

  // ユーザー権限の要求
  const requestUserPermission = useCallback(async (): Promise<boolean> => {
    try {
      // 初期化されていない場合は先に初期化
      if (!state.isInitialized) {
        const initSuccess = await initialize()
        if (!initSuccess) {
          return false
        }
      }

      // ユーザージェスチャーによる音響開始
      return await start()
    } catch (error) {
      console.error('Failed to request user permission:', error)
      return false
    }
  }, [state.isInitialized, initialize, start])

  // 自動初期化（依存配列から initialize を除去）
  useEffect(() => {
    if (typeof window !== 'undefined' && autoInitialize && !state.isInitialized && !isLoading) {
      initialize()
    }
  }, [autoInitialize, state.isInitialized, isLoading]) // initialize を除去

  // 状態の定期更新（デバッグ用）- 本番では無効化
  useEffect(() => {
    // 本番環境では定期更新を無効化してパフォーマンス向上
    if (process.env.NODE_ENV !== 'production') {
      const interval = setInterval(() => {
        if (typeof window !== 'undefined') {
          setState(getAudioEngineState())
        }
      }, 1000)
      return () => clearInterval(interval)
    }
    // production環境では何もしない（undefinedを返す）
    return undefined
  }, []) // 空の依存配列でループを防止

  // コンテキスト値
  const contextValue: AudioContextType = {
    state,
    isLoading,
    initialize,
    start,
    stop,
    setVolume,
    getVolume,
    healthCheck,
    requestUserPermission
  }

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  )
}

// 音響コンテキストのカスタムフック
export function useAudio(): AudioContextType {
  const context = useContext(AudioContext)
  
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  
  return context
}

// 音響エンジンの状態チェック用フック
export function useAudioState() {
  const { state, isLoading, healthCheck } = useAudio()
  
  return {
    isReady: state.isInitialized && state.isStarted && state.hasUserPermission,
    isInitialized: state.isInitialized,
    isStarted: state.isStarted,
    hasPermission: state.hasUserPermission,
    isLoading,
    error: state.error,
    health: healthCheck()
  }
}

// 音量制御用フック
export function useAudioVolume() {
  const { setVolume, getVolume } = useAudio()
  const [volume, setVolumeState] = useState(getVolume())

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume)
    setVolumeState(newVolume)
  }, [setVolume])

  useEffect(() => {
    setVolumeState(getVolume())
  }, [getVolume])

  return {
    volume,
    setVolume: updateVolume,
    increaseVolume: () => updateVolume(Math.min(0, volume + 5)),
    decreaseVolume: () => updateVolume(Math.max(-60, volume - 5)),
    mute: () => updateVolume(-60),
    unmute: () => updateVolume(-10)
  }
}

// 音響権限要求用フック
export function useAudioPermission() {
  const { requestUserPermission, state } = useAudio()
  const [isRequesting, setIsRequesting] = useState(false)

  const requestPermission = useCallback(async () => {
    if (state.hasUserPermission) {
      return true
    }

    setIsRequesting(true)
    try {
      const success = await requestUserPermission()
      return success
    } finally {
      setIsRequesting(false)
    }
  }, [requestUserPermission, state.hasUserPermission])

  return {
    hasPermission: state.hasUserPermission,
    isRequesting,
    requestPermission
  }
} 