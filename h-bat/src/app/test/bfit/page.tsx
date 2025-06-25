'use client'

import React, { useState, useEffect } from 'react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  ArrowRight, 
  BarChart3, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  CheckCircle,
  Music,
  Search,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

import { Badge } from '@/components/ui/badge'
import BFITTestScreen from '@/components/test/BFITTestScreen'
import { useBFITTest, useBFITTestResult } from '@/hooks/useBFITTest'
import { useStaircaseStore } from '@/stores/staircaseStore'
import { BFITTrial, BFITResult, evaluateBFITQuality } from '@/lib/bfit/staircaseController'

// ページ状態
type PageState = 'loading' | 'ready' | 'testing' | 'results' | 'error'

// BFIT測定ページ
export default function BFITTestPage() {
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [error, setError] = useState<string | null>(null)

  // Zustand store
  const { 
    currentSession, 
    getAverageHearingThreshold,
    recordBFITTrial,
    setBFITResult 
  } = useStaircaseStore()

  // セッション確認
  useEffect(() => {
    if (!currentSession) {
      router.push('/test')
      return
    }

    const hearingThreshold = getAverageHearingThreshold()
    if (!hearingThreshold) {
      setError('聴力閾値データが見つかりません')
      setPageState('error')
      return
    }

    setPageState('ready')
  }, [currentSession, router, getAverageHearingThreshold])

  // BFIT測定設定
  const hearingThreshold = getAverageHearingThreshold() || 40
  const bfitConfig = {
    sessionId: currentSession?.sessionId || '',
    profileId: currentSession?.profileId || '',
    hearingThreshold,
    baseTempo: 120,
    patternDuration: 8,
    repetitions: 3,
    onTrialComplete: (trial: BFITTrial) => {
      try {
        // 試行データをZustandストアに保存
        recordBFITTrial({
          sessionId: currentSession?.sessionId || '',
          trialIndex: trial.trialIndex,
          slopeK: trial.slopeK,
          direction: trial.direction,
          userAnswer: trial.userAnswer,
          correct: trial.correct,
          ...(trial.reactionTime !== undefined && { reactionTime: trial.reactionTime }),
          ioiSequence: trial.ioiSequence,
          patternId: trial.patternId,
          soundLevel: trial.soundLevel,
          isReversal: trial.isReversal,
          timestamp: trial.timestamp
        })
      } catch (err) {
        console.error('Failed to record BFIT trial:', err)
      }
    },
    onTestComplete: (result: BFITResult) => {
      try {
        // 結果データをZustandストアに保存
        setBFITResult({
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
        console.error('Failed to save BFIT result:', err)
        setError('結果の保存に失敗しました')
        setPageState('error')
      }
    },
    onError: (err: Error) => {
      console.error('BFIT test error:', err)
      setError(err.message)
      setPageState('error')
    }
  }

  // BFIT測定フック
  const {
    result: testResult,
    reset
  } = useBFITTest(bfitConfig)

  // 結果分析フック
  const resultAnalysis = useBFITTestResult(testResult)

  // テスト開始
  const handleStartTest = () => {
    setPageState('testing')
  }

  // 戻る
  const handleBack = () => {
    if (pageState === 'testing') {
      setPageState('ready')
      reset()
    } else {
      router.push('/test/bit')
    }
  }

  // 次へ進む
  const handleNext = () => {
    router.push('/test/results')
  }

  // 読み込み中
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                <Music className="w-8 h-8 text-purple-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">読み込み中...</h3>
                <p className="text-gray-600">BFITテストを準備しています</p>
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
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">エラーが発生しました</h3>
                <p className="text-gray-600">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleBack} variant="outline">
                  戻る
                </Button>
                <Button onClick={() => window.location.reload()}>
                  再試行
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 測定中
  if (pageState === 'testing') {
    return (
      <BFITTestScreen
        config={bfitConfig}
        onBack={handleBack}
      />
    )
  }

  // 結果表示
  if (pageState === 'results' && testResult) {
    const quality = evaluateBFITQuality(testResult)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        {/* ヘッダー */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">BFITテスト結果</h1>
                <p className="text-sm text-gray-600">
                  複雑リズム・ビート発見・テンポ方向判定テスト
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleBack} variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  戻る
                </Button>
                <Button onClick={handleNext} size="sm">
                  次へ
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* 総合評価 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  総合評価
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <div className={`text-6xl font-bold ${
                      quality.grade === 'A' ? 'text-green-600' :
                      quality.grade === 'B' ? 'text-blue-600' :
                      quality.grade === 'C' ? 'text-yellow-600' :
                      quality.grade === 'D' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {quality.grade}
                    </div>
                    <div className="text-xl text-gray-600">
                      スコア: {quality.score}点
                    </div>
                  </div>
                  <p className="text-gray-700 max-w-md mx-auto">
                    {quality.feedback}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 詳細結果 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 閾値結果 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    IOI変化率閾値
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {testResult.slopeThreshold.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">ms/beat</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>感度レベル</span>
                      <Badge variant={
                        testResult.slopeThreshold < 3 ? 'default' :
                        testResult.slopeThreshold < 6 ? 'secondary' :
                        'outline'
                      }>
                        {testResult.slopeThreshold < 3 ? '高感度' :
                         testResult.slopeThreshold < 6 ? '標準' : '要改善'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>収束品質</span>
                      <span>{(testResult.convergenceAnalysis.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 方向別精度 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    方向別精度
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Accelerando</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {(testResult.directionAccuracy.accelerando.accuracy * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {testResult.directionAccuracy.accelerando.correct}/{testResult.directionAccuracy.accelerando.total}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm">Ritardando</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {(testResult.directionAccuracy.ritardando.accuracy * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {testResult.directionAccuracy.ritardando.correct}/{testResult.directionAccuracy.ritardando.total}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">総合精度</span>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            {(testResult.directionAccuracy.overall.accuracy * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {testResult.directionAccuracy.overall.correct}/{testResult.directionAccuracy.overall.total}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* パターン分析 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-orange-600" />
                    パターン分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">パターンID</span>
                      <span className="font-mono text-sm">{testResult.patternAnalysis.patternId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">平均反応時間</span>
                      <span className="font-semibold">
                        {testResult.patternAnalysis.averageReactionTime.toFixed(0)}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">パターン精度</span>
                      <span className="font-semibold">
                        {(testResult.patternAnalysis.patternAccuracy * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 測定統計 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    測定統計
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">総試行回数</span>
                      <span className="font-semibold">{testResult.totalTrials}回</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">反転回数</span>
                      <span className="font-semibold">{testResult.totalReversals}回</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">測定時間</span>
                      <span className="font-semibold">
                        {Math.round(testResult.duration / 1000)}秒
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">収束状態</span>
                      <Badge variant={testResult.convergenceAnalysis.isConverged ? 'default' : 'secondary'}>
                        {testResult.convergenceAnalysis.isConverged ? '収束済み' : '未収束'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 推奨事項（分析結果がある場合） */}
            {resultAnalysis?.recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    推奨事項
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {resultAnalysis.recommendations.map((recommendation, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-700">{recommendation}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 進行ボタン */}
            <div className="flex justify-between">
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                やり直し
              </Button>
              <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
                結果を確認
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // 準備完了状態
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* ヘッダー */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">BFITテスト</h1>
              <p className="text-sm text-gray-600">
                複雑リズム・ビート発見・テンポ方向判定テスト
              </p>
            </div>
            <Button onClick={handleBack} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* テスト説明 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-6 h-6 text-purple-600" />
                BFITテストについて
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                BFITテストでは、複雑なリズムパターンの中からビートを発見し、
                そのテンポ変化（加速・減速）を判定する能力を測定します。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    ステップ1: ビート発見
                  </h4>
                  <p className="text-sm text-purple-700">
                    不等間隔の8音符パターンから規則的なビートを感じ取ります
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    ステップ2: テンポ判定
                  </h4>
                  <p className="text-sm text-blue-700">
                    ビートのテンポが加速するか減速するかを判定します
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 測定設定 */}
          <Card>
            <CardHeader>
              <CardTitle>測定設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(hearingThreshold + 30).toFixed(0)}
                  </div>
                  <div className="text-gray-600">音圧 (dB SPL)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">120</div>
                  <div className="text-gray-600">基準テンポ (BPM)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">8.0</div>
                  <div className="text-gray-600">初期変化率 (ms/beat)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">25</div>
                  <div className="text-gray-600">最大試行回数</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 注意事項 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                注意事項
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  ヘッドフォンまたはイヤフォンを使用してください
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  静かな環境で実施してください
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  複雑なリズムパターンに集中してください
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  所要時間は約10-15分です
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 開始ボタン */}
          <div className="text-center">
            <Button 
              onClick={handleStartTest}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 px-8 py-3"
            >
              BFITテストを開始
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
} 