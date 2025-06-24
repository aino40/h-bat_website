'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Volume2, 
  RotateCcw, 
  ChevronRight,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'

import { useBSTTest, BSTTestConfig, BSTTestResult } from '@/hooks/useBSTTest'
import { useStaircaseStore } from '@/stores/staircaseStore'
import { BSTTrial } from '@/lib/bst/staircaseController'

// BST結果可視化コンポーネント
const BSTResultVisualization: React.FC<{ result: BSTTestResult }> = ({ result }) => {
  const { summary, quality } = result

  return (
    <div className="space-y-6">
      {/* 総合評価 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
            BST テスト結果
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {summary.threshold.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500">閾値 (dB)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Math.round(summary.confidence * 100)}%
              </div>
              <div className="text-sm text-gray-500">信頼度</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {Math.round(summary.accuracy * 100)}%
              </div>
              <div className="text-sm text-gray-500">正答率</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {Math.round(summary.duration / 60)}
              </div>
              <div className="text-sm text-gray-500">所要時間(分)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 評価グレード */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className={`
              inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold
              ${quality.grade === 'A' ? 'bg-green-100 text-green-800' :
                quality.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                quality.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                quality.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'}
            `}>
              {quality.grade}
            </div>
            <div>
              <div className="text-xl font-semibold mb-2">
                スコア: {quality.score}点
              </div>
              <div className="text-gray-600">
                {quality.feedback}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// BST進捗表示コンポーネント
const BSTProgressDisplay: React.FC<{
  progress: any
  currentTrial: any
}> = ({ progress, currentTrial }) => {
  const progressPercentage = Math.min((progress.reversalsCount / progress.targetReversals) * 100, 100)

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* 全体進捗 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>BST 進捗</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress 
              value={progressPercentage}
              max={100}
              className={`h-2 transition-all duration-300 ${
                progress.isNearCompletion ? 'animate-pulse' : ''
              }`}
            />
          </div>

          {/* 詳細情報 */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">
                {progress.trialsCompleted}
              </div>
              <div className="text-xs text-gray-500">試行回数</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-600">
                {progress.reversalsCount}
              </div>
              <div className="text-xs text-gray-500">反転回数</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-600">
                {progress.currentVolumeDifference.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">音量差(dB)</div>
            </div>
          </div>

          {/* 現在のパターン表示 */}
          {currentTrial.patternType && (
            <div className="text-center text-sm text-gray-600">
              現在のパターン: <span className="font-semibold">
                {currentTrial.patternType === '2beat' ? '2拍子' : '3拍子'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// フィードバック表示コンポーネント
const BSTFeedback: React.FC<{ feedback: any }> = ({ feedback }) => {
  if (!feedback.show) return null

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        exit={{ y: -20 }}
        className={`
          px-8 py-4 rounded-full text-white font-bold text-lg shadow-lg
          ${feedback.isCorrect ? 'bg-green-500' : 'bg-red-500'}
        `}
      >
        {feedback.isCorrect ? (
          <>
            <Zap className="w-6 h-6 inline mr-2" />
            正解！
          </>
        ) : (
          <>
            <RotateCcw className="w-6 h-6 inline mr-2" />
            もう一度
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// メインBSTテストページ
export default function BSTTestPage() {
  const router = useRouter()
  const { 
    currentSession, 
    recordBSTTrial, 
    setBSTResult, 
    completeTest,
    getHearingThresholdAverage 
  } = useStaircaseStore()

  const [showResult, setShowResult] = useState(false)
  const [testResult, setTestResult] = useState<BSTTestResult | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  // セッション確認
  useEffect(() => {
    if (!currentSession) {
      router.push('/test/hearing')
      return
    }
  }, [currentSession, router])

  // BST テスト設定
  const testConfig: BSTTestConfig = {
    sessionId: currentSession?.sessionId || '',
    profileId: currentSession?.profileId || '',
    hearingThreshold: getHearingThresholdAverage(),
    onTrialComplete: (trial: BSTTrial) => {
      // データベースに試行データを保存
      const trialData: any = {
        sessionId: currentSession?.sessionId || '',
        trialIndex: trial.trialIndex,
        volumeDifference: trial.volumeDifference,
        patternType: trial.patternType,
        userAnswer: trial.userAnswer,
        correct: trial.correct,
        strongBeatLevel: trial.strongBeatLevel,
        weakBeatLevel: trial.weakBeatLevel,
        isReversal: trial.isReversal,
        timestamp: trial.timestamp
      }
      
      if (trial.reactionTime !== undefined) {
        trialData.reactionTime = trial.reactionTime
      }
      
      recordBSTTrial(trialData)
    },
    onProgress: (progress) => {
      console.warn('BST Progress:', progress)
    },
    onError: (error) => {
      console.error('BST Test Error:', error)
    }
  }

  // BST テストフック
  const {
    state,
    error,
    progress,
    currentTrial,
    feedback,
    playAudio,
    stopAudio,
    submitAnswer,
    getResult,
    getDebugInfo,
    canPlay,
    canAnswer,
    isPlaying,
    isCompleted,
    hasError
  } = useBSTTest(testConfig)

  // デバッグ情報（開発環境のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('BST State:', {
        state,
        canPlay,
        canAnswer,
        isPlaying,
        isCompleted,
        hasError,
        currentTrial,
        progress,
        debugInfo: getDebugInfo?.()
      })
    }
  }, [state, canPlay, canAnswer, isPlaying, isCompleted, hasError, currentTrial, progress, getDebugInfo])

  // テスト完了処理
  useEffect(() => {
    if (isCompleted) {
      const result = getResult()
      if (result) {
        setTestResult(result)
        setShowResult(true)
        
        // データベースに結果保存
        setBSTResult({
          sessionId: currentSession?.sessionId || '',
          volumeDifferenceThreshold: result.summary.threshold,
          confidence: result.summary.confidence,
          accuracy: result.summary.accuracy,
          totalTrials: result.result.totalTrials,
          totalReversals: result.result.totalReversals,
          duration: result.summary.duration
        })
      }
    }
  }, [isCompleted, getResult, setBSTResult, currentSession])

  // 次のテストへ進む
  const handleContinueToNext = async () => {
    setIsNavigating(true)
    
    try {
      // テスト完了をマーク
      await completeTest('bst')
      
      // 次のテスト（BIT）へ遷移
      router.push('/test/bit')
    } catch (error) {
      console.error('Failed to proceed to next test:', error)
      setIsNavigating(false)
    }
  }

  // セッションがない場合
  if (!currentSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">セッションエラー</h3>
            <p className="text-gray-600 mb-4">
              有効なセッションが見つかりません
            </p>
            <Button onClick={() => router.push('/test/hearing')}>
              聴力テストから開始
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // エラー画面
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">テストエラー</h3>
            <p className="text-gray-600 mb-4">
              {error?.message || 'BST テストでエラーが発生しました'}
            </p>
            <Button onClick={() => window.location.reload()}>
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 結果表示画面
  if (showResult && testResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">BST テスト完了！</h1>
            <p className="text-gray-600">
              拍子知覚テストが完了しました。結果をご確認ください。
            </p>
          </div>

          <BSTResultVisualization result={testResult} />

          <div className="mt-8 text-center">
            <Button 
              onClick={handleContinueToNext}
              disabled={isNavigating}
              size="lg"
              className="px-8"
            >
              {isNavigating ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  次のテストへ...
                </>
              ) : (
                <>
                  次のテスト（BIT）へ進む
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ローディング画面
  if (state === 'initializing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">BST テスト準備中</h3>
            <p className="text-gray-600">音響システムを初期化しています...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // メインテスト画面
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-center mb-2">
            BST - 拍子知覚テスト
          </h1>
          <p className="text-gray-600 text-center">
            音楽を聞いて、2拍子か3拍子かを判定してください
          </p>
        </div>

        {/* 進捗表示 */}
        <BSTProgressDisplay 
          progress={progress}
          currentTrial={currentTrial}
        />

        {/* メインテストエリア */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-center">
              <Volume2 className="w-6 h-6 mr-2" />
              音を聞いて判定してください
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* 再生ボタン */}
              <div>
                <Button
                  onClick={isPlaying ? stopAudio : playAudio}
                  disabled={!canPlay && !isPlaying}
                  size="lg"
                  className={`
                    w-20 h-20 rounded-full text-lg font-bold
                    ${isPlaying 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-blue-500 hover:bg-blue-600'
                    }
                  `}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8" />
                  )}
                </Button>
              </div>

              {/* 状態別メッセージ */}
              <div className="space-y-2">
                {state === 'ready' && (
                  <p className="text-lg font-medium">
                    ▶️ ボタンを押して音楽を再生してください
                  </p>
                )}
                {state === 'playing' && (
                  <p className="text-lg font-medium text-blue-600">
                    🎵 音楽を聞いています...
                  </p>
                )}
                {state === 'waiting-response' && (
                  <p className="text-lg font-medium text-purple-600">
                    💭 2拍子ですか？3拍子ですか？
                  </p>
                )}
                {state === 'processing' && (
                  <p className="text-lg font-medium text-orange-600">
                    ⏳ 処理中...
                  </p>
                )}
              </div>

              {/* 回答ボタン */}
              {canAnswer && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 gap-4 max-w-md mx-auto"
                >
                  <Button
                    onClick={() => submitAnswer('2beat')}
                    size="lg"
                    variant="outline"
                    className="h-16 text-lg font-bold border-2 border-blue-300 hover:bg-blue-50"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">2</div>
                      <div className="text-sm">拍子</div>
                    </div>
                  </Button>
                  <Button
                    onClick={() => submitAnswer('3beat')}
                    size="lg"
                    variant="outline"
                    className="h-16 text-lg font-bold border-2 border-purple-300 hover:bg-purple-50"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">3</div>
                      <div className="text-sm">拍子</div>
                    </div>
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ヒント */}
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-sm text-gray-600">
              💡 <strong>ヒント:</strong> 
              強く聞こえる音（強拍）の間隔を数えてみてください。
              2拍子は「強-弱」、3拍子は「強-弱-弱」のパターンです。
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィードバック表示 */}
      <BSTFeedback feedback={feedback} />
    </div>
  )
} 