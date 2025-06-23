'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { HearingFrequency, HEARING_FREQUENCIES } from '@/lib/audio/hearing'

// 聴力測定画面のプロパティ
interface HearingTestScreenProps {
  currentFrequency: HearingFrequency
  currentLevel: number
  isPlaying: boolean
  isTestActive: boolean
  progress: {
    currentFrequencyIndex: number
    totalFrequencies: number
    trialsCompleted: number
    reversalsCount: number
    isConverged: boolean
  }
  onPlayTone: () => Promise<void>
  onResponse: (heard: boolean) => void
  onNextFrequency: () => void
  onPreviousFrequency: () => void
  onRestart: () => void
  onSettings: () => void
  onBack: () => void
  error?: string | null
}

// レスポンスボタンコンポーネント
const ResponseButton: React.FC<{
  heard: boolean
  onClick: () => void
  disabled: boolean
  className?: string
}> = ({ heard, onClick, disabled, className = '' }) => (
  <Button
    variant={heard ? 'primary' : 'secondary'}
    size="lg"
    onClick={onClick}
    disabled={disabled}
    className={`
      flex-1 h-16 text-lg font-semibold transition-all duration-200
      ${heard 
        ? 'bg-green-500 hover:bg-green-600 text-white' 
        : 'bg-red-500 hover:bg-red-600 text-white'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
      ${className}
    `}
  >
    {heard ? (
      <>
        <Volume2 className="w-6 h-6 mr-2" />
        聞こえた
      </>
    ) : (
      <>
        <VolumeX className="w-6 h-6 mr-2" />
        聞こえなかった
      </>
    )}
  </Button>
)

// 周波数表示コンポーネント
const FrequencyDisplay: React.FC<{
  frequency: HearingFrequency
  level: number
  isActive: boolean
}> = ({ frequency, level, isActive }) => (
  <div className={`
    text-center p-4 rounded-lg border-2 transition-all duration-200
    ${isActive 
      ? 'border-blue-500 bg-blue-50 shadow-lg' 
      : 'border-gray-200 bg-gray-50'
    }
  `}>
    <div className="text-2xl font-bold text-gray-800">
      {frequency / 1000}kHz
    </div>
    <div className="text-sm text-gray-600 mt-1">
      {level.toFixed(1)} dB SPL
    </div>
  </div>
)

// 進捗表示コンポーネント
const TestProgress: React.FC<{
  progress: HearingTestScreenProps['progress']
}> = ({ progress }) => {
  const overallProgress = (progress.currentFrequencyIndex / progress.totalFrequencies) * 100
  const frequencyProgress = progress.isConverged ? 100 : (progress.reversalsCount / 6) * 100

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          周波数 {progress.currentFrequencyIndex + 1} / {progress.totalFrequencies}
        </span>
        <span className="text-sm text-gray-500">
          {progress.trialsCompleted} 試行完了
        </span>
      </div>
      
      <div className="space-y-2">
        <Progress 
          value={overallProgress} 
          max={100}
          className="h-2"
          variant="default"
        />
        <Progress 
          value={frequencyProgress} 
          max={100}
          className="h-1"
          variant="success"
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>全体進捗: {overallProgress.toFixed(0)}%</span>
        <span>反転: {progress.reversalsCount}/6</span>
      </div>
    </div>
  )
}

// メイン聴力測定画面コンポーネント
export const HearingTestScreen: React.FC<HearingTestScreenProps> = ({
  currentFrequency,
  currentLevel,
  isPlaying,
  isTestActive,
  progress,
  onPlayTone,
  onResponse,
  onNextFrequency,
  onPreviousFrequency,
  onRestart,
  onSettings,
  onBack,
  error
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

  // 純音再生ハンドラー
  const handlePlayTone = useCallback(async () => {
    if (isLoading || isPlaying) return

    setIsLoading(true)
    try {
      await onPlayTone()
    } catch (error) {
      console.error('Failed to play tone:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, isPlaying, onPlayTone])

  // レスポンスハンドラー
  const handleResponse = useCallback((heard: boolean) => {
    if (isPlaying || isLoading) return
    onResponse(heard)
  }, [isPlaying, isLoading, onResponse])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isTestActive) return

      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault()
          handlePlayTone()
          break
        case '1':
        case 'h':
          event.preventDefault()
          handleResponse(true)
          break
        case '2':
        case 'n':
          event.preventDefault()
          handleResponse(false)
          break
        case 'ArrowLeft':
          event.preventDefault()
          onPreviousFrequency()
          break
        case 'ArrowRight':
          event.preventDefault()
          onNextFrequency()
          break
        case 'r':
          event.preventDefault()
          onRestart()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isTestActive, handlePlayTone, handleResponse, onPreviousFrequency, onNextFrequency, onRestart])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* ヘッダー */}
      <header className="bg-white/90 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                戻る
              </Button>
              <div className="flex items-center space-x-2">
                <Headphones className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-800">
                  聴力閾値測定
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={onRestart}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onSettings}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="mt-4">
            <TestProgress progress={progress} />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 説明書きモーダル */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl p-6 max-w-md w-full"
              >
                <div className="text-center">
                  <Headphones className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-4">聴力測定について</h2>
                  <div className="text-left space-y-3 text-sm text-gray-600">
                    <p>• ヘッドフォンを装着してください</p>
                    <p>• 純音が聞こえたら「聞こえた」を押してください</p>
                    <p>• 聞こえなかった場合は「聞こえなかった」を押してください</p>
                    <p>• 3つの周波数（1kHz, 2kHz, 4kHz）で測定します</p>
                    <p>• 各周波数で約15-20回の試行を行います</p>
                  </div>
                  <Button
                    onClick={() => setShowInstructions(false)}
                    className="mt-6 w-full"
                  >
                    測定を開始
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-8">
          {/* エラー表示 */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
            >
              {error}
            </motion.div>
          )}

          {/* 周波数選択 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">測定周波数</h2>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPreviousFrequency}
                  disabled={progress.currentFrequencyIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNextFrequency}
                  disabled={progress.currentFrequencyIndex === progress.totalFrequencies - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {HEARING_FREQUENCIES.map((freq) => (
                <FrequencyDisplay
                  key={freq}
                  frequency={freq}
                  level={freq === currentFrequency ? currentLevel : 0}
                  isActive={freq === currentFrequency}
                />
              ))}
            </div>
          </Card>

          {/* 音再生コントロール */}
          <Card className="p-8">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {currentFrequency / 1000}kHz の純音
                </h3>
                <p className="text-gray-600">
                  音圧レベル: {currentLevel.toFixed(1)} dB SPL
                </p>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  onClick={handlePlayTone}
                  disabled={isLoading || isPlaying || !isTestActive}
                  className="w-32 h-32 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isLoading || isPlaying ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Pause className="w-12 h-12" />
                    </motion.div>
                  ) : (
                    <Play className="w-12 h-12" />
                  )}
                </Button>
              </motion.div>

              <p className="text-sm text-gray-500">
                クリックまたはスペースキーで音を再生
              </p>
            </div>
          </Card>

          {/* 応答ボタン */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">
              音は聞こえましたか？
            </h3>
            <div className="flex space-x-4">
              <ResponseButton
                heard={true}
                onClick={() => handleResponse(true)}
                disabled={isPlaying || isLoading || !isTestActive}
              />
              <ResponseButton
                heard={false}
                onClick={() => handleResponse(false)}
                disabled={isPlaying || isLoading || !isTestActive}
              />
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">
              キーボード: 1 = 聞こえた, 2 = 聞こえなかった
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default HearingTestScreen 