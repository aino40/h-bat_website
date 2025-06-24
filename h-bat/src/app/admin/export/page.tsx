'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Database, Calendar, FileText, Clock, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// Mock API functions for demonstration
const ExportAPI = {
  exportData: async (_config: any): Promise<Blob> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    const csvContent = `session_id,created_at,age,gender
1,2024-06-24,25,male
2,2024-06-24,30,female`
    return new Blob([csvContent], { type: 'text/csv' })
  },
  
  downloadBlob: (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
  
  generateFilename: (_config: any): string => {
    const date = new Date().toISOString().split('T')[0]
    const dataTypesSuffix = _config.dataTypes.length === 3 ? 'all' : _config.dataTypes.join('-')
    return `h-bat-export-${dataTypesSuffix}-${date}.${_config.format}`
  },
  
  getExportHistory: async () => [
    {
      id: '1',
      filename: 'h-bat-export-all-2024-06-24.csv',
      format: 'csv',
      size: 245760,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      status: 'completed'
    },
    {
      id: '2',
      filename: 'h-bat-export-thresholds-2024-06-23.tsv',
      format: 'tsv',
      size: 128512,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      status: 'completed'
    }
  ],
  
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Byte'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
}

export default function AdminExportPage() {
  const { user, isAdmin, isLoading } = useAuth()
  const router = useRouter()
  
  const [exportConfig, setExportConfig] = useState({
    format: 'csv',
    dataTypes: ['profiles', 'thresholds', 'trials'],
    startDate: '',
    endDate: ''
  })
  
  const [isExporting, setIsExporting] = useState(false)
  const [exportHistory, setExportHistory] = useState<any[]>([])
  const [previewCount, setPreviewCount] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/admin/login')
      return
    }

    if (!isLoading && user && !isAdmin) {
      router.push('/')
      return
    }

    // Load export history
    loadExportHistory()
    // Simulate preview count
    setPreviewCount(1247)
  }, [user, isAdmin, isLoading, router])

  const loadExportHistory = async () => {
    try {
      const history = await ExportAPI.getExportHistory()
      setExportHistory(history)
    } catch (error) {
      console.error('Failed to load export history:', error)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await ExportAPI.exportData(exportConfig)
      const filename = ExportAPI.generateFilename(exportConfig)
      ExportAPI.downloadBlob(blob, filename)
      
      // Refresh export history
      await loadExportHistory()
    } catch (error) {
      console.error('Export failed:', error)
      alert('エクスポートに失敗しました')
    } finally {
      setIsExporting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link
              href="/admin/dashboard"
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>ダッシュボードに戻る</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Database className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">データエクスポート</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Export Configuration */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Download className="h-5 w-5 mr-2 text-blue-600" />
              エクスポート設定
            </h2>

            <div className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  期間選択
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">開始日</label>
                    <input
                      type="date"
                      value={exportConfig.startDate}
                      onChange={(e) => setExportConfig(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">終了日</label>
                    <input
                      type="date"
                      value={exportConfig.endDate}
                      onChange={(e) => setExportConfig(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Data Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  データ種別
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'profiles', label: 'プロフィール情報' },
                    { key: 'thresholds', label: '聴力・閾値データ' },
                    { key: 'trials', label: '試行データ' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportConfig.dataTypes.includes(key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExportConfig(prev => ({
                              ...prev,
                              dataTypes: [...prev.dataTypes, key]
                            }))
                          } else {
                            setExportConfig(prev => ({
                              ...prev,
                              dataTypes: prev.dataTypes.filter(t => t !== key)
                            }))
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  出力形式
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'csv', label: 'CSV (Excel対応)' },
                    { key: 'tsv', label: 'TSV (タブ区切り)' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="radio"
                        name="format"
                        value={key}
                        checked={exportConfig.format === key}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, format: e.target.value }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {previewCount && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm text-blue-800">
                      プレビュー: <strong>{previewCount.toLocaleString()}</strong> 件のレコード
                    </span>
                  </div>
                </div>
              )}

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={isExporting || exportConfig.dataTypes.length === 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>エクスポート中...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    <span>エクスポート実行</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Export History */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              エクスポート履歴
            </h2>

            <div className="space-y-4">
              {exportHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>エクスポート履歴がありません</p>
                </div>
              ) : (
                exportHistory.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.filename}</h3>
                        <div className="mt-1 text-sm text-gray-500 space-y-1">
                          <div className="flex items-center space-x-4">
                            <span>形式: {item.format.toUpperCase()}</span>
                            <span>サイズ: {ExportAPI.formatFileSize(item.size)}</span>
                          </div>
                          <div>作成日時: {formatDate(item.created_at)}</div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : item.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status === 'completed' ? '完了' : 
                           item.status === 'failed' ? 'エラー' : '処理中'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
