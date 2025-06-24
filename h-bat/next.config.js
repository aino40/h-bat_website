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
  // 動的レンダリングを強制
  generateStaticParams: false,
  // ランタイム設定
  serverComponentsExternalPackages: ['@supabase/supabase-js'],
}

module.exports = nextConfig
