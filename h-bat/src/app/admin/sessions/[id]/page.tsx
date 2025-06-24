'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, User, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function SessionDetailPage() {
  const { user, isAdmin, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/admin/login')
      return
    }

    if (!isLoading && user && !isAdmin) {
      router.push('/')
      return
    }
  }, [user, isAdmin, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/sessions"
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>セッション一覧</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">セッション詳細</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <User className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">セッション情報</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">セッションID:</span>
              <span className="ml-2 text-gray-900 font-mono">{sessionId}</span>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">開発中</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    詳細なセッション情報とデータ可視化機能は開発中です。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
