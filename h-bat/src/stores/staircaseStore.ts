'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { 
  StaircaseController, 
  StaircaseTrial, 
  StaircaseResult,
  StaircaseConfig,
  createStaircaseController,
  calculateStaircaseProgress
} from '@/lib/staircase/core'

// テストタイプ
export type TestType = 'hearing' | 'bst' | 'bit' | 'bfit'

// セッション状態
export interface TestSession {
  sessionId: string
  profileId: string | null
  currentTest: TestType | null
  startedAt: Date
  completedAt: Date | null
  
  // 各テストの状態
  hearingTest: {
    frequencies: number[] // [1000, 2000, 4000]
    currentFrequencyIndex: number
    controllers: Map<number, StaircaseController>
    results: Map<number, StaircaseResult>
    isCompleted: boolean
  }
  
  bstTest: {
    controller: StaircaseController | null
    result: StaircaseResult | null
    isCompleted: boolean
  }
  
  bitTest: {
    controller: StaircaseController | null
    result: StaircaseResult | null
    isCompleted: boolean
  }
  
  bfitTest: {
    controller: StaircaseController | null
    result: StaircaseResult | null
    isCompleted: boolean
  }
}

// ストアの状態
interface StaircaseStore {
  // セッション管理
  currentSession: TestSession | null
  sessionHistory: TestSession[]
  
  // 現在のテスト状態
  currentController: StaircaseController | null
  isTestActive: boolean
  
  // UI状態
  isLoading: boolean
  error: string | null
  
  // アクション
  // セッション管理
  startSession: (profileId?: string) => string
  endSession: () => void
  loadSession: (sessionId: string) => boolean
  
  // テスト開始・終了
  startTest: (testType: TestType, config?: Partial<StaircaseConfig>) => void
  endTest: () => void
  
  // 試行記録
  recordTrial: (response: boolean) => StaircaseTrial | null
  
  // 聴力測定専用（複数周波数）
  startHearingTest: (frequencies?: number[]) => void
  nextHearingFrequency: () => boolean
  getCurrentHearingFrequency: () => number | null
  
  // 結果取得
  getCurrentResult: () => StaircaseResult | null
  getTestResult: (testType: TestType) => StaircaseResult | null
  getAllResults: () => { [key in TestType]?: StaircaseResult }
  
  // BST専用機能
  recordBSTTrial: (trial: {
    sessionId: string
    trialIndex: number
    volumeDifference: number
    patternType: '2beat' | '3beat'
    userAnswer: '2beat' | '3beat'
    correct: boolean
    reactionTime?: number
    strongBeatLevel: number
    weakBeatLevel: number
    isReversal: boolean
    timestamp: Date
  }) => void
  setBSTResult: (result: {
    sessionId: string
    volumeDifferenceThreshold: number
    confidence: number
    accuracy: number
    totalTrials: number
    totalReversals: number
    duration: number
  }) => void
  getHearingThresholdAverage: () => number
  completeTest: (testType: TestType) => Promise<void>
  
  // 進行状況
  getProgress: () => {
    reversalProgress: number
    trialProgress: number
    overallProgress: number
    estimatedRemainingTrials: number
  } | null
  
  // ユーティリティ
  reset: () => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}

// セッション作成ヘルパー
function createTestSession(profileId?: string): TestSession {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    sessionId,
    profileId: profileId || null,
    currentTest: null,
    startedAt: new Date(),
    completedAt: null,
    
    hearingTest: {
      frequencies: [1000, 2000, 4000],
      currentFrequencyIndex: 0,
      controllers: new Map(),
      results: new Map(),
      isCompleted: false
    },
    
    bstTest: {
      controller: null,
      result: null,
      isCompleted: false
    },
    
    bitTest: {
      controller: null,
      result: null,
      isCompleted: false
    },
    
    bfitTest: {
      controller: null,
      result: null,
      isCompleted: false
    }
  }
}

// Zustandストア
export const useStaircaseStore = create<StaircaseStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        currentSession: null,
        sessionHistory: [],
        currentController: null,
        isTestActive: false,
        isLoading: false,
        error: null,

        // セッション開始
        startSession: (profileId?: string) => {
          const session = createTestSession(profileId)
          
          set((state) => ({
            currentSession: session,
            sessionHistory: [...state.sessionHistory, session],
            error: null
          }))
          
          return session.sessionId
        },

        // セッション終了
        endSession: () => {
          const { currentSession } = get()
          if (!currentSession) return

          const completedSession = {
            ...currentSession,
            completedAt: new Date()
          }

          set((state) => ({
            currentSession: null,
            currentController: null,
            isTestActive: false,
            sessionHistory: state.sessionHistory.map(s => 
              s.sessionId === completedSession.sessionId ? completedSession : s
            )
          }))
        },

        // セッション読み込み
        loadSession: (sessionId: string) => {
          const { sessionHistory } = get()
          const session = sessionHistory.find(s => s.sessionId === sessionId)
          
          if (session) {
            set({ currentSession: session })
            return true
          }
          
          set({ error: `Session ${sessionId} not found` })
          return false
        },

        // テスト開始
        startTest: (testType: TestType, config?: Partial<StaircaseConfig>) => {
          const { currentSession } = get()
          if (!currentSession) {
            set({ error: 'No active session' })
            return
          }

          try {
            const controller = createStaircaseController(testType, config)
            
            const updatedSession = {
              ...currentSession,
              currentTest: testType
            }

            // テストタイプ別の設定
            switch (testType) {
              case 'bst':
                updatedSession.bstTest.controller = controller
                break
              case 'bit':
                updatedSession.bitTest.controller = controller
                break
              case 'bfit':
                updatedSession.bfitTest.controller = controller
                break
              case 'hearing':
                // 聴力測定は別メソッドで処理
                set({ error: 'Use startHearingTest for hearing tests' })
                return
            }

            set({
              currentSession: updatedSession,
              currentController: controller,
              isTestActive: true,
              error: null
            })
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to start test'
            })
          }
        },

        // テスト終了
        endTest: () => {
          const { currentSession, currentController } = get()
          if (!currentSession || !currentController) return

          try {
            const result = currentController.getResult()
            if (!result) {
              set({ error: 'No result available' })
              return
            }

            const updatedSession = { ...currentSession }
            
            // テストタイプ別の結果保存
            switch (currentSession.currentTest) {
              case 'bst':
                updatedSession.bstTest.result = result
                updatedSession.bstTest.isCompleted = true
                break
              case 'bit':
                updatedSession.bitTest.result = result
                updatedSession.bitTest.isCompleted = true
                break
              case 'bfit':
                updatedSession.bfitTest.result = result
                updatedSession.bfitTest.isCompleted = true
                break
            }

            updatedSession.currentTest = null

            set({
              currentSession: updatedSession,
              currentController: null,
              isTestActive: false
            })
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to end test'
            })
          }
        },

        // 試行記録
        recordTrial: (response: boolean) => {
          const { currentController, currentSession } = get()
          if (!currentController || !currentSession) {
            set({ error: 'No active test' })
            return null
          }

          try {
            const trial = currentController.recordTrial(response)
            
            // セッション更新
            const updatedSession = { ...currentSession }
            set({ currentSession: updatedSession })
            
            // 収束チェック
            if (currentController.isConverged()) {
              // 自動的にテスト終了
              setTimeout(() => {
                get().endTest()
              }, 100)
            }

            return trial
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to record trial'
            })
            return null
          }
        },

        // 聴力測定開始
        startHearingTest: (frequencies = [1000, 2000, 4000]) => {
          const { currentSession } = get()
          if (!currentSession) {
            set({ error: 'No active session' })
            return
          }

          try {
            const updatedSession = {
              ...currentSession,
              currentTest: 'hearing' as TestType,
              hearingTest: {
                ...currentSession.hearingTest,
                frequencies,
                currentFrequencyIndex: 0,
                controllers: new Map(),
                results: new Map(),
                isCompleted: false
              }
            }

            // 最初の周波数のコントローラーを作成
            const firstFreq = frequencies[0]
            if (firstFreq) {
              const controller = createStaircaseController('hearing')
              updatedSession.hearingTest.controllers.set(firstFreq, controller)
              
              set({
                currentSession: updatedSession,
                currentController: controller,
                isTestActive: true,
                error: null
              })
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to start hearing test'
            })
          }
        },

        // 次の聴力測定周波数
        nextHearingFrequency: () => {
          const { currentSession, currentController } = get()
          if (!currentSession || currentSession.currentTest !== 'hearing') {
            return false
          }

          try {
            // 現在の結果を保存
            if (currentController) {
              const result = currentController.getResult()
              if (result) {
                const currentFreq = currentSession.hearingTest.frequencies[currentSession.hearingTest.currentFrequencyIndex]
                if (currentFreq) {
                  currentSession.hearingTest.results.set(currentFreq, result)
                }
              }
            }

            // 次の周波数に進む
            const nextIndex = currentSession.hearingTest.currentFrequencyIndex + 1
            const nextFreq = currentSession.hearingTest.frequencies[nextIndex]

            if (!nextFreq) {
              // 全周波数完了
              const updatedSession = {
                ...currentSession,
                hearingTest: {
                  ...currentSession.hearingTest,
                  isCompleted: true
                },
                currentTest: null
              }

              set({
                currentSession: updatedSession,
                currentController: null,
                isTestActive: false
              })
              return false
            }

            // 次の周波数のコントローラーを作成
            const nextController = createStaircaseController('hearing')
            currentSession.hearingTest.controllers.set(nextFreq, nextController)
            
            const updatedSession = {
              ...currentSession,
              hearingTest: {
                ...currentSession.hearingTest,
                currentFrequencyIndex: nextIndex
              }
            }

            set({
              currentSession: updatedSession,
              currentController: nextController
            })

            return true
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to advance to next frequency'
            })
            return false
          }
        },

        // 現在の聴力測定周波数取得
        getCurrentHearingFrequency: () => {
          const { currentSession } = get()
          if (!currentSession || currentSession.currentTest !== 'hearing') {
            return null
          }

          const { frequencies, currentFrequencyIndex } = currentSession.hearingTest
          return frequencies[currentFrequencyIndex] || null
        },

        // 現在の結果取得
        getCurrentResult: () => {
          const { currentController } = get()
          return currentController?.getResult() || null
        },

        // テスト結果取得
        getTestResult: (testType: TestType) => {
          const { currentSession } = get()
          if (!currentSession) return null

          switch (testType) {
            case 'bst':
              return currentSession.bstTest.result || null
            case 'bit':
              return currentSession.bitTest.result || null
            case 'bfit':
              return currentSession.bfitTest.result || null
            case 'hearing':
              // 聴力測定は複数結果を統合
              const results = Array.from(currentSession.hearingTest.results.values())
              return results.length > 0 ? results[0] || null : null // 簡略化
            default:
              return null
          }
        },

        // 全結果取得
        getAllResults: () => {
          const { currentSession } = get()
          if (!currentSession) return {}

          const results: { [key in TestType]?: StaircaseResult } = {}

          if (currentSession.bstTest.result) {
            results.bst = currentSession.bstTest.result
          }
          if (currentSession.bitTest.result) {
            results.bit = currentSession.bitTest.result
          }
          if (currentSession.bfitTest.result) {
            results.bfit = currentSession.bfitTest.result
          }
          if (currentSession.hearingTest.results.size > 0) {
            // 聴力測定は最初の結果を代表として返す（簡略化）
            const firstResult = Array.from(currentSession.hearingTest.results.values())[0]
            if (firstResult) {
              results.hearing = firstResult
            }
          }

          return results
        },

        // 進行状況取得
        getProgress: () => {
          const { currentController, currentSession } = get()
          if (!currentController || !currentSession) return null

          const state = currentController.getState()
          const config = currentController.getDebugInfo().config

          return calculateStaircaseProgress(state, config)
        },

        // BST専用機能
        recordBSTTrial: (trial) => {
          console.warn('Recording BST trial:', trial)
          // TODO: Supabaseにデータ保存を実装
        },

        setBSTResult: (result) => {
          console.warn('Setting BST result:', result)
          // TODO: Supabaseに結果保存を実装
        },

        getHearingThresholdAverage: () => {
          const { currentSession } = get()
          if (!currentSession || !currentSession.hearingTest.isCompleted) {
            return 70 // デフォルト値
          }

          const results = Array.from(currentSession.hearingTest.results.values())
          if (results.length === 0) return 70

          const totalThreshold = results.reduce((sum, result) => sum + result.threshold, 0)
          return totalThreshold / results.length
        },

        completeTest: async (testType: TestType) => {
          const { currentSession } = get()
          if (!currentSession) return

          set((state) => {
            if (!state.currentSession) return state

            const updatedSession = { ...state.currentSession }
            
            switch (testType) {
              case 'bst':
                updatedSession.bstTest.isCompleted = true
                break
              case 'bit':
                updatedSession.bitTest.isCompleted = true
                break
              case 'bfit':
                updatedSession.bfitTest.isCompleted = true
                break
              case 'hearing':
                updatedSession.hearingTest.isCompleted = true
                break
            }

            return {
              ...state,
              currentSession: updatedSession
            }
          })
        },

        // リセット
        reset: () => {
          set({
            currentSession: null,
            sessionHistory: [],
            currentController: null,
            isTestActive: false,
            isLoading: false,
            error: null
          })
        },

        // エラー設定
        setError: (error: string | null) => {
          set({ error })
        },

        // ローディング設定
        setLoading: (loading: boolean) => {
          set({ isLoading: loading })
        }
      }),
      {
        name: 'h-bat-staircase-store',
        // セッション履歴のみ永続化（コントローラーは除外）
        partialize: (state) => ({
          sessionHistory: state.sessionHistory.map(session => ({
            ...session,
            // コントローラーは永続化しない（関数が含まれるため）
            hearingTest: {
              ...session.hearingTest,
              controllers: new Map() // 空のMapで初期化
            },
            bstTest: {
              ...session.bstTest,
              controller: null
            },
            bitTest: {
              ...session.bitTest,
              controller: null
            },
            bfitTest: {
              ...session.bfitTest,
              controller: null
            }
          }))
        })
      }
    ),
    {
      name: 'h-bat-staircase-store'
    }
  )
)

// カスタムフック
export function useCurrentTest() {
  return useStaircaseStore((state) => ({
    testType: state.currentSession?.currentTest,
    isActive: state.isTestActive,
    controller: state.currentController,
    progress: state.getProgress(),
    error: state.error
  }))
}

export function useTestResults() {
  return useStaircaseStore((state) => ({
    current: state.getCurrentResult(),
    all: state.getAllResults(),
    getResult: state.getTestResult
  }))
}

export function useHearingTest() {
  return useStaircaseStore((state) => ({
    currentFrequency: state.getCurrentHearingFrequency(),
    frequencies: state.currentSession?.hearingTest.frequencies || [],
    currentIndex: state.currentSession?.hearingTest.currentFrequencyIndex || 0,
    isCompleted: state.currentSession?.hearingTest.isCompleted || false,
    results: state.currentSession?.hearingTest.results || new Map(),
    start: state.startHearingTest,
    next: state.nextHearingFrequency
  }))
} 