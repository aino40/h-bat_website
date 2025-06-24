'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  User, 
  Calendar, 
  Users, 
  Hand, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle 
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

// バリデーションスキーマ
const userInfoSchema = z.object({
  age: z.number()
    .min(10, '年齢は10歳以上で入力してください')
    .max(100, '年齢は100歳以下で入力してください'),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say'], {
    required_error: '性別を選択してください'
  }),
  handedness: z.enum(['right', 'left', 'both'], {
    required_error: '利き手を選択してください'
  }),
  musicalExperience: z.enum(['none', 'basic', 'intermediate', 'advanced'], {
    required_error: '音楽経験を選択してください'
  }),
  hearingImpairment: z.boolean(),
  consentConfirmed: z.boolean().refine(val => val === true, {
    message: '同意確認が必要です'
  })
})

type UserInfoForm = z.infer<typeof userInfoSchema>

export default function UserInfoPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<UserInfoForm>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      hearingImpairment: false,
      consentConfirmed: false
    }
  })

  const onSubmit = async (data: UserInfoForm) => {
    setIsLoading(true)
    
    try {
      // ユーザー情報をローカルストレージに保存
      localStorage.setItem('h-bat-user-info', JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      }))
      
      // 聴力閾値測定画面に遷移
      setTimeout(() => {
        router.push('/test/hearing')
      }, 1000)
    } catch (error) {
      console.error('Error saving user info:', error)
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                基本情報の入力
              </CardTitle>
              <p className="text-gray-600 mt-2">
                テストの精度向上のため、以下の情報をご入力ください
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* 年齢 */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 mr-2" />
                    年齢
                  </label>
                  <input
                    type="number"
                    {...register('age', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 25"
                    min="10"
                    max="100"
                  />
                  {errors.age && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.age.message}
                    </p>
                  )}
                </div>

                {/* 性別 */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                    <Users className="h-4 w-4 mr-2" />
                    性別
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'male', label: '男性' },
                      { value: 'female', label: '女性' },
                      { value: 'other', label: 'その他' },
                      { value: 'prefer-not-to-say', label: '回答しない' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          {...register('gender')}
                          value={option.value}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.gender && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.gender.message}
                    </p>
                  )}
                </div>

                {/* 利き手 */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                    <Hand className="h-4 w-4 mr-2" />
                    利き手
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'right', label: '右手' },
                      { value: 'left', label: '左手' },
                      { value: 'both', label: '両手' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          {...register('handedness')}
                          value={option.value}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.handedness && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.handedness.message}
                    </p>
                  )}
                </div>

                {/* 音楽経験 */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                    🎵 音楽経験
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'none', label: 'なし（楽器演奏経験なし）' },
                      { value: 'basic', label: '初級（1-3年程度の演奏経験）' },
                      { value: 'intermediate', label: '中級（4-10年程度の演奏経験）' },
                      { value: 'advanced', label: '上級（10年以上または専門的な音楽教育）' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          {...register('musicalExperience')}
                          value={option.value}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.musicalExperience && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.musicalExperience.message}
                    </p>
                  )}
                </div>

                {/* 聴覚に関する質問 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-yellow-800 mb-3">聴覚に関する確認</h3>
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      {...register('hearingImpairment')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    />
                    <span className="ml-2 text-sm text-yellow-700">
                      現在、聴覚に問題がある、または聴覚障害をお持ちですか？
                      <br />
                      <span className="text-xs text-yellow-600">
                        ※該当する場合でもテストは実施可能ですが、結果の解釈にご注意ください
                      </span>
                    </span>
                  </label>
                </div>

                {/* 最終確認 */}
                <div className="border-t pt-6">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      {...register('consentConfirmed')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      入力した情報が正確であることを確認し、テストの開始に同意します。
                    </span>
                  </label>
                  {errors.consentConfirmed && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.consentConfirmed.message}
                    </p>
                  )}
                </div>

                {/* ボタン */}
                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isLoading}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    戻る
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="min-w-[140px]"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>保存中...</span>
                      </div>
                    ) : (
                      <>
                        テスト開始
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 