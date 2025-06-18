import Link from 'next/link';
import { Play, Headphones, BarChart3, Settings } from 'lucide-react';

export default function Home() {
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
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-full p-4 shadow-lg">
              <Play className="h-16 w-16 text-blue-600" />
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            🎵 H-BAT リズム知覚テスト 🎵
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            あなたのリズム感を科学的に測定します。聴力チェックから始まり、
            拍子判定、テンポ変化、複雑リズムの認識能力を評価します。
          </p>

          <div className="mb-12">
            <Link
              href="/test"
              className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <Play className="h-5 w-5 mr-2" />
              テストを開始する
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-center mb-4">
                <Headphones className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">🎧 聴力チェック</h3>
              <p className="text-sm text-gray-600">
                1kHz/2kHz/4kHz純音による<br />
                個人聴力閾値測定（3分）
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">🥁 拍子判定テスト</h3>
              <p className="text-sm text-gray-600">
                2拍子 vs 3拍子の<br />
                強拍認識能力測定（5分）
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-center mb-4">
                <Play className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">⏱️ テンポ変化テスト</h3>
              <p className="text-sm text-gray-600">
                加速・減速の<br />
                テンポ方向判定（5分）
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-center mb-4">
                <Settings className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">🎼 複雑リズムテスト</h3>
              <p className="text-sm text-gray-600">
                不等間隔パターンでの<br />
                ビート発見・判定（7分）
              </p>
            </div>
          </div>

          {/* Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold text-yellow-800 mb-3">⚠️ 注意事項</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• ヘッドフォンまたはイヤホンが必須です</li>
              <li>• 静かな環境で実施してください</li>
              <li>• 全体の所要時間は約20分です</li>
              <li>• 途中で中断せずに最後まで実施してください</li>
            </ul>
          </div>
        </div>
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
  );
}