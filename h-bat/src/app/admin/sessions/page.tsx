'use client'

import { useState, useEffect } from 'react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface SessionData {
  id: string
  profile_id: string
  started_at: string
  completed_at: string | null
  status: 'in_progress' | 'completed' | 'abandoned'
  profiles: {
    age: number
    gender: string
    handedness: string
  }
  hearing_thresholds: Array<{
    frequency: number
    threshold_db: number
  }>
  thresholds: {
    bst_db: number | null
    bit_slope: number | null
    bfit_slope: number | null
  } | null
}

interface FilterOptions {
  status: string
  dateRange: string
  ageRange: string
  gender: string
}

export default function AdminSessionsPage() {
  const { user, isAdmin, isLoading } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [filteredSessions, setFilteredSessions] = useState<SessionData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: 'all',
    ageRange: 'all',
    gender: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const itemsPerPage = 10
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentSessions = filteredSessions.slice(startIndex, endIndex)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/admin/login')
      return
    }

    if (!isLoading && user && !isAdmin) {
      router.push('/')
      return
    }

    if (user && isAdmin) {
      fetchSessions()
    }
  }, [user, isAdmin, isLoading, router])

  const fetchSessions = async () => {
    try {
      setIsLoadingData(true)
      
      // Mock data for now - replace with actual Supabase query
      const mockData = [
        {
          id: 'session-001',
          profile_id: 'profile-001',
          started_at: '2024-01-15T10:30:00Z',
          completed_at: '2024-01-15T10:52:00Z',
          status: 'completed' as const,
          profiles: {
            age: 28,
            gender: 'male',
            handedness: 'right'
          },
          hearing_thresholds: [
            { frequency: 1000, threshold_db: 25 },
            { frequency: 2000, threshold_db: 20 },
            { frequency: 4000, threshold_db: 30 }
          ],
          thresholds: {
            bst_db: 12.5,
            bit_slope: 8.2,
            bfit_slope: 15.1
          }
        },
        {
          id: 'session-002',
          profile_id: 'profile-002',
          started_at: '2024-01-15T14:15:00Z',
          completed_at: null,
          status: 'in_progress' as const,
          profiles: {
            age: 35,
            gender: 'female',
            handedness: 'left'
          },
          hearing_thresholds: [],
          thresholds: null
        }
      ]

      setSessions(mockData)
      setFilteredSessions(mockData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setIsLoadingData(false)
    }
  }

  // Apply filters and search
  useEffect(() => {
    let filtered = sessions

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.profile_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(session => session.status === filters.status)
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const startDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
      }
      
      filtered = filtered.filter(session => 
        new Date(session.started_at) >= startDate
      )
    }

    // Age range filter
    if (filters.ageRange !== 'all') {
      filtered = filtered.filter(session => {
        const age = session.profiles?.age
        if (!age) return false
        
        switch (filters.ageRange) {
          case '18-25':
            return age >= 18 && age <= 25
          case '26-35':
            return age >= 26 && age <= 35
          case '36-50':
            return age >= 36 && age <= 50
          case '51+':
            return age >= 51
          default:
            return true
        }
      })
    }

    // Gender filter
    if (filters.gender !== 'all') {
      filtered = filtered.filter(session => 
        session.profiles?.gender === filters.gender
      )
    }

    setFilteredSessions(filtered)
    setCurrentPage(1)
  }, [sessions, searchTerm, filters])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'abandoned':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '完了'
      case 'in_progress':
        return '実施中'
      case 'abandoned':
        return '中断'
      default:
        return '不明'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportToCSV = async (sessionId?: string) => {
    try {
      // TODO: Implement CSV export functionality
      console.warn('Export CSV for session:', sessionId || 'all')
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">セッションデータを読み込み中...</p>
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
              <Link
                href="/admin/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>ダッシュボード</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">セッション管理</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fetchSessions()}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>更新</span>
              </button>
              <button
                onClick={() => exportToCSV()}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>一括エクスポート</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="セッションIDで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>フィルター</span>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ステータス
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">すべて</option>
                    <option value="completed">完了</option>
                    <option value="in_progress">実施中</option>
                    <option value="abandoned">中断</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    期間
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">すべて</option>
                    <option value="today">今日</option>
                    <option value="week">過去1週間</option>
                    <option value="month">過去1ヶ月</option>
                  </select>
                </div>

                {/* Age Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    年齢層
                  </label>
                  <select
                    value={filters.ageRange}
                    onChange={(e) => setFilters({...filters, ageRange: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">すべて</option>
                    <option value="18-25">18-25歳</option>
                    <option value="26-35">26-35歳</option>
                    <option value="36-50">36-50歳</option>
                    <option value="51+">51歳以上</option>
                  </select>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    性別
                  </label>
                  <select
                    value={filters.gender}
                    onChange={(e) => setFilters({...filters, gender: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">すべて</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {filteredSessions.length} 件のセッション
            {searchTerm && ` (「${searchTerm}」で検索)`}
          </p>
          <div className="text-sm text-gray-500">
            {startIndex + 1}-{Math.min(endIndex, filteredSessions.length)} / {filteredSessions.length}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">データ取得エラー</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sessions Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {currentSessions.length === 0 ? (
            <div className="p-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">セッションが見つかりません</h3>
              <p className="text-gray-600">検索条件を変更してお試しください。</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        セッション
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        被験者情報
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        開始日時
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        結果
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {session.id.slice(0, 8)}...
                          </div>
                          <div className="text-sm text-gray-500">
                            {session.profile_id.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {session.profiles?.age}歳 / {session.profiles?.gender === 'male' ? '男性' : session.profiles?.gender === 'female' ? '女性' : 'その他'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {session.profiles?.handedness === 'right' ? '右利き' : session.profiles?.handedness === 'left' ? '左利き' : '両利き'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(session.started_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(session.status)}
                            <span className="text-sm text-gray-900">
                              {getStatusText(session.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.status === 'completed' ? (
                            <div className="space-y-1">
                              <div>BST: {session.thresholds?.bst_db?.toFixed(1) || 'N/A'} dB</div>
                              <div>BIT: {session.thresholds?.bit_slope?.toFixed(1) || 'N/A'} ms</div>
                              <div>BFIT: {session.thresholds?.bfit_slope?.toFixed(1) || 'N/A'} ms</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">未完了</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              href={`/admin/sessions/${session.id}`}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => exportToCSV(session.id)}
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden">
                <div className="space-y-4 p-4">
                  {currentSessions.map((session) => (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(session.status)}
                          <span className="font-medium text-gray-900">
                            {getStatusText(session.status)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/admin/sessions/${session.id}`}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => exportToCSV(session.id)}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">セッションID:</span>
                          <span className="ml-2 text-gray-900">{session.id.slice(0, 8)}...</span>
                        </div>
                        <div>
                          <span className="text-gray-500">被験者:</span>
                          <span className="ml-2 text-gray-900">
                            {session.profiles?.age}歳 / {session.profiles?.gender === 'male' ? '男性' : session.profiles?.gender === 'female' ? '女性' : 'その他'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">開始日時:</span>
                          <span className="ml-2 text-gray-900">{formatDate(session.started_at)}</span>
                        </div>
                        
                        {session.status === 'completed' && session.thresholds && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-gray-500 text-xs mb-2">テスト結果</div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>BST: {session.thresholds.bst_db?.toFixed(1) || 'N/A'} dB</div>
                              <div>BIT: {session.thresholds.bit_slope?.toFixed(1) || 'N/A'} ms</div>
                              <div>BFIT: {session.thresholds.bfit_slope?.toFixed(1) || 'N/A'} ms</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              {startIndex + 1} - {Math.min(endIndex, filteredSessions.length)} / {filteredSessions.length} 件
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>前へ</span>
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm rounded-md ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>次へ</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
} 