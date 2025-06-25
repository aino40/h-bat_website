'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Volume2, 
  RotateCcw, 
  Zap,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { 
  BITAudioGenerator,
  calculateBITProgress
} from '@/lib/audio/bit'
import { 
  BITStaircaseController, 
  BITTrial,
  BITResult 
} from '@/lib/bit/staircaseController'

// BITテスト設定
export interface BITTestConfig {
  sessionId: string
  profileId: string
  hearingThreshold: number
  onTrialComplete: (trial: BITTrial) => void
  onTestComplete: (result: BITResult) => void
  onError: (error: Error) => void
}

// BITテスト画面のプロパティ
export interface BITTestScreenProps {
  config: BITTestConfig
  onBack?: () => void
  onSettings?: () => void
}

// テスト状態の型定義
type TestState = 
  | 'initializing'
  | 'ready'
  | 'playing'
  | 'waiting'
  | 'feedback'
  | 'completed'
  | 'error'

// BITテスト画面コンポーネント
export default function BITTestScreen({ 
  config, 
  onBack, 
  onSettings 
}: BITTestScreenProps) {
  // 状態管理
  const [testState, setTestState] = useState<TestState>('initializing')
  const [audioGenerator, setAudioGenerator] = useState<BITAudioGenerator | null>(null)
  const [staircaseController, setStaircaseController] = useState<BITStaircaseController | null>(null)
  const [currentDirection, setCurrentDirection] = useState<'accelerando' | 'ritardando'>('accelerando')
  const [currentTrial, setCurrentTrial] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [lastAnswer, setLastAnswer] = useState<'accelerando' | 'ritardando' | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [reactionStartTime, setReactionStartTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 進捗状態
  const [progress, setProgress] = useState({
    trialsCompleted: 0,
    reversalsCount: 0,
    isConverged: false,
    currentSlopeK: 5,
    estimatedRemainingTrials: 20
  })

  // 初期化
  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout
    
    const initialize = async () => {
      try {
        console.log('BITTestScreen: Starting initialization...')
        setTestState('initializing')
        setError(null)
        
        // タイムアウト設定（10秒）
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.error('BITTestScreen: Initialization timeout')
            setError('初期化がタイムアウトしました。ページをリロードしてください。')
            setTestState('error')
          }
        }, 10000)
        
        // 既存のリソースをクリーンアップ
        if (audioGenerator) {
          console.log('BITTestScreen: Disposing existing audio generator')
          audioGenerator.dispose()
          setAudioGenerator(null)
        }
        
        // 少し待機してからリソース作成
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if (!isMounted) return
        
        // オーディオジェネレータ初期化
        console.log('BITTestScreen: Creating audio generator with hearing threshold:', config.hearingThreshold)
        const generator = new BITAudioGenerator({
          soundLevel: config.hearingThreshold + 30
        })
        
        console.log('BITTestScreen: Initializing audio generator...')
        await generator.initialize()
        
        if (!isMounted) {
          generator.dispose()
          return
        }
        
        setAudioGenerator(generator)
        console.log('BITTestScreen: Audio generator initialized successfully')

        // ステアケースコントローラー初期化
        console.log('BITTestScreen: Creating staircase controller...')
        const controller = new BITStaircaseController(
          config.sessionId,
          config.profileId,
          config.hearingThreshold
        )
        
        if (!isMounted) return
        
        setStaircaseController(controller)
        console.log('BITTestScreen: Staircase controller created successfully')

        // タイムアウトをクリア
        clearTimeout(timeoutId)
        
        setTestState('ready')
        console.log('BITTestScreen: Initialization completed successfully')
      } catch (err) {
        console.error('BITTestScreen: Initialization failed:', err)
        clearTimeout(timeoutId)
        if (isMounted) {
          setError(`初期化エラー: ${err instanceof Error ? err.message : String(err)}`)
          setTestState('error')
          config.onError(err as Error)
        }
      }
    }

    initialize()

    // クリーンアップ
    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      if (audioGenerator) {
        console.log('BITTestScreen: Cleaning up audio generator')
        audioGenerator.dispose()
      }
    }
  }, [config.sessionId, config.profileId, config.hearingThreshold])

  // テスト完了
  const completeTest = useCallback(() => {
    if (!staircaseController) return

    try {
      const result = staircaseController.getResult()
      if (result) {
        setTestState('completed')
        config.onTestComplete(result)
      }
    } catch (err) {
      console.error('Test completion failed:', err)
      setError('テストの完了処理に失敗しました')
      setTestState('error')
    }
  }, [staircaseController, config])

  // 進捗更新
  useEffect(() => {
    if (staircaseController) {
      const newProgress = staircaseController.getProgress()
      setProgress(newProgress)
      
      // 収束判定
      if (newProgress.isConverged && testState !== 'completed') {
        completeTest()
      }
    }
  }, [currentTrial, staircaseController, testState, completeTest])

  // 音声再生
  const playAudio = async () => {
    if (!audioGenerator || !staircaseController || isPlaying) return

    try {
      setIsPlaying(true)
      setTestState('playing')
      setLastAnswer(null)
      setIsCorrect(null)

      // 現在のIOI変化率を取得
      const currentSlopeK = staircaseController.getCurrentSlopeK()
      
      // ランダムな方向を生成
      const direction = audioGenerator.generateRandomDirection()
      setCurrentDirection(direction)

      // 音源設定
      audioGenerator.setSlopeK(currentSlopeK)
      audioGenerator.setDirection(direction)
      audioGenerator.setSoundLevel(config.hearingThreshold + 30)

      // 音声再生
      await audioGenerator.playPattern()
      
      setIsPlaying(false)
      setTestState('waiting')
      setReactionStartTime(Date.now())
    } catch (err) {
      console.error('Audio playback failed:', err)
      setError('音声の再生に失敗しました')
      setTestState('error')
      setIsPlaying(false)
    }
  }

  // 回答処理
  const handleAnswer = (userAnswer: 'accelerando' | 'ritardando') => {
    if (!staircaseController || !audioGenerator || testState !== 'waiting') return

    const reactionTime = reactionStartTime ? Date.now() - reactionStartTime : undefined
    const correct = currentDirection === userAnswer
    const ioiSequence = audioGenerator.getCurrentIOISequence()

    // 試行記録
    try {
      console.log('BIT: Recording response:', {
        direction: currentDirection,
        userAnswer,
        correct,
        reactionTime
      })
      
      const trial = staircaseController.recordResponse(
        currentDirection,
        userAnswer,
        ioiSequence,
        reactionTime
      )

      console.log('BIT: Trial recorded:', trial)

      setLastAnswer(userAnswer)
      setIsCorrect(correct)
      setCurrentTrial(prev => prev + 1)
      setTestState('feedback')

      // 試行完了コールバック
      config.onTrialComplete(trial)

      // 進捗状況を確認
      const progress = staircaseController.getProgress()
      console.log('BIT: Progress after trial:', progress)

      // フィードバック表示後、次の試行へ
      setTimeout(() => {
        console.log('BIT: Checking convergence after feedback...')
        if (staircaseController.isConverged()) {
          console.log('BIT: Test converged, completing...')
          completeTest()
        } else {
          console.log('BIT: Continuing to next trial...')
          setTestState('ready')
        }
      }, 1500)
    } catch (err) {
      console.error('BIT: Trial recording failed:', err)
      setError('試行の記録に失敗しました')
      setTestState('error')
    }
  }

  // 音声停止
  const stopAudio = () => {
    if (audioGenerator) {
      audioGenerator.stopPattern()
      setIsPlaying(false)
      setTestState('ready')
    }
  }

  // リセット
  const resetTest = () => {
    if (staircaseController) {
      staircaseController.reset()
      setCurrentTrial(0)
      setTestState('ready')
      setLastAnswer(null)
      setIsCorrect(null)
      setError(null)
    }
  }

  // 進捗計算
  const progressData = calculateBITProgress(
    progress.trialsCompleted,
    progress.reversalsCount,
    6 // 目標反転回数
  )

  // エラー状態
  if (testState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              エラーが発生しました
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="flex gap-2">
              <Button onClick={resetTest} variant="outline" className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                リトライ
              </Button>
              {onBack && (
                <Button onClick={onBack} variant="outline" className="flex-1">
                  戻る
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 完了状態
  if (testState === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              BITテスト完了！
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {progress.trialsCompleted}試行完了
              </div>
              <div className="text-sm text-gray-600">
                IOI変化率閾値: {progress.currentSlopeK.toFixed(1)} ms/beat
              </div>
            </div>
            <div className="flex gap-2">
              {onBack && (
                <Button onClick={onBack} className="flex-1">
                  次のテストへ
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* ヘッダー */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button onClick={onBack} variant="ghost" size="sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  戻る
                </Button>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">BIT テスト</h1>
                <p className="text-sm text-gray-600">テンポ方向判定テスト</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onSettings && (
                <Button onClick={onSettings} variant="ghost" size="sm">
                  設定
                </Button>
              )}
            </div>
          </div>
          
          {/* 進捗表示 */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>試行 {progress.trialsCompleted}</span>
              <span>反転 {progress.reversalsCount}/6</span>
            </div>
            <Progress 
              value={progressData.overallProgress}
              max={100}
              className={`h-2 transition-all duration-300 ${
                progressData.isNearCompletion ? 'animate-pulse' : ''
              }`}
            />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* テスト情報カード */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                テンポ方向判定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">現在のIOI変化率</div>
                  <div className="font-mono text-lg font-bold text-blue-600">
                    {progress.currentSlopeK.toFixed(1)} ms/beat
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">音圧レベル</div>
                  <div className="font-mono text-lg font-bold text-green-600">
                    {(config.hearingThreshold + 30).toFixed(0)} dB SPL
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">残り試行数</div>
                  <div className="font-mono text-lg font-bold text-purple-600">
                    約{progress.estimatedRemainingTrials}回
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* テスト実行カード */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-6">
                {/* 初期化中 */}
                {testState === 'initializing' && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                      <Volume2 className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">初期化中...</h3>
                      <p className="text-gray-600">音響システムを準備しています</p>
                      <p className="text-xs text-gray-500 mt-2">
                        しばらく待ってもこの画面が続く場合は、ページをリロードしてください
                      </p>
                    </div>
                    <div className="mt-4">
                      <Button 
                        onClick={resetTest}
                        variant="outline"
                        size="sm"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        リトライ
                      </Button>
                    </div>
                  </div>
                )}

                {/* 準備完了 */}
                {testState === 'ready' && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">音を聞いて判定してください</h3>
                      <p className="text-gray-600">
                        テンポが「だんだん速く」なるか「だんだん遅く」なるかを判定します
                      </p>
                    </div>
                    <Button 
                      onClick={playAudio}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      音を再生
                    </Button>
                  </div>
                )}

                {/* 再生中 */}
                {testState === 'playing' && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                      <Pause className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">再生中...</h3>
                      <p className="text-gray-600">よく聞いてテンポの変化を感じてください</p>
                    </div>
                    <Button 
                      onClick={stopAudio}
                      variant="outline"
                      size="lg"
                    >
                      <Pause className="w-5 h-5 mr-2" />
                      停止
                    </Button>
                  </div>
                )}

                {/* 回答待ち */}
                {testState === 'waiting' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">テンポはどちらに変化しましたか？</h3>
                      <p className="text-gray-600">聞こえた音のテンポ変化を選択してください</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                      <Button
                        onClick={() => handleAnswer('accelerando')}
                        size="lg"
                        variant="outline"
                        className="h-16 flex-col space-y-1 border-2 hover:border-green-500 hover:bg-green-50"
                      >
                        <TrendingUp className="w-6 h-6 text-green-600" />
                        <span className="text-sm font-medium">だんだん速く</span>
                        <span className="text-xs text-gray-500">Accelerando</span>
                      </Button>
                      <Button
                        onClick={() => handleAnswer('ritardando')}
                        size="lg"
                        variant="outline"
                        className="h-16 flex-col space-y-1 border-2 hover:border-red-500 hover:bg-red-50"
                      >
                        <TrendingDown className="w-6 h-6 text-red-600" />
                        <span className="text-sm font-medium">だんだん遅く</span>
                        <span className="text-xs text-gray-500">Ritardando</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* フィードバック */}
                {testState === 'feedback' && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="space-y-4"
                    >
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                        isCorrect ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {isCorrect ? (
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className={`text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {isCorrect ? '正解！' : '不正解'}
                        </h3>
                        <p className="text-gray-600">
                          正解: {currentDirection === 'accelerando' ? 'だんだん速く' : 'だんだん遅く'}
                          {lastAnswer && ` / あなたの回答: ${lastAnswer === 'accelerando' ? 'だんだん速く' : 'だんだん遅く'}`}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </CardContent>
          </Card>

          {/* リセットボタン */}
          {testState === 'ready' && (
            <div className="text-center">
              <Button 
                onClick={resetTest} 
                variant="outline"
                className="text-gray-600"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                テストをリセット
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 