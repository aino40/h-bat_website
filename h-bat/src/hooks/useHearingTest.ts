'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { HearingTestController, HearingFrequency, HEARING_FREQUENCIES } from '@/lib/audio/hearing'
import { HearingStaircaseController, HearingResult } from '@/lib/hearing/staircaseController'

// 聴力測定の状態
export interface HearingTestState {
  // テスト状態
  isInitialized: boolean
  isTestActive: boolean
  isPlaying: boolean
  currentFrequency: HearingFrequency
  currentFrequencyIndex: number
  
  // 音響状態
  currentLevel: number
  isAudioReady: boolean
  
  // 進捗状態
  progress: {
    currentFrequencyIndex: number
    totalFrequencies: number
    trialsCompleted: number
    reversalsCount: number
    isConverged: boolean
  }
  
  // エラー状態
  error: string | null
  
  // 結果
  results: Map<HearingFrequency, HearingResult>
  isCompleted: boolean
}

// 聴力測定フック
export function useHearingTest(sessionId: string, profileId: string) {
  // 音響コントローラー
  const audioControllerRef = useRef<HearingTestController | null>(null)
  const staircaseControllerRef = useRef<HearingStaircaseController | null>(null)
  
  // 状態管理
  const [state, setState] = useState<HearingTestState>({
    isInitialized: false,
    isTestActive: false,
    isPlaying: false,
    currentFrequency: 1000,
    currentFrequencyIndex: 0,
    currentLevel: 40,
    isAudioReady: false,
    progress: {
      currentFrequencyIndex: 0,
      totalFrequencies: HEARING_FREQUENCIES.length,
      trialsCompleted: 0,
      reversalsCount: 0,
      isConverged: false
    },
    error: null,
    results: new Map(),
    isCompleted: false
  })

  // 初期化
  const initialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }))

      // 音響コントローラー初期化
      const audioController = new HearingTestController()
      await audioController.initialize()
      audioControllerRef.current = audioController

      // ステアケースコントローラー初期化
      const staircaseController = new HearingStaircaseController(sessionId, profileId)
      staircaseControllerRef.current = staircaseController

      // 初期設定
      const initialFrequency = HEARING_FREQUENCIES[0]!
      audioController.setFrequency(initialFrequency)
      staircaseController.setCurrentFrequency(initialFrequency)

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isAudioReady: true,
        isTestActive: true,
        currentFrequency: initialFrequency,
        currentLevel: staircaseController.getCurrentLevel()
      }))

    } catch (error) {
      console.error('Hearing test initialization failed:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize hearing test'
      }))
    }
  }, [sessionId, profileId])

  // 純音再生
  const playTone = useCallback(async () => {
    const audioController = audioControllerRef.current
    const staircaseController = staircaseControllerRef.current

    if (!audioController || !staircaseController || state.isPlaying) {
      return
    }

    try {
      setState(prev => ({ ...prev, isPlaying: true, error: null }))

      const currentLevel = staircaseController.getCurrentLevel()
      await audioController.playTone(currentLevel)

    } catch (error) {
      console.error('Tone playback failed:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to play tone'
      }))
    } finally {
      setState(prev => ({ ...prev, isPlaying: false }))
    }
  }, [state.isPlaying])

  // 応答記録
  const recordResponse = useCallback((heard: boolean) => {
    const staircaseController = staircaseControllerRef.current

    if (!staircaseController || state.isPlaying) {
      return undefined
    }

    try {
      // 応答時間測定（簡易版）
      const reactionTime = Date.now() % 10000 // 簡易的な反応時間

      // 応答を記録
      const trial = staircaseController.recordResponse(heard, reactionTime)
      
      // 進捗更新
      const progress = staircaseController.getCurrentProgress()
      const currentLevel = staircaseController.getCurrentLevel()

      setState(prev => ({
        ...prev,
        currentLevel,
        progress: {
          ...prev.progress,
          trialsCompleted: progress.trialsCompleted,
          reversalsCount: progress.reversalsCount,
          isConverged: progress.isConverged
        }
      }))

      // 現在の周波数が完了した場合
      if (staircaseController.isCurrentFrequencyCompleted()) {
        const result = staircaseController.getCurrentResult()
        if (result) {
          setState(prev => ({
            ...prev,
            results: new Map(prev.results).set(state.currentFrequency, result)
          }))
        }

        // 次の周波数に移動
        const nextFrequency = staircaseController.moveToNextFrequency()
        if (nextFrequency) {
          moveToFrequency(nextFrequency)
        } else {
          // 全テスト完了
          completeTest()
        }
      }

      return trial
    } catch (error) {
      console.error('Failed to record response:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to record response'
      }))
      return undefined
    }
  }, [state.isPlaying, state.currentFrequency])

  // 周波数移動
  const moveToFrequency = useCallback((frequency: HearingFrequency) => {
    const audioController = audioControllerRef.current
    const staircaseController = staircaseControllerRef.current

    if (!audioController || !staircaseController) {
      return
    }

    try {
      // 音響コントローラーの周波数設定
      audioController.setFrequency(frequency)
      
      // ステアケースコントローラーの周波数設定
      staircaseController.setCurrentFrequency(frequency)
      
      // 状態更新
      const frequencyIndex = HEARING_FREQUENCIES.indexOf(frequency)
      const progress = staircaseController.getCurrentProgress()
      const currentLevel = staircaseController.getCurrentLevel()

      setState(prev => ({
        ...prev,
        currentFrequency: frequency,
        currentFrequencyIndex: frequencyIndex,
        currentLevel,
        progress: {
          ...prev.progress,
          currentFrequencyIndex: frequencyIndex,
          trialsCompleted: progress.trialsCompleted,
          reversalsCount: progress.reversalsCount,
          isConverged: progress.isConverged
        }
      }))

    } catch (error) {
      console.error('Failed to move to frequency:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to change frequency'
      }))
    }
  }, [])

  // 次の周波数に移動
  const moveToNextFrequency = useCallback(() => {
    const staircaseController = staircaseControllerRef.current
    if (!staircaseController) return

    const nextFrequency = staircaseController.moveToNextFrequency()
    if (nextFrequency) {
      moveToFrequency(nextFrequency)
    }
  }, [moveToFrequency])

  // 前の周波数に移動
  const moveToPreviousFrequency = useCallback(() => {
    const staircaseController = staircaseControllerRef.current
    if (!staircaseController) return

    const previousFrequency = staircaseController.moveToPreviousFrequency()
    if (previousFrequency) {
      moveToFrequency(previousFrequency)
    }
  }, [moveToFrequency])

  // テスト完了
  const completeTest = useCallback(() => {
    const staircaseController = staircaseControllerRef.current
    if (!staircaseController) return

    try {
      // 最終結果取得
      const sessionResult = staircaseController.getSessionResult()
      
      setState(prev => ({
        ...prev,
        isTestActive: false,
        isCompleted: true,
        results: sessionResult.results
      }))

    } catch (error) {
      console.error('Failed to complete test:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to complete test'
      }))
    }
  }, [])

  // 現在の周波数リセット
  const resetCurrentFrequency = useCallback(() => {
    const staircaseController = staircaseControllerRef.current
    if (!staircaseController) return

    try {
      staircaseController.resetCurrentFrequency()
      
      const progress = staircaseController.getCurrentProgress()
      const currentLevel = staircaseController.getCurrentLevel()

      setState(prev => ({
        ...prev,
        currentLevel,
        progress: {
          ...prev.progress,
          trialsCompleted: progress.trialsCompleted,
          reversalsCount: progress.reversalsCount,
          isConverged: progress.isConverged
        }
      }))

    } catch (error) {
      console.error('Failed to reset current frequency:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to reset frequency'
      }))
    }
  }, [])

  // 全テストリセット
  const resetTest = useCallback(() => {
    const staircaseController = staircaseControllerRef.current
    if (!staircaseController) return

    try {
      staircaseController.resetAll()
      
      const initialFrequency = HEARING_FREQUENCIES[0]!
      moveToFrequency(initialFrequency)

      setState(prev => ({
        ...prev,
        isTestActive: true,
        isCompleted: false,
        results: new Map(),
        error: null
      }))

    } catch (error) {
      console.error('Failed to reset test:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to reset test'
      }))
    }
  }, [moveToFrequency])

  // 停止
  const stopTest = useCallback(() => {
    const audioController = audioControllerRef.current
    
    if (audioController) {
      audioController.stopAll()
    }

    setState(prev => ({
      ...prev,
      isTestActive: false,
      isPlaying: false
    }))
  }, [])

  // クリーンアップ
  const cleanup = useCallback(() => {
    const audioController = audioControllerRef.current

    if (audioController) {
      audioController.dispose()
      audioControllerRef.current = null
    }

    setState(prev => ({
      ...prev,
      isInitialized: false,
      isTestActive: false,
      isAudioReady: false
    }))
  }, [])

  // エラークリア
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    // 状態
    state,
    
    // アクション
    initialize,
    playTone,
    recordResponse,
    moveToNextFrequency,
    moveToPreviousFrequency,
    moveToFrequency,
    resetCurrentFrequency,
    resetTest,
    stopTest,
    clearError,
    cleanup,

    // ヘルパー
    isReady: state.isInitialized && state.isAudioReady,
    canPlayTone: state.isTestActive && !state.isPlaying && state.isAudioReady,
    canRecordResponse: state.isTestActive && !state.isPlaying,
    
    // 進捗情報
    progressPercent: (state.progress.currentFrequencyIndex / state.progress.totalFrequencies) * 100,
    frequencyProgressPercent: state.progress.isConverged ? 100 : (state.progress.reversalsCount / 6) * 100,
    
    // 結果情報
    currentResult: state.results.get(state.currentFrequency),
    allResults: Array.from(state.results.values()),
    completedFrequencies: Array.from(state.results.keys())
  }
} 