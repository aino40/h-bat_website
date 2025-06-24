'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import HearingTestScreen from '@/components/test/HearingTestScreen'
import { useHearingTest } from '@/hooks/useHearingTest'
import { useStaircaseStore } from '@/stores/staircaseStore'
import { useTestNavigation } from '@/hooks/useTestNavigation'
import { TestProgress } from '@/components/navigation/TestProgress'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Headphones, AlertCircle, CheckCircle } from 'lucide-react'

// 聴力測定ページ
export default function HearingTestPage() {
  const router = useRouter()
  const { currentSession, startTest } = useStaircaseStore()
  const { steps, progress, completeCurrentStep, saveHearingThresholds } = useTestNavigation()
  const [sessionId, setSessionId] = useState<string>('')
  const [profileId, setProfileId] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  // セッション初期化
  useEffect(() => {
    if (!currentSession) {
      // セッションがない場合はユーザー情報入力画面に戻る
      console.warn('No current session found, redirecting to user-info')
      router.push('/user-info')
      return
    }

    console.log('Current session found:', currentSession)
    setSessionId(currentSession.sessionId)
    setProfileId(currentSession.profileId || '')
    setIsReady(true)

    // テスト開始をマーク
    startTest('hearing')
  }, [currentSession, router, startTest])

  // 聴力測定フック
  const {
    state,
    initialize,
    playTone,
    recordResponse,
    moveToNextFrequency,
    moveToPreviousFrequency,
    resetCurrentFrequency,
    stopTest,
    clearError,
    isReady: isTestReady,
    canRecordResponse,
    allResults
  } = useHearingTest(sessionId, profileId)

  // 初期化
  useEffect(() => {
    if (isReady && !state.isInitialized) {
      initialize()
    }
  }, [isReady, state.isInitialized, initialize])

  // テスト完了処理
  useEffect(() => {
    if (state.isCompleted && allResults.length > 0) {
      // 聴力閾値を保存
      const thresholds = allResults.reduce((acc, result) => {
        acc[`${result.frequency / 1000}kHz`] = result.thresholdDb
        return acc
      }, {} as Record<string, number>)
      
      saveHearingThresholds(thresholds)
      
      // 次のテストに移動（BST画面へ）
      setTimeout(() => {
        completeCurrentStep({ 
          thresholds,
          allResults,
          completedAt: new Date().toISOString()
        })
        // 直接BST画面に遷移
        router.push('/test/bst')
      }, 3000)
    }
  }, [state.isCompleted, allResults, saveHearingThresholds, completeCurrentStep, router])

  // 応答ハンドラー
  const handleResponse = (heard: boolean) => {
    if (!canRecordResponse) return
    recordResponse(heard)
  }

  // 設定ハンドラー
  const handleSettings = () => {
    // 設定画面を開く（将来の実装）
    console.warn('Settings clicked')
  }

  // 戻るハンドラー
  const handleBack = () => {
    stopTest()
    router.push('/test')
  }

  // ローディング画面
  if (!isReady || !isTestReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 mx-auto mb-4"
            >
              <Headphones className="w-12 h-12 text-blue-600" />
            </motion.div>
            <h2 className="text-xl font-semibold mb-2">聴力測定を準備中...</h2>
            <p className="text-gray-600 mb-4">
              音響システムを初期化しています。しばらくお待ちください。
            </p>
            {/* デバッグ情報 */}
            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
              <div>Session Ready: {isReady ? '✓' : '✗'}</div>
              <div>Test Ready: {isTestReady ? '✓' : '✗'}</div>
              <div>Session ID: {sessionId || 'None'}</div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // エラー画面
  if (state.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-red-800">エラーが発生しました</h2>
            <p className="text-gray-600 mb-4">{state.error}</p>
            <div className="space-y-2">
              <Button onClick={clearError} className="w-full">
                再試行
              </Button>
              <Button variant="outline" onClick={handleBack} className="w-full">
                戻る
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // 完了画面
  if (state.isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            >
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-4 text-green-800">聴力測定完了！</h2>
            <div className="space-y-3 mb-6">
              {allResults.map((result) => (
                <div key={result.frequency} className="flex justify-between items-center">
                  <span className="font-medium">{result.frequency / 1000}kHz:</span>
                  <span className="text-green-600 font-semibold">
                    {result.thresholdDb.toFixed(1)} dB SPL
                  </span>
                </div>
              ))}
            </div>
            <p className="text-gray-600 mb-4">
              次は拍子判別テスト（BST）に進みます...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <motion.div
                className="bg-green-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3 }}
              />
            </div>
            {/* 手動進行ボタン */}
            <Button
              onClick={() => router.push('/test/bst')}
              className="w-full"
              variant="outline"
            >
              BST テストに進む
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // メイン聴力測定画面
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <TestProgress
              currentStep="hearing"
              steps={steps}
              totalProgress={progress}
              showTimeEstimate={true}
            />
          </div>
          
          {/* Main Test Area */}
          <div className="lg:col-span-3">
            <HearingTestScreen
              currentFrequency={state.currentFrequency}
              currentLevel={state.currentLevel}
              isPlaying={state.isPlaying}
              isTestActive={state.isTestActive}
              progress={state.progress}
              onPlayTone={playTone}
              onResponse={handleResponse}
              onNextFrequency={moveToNextFrequency}
              onPreviousFrequency={moveToPreviousFrequency}
              onRestart={resetCurrentFrequency}
              onSettings={handleSettings}
              onBack={handleBack}
              error={state.error}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 