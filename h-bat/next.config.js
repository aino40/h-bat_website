/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 警告をエラーとして扱わない
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript型チェックエラーを無視（ビルド時）
    ignoreBuildErrors: false,
  },
  experimental: {
    // 実験的機能の設定
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
