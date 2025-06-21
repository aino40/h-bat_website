/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Font Family
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      
      // H-BAT Color Palette
      colors: {
        // Primary Colors (音響・音楽テーマ)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb', // メインブルー
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1e293b',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#7c3aed', // アクセントパープル
          600: '#7c2d12',
          700: '#6b21a8',
          800: '#581c87',
          900: '#4c1d95',
        },
        green: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // 成功グリーン
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        
        // Secondary Colors (ポップ要素)
        orange: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // エナジーオレンジ
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        pink: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899', // フレンドリーピンク
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4', // フレッシュシアン
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        
        // Admin Colors (管理者画面専用)
        admin: {
          primary: '#1e40af',    // 管理者メインブルー
          secondary: '#64748b',  // 管理者セカンダリー
          accent: '#7c3aed',     // 管理者アクセント
          dark: '#0f172a',       // ダークモード対応
        },
        
        // Status Colors
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        
        // Data Visualization Colors
        chart: {
          blue: '#3b82f6',    // BST データ
          green: '#10b981',   // BIT データ
          purple: '#8b5cf6',  // BFIT データ
          orange: '#f59e0b',  // 聴力データ
          red: '#ef4444',     // エラー・異常値
        },
      },
      
      // Typography
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.25' }],     // 12px - キャプション
        'sm': ['0.875rem', { lineHeight: '1.5' }],     // 14px - 補助テキスト
        'base': ['1rem', { lineHeight: '1.5' }],       // 16px - 本文
        'lg': ['1.125rem', { lineHeight: '1.75' }],    // 18px - リード文
        'xl': ['1.25rem', { lineHeight: '1.75' }],     // 20px - 小見出し
        '2xl': ['1.5rem', { lineHeight: '1.5' }],      // 24px - 見出し
        '3xl': ['1.875rem', { lineHeight: '1.25' }],   // 30px - 大見出し
        '4xl': ['2.25rem', { lineHeight: '1.25' }],    // 36px - ヒーロータイトル
      },
      
      // Spacing & Sizing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Border Radius
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      
      // Box Shadow
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'elevated': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'button': '0 4px 14px 0 rgba(37, 99, 235, 0.15)',
        'audio': '0 8px 25px -8px rgba(124, 58, 237, 0.3)',
      },
      
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      
      // Keyframes
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      
      // Transitions
      transitionDuration: {
        '250': '250ms',
        '400': '400ms',
      },
      
      // Backdrop Blur
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
} 