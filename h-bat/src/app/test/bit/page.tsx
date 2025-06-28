'use client'

import { useEffect, useState } from 'react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  BarChart3,
  ArrowRight,
  RotateCcw
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import BITTestScreen from '@/components/test/BITTestScreen'
import { useBITTest, useBITTestResult } from '@/hooks/useBITTest'
import { useStaircaseStore } from '@/stores/staircaseStore'
import { BITTrial, BITResult, evaluateBITQuality } from '@/lib/bit/staircaseController'

// ページ状態の型定義
type PageState = 'loading' | 'ready' | 'testing' | 'results' | 'error'

export default function BITTestPage() {
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [error, setError] = useState<string | null>(null)

  // Zustand store
  const {
    currentSession,
    getHearingThresholdAverage,
    recordBITTrial,
    setBITResult,
    completeTest
  } = useStaircaseStore()

  // セッション確認
  useEffect(() => {
    const initializePage = async () => {
      console.log('BIT Page: Initializing page...', {
        hasCurrentSession: !!currentSession,
        sessionId: currentSession?.sessionId,
        hearingTestCompleted: currentSession?.hearingTest?.isCompleted,
        hearingTestResults: currentSession?.hearingTest?.results?.size || 0
      })

      if (!currentSession) {
        console.warn('BIT Page: No active session found, redirecting to hearing test')
        router.push('/test/hearing')
        return
      }

      // 聴力閾値の確認 - より詳細なデバッグ
      const hearingThresholdFromStore = getHearingThresholdAverage()
      console.log('BIT Page: Hearing threshold check:', {
        rawThreshold: hearingThresholdFromStore,
        isValid: hearingThresholdFromStore && hearingThresholdFromStore > 0 && isFinite(hearingThresholdFromStore),
        sessionHearingResults: currentSession.hearingTest?.results ? 
          Array.from(currentSession.hearingTest.results.entries()) : 'No results'
      })

      // より柔軟な聴力閾値取得
      if (!hearingThresholdFromStore || hearingThresholdFromStore <= 0 || !isFinite(hearingThresholdFromStore)) {
        try {
          const storedThresholds = localStorage.getItem('h-bat-hearing-thresholds')
          if (storedThresholds) {
            const thresholds = JSON.parse(storedThresholds)
            console.log('BIT Page: Found stored thresholds:', thresholds)
            
            if (typeof thresholds === 'object' && thresholds !== null) {
              const values = Object.values(thresholds).filter((val): val is number => 
                typeof val === 'number' && isFinite(val) && val > 0
              )
              
              if (values.length > 0) {
                const avgThreshold = values.reduce((sum, val) => sum + val, 0) / values.length
                console.log('BIT Page: Using localStorage hearing threshold:', avgThreshold)
                setPageState('ready')
                return
              }
            }
          }
        } catch (error) {
          console.warn('BIT Page: Error reading stored thresholds:', error)
        }
      }

      // 最終的にデフォルト値を使用
      console.log('BIT Page: Using final hearing threshold for initialization')

      try {
        console.log('BIT page: Initializing with hearing threshold:', hearingThresholdFromStore || 50)
        setPageState('ready')
      } catch (error) {
        console.error('BIT page initialization error:', error)
        setError('ページの初期化に失敗しました')
        setPageState('error')
      }
    }

    initializePage()
  }, [currentSession, getHearingThresholdAverage, router])

  // BITテスト設定
  const rawHearingThreshold = getHearingThresholdAverage()
  console.log('BIT Page: Raw hearing threshold from store:', rawHearingThreshold)
  
  // より柔軟な聴力閾値取得
  let finalHearingThreshold = rawHearingThreshold
  
  // staircaseStoreから取得できない場合、localStorageから取得
  if (!finalHearingThreshold || finalHearingThreshold <= 0 || !isFinite(finalHearingThreshold)) {
    try {
      const storedThresholds = localStorage.getItem('h-bat-hearing-thresholds')
      if (storedThresholds) {
        const thresholds = JSON.parse(storedThresholds)
        console.log('BIT Page: Found stored thresholds:', thresholds)
        
        if (typeof thresholds === 'object' && thresholds !== null) {
          const values = Object.values(thresholds).filter((val): val is number => 
            typeof val === 'number' && isFinite(val) && val > 0
          )
          
          if (values.length > 0) {
            finalHearingThreshold = values.reduce((sum, val) => sum + val, 0) / values.length
            console.log('BIT Page: Using localStorage hearing threshold:', finalHearingThreshold)
          }
        }
      }
    } catch (error) {
      console.warn('BIT Page: Error reading stored thresholds:', error)
    }
  }
  
  // 最終的にデフォルト値を使用
  if (!finalHearingThreshold || finalHearingThreshold <= 0 || !isFinite(finalHearingThreshold)) {
    finalHearingThreshold = 50 // より現実的なデフォルト値
    console.log('BIT Page: Using default hearing threshold:', finalHearingThreshold)
  }
  
  const hearingThreshold = finalHearingThreshold
  console.log('BIT Page: Final hearing threshold:', hearingThreshold)

  const [bitState, bitActions] = useBITTest({
    sessionId: currentSession?.sessionId || '',
    profileId: currentSession?.profileId || '',
    hearingThreshold,
    onTrialComplete: (trial: BITTrial) => {
      try {
        recordBITTrial({
          sessionId: currentSession?.sessionId || '',
          trialIndex: trial.trialIndex,
          slopeK: trial.slopeK,
          direction: trial.direction,
          userAnswer: trial.userAnswer,
          correct: trial.correct,
          ...(trial.reactionTime !== undefined && { reactionTime: trial.reactionTime }),
          ioiSequence: trial.ioiSequence,
          soundLevel: trial.soundLevel,
          isReversal: trial.isReversal,
          timestamp: trial.timestamp
        })
      } catch (err) {
        console.error('Failed to record BIT trial:', err)
      }
    },
    onTestComplete: (result: BITResult) => {
      try {
        setBITResult({
          sessionId: currentSession?.sessionId || '',
          slopeThreshold: result.slopeThreshold,
          confidence: result.convergenceAnalysis.confidence,
          directionAccuracy: {
            overall: { 
              accuracy: result.directionAccuracy.overall.accuracy, 
              totalTrials: result.directionAccuracy.overall.total 
            },
            accelerando: { 
              accuracy: result.directionAccuracy.accelerando.accuracy, 
              totalTrials: result.directionAccuracy.accelerando.total 
            },
            ritardando: { 
              accuracy: result.directionAccuracy.ritardando.accuracy, 
              totalTrials: result.directionAccuracy.ritardando.total 
            }
          },
          totalTrials: result.totalTrials,
          totalReversals: result.totalReversals,
          duration: result.duration
        })
        setPageState('results')
      } catch (err) {
        console.error('Failed to save BIT result:', err)
        setError('結果の保存に失敗しました')
        setPageState('error')
      }
    },
    onError: (err: Error) => {
      console.error('BIT test error:', err)
      setError(err.message)
      setPageState('error')
    }
  })

  // 結果分析
  const resultAnalysis = useBITTestResult(bitState.finalResult)

  // 次のテストへ進む
  const handleNext = async () => {
    console.log('BIT: handleNext called', { 
      hasCurrentSession: !!currentSession, 
      hasFinalResult: !!bitState.finalResult,
      sessionId: currentSession?.sessionId 
    })
    
    if (!currentSession || !bitState.finalResult) {
      console.warn('BIT: Missing session or final result, cannot proceed')
      return
    }

    try {
      console.log('BIT: Completing test...')
      // テスト完了をマーク
      await completeTest('bit')
      
      console.log('BIT: Test completed, navigating to BFIT...')
      // 次のテスト（BFIT）へ
      router.push('/test/bfit')
    } catch (err) {
      console.error('Failed to complete BIT test:', err)
      setError('テストの完了処理に失敗しました')
    }
  }

  // 戻る処理
  const handleBack = () => {
    router.push('/test/bst')
  }

  // テストリセット
  const handleReset = () => {
    bitActions.reset()
    setPageState('ready')
    setError(null)
  }

  // テスト開始
  const handleStartTest = async () => {
    try {
      console.log('BIT: Starting test, checking initialization...')
      
      // 初期化が完了するまで待機
      if (!bitState.isInitialized) {
        console.log('BIT: Not initialized, initializing...')
        await bitActions.initialize()
      }
      
      if (bitState.hasError) {
        console.error('BIT: Test has error:', bitState.errorMessage)
        setError(bitState.errorMessage || 'テストでエラーが発生しました')
        setPageState('error')
        return
      }
      
      console.log('BIT: Test initialized successfully, starting...')
      setPageState('testing')
    } catch (err) {
      console.error('BIT: Failed to start test:', err)
      setError('テストの開始に失敗しました')
      setPageState('error')
    }
  }

  // ローディング状態
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">読み込み中...</h3>
                <p className="text-gray-600">セッション情報を確認しています</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // エラー状態
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              エラーが発生しました
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="flex gap-2">
              <Button onClick={handleReset} variant="outline" className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                リトライ
              </Button>
              <Button onClick={handleBack} variant="outline" className="flex-1">
                戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 結果表示状態
  if (pageState === 'results' && bitState.finalResult) {
    const quality = evaluateBITQuality(bitState.finalResult)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        {/* ヘッダー */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">BIT テスト結果</h1>
                <p className="text-sm text-gray-600">テンポ方向判定テスト完了</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleBack} variant="ghost" size="sm">
                  戻る
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* 結果サマリー */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    テスト結果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {quality.grade}
                      </div>
                      <div className="text-sm text-gray-600">総合評価</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {bitState.finalResult.slopeThreshold.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">閾値 (ms/beat)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(bitState.finalResult.directionAccuracy.overall.accuracy * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">正答率</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {bitState.finalResult.totalTrials}
                      </div>
                      <div className="text-sm text-gray-600">試行回数</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 詳細結果 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>方向別精度</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span>加速（Accelerando）</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={bitState.finalResult.directionAccuracy.accelerando.accuracy * 100}
                          max={100}
                          className="w-32"
                        />
                        <span className="text-sm font-mono">
                          {Math.round(bitState.finalResult.directionAccuracy.accelerando.accuracy * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        <span>減速（Ritardando）</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={bitState.finalResult.directionAccuracy.ritardando.accuracy * 100}
                          max={100}
                          className="w-32"
                        />
                        <span className="text-sm font-mono">
                          {Math.round(bitState.finalResult.directionAccuracy.ritardando.accuracy * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 分析とフィードバック */}
            {resultAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>分析とフィードバック</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">総合評価</h4>
                        <p className="text-gray-600">{resultAnalysis.summary}</p>
                      </div>
                      
                      {resultAnalysis.strengths.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-green-600 mb-2">強み</h4>
                          <ul className="space-y-1">
                            {resultAnalysis.strengths.map((strength, index) => (
                              <li key={index} className="text-gray-600 flex items-start gap-2">
                                <span className="text-green-500 mt-1">•</span>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {resultAnalysis.improvements.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-orange-600 mb-2">改善点</h4>
                          <ul className="space-y-1">
                            {resultAnalysis.improvements.map((improvement, index) => (
                              <li key={index} className="text-gray-600 flex items-start gap-2">
                                <span className="text-orange-500 mt-1">•</span>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {resultAnalysis.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-blue-600 mb-2">推奨事項</h4>
                          <ul className="space-y-1">
                            {resultAnalysis.recommendations.map((recommendation, index) => (
                              <li key={index} className="text-gray-600 flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                {recommendation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* 次へボタン */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-center"
            >
              <Button 
                onClick={handleNext}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                次のテストへ（BFIT）
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    )
  }

  // 準備完了状態
  if (pageState === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        {/* ヘッダー */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">BIT テスト</h1>
                <p className="text-sm text-gray-600">テンポ方向判定テスト</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleBack} variant="ghost" size="sm">
                  戻る
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* テスト説明 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  BIT（Beat Interval Test）について
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    このテストでは、音のテンポが「だんだん速く」なるか「だんだん遅く」なるかを判定していただきます。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-green-800">Accelerando</h4>
                        <p className="text-sm text-green-700">だんだん速くなる</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <TrendingDown className="w-6 h-6 text-red-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-red-800">Ritardando</h4>
                        <p className="text-sm text-red-700">だんだん遅くなる</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">テストの流れ</h4>
                    <ol className="space-y-1 text-sm text-blue-700">
                      <li>1. 音を再生して、よく聞いてください</li>
                      <li>2. テンポの変化を感じ取ってください</li>
                      <li>3. 「だんだん速く」か「だんだん遅く」かを選択してください</li>
                      <li>4. 約15-25回の試行を行います</li>
                    </ol>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">設定情報</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">音圧レベル:</span>
                        <span className="font-mono ml-2">{(hearingThreshold + 30).toFixed(0)} dB SPL</span>
                      </div>
                      <div>
                        <span className="text-gray-600">聴力閾値:</span>
                        <span className="font-mono ml-2">{hearingThreshold.toFixed(0)} dB SPL</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 開始ボタン */}
            <div className="text-center">
              <Button 
                onClick={handleStartTest}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                テストを開始
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // テスト実行状態
  if (pageState === 'testing') {
    return (
              <BITTestScreen
          config={{
            sessionId: currentSession?.sessionId || '',
            profileId: currentSession?.profileId || '',
            hearingThreshold,
            onTrialComplete: (trial: BITTrial) => {
              try {
                recordBITTrial({
                  sessionId: currentSession?.sessionId || '',
                  trialIndex: trial.trialIndex,
                  slopeK: trial.slopeK,
                  direction: trial.direction,
                  userAnswer: trial.userAnswer,
                  correct: trial.correct,
                  ...(trial.reactionTime !== undefined && { reactionTime: trial.reactionTime }),
                  ioiSequence: trial.ioiSequence,
                  soundLevel: trial.soundLevel,
                  isReversal: trial.isReversal,
                  timestamp: trial.timestamp
                })
              } catch (err) {
                console.error('Failed to record BIT trial:', err)
              }
            },
            onTestComplete: (result: BITResult) => {
              try {
                setBITResult({
                  sessionId: currentSession?.sessionId || '',
                  slopeThreshold: result.slopeThreshold,
                  confidence: result.convergenceAnalysis.confidence,
                  directionAccuracy: {
                    overall: { 
                      accuracy: result.directionAccuracy.overall.accuracy, 
                      totalTrials: result.directionAccuracy.overall.total 
                    },
                    accelerando: { 
                      accuracy: result.directionAccuracy.accelerando.accuracy, 
                      totalTrials: result.directionAccuracy.accelerando.total 
                    },
                    ritardando: { 
                      accuracy: result.directionAccuracy.ritardando.accuracy, 
                      totalTrials: result.directionAccuracy.ritardando.total 
                    }
                  },
                  totalTrials: result.totalTrials,
                  totalReversals: result.totalReversals,
                  duration: result.duration
                })
                setPageState('results')
              } catch (err) {
                console.error('Failed to save BIT result:', err)
                setError('結果の保存に失敗しました')
                setPageState('error')
              }
            },
            onError: (err: Error) => {
              console.error('BIT test error:', err)
              setError(err.message)
              setPageState('error')
            }
          }}
          onBack={() => setPageState('ready')}
        />
    )
  }

  return null
} 