'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown,
  Volume2,
  Clock,
  BarChart3,
  Check,
  X,
  Search,
  Music
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { BFITAudioGenerator, BFITConfig } from '@/lib/audio/bfit'
import { BFITTrial } from '@/lib/bfit/staircaseController'

// BFIT測定画面のプロパティ
interface BFITTestScreenProps {
  config: BFITConfig & {
    onTrialComplete: (trial: BFITTrial) => void
    onTestComplete: (result: any) => void
    onError: (error: Error) => void
  }
  onBack: () => void
}

// テスト段階
type TestPhase = 'beat-finding' | 'tempo-judgment' | 'feedback' | 'complete'

// BFIT測定画面コンポーネント
export default function BFITTestScreen({ config, onBack }: BFITTestScreenProps) {
  // 状態管理
  const [phase, setPhase] = useState<TestPhase>('beat-finding')
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioGenerator, setAudioGenerator] = useState<BFITAudioGenerator | null>(null)
  const [currentPattern, setCurrentPattern] = useState<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect'; message: string } | null>(null)
  
  // 試行データ
  const [currentTrial, setCurrentTrial] = useState(1)
  const [totalTrials] = useState(25)
  const [currentDirection, setCurrentDirection] = useState<'accelerando' | 'ritardando'>('accelerando')
  const [reactionStartTime, setReactionStartTime] = useState<number | null>(null)
  
  // 進捗データ
  const [progress, setProgress] = useState({
    trialsCompleted: 0,
    reversalsCount: 0,
    currentSlopeK: 8.0,
    accuracy: 0
  })

  // 音響生成器初期化
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        const generator = new BFITAudioGenerator({
          ...config,
          baseTempo: 120,
          patternDuration: 8,
          repetitions: 3
        })
        
        await generator.initialize()
        setAudioGenerator(generator)
        setIsInitialized(true)
      } catch (err) {
        console.error('Failed to initialize BFIT audio generator:', err)
        setError('音響システムの初期化に失敗しました')
        config.onError?.(err as Error)
      }
    }

    initializeAudio()

    return () => {
      audioGenerator?.dispose()
    }
  }, [])

  // パターン生成と再生
  const generateAndPlayPattern = useCallback(async () => {
    if (!audioGenerator || !isInitialized) return

    try {
      // ランダムに方向を決定
      const direction = Math.random() > 0.5 ? 'accelerando' : 'ritardando'
      setCurrentDirection(direction)

      // パターン生成
      const pattern = audioGenerator.generatePattern(
        progress.currentSlopeK,
        direction,
        'default'
      )
      setCurrentPattern(pattern)

      // 再生開始
      await audioGenerator.playPattern()
      setIsPlaying(true)
      setPhase('beat-finding')
      setReactionStartTime(Date.now())
    } catch (err) {
      console.error('Failed to generate/play pattern:', err)
      setError('パターンの生成・再生に失敗しました')
    }
  }, [audioGenerator, isInitialized, progress.currentSlopeK])

  // 再生停止
  const stopPlayback = useCallback(() => {
    if (audioGenerator) {
      audioGenerator.stopPlayback()
      setIsPlaying(false)
    }
  }, [audioGenerator])

  // ビート発見段階の完了
  const handleBeatFound = useCallback(() => {
    if (phase === 'beat-finding') {
      setPhase('tempo-judgment')
    }
  }, [phase])

  // テンポ方向判定
  const handleTempoJudgment = useCallback((userAnswer: 'accelerando' | 'ritardando') => {
    if (phase !== 'tempo-judgment' || !reactionStartTime) return

    const reactionTime = Date.now() - reactionStartTime
    const correct = userAnswer === currentDirection

    // フィードバック表示
    setFeedback({
      type: correct ? 'correct' : 'incorrect',
      message: correct ? '正解！' : 'もう一度トライしてみましょう'
    })

    // 試行データ作成
    const trial: BFITTrial = {
      trialIndex: currentTrial,
      level: progress.currentSlopeK,
      slopeK: progress.currentSlopeK,
      direction: currentDirection,
      userAnswer,
      correct,
      response: correct,
      reactionTime,
      ioiSequence: currentPattern?.ioiSequence || [],
      patternId: 'default',
      soundLevel: config.hearingThreshold + 30,
      isReversal: false, // ステアケースコントローラーで判定
      timestamp: new Date()
    }

    // 再生停止
    stopPlayback()

    // 試行完了コールバック
    config.onTrialComplete?.(trial)

    // 進捗更新
    setProgress(prev => ({
      ...prev,
      trialsCompleted: prev.trialsCompleted + 1,
      accuracy: (prev.accuracy * (currentTrial - 1) + (correct ? 1 : 0)) / currentTrial
    }))

    setPhase('feedback')

    // フィードバック後に次の試行へ
    setTimeout(() => {
      setFeedback(null)
      if (currentTrial < totalTrials) {
        setCurrentTrial(prev => prev + 1)
        generateAndPlayPattern()
      } else {
        setPhase('complete')
        config.onTestComplete?.({})
      }
    }, 1500)
  }, [phase, reactionStartTime, currentDirection, currentTrial, totalTrials, currentPattern, progress, config, stopPlayback, generateAndPlayPattern])

  // 初回パターン生成
  useEffect(() => {
    if (isInitialized && currentTrial === 1) {
      generateAndPlayPattern()
    }
  }, [isInitialized, currentTrial, generateAndPlayPattern])

  // エラー状態
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">エラーが発生しました</h3>
                <p className="text-gray-600">{error}</p>
              </div>
              <Button onClick={onBack} variant="outline">
                戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 初期化中
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                <Music className="w-8 h-8 text-purple-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">初期化中...</h3>
                <p className="text-gray-600">複雑リズムパターンを準備しています</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* ヘッダー */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">BFIT テスト</h1>
              <p className="text-sm text-gray-600">
                複雑リズム・ビート発見・テンポ方向判定テスト
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onBack} variant="ghost" size="sm">
                戻る
              </Button>
            </div>
          </div>
          
          {/* 進捗バー */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>試行 {currentTrial} / {totalTrials}</span>
              <span>正答率: {Math.round(progress.accuracy * 100)}%</span>
            </div>
            <Progress value={(currentTrial / totalTrials) * 100} max={100} className="h-2" />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* 現在の設定情報 */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {progress.currentSlopeK.toFixed(1)}
                  </div>
                  <div className="text-gray-600">変化率 (ms/beat)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {(config.hearingThreshold + 30).toFixed(0)}
                  </div>
                  <div className="text-gray-600">音圧 (dB SPL)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {progress.reversalsCount}
                  </div>
                  <div className="text-gray-600">反転回数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    120
                  </div>
                  <div className="text-gray-600">基準テンポ (BPM)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* テスト画面 */}
          <Card className="relative overflow-hidden">
            <CardContent className="pt-8 pb-12">
              <AnimatePresence mode="wait">
                {/* ビート発見段階 */}
                {phase === 'beat-finding' && (
                  <motion.div
                    key="beat-finding"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-center space-y-8"
                  >
                    <div className="space-y-4">
                      <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                        <Search className="w-10 h-10 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          ステップ 1: ビートを見つけてください
                        </h2>
                        <p className="text-gray-600">
                          複雑なリズムパターンの中から、一定のビートを感じ取ってください
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <Volume2 className="w-6 h-6 text-gray-400" />
                        <div className="text-lg text-gray-600">
                          {isPlaying ? '再生中...' : '待機中'}
                        </div>
                      </div>
                      
                      <Button
                        onClick={handleBeatFound}
                        size="lg"
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!isPlaying}
                      >
                        ビートが聞こえました
                      </Button>
                    </div>

                    <div className="text-sm text-gray-500">
                      リズムパターンを聞いて、規則的なビートを感じたらボタンを押してください
                    </div>
                  </motion.div>
                )}

                {/* テンポ方向判定段階 */}
                {phase === 'tempo-judgment' && (
                  <motion.div
                    key="tempo-judgment"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-center space-y-8"
                  >
                    <div className="space-y-4">
                      <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                        <Clock className="w-10 h-10 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          ステップ 2: テンポの変化を判定してください
                        </h2>
                        <p className="text-gray-600">
                          ビートのテンポが「だんだん速く」なるか「だんだん遅く」なるかを選択してください
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                      <Button
                        onClick={() => handleTempoJudgment('accelerando')}
                        size="lg"
                        variant="outline"
                        className="h-24 flex flex-col items-center gap-2 border-green-200 hover:border-green-400 hover:bg-green-50"
                      >
                        <TrendingUp className="w-8 h-8 text-green-600" />
                        <div>
                          <div className="font-semibold text-green-800">Accelerando</div>
                          <div className="text-sm text-green-600">だんだん速く</div>
                        </div>
                      </Button>

                      <Button
                        onClick={() => handleTempoJudgment('ritardando')}
                        size="lg"
                        variant="outline"
                        className="h-24 flex flex-col items-center gap-2 border-red-200 hover:border-red-400 hover:bg-red-50"
                      >
                        <TrendingDown className="w-8 h-8 text-red-600" />
                        <div>
                          <div className="font-semibold text-red-800">Ritardando</div>
                          <div className="text-sm text-red-600">だんだん遅く</div>
                        </div>
                      </Button>
                    </div>

                    <div className="text-sm text-gray-500">
                      ビートのテンポ変化を感じ取って、該当するボタンを選択してください
                    </div>
                  </motion.div>
                )}

                {/* フィードバック段階 */}
                {phase === 'feedback' && feedback && (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-center space-y-6"
                  >
                    <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                      feedback.type === 'correct' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {feedback.type === 'correct' ? (
                        <Check className="w-12 h-12 text-green-600" />
                      ) : (
                        <X className="w-12 h-12 text-red-600" />
                      )}
                    </div>
                    
                    <div>
                      <h3 className={`text-2xl font-bold mb-2 ${
                        feedback.type === 'correct' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {feedback.message}
                      </h3>
                      <p className="text-gray-600">
                        正解は「{currentDirection === 'accelerando' ? 'だんだん速く' : 'だんだん遅く'}」でした
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* 完了段階 */}
                {phase === 'complete' && (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-6"
                  >
                    <div className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-12 h-12 text-purple-600" />
                    </div>
                    
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        テスト完了！
                      </h2>
                      <p className="text-gray-600">
                        BFITテストが完了しました。結果を確認してください。
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>

            {/* 音響制御ボタン */}
            <div className="absolute bottom-4 right-4">
              <div className="flex items-center gap-2">
                {isPlaying ? (
                  <Button
                    onClick={stopPlayback}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    停止
                  </Button>
                ) : (
                  <Button
                    onClick={generateAndPlayPattern}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={phase === 'feedback' || phase === 'complete'}
                  >
                    <Play className="w-4 h-4" />
                    再生
                  </Button>
                )}
                
                <Button
                  onClick={() => {
                    stopPlayback()
                    generateAndPlayPattern()
                  }}
                  size="sm"
                  variant="outline"
                  disabled={phase === 'feedback' || phase === 'complete'}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
} 