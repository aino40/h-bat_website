import Link from 'next/link';
import { ArrowLeft, Play, Info } from 'lucide-react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>ホームに戻る</span>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">H-BAT テスト</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-100 rounded-full p-4">
                <Play className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              テスト準備中
            </h2>
            
            <p className="text-gray-600 mb-6">
              H-BATリズム知覚テストの実装準備中です。<br />
              現在は基本的なプロジェクト構造の構築が完了しました。
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-left">
                  <h3 className="font-semibold text-blue-900 mb-2">次の開発ステップ</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Supabaseデータベース設定</li>
                    <li>• Tone.js音響処理システム</li>
                    <li>• ステアケース法アルゴリズム</li>
                    <li>• 聴力閾値測定機能</li>
                    <li>• BST/BIT/BFITテスト実装</li>
                  </ul>
                </div>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
} 