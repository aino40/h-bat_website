'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Shield, 
  Database, 
  Settings, 
  Download, 
  Users, 
  Activity,
  BarChart3,
  LogOut,
  User
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function AdminDashboardPage() {
  const { user, isAdmin, signOut, isLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    todaysSessions: 0
  })

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/admin/login')
      return
    }

    if (!isLoading && user && !isAdmin) {
      router.push('/')
      return
    }

    // TODO: Fetch actual stats from Supabase
    // For now, using placeholder data
    setStats({
      totalSessions: 27,
      completedSessions: 20,
      todaysSessions: 3
    })
  }, [user, isAdmin, isLoading, router])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/admin/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

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
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">H-BAT 管理者</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">ダッシュボード</h2>
          <p className="text-gray-600">H-BATシステムの管理・監視機能</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総セッション数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">完了セッション</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-3">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">今日のセッション</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todaysSessions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Management Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Management */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Users className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">セッション管理</h3>
            </div>
            <p className="text-gray-600 mb-4">
              被験者セッションの一覧・詳細表示・検索機能
            </p>
            <Link
              href="/admin/sessions"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              セッション一覧を表示
            </Link>
          </div>

          {/* Data Export */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Download className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">データエクスポート</h3>
            </div>
            <p className="text-gray-600 mb-4">
              CSV/TSV形式でのデータ一括エクスポート機能
            </p>
            <Link
              href="/admin/export"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              データをエクスポート
            </Link>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">システム設定</h3>
            </div>
            <p className="text-gray-600 mb-4">
              テストパラメータ・音響設定の調整機能
            </p>
            <Link
              href="/admin/settings"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              設定を管理
            </Link>
          </div>

          {/* Database Status */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="h-6 w-6 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">データベース状況</h3>
            </div>
            <p className="text-gray-600 mb-4">
              データベース接続状況とパフォーマンス監視
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600 font-medium">正常稼働中</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/sessions"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Users className="h-4 w-4 mr-2" />
              最新セッション確認
            </Link>
            <Link
              href="/admin/export"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              今月のデータ出力
            </Link>
            <Link
              href="/admin/settings"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              テスト設定確認
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 