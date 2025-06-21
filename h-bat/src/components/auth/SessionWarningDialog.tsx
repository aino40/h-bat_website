'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'

interface SessionWarningDialogProps {
  isOpen: boolean
  remainingTime: number // in minutes
  onExtendSession: () => void
  onLogout: () => void
}

export function SessionWarningDialog({
  isOpen,
  remainingTime,
  onExtendSession,
  onLogout
}: SessionWarningDialogProps) {
  const [countdown, setCountdown] = useState(remainingTime)

  useEffect(() => {
    if (!isOpen) return

    setCountdown(remainingTime)

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [isOpen, remainingTime, onLogout])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-orange-600" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          セッションの有効期限が近づいています
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          セキュリティのため、非アクティブな状態が続くとセッションが終了します。
        </p>

        {/* Countdown */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="text-orange-800 font-medium">
              残り時間: {countdown}分
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ログアウト
          </button>
          <button
            onClick={onExtendSession}
            className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            セッションを延長
          </button>
        </div>

        {/* Auto logout warning */}
        <p className="text-xs text-gray-500 text-center mt-4">
          {countdown}分後に自動的にログアウトします
        </p>
      </div>
    </div>
  )
} 