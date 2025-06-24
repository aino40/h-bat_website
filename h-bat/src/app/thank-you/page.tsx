'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Heart, 
  ExternalLink, 
  Mail, 
  MessageCircle, 
  Star,
  CheckCircle,
  Users,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function ThankYouPage() {
  const [sessionData, setSessionData] = useState<any>(null)
  
  useEffect(() => {
    // Load session data for personalization
    try {
      const session = localStorage.getItem('h-bat-session')
      if (session) {
        setSessionData(JSON.parse(session))
      }
    } catch (error) {
      console.error('Error loading session data:', error)
    }
  }, [])

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleFeedback = () => {
    // External feedback form
    handleExternalLink('https://forms.gle/example-feedback-form')
  }

  const handleSurvey = () => {
    // External survey
    handleExternalLink('https://survey.example.com/h-bat-follow-up')
  }

  const handleResearchInfo = () => {
    // Research information page
    handleExternalLink('https://research.example.com/rhythm-perception')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Thank You Header */}
          <div className="mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <div className="bg-white rounded-full p-6 shadow-lg">
                <Heart className="h-16 w-16 text-red-500" />
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-4xl font-bold text-gray-900 mb-4"
            >
              ありがとうございました！
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              H-BAT リズム知覚テストにご参加いただき、誠にありがとうございました。
              あなたのデータは音楽認知研究の発展に大きく貢献します。
            </motion.p>
          </div>

          {/* Session Summary */}
          {sessionData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-12"
            >
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">テスト完了</h2>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="text-center">
                      <div className="font-medium text-gray-900">セッションID</div>
                      <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                        {sessionData.id?.slice(-8) || 'N/A'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">完了したテスト</div>
                      <div>{sessionData.completedSteps?.length || 0} / 4</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">実施日時</div>
                      <div>
                        {sessionData.startedAt ? 
                          new Date(sessionData.startedAt).toLocaleDateString('ja-JP') : 
                          '不明'
                        }
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Feedback Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-blue-100 rounded-full p-3">
                      <MessageCircle className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <CardTitle className="text-center">フィードバック</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 mb-6">
                    テストの改善のため、ご感想やご意見をお聞かせください。
                    匿名で送信されます。
                  </p>
                  <Button onClick={handleFeedback} className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    フィードバックを送信
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Follow-up Survey Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-purple-100 rounded-full p-3">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <CardTitle className="text-center">追加アンケート</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 mb-6">
                    音楽経験や日常生活に関する追加質問にご協力ください。
                    研究の質向上に役立ちます。
                  </p>
                  <Button onClick={handleSurvey} variant="outline" className="w-full">
                    <Star className="h-4 w-4 mr-2" />
                    アンケートに回答
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Research Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mb-12"
          >
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
              <CardContent className="p-8">
                <div className="flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">研究について</h2>
                </div>
                <p className="text-gray-700 mb-6 max-w-3xl mx-auto">
                  本研究は、リズム知覚能力の個人差とその神経科学的基盤を明らかにすることを目的としています。
                  収集されたデータは、音楽教育プログラムの開発や聴覚処理障害の理解向上に活用されます。
                </p>
                <Button onClick={handleResearchInfo} variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  研究の詳細を見る
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mb-12"
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <Mail className="h-5 w-5 text-gray-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">お問い合わせ</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  研究に関するご質問やご不明な点がございましたら、お気軽にお問い合わせください。
                </p>
                <div className="text-sm text-gray-700">
                  <p><strong>研究責任者:</strong> 研究室名</p>
                  <p><strong>Email:</strong> research@h-bat.example.com</p>
                  <p><strong>電話:</strong> 03-XXXX-XXXX</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Final Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="text-center"
          >
            <p className="text-lg text-gray-700 mb-6">
              再度、貴重なお時間をいただき、ありがとうございました。
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => window.location.href = '/'}>
                ホームに戻る
              </Button>
              <Button 
                onClick={() => window.close()} 
                variant="outline"
              >
                ウィンドウを閉じる
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
