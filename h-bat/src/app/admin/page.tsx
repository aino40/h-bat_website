import Link from 'next/link';
import { ArrowLeft, Shield, Database, Settings, Download } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>ホームに戻る</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">H-BAT 管理者</h1>
            </div>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">管理者システム</h2>
          <p className="text-gray-600">H-BATシステムの管理・監視機能</p>
        </div>

        {/* Login Prompt */}
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">管理者ログインが必要です</h3>
          <p className="text-gray-600 mb-6">
            管理機能にアクセスするには、管理者アカウントでログインしてください。
          </p>
          <Link
            href="/admin/login"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            管理者ログイン
          </Link>
        </div>

        {/* Feature Preview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border opacity-75">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">セッション管理</p>
                <p className="text-lg font-semibold text-gray-400">ログイン後利用可能</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border opacity-75">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3">
                <Download className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">データエクスポート</p>
                <p className="text-lg font-semibold text-gray-400">ログイン後利用可能</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border opacity-75">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-3">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">システム設定</p>
                <p className="text-lg font-semibold text-gray-400">ログイン後利用可能</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 