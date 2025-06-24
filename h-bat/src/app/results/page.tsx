'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'
import { 
  Trophy, 
  RotateCcw, 
  BarChart3, 
  Play, 
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/badge'
import { useTestNavigation } from '@/hooks/useTestNavigation'

interface TestResult {
  testType: string
  testName: string
  threshold: number
  unit: string
  grade: string
  percentile: number
  accuracy: number
  trials: number
}

interface HearingResult {
  frequency: string
  threshold: number
  grade: string
}

export default function ResultsPage() {
  const router = useRouter()
  const { session, resetSession } = useTestNavigation()
  const [isLoading, setIsLoading] = useState(true)
  const [results, setResults] = useState<{
    hearing: HearingResult[]
    tests: TestResult[]
    overall: {
      grade: string
      score: number
      percentile: number
    }
  } | null>(null)

  useEffect(() => {
    const loadResults = () => {
      try {
        // Mock data for demonstration
        const mockResults = {
          hearing: [
            { frequency: '1kHz', threshold: 25, grade: 'B' },
            { frequency: '2kHz', threshold: 20, grade: 'A' },
            { frequency: '4kHz', threshold: 30, grade: 'B' }
          ],
          tests: [
            {
              testType: 'bst',
              testName: 'BST (拍子判定)',
              threshold: 12.5,
              unit: 'dB',
              grade: 'B',
              percentile: 65,
              accuracy: 82.5,
              trials: 35
            },
            {
              testType: 'bit',
              testName: 'BIT (テンポ変化)',
              threshold: 8.2,
              unit: 'ms/beat',
              grade: 'A',
              percentile: 75,
              accuracy: 88.0,
              trials: 42
            },
            {
              testType: 'bfit',
              testName: 'BFIT (複雑リズム)',
              threshold: 15.1,
              unit: 'ms/beat',
              grade: 'C',
              percentile: 55,
              accuracy: 75.5,
              trials: 38
            }
          ],
          overall: {
            grade: 'B',
            score: 78,
            percentile: 65
          }
        }
        
        setResults(mockResults)
      } catch (error) {
        console.error('Error loading results:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadResults()
  }, [session, router])

  const getGradeColor = (grade: string) => {
    const colors = {
      A: 'bg-green-100 text-green-800 border-green-200',
      B: 'bg-blue-100 text-blue-800 border-blue-200',
      C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      D: 'bg-orange-100 text-orange-800 border-orange-200',
      F: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[grade as keyof typeof colors] || colors.C
  }

  const handleRestart = () => {
    resetSession()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">結果を処理中...</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">結果が見つかりません</h2>
            <p className="text-gray-600 mb-4">テストが完了していないか、データが破損している可能性があります。</p>
            <Button onClick={() => router.push('/')}>
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const chartData = results.tests.map(test => ({
    name: test.testName.split(' ')[0],
    threshold: test.threshold,
    accuracy: test.accuracy
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-white rounded-full p-4 shadow-lg">
                <Trophy className="h-12 w-12 text-yellow-500" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🎉 テスト完了！ 🎉</h1>
            <p className="text-lg text-gray-600">お疲れさまでした。あなたのリズム知覚能力の結果をご確認ください。</p>
          </div>

          {/* Overall Grade */}
          <Card className="mb-8 shadow-xl">
            <CardContent className="text-center p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">総合評価</h2>
              <div className="flex items-center justify-center space-x-8 mb-6">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold border-2 ${getGradeColor(results.overall.grade)}`}>
                    {results.overall.grade}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">総合グレード</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {results.overall.score}
                  </div>
                  <p className="text-sm text-gray-600">総合スコア</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {results.overall.percentile}%
                  </div>
                  <p className="text-sm text-gray-600">上位パーセンタイル</p>
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <Button onClick={() => router.push('/thank-you')} variant="outline">
                  お礼ページへ
                </Button>
                <Button onClick={handleRestart}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  もう一度テスト
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Test Results Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  テスト結果一覧
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="threshold" fill="#3B82F6" name="閾値" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Detailed Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Play className="h-5 w-5 mr-2" />
                  リズム知覚テスト結果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.tests.map((result, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{result.testName}</h4>
                        <Badge className={getGradeColor(result.grade)}>
                          {result.grade}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="block font-medium">閾値</span>
                          {result.threshold.toFixed(1)} {result.unit}
                        </div>
                        <div>
                          <span className="block font-medium">正答率</span>
                          {result.accuracy.toFixed(1)}%
                        </div>
                        <div>
                          <span className="block font-medium">試行数</span>
                          {result.trials} 回
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
