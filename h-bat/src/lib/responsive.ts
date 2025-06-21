// Tailwind準拠のブレークポイント定義
export const breakpoints = {
  sm: 640,   // スマートフォン
  md: 768,   // タブレット  
  lg: 1024,  // ラップトップ
  xl: 1280,  // デスクトップ
  '2xl': 1536  // 大画面
} as const

export type Breakpoint = keyof typeof breakpoints

// デバイス判定ユーティリティ
export function getDeviceType(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < breakpoints.md) return 'mobile'
  if (width < breakpoints.lg) return 'tablet'
  return 'desktop'
}

// ブレークポイント判定フック（クライアントサイドのみ）
export function useBreakpoint() {
  if (typeof window === 'undefined') {
    return {
      width: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      deviceType: 'desktop' as const
    }
  }

  const width = window.innerWidth
  const deviceType = getDeviceType(width)
  
  return {
    width,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet', 
    isDesktop: deviceType === 'desktop',
    deviceType
  }
}

// レスポンシブクラス生成ユーティリティ
export function responsive<T extends string>(classes: {
  base?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}): string {
  const classArray: string[] = []
  
  if (classes.base) classArray.push(classes.base)
  if (classes.sm) classArray.push(`sm:${classes.sm}`)
  if (classes.md) classArray.push(`md:${classes.md}`)
  if (classes.lg) classArray.push(`lg:${classes.lg}`)
  if (classes.xl) classArray.push(`xl:${classes.xl}`)
  if (classes['2xl']) classArray.push(`2xl:${classes['2xl']}`)
  
  return classArray.join(' ')
}

// コンテナサイズ設定
export const containerSizes = {
  sm: 'max-w-screen-sm',    // 640px
  md: 'max-w-screen-md',    // 768px
  lg: 'max-w-screen-lg',    // 1024px
  xl: 'max-w-screen-xl',    // 1280px
  '2xl': 'max-w-screen-2xl', // 1536px
  full: 'max-w-full'
} as const

// グリッドレスポンシブ設定
export const gridResponsive = {
  // 1列 → 2列 → 3列 → 4列
  cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  // 1列 → 2列 → 3列
  stats: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  // 1列 → 2列
  features: 'grid-cols-1 md:grid-cols-2',
  // 音響テスト用（常に1列、幅調整）
  audioTest: 'grid-cols-1 max-w-2xl mx-auto',
  // 管理者テーブル用
  adminTable: 'grid-cols-1 overflow-x-auto'
} as const

// テキストサイズレスポンシブ設定
export const textResponsive = {
  hero: 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl',
  heading: 'text-2xl sm:text-3xl lg:text-4xl',
  subheading: 'text-xl sm:text-2xl lg:text-3xl',
  body: 'text-base sm:text-lg',
  caption: 'text-sm sm:text-base'
} as const

// スペーシングレスポンシブ設定
export const spacingResponsive = {
  section: 'py-8 sm:py-12 lg:py-16 xl:py-20',
  container: 'px-4 sm:px-6 lg:px-8',
  card: 'p-4 sm:p-6 lg:p-8',
  button: 'px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4'
} as const

// 被験者向け画面のモバイル最適化クラス
export const mobileOptimized = {
  // フルスクリーン対応
  fullScreen: 'min-h-screen bg-gradient-to-br from-blue-50 to-purple-50',
  // 固定ヘッダー
  fixedHeader: 'fixed top-0 w-full bg-white/90 backdrop-blur-sm z-50',
  // スクロール可能コンテンツ
  scrollableContent: 'pt-20 pb-24 px-4 overflow-y-auto',
  // 固定フッター
  fixedFooter: 'fixed bottom-0 w-full bg-white border-t p-4 z-50',
  // 音響テストカード
  audioCard: 'w-full max-w-lg mx-auto',
  // ボタングリッド
  buttonGrid: 'grid grid-cols-2 gap-3 w-full max-w-md mx-auto'
} as const

// 管理者画面のレスポンシブ設定
export const adminResponsive = {
  // デスクトップ: サイドバー + メインコンテンツ
  desktop: 'hidden lg:flex',
  desktopSidebar: 'w-64 bg-white shadow-lg',
  desktopMain: 'flex-1 p-6',
  
  // モバイル: ボトムナビゲーション
  mobile: 'lg:hidden',
  mobileMain: 'pb-16 p-4',
  mobileNav: 'fixed bottom-0 w-full bg-white border-t z-50',
  mobileNavGrid: 'grid grid-cols-4 py-2',
  
  // タブレット対応テーブル
  responsiveTable: {
    desktop: 'hidden md:block',
    mobile: 'md:hidden space-y-4'
  }
} as const

// アニメーション設定（レスポンシブ対応）
export const animationResponsive = {
  // モバイルでは軽量なアニメーション
  card: 'transition-all duration-200 hover:scale-105 md:hover:scale-102',
  button: 'transition-all duration-200 hover:transform hover:-translate-y-0.5 active:transform active:translate-y-0',
  // デスクトップでは豊富なアニメーション
  desktopOnly: 'hidden md:block animate-fade-in'
} as const 