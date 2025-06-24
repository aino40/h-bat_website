'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Play, 
  Headphones, 
  BarChart3, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Shield,
  FileText,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/checkbox'

export default function Home() {
  const [showConsent, setShowConsent] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleStartTest = () => {
    setShowConsent(true)
  }

  const handleConsentSubmit = async () => {
    if (!consentChecked) return
    
    setIsLoading(true)
    // 同意情報をローカルストレージに保存
    localStorage.setItem('h-bat-consent', JSON.stringify({
      agreed: true,
      timestamp: new Date().toISOString()
    }))
    
    // ユーザー情報入力画面に遷移
    setTimeout(() => {
      router.push('/user-info')
    }, 1000)
  }

  if (showConsent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-blue-100 rounded-full p-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  研究参加に関する同意書
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">研究の目的</h3>
                  <p className="text-gray-700 mb-4">
                    本研究は、リズム知覚能力（拍子・テンポ・ビート検出）の個人差を科学的に評価することを目的としています。
                    得られたデータは音楽認知研究の発展に貢献し、音楽教育や聴覚訓練プログラムの改善に活用されます。
                  </p>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">テスト内容</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                    <li>聴力閾値測定（1kHz, 2kHz, 4kHz純音）</li>
                    <li>拍子判別テスト（2拍子 vs 3拍子）</li>
                    <li>テンポ変化判定テスト（加速 vs 減速）</li>
                    <li>複雑リズムパターン認識テスト</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">参加条件・注意事項</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                    <li>ヘッドフォンまたはイヤホンを使用してください</li>
                    <li>静かな環境で実施してください</li>
                    <li>所要時間は約20分です</li>
                    <li>聴覚に問題がある場合は参加をお控えください</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">データの取り扱い</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                    <li>個人を特定できる情報は収集しません</li>
                    <li>データは研究目的でのみ使用されます</li>
                    <li>研究結果は学術論文として公表される可能性があります</li>
                    <li>いつでも参加を中止することができます</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-gray-900 mb-3">お問い合わせ</h3>
                  <p className="text-gray-700 mb-6">
                    研究に関するご質問は、研究責任者までお問い合わせください。<br />
                    Email: research@h-bat.example.com
                  </p>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="consent"
                      checked={consentChecked}
                      onCheckedChange={(checked) => setConsentChecked(checked === true)}
                      className="mt-1"
                    />
                    <label 
                      htmlFor="consent"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      上記の内容を理解し、研究参加に同意します。
                      また、いつでも参加を中止できることを理解しました。
                    </label>
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowConsent(false)}
                    disabled={isLoading}
                  >
                    戻る
                  </Button>
                  <Button
                    onClick={handleConsentSubmit}
                    disabled={!consentChecked || isLoading}
                    className="min-w-[120px]"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>処理中...</span>
                      </div>
                    ) : (
                      <>
                        同意して開始
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Headphones className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">H-BAT</h1>
            </div>
            <nav className="flex space-x-4">
              <Link
                href="/admin"
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>管理者</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center mb-8">
            <motion.div 
              className="bg-white rounded-full p-4 shadow-lg"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Play className="h-16 w-16 text-blue-600" />
            </motion.div>
          </div>
          
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            🎵 H-BAT リズム知覚テスト 🎵
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            あなたのリズム感を科学的に測定します。聴力チェックから始まり、
            拍子判定、テンポ変化、複雑リズムの認識能力を評価します。
          </p>

          <div className="mb-12">
            <Button
              onClick={handleStartTest}
              size="lg"
              className="px-8 py-4 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Play className="h-5 w-5 mr-2" />
              テストを開始する
            </Button>
          </div>

          {/* Features */}
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-green-100 rounded-full p-3">
                    <Headphones className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">🎧 聴力チェック</h3>
                <p className="text-sm text-gray-600">
                  1kHz/2kHz/4kHz純音による<br />
                  個人聴力閾値測定（3分）
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-blue-100 rounded-full p-3">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">🥁 拍子判定テスト</h3>
                <p className="text-sm text-gray-600">
                  2拍子 vs 3拍子の<br />
                  強拍認識能力測定（5分）
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-purple-100 rounded-full p-3">
                    <Play className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">⏱️ テンポ変化テスト</h3>
                <p className="text-sm text-gray-600">
                  加速・減速の<br />
                  テンポ方向判定（5分）
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-orange-100 rounded-full p-3">
                    <Settings className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">🎼 複雑リズムテスト</h3>
                <p className="text-sm text-gray-600">
                  不等間隔パターンでの<br />
                  ビート発見・判定（7分）
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notice */}
          <motion.div 
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center justify-center mb-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="font-semibold text-yellow-800">注意事項</h3>
            </div>
            <ul className="text-sm text-yellow-700 space-y-2">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-yellow-600" />
                ヘッドフォンまたはイヤホンが必須です
              </li>
              <li className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-yellow-600" />
                静かな環境で実施してください
              </li>
              <li className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                全体の所要時間は約20分です
              </li>
              <li className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
                途中で中断せずに最後まで実施してください
              </li>
            </ul>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 H-BAT (Hearing-Based Audio Tests). All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}