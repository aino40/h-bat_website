'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Volume2, 
  RotateCcw, 
  Zap
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { 
  BSTAudioGenerator
} from '@/lib/audio/bst'
import { 
  BSTStaircaseController, 
  BSTResult 
} from '@/lib/bst/staircaseController'

// プロパティ型定義
interface BSTTestScreenProps {
  sessionId: string
  profileId: string
  hearingThreshold: number // 聴力閾値平均値
  onComplete: (result: BSTResult) => void
  onError: (error: Error) => void
}

// テスト状態
type TestState = 'loading' | 'ready' | 'playing' | 'waiting' | 'completed' | 'error'

// BST専用のフィードバック表示
const BSTFeedback: React.FC<{ 
  isCorrect: boolean | null
  show: boolean 
}> = ({ isCorrect, show }) => {
  if (!show || isCorrect === null) return null

  return (
    <AnimatePresence>
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
            ${isCorrect ? 'bg-green-500' : 'bg-red-500'}
          `}
        >
          {isCorrect ? (
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
    </AnimatePresence>
  )
}

// BST進捗表示コンポーネント
const BSTProgress: React.FC<{
  trialsCompleted: number
  reversalsCount: number
  targetReversals: number
  currentVolumeDifference: number
  isNearCompletion: boolean
}> = ({ 
  trialsCompleted, 
  reversalsCount, 
  targetReversals, 
  currentVolumeDifference,
  isNearCompletion 
}) => {
  const progressPercentage = Math.min((reversalsCount / targetReversals) * 100, 100)

  return (
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
            isNearCompletion ? 'animate-pulse' : ''
          }`}
        />
      </div>

      {/* 詳細情報 */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-2xl font-bold text-blue-600">{trialsCompleted}</div>
          <div className="text-xs text-gray-500">試行回数</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-purple-600">{reversalsCount}</div>
          <div className="text-xs text-gray-500">反転回数</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-orange-600">
            {currentVolumeDifference.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">音量差(dB)</div>
        </div>
      </div>
    </div>
  )
}

// メインBSTテストスクリーンコンポーネント
export const BSTTestScreen: React.FC<BSTTestScreenProps> = ({
  sessionId,
  profileId,
  hearingThreshold,
  onComplete,
  onError
}) => {
  // 状態管理
  const [testState, setTestState] = useState<TestState>('loading')
  const [audioGenerator, setAudioGenerator] = useState<BSTAudioGenerator | null>(null)
  const [staircaseController, setStaircaseController] = useState<BSTStaircaseController | null>(null)
  const [currentPattern, setCurrentPattern] = useState<'2beat' | '3beat' | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [lastResponse, setLastResponse] = useState<boolean | null>(null)
  const [reactionStartTime, setReactionStartTime] = useState<number | null>(null)

  // 進捗状態
  const [progress, setProgress] = useState({
    trialsCompleted: 0,
    reversalsCount: 0,
    currentVolumeDifference: 20,
    isConverged: false,
    estimatedRemainingTrials: 0
  })

  // 初期化
  useEffect(() => {
    const initializeTest = async () => {
      try {
        setTestState('loading')

        // オーディオジェネレーター初期化
        const generator = new BSTAudioGenerator({
          strongBeatLevel: hearingThreshold + 30 // 聴力閾値+30dB
        })
        await generator.initialize()
        setAudioGenerator(generator)

        // ステアケースコントローラー初期化
        const controller = new BSTStaircaseController(
          sessionId,
          profileId,
          hearingThreshold
        )
        setStaircaseController(controller)

        setTestState('ready')
      } catch (error) {
        console.error('BST test initialization failed:', error)
        setTestState('error')
        onError(error as Error)
      }
    }

    initializeTest()

    // クリーンアップ
    return () => {
      if (audioGenerator) {
        audioGenerator.dispose()
      }
    }
  }, [sessionId, profileId, hearingThreshold, onError])

  // 新しい試行開始
  const startNewTrial = useCallback(() => {
    if (!audioGenerator || !staircaseController) return

    try {
      // ランダムパターン生成
      const pattern = audioGenerator.generateRandomPattern()
      setCurrentPattern(pattern)

      // 音響設定更新
      const volumeDifference = staircaseController.getCurrentVolumeDifference()
      const strongBeatLevel = staircaseController.getStrongBeatLevel()
      
      audioGenerator.setPattern(pattern)
      audioGenerator.setVolumeDifference(volumeDifference)
      audioGenerator.setStrongBeatLevel(strongBeatLevel)

      // 進捗更新
      const currentProgress = staircaseController.getProgress()
      setProgress(currentProgress)

      setTestState('ready')
    } catch (error) {
      console.error('Failed to start new trial:', error)
      onError(error as Error)
    }
  }, [audioGenerator, staircaseController, onError])

  // 音響再生
  const playPattern = useCallback(async () => {
    if (!audioGenerator || testState !== 'ready') return

    try {
      setTestState('playing')
      setIsPlaying(true)
      setReactionStartTime(Date.now())

      await audioGenerator.playPattern()

      // 6秒後に自動停止
      setTimeout(() => {
        setIsPlaying(false)
        setTestState('waiting')
      }, 6000)

    } catch (error) {
      console.error('Failed to play pattern:', error)
      setIsPlaying(false)
      setTestState('ready')
      onError(error as Error)
    }
  }, [audioGenerator, testState, onError])

  // 音響停止
  const stopPattern = useCallback(() => {
    if (!audioGenerator) return

    audioGenerator.stopPattern()
    setIsPlaying(false)
    setTestState('ready')
  }, [audioGenerator])

  // ユーザー回答処理
  const handleAnswer = useCallback((userAnswer: '2beat' | '3beat') => {
    if (!staircaseController || !currentPattern || testState !== 'waiting') return

    try {
      // 反応時間計算
      const reactionTime = reactionStartTime ? Date.now() - reactionStartTime : undefined

      // 回答記録
      const trial = staircaseController.recordResponse(
        currentPattern,
        userAnswer,
        reactionTime
      )

      // フィードバック表示
      setLastResponse(trial.correct)
      setShowFeedback(true)

      setTimeout(() => {
        setShowFeedback(false)
        
        // 収束判定
        if (staircaseController.isConverged()) {
          const result = staircaseController.getResult()
          if (result) {
            setTestState('completed')
            onComplete(result)
          }
        } else {
          // 次の試行へ
          startNewTrial()
        }
      }, 1500)

    } catch (error) {
      console.error('Failed to handle answer:', error)
      onError(error as Error)
    }
  }, [
    staircaseController, 
    currentPattern, 
    testState, 
    reactionStartTime, 
    startNewTrial, 
    onComplete, 
    onError
  ])

  // 初回試行開始
  useEffect(() => {
    if (testState === 'ready' && !currentPattern) {
      startNewTrial()
    }
  }, [testState, currentPattern, startNewTrial])

  // ローディング画面
  if (testState === 'loading') {
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

  // エラー画面
  if (testState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-red-800">
              初期化エラー
            </h3>
            <p className="text-gray-600 mb-4">
              音響システムの初期化に失敗しました
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 完了画面
  if (testState === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✅</span>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-green-800">
              BST テスト完了！
            </h3>
            <p className="text-gray-600">
              拍子知覚テストが完了しました
            </p>
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
        <Card className="mb-6">
          <CardContent className="p-6">
            <BSTProgress
              trialsCompleted={progress.trialsCompleted}
              reversalsCount={progress.reversalsCount}
              targetReversals={6}
              currentVolumeDifference={progress.currentVolumeDifference}
              isNearCompletion={progress.reversalsCount >= 4}
            />
          </CardContent>
        </Card>

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
                  onClick={isPlaying ? stopPattern : playPattern}
                  disabled={testState !== 'ready' && testState !== 'playing'}
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

              {/* 説明テキスト */}
              <div className="space-y-2">
                {testState === 'ready' && (
                  <p className="text-lg font-medium">
                    ▶️ ボタンを押して音楽を再生してください
                  </p>
                )}
                {testState === 'playing' && (
                  <p className="text-lg font-medium text-blue-600">
                    🎵 音楽を聞いています...
                  </p>
                )}
                {testState === 'waiting' && (
                  <p className="text-lg font-medium text-purple-600">
                    💭 2拍子ですか？3拍子ですか？
                  </p>
                )}
              </div>

              {/* 回答ボタン */}
              {testState === 'waiting' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 gap-4 max-w-md mx-auto"
                >
                  <Button
                    onClick={() => handleAnswer('2beat')}
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
                    onClick={() => handleAnswer('3beat')}
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
      <BSTFeedback 
        isCorrect={lastResponse} 
        show={showFeedback} 
      />
    </div>
  )
}

export default BSTTestScreen 