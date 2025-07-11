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
  // 静的生成を無効化してSSRエラーを回避
  output: 'standalone',
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig
