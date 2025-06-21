'use client'

import { motion, type Variants, type Transition } from 'framer-motion'
import { ReactNode } from 'react'

// H-BAT専用アニメーション設定
export const animations = {
  // フェードイン
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // スライドアップ
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // スライドダウン
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // スケールイン
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  
  // 左からスライド
  slideLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // 右からスライド
  slideRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // バウンス
  bounce: {
    initial: { opacity: 0, y: -20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 10
      }
    },
    exit: { opacity: 0, y: -20 }
  },
  
  // 回転フェード
  rotateFade: {
    initial: { opacity: 0, rotate: -10 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 10 },
    transition: { duration: 0.4, ease: 'easeOut' }
  }
} as const

// ステージングアニメーション（複数要素の順次表示）
export const staggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
}

// 音響フィードバック専用アニメーション
export const audioFeedbackVariants: Variants = {
  correct: {
    scale: [1, 1.2, 1],
    backgroundColor: ['#10b981', '#34d399', '#10b981'],
    transition: { duration: 0.6, ease: 'easeInOut' }
  },
  incorrect: {
    x: [-5, 5, -5, 5, 0],
    backgroundColor: ['#ef4444', '#f87171', '#ef4444'],
    transition: { duration: 0.5, ease: 'easeInOut' }
  }
}

// ページトランジション
export const pageTransition: Transition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5
}

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    x: '-100%'
  },
  in: {
    opacity: 1,
    x: 0
  },
  out: {
    opacity: 0,
    x: '100%'
  }
}

// 汎用アニメーションコンポーネント
interface MotionWrapperProps {
  children: ReactNode
  animation?: keyof typeof animations
  delay?: number
  className?: string
  onClick?: () => void
}

export function MotionWrapper({ 
  children, 
  animation = 'fadeIn', 
  delay = 0,
  className,
  onClick 
}: MotionWrapperProps) {
  const animationConfig = animations[animation]
  
  return (
    <motion.div
      initial={animationConfig.initial}
      animate={animationConfig.animate}
      exit={animationConfig.exit}
      transition={{ 
        duration: 0.3, 
        ease: 'easeOut',
        delay 
      }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

// ステージングコンテナ
interface StaggerContainerProps {
  children: ReactNode
  className?: string
}

export function StaggerContainer({ children, className }: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ステージングアイテム
interface StaggerItemProps {
  children: ReactNode
  className?: string
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      variants={staggerItemVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 音響フィードバックコンポーネント
interface AudioFeedbackProps {
  children: ReactNode
  feedback: 'correct' | 'incorrect' | null
  className?: string
}

export function AudioFeedback({ children, feedback, className }: AudioFeedbackProps) {
  return (
    <motion.div
      animate={feedback || 'initial'}
      variants={audioFeedbackVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ホバーエフェクト
interface HoverEffectProps {
  children: ReactNode
  scale?: number
  y?: number
  className?: string
  onClick?: () => void
}

export function HoverEffect({ 
  children, 
  scale = 1.05, 
  y = -2, 
  className,
  onClick 
}: HoverEffectProps) {
  return (
    <motion.div
      whileHover={{ scale, y }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

// プレスエフェクト
interface PressEffectProps {
  children: ReactNode
  scale?: number
  className?: string
  onClick?: () => void
}

export function PressEffect({ 
  children, 
  scale = 0.95, 
  className,
  onClick 
}: PressEffectProps) {
  return (
    <motion.div
      whileTap={{ scale }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

// パルスアニメーション
interface PulseProps {
  children: ReactNode
  scale?: number[]
  duration?: number
  className?: string
}

export function Pulse({ 
  children, 
  scale = [1, 1.05, 1], 
  duration = 2,
  className 
}: PulseProps) {
  return (
    <motion.div
      animate={{ scale }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: 'loop',
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// フローティングアニメーション
interface FloatingProps {
  children: ReactNode
  y?: number[]
  duration?: number
  className?: string
}

export function Floating({ 
  children, 
  y = [0, -10, 0], 
  duration = 3,
  className 
}: FloatingProps) {
  return (
    <motion.div
      animate={{ y }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: 'loop',
        ease: 'easeInOut'
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ページトランジションラッパー
interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  )
} 