'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Volume2, 
  RotateCcw, 
  Zap,
  Music,
  CheckCircle,
  XCircle
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { BSTAudioGenerator } from '@/lib/audio/bst'
import { BSTStaircaseController, BSTResult } from '@/lib/bst/staircaseController'

// プロパティ型定義
interface BSTTestScreenProps {
  sessionId: string
  profileId: string
  hearingThreshold: number // 聴力閾値平均値
  onComplete: (result: BSTResult) => void
  onError: (error: Error) => void
}

// テスト状態の型定義
type TestState = 'loading' | 'ready' | 'playing' | 'waiting' | 'completed' | 'error';

// BST専用のフィードバック表示
const BSTFeedback: React.FC<{ 
  isCorrect: boolean | null
  show: boolean 
}> = ({ isCorrect, show }) => {
  if (!show || isCorrect === null) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          exit={{ y: -20 }}
          className={`
            px-8 py-6 rounded-2xl text-white font-bold text-xl shadow-lg
            backdrop-blur-sm
            ${isCorrect 
              ? 'bg-green-500/90 shadow-green-500/20' 
              : 'bg-red-500/90 shadow-red-500/20'
            }
          `}
        >
          {isCorrect ? (
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8" />
              <span>正解！</span>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <XCircle className="w-8 h-8" />
              <span>もう一度</span>
            </div>
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
    <div className="space-y-6">
      {/* 全体進捗 */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-800">テスト進捗</h3>
            <p className="text-sm text-gray-500">
              {isNearCompletion ? "もう少しで完了です！" : "音の強弱を判別してください"}
            </p>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(progressPercentage)}%
          </div>
        </div>
        <Progress 
          value={progressPercentage}
          max={100}
          className={`h-3 rounded-full transition-all duration-300 ${
            isNearCompletion ? 'animate-pulse bg-blue-100' : ''
          }`}
        />
      </div>

      {/* 詳細情報カード */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {trialsCompleted}
              </div>
              <div className="text-sm text-gray-600">試行回数</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {reversalsCount}
              </div>
              <div className="text-sm text-gray-600">反転回数</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {currentVolumeDifference.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">音量差(dB)</div>
            </div>
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-gray-800 flex items-center justify-center space-x-3">
            <Music className="w-8 h-8 text-blue-600" />
            <span>拍子の強弱判別テスト</span>
          </CardTitle>
          <p className="text-gray-600 mt-2">
            音を聴いて、2拍子か3拍子かを判断してください
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* 進捗表示 */}
          <BSTProgress
            trialsCompleted={progress.trialsCompleted}
            reversalsCount={progress.reversalsCount}
            targetReversals={6}
            currentVolumeDifference={progress.currentVolumeDifference}
            isNearCompletion={progress.isConverged}
          />

          {/* 再生コントロール */}
          <div className="flex justify-center">
            <Button
              size="lg"
              variant={isPlaying ? "outline" : "primary"}
              onClick={isPlaying ? stopPattern : playPattern}
              className="w-32 h-32 rounded-full shadow-lg transition-transform hover:scale-105"
              disabled={!['ready', 'playing'].includes(testState)}
            >
              {isPlaying ? (
                <Pause className="w-12 h-12" />
              ) : (
                <Play className="w-12 h-12" />
              )}
            </Button>
          </div>

          {/* 判定ボタン */}
          <div className="grid grid-cols-2 gap-6 mt-8">
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleAnswer('2beat')}
              disabled={testState !== 'playing'}
              className="py-8 text-lg font-semibold rounded-xl hover:bg-blue-50 transition-colors"
            >
              2拍子
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleAnswer('3beat')}
              disabled={testState !== 'playing'}
              className="py-8 text-lg font-semibold rounded-xl hover:bg-blue-50 transition-colors"
            >
              3拍子
            </Button>
          </div>

          {/* フィードバック表示 */}
          <BSTFeedback isCorrect={lastResponse} show={showFeedback} />
        </CardContent>
      </Card>
    </div>
  )
}

export default BSTTestScreen 