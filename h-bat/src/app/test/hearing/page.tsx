'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import HearingTestScreen from '@/components/test/HearingTestScreen'
import { useHearingTest } from '@/hooks/useHearingTest'
import { useStaircaseStore } from '@/stores/staircaseStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Headphones, AlertCircle, CheckCircle } from 'lucide-react'

// 聴力測定ページ
export default function HearingTestPage() {
  const router = useRouter()
  const { currentSession, startTest } = useStaircaseStore()
  const [sessionId, setSessionId] = useState<string>('')
  const [profileId, setProfileId] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  // セッション初期化
  useEffect(() => {
    if (!currentSession) {
      // セッションがない場合は前のページに戻る
      router.push('/test')
      return
    }

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
      // 次のテストに移動
      setTimeout(() => {
        router.push('/test/bst')
      }, 3000)
    }
  }, [state.isCompleted, allResults, router])

  // 応答ハンドラー
  const handleResponse = (heard: boolean) => {
    if (!canRecordResponse) return
    recordResponse(heard)
  }

  // 設定ハンドラー
  const handleSettings = () => {
    // 設定画面を開く（将来の実装）
    console.log('Settings clicked')
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
            <p className="text-gray-600">
              音響システムを初期化しています。しばらくお待ちください。
            </p>
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
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-green-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3 }}
              />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // メイン聴力測定画面
  return (
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
  )
} 