'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface SessionManagerOptions {
  // Session timeout in minutes (default: 60 minutes)
  sessionTimeout?: number
  // Warning before logout in minutes (default: 5 minutes)
  warningTime?: number
  // Check interval in minutes (default: 1 minute)
  checkInterval?: number
  // Callback when session is about to expire
  onSessionWarning?: (remainingTime: number) => void
  // Callback when session expires
  onSessionExpired?: () => void
}

export function useSessionManager(options: SessionManagerOptions = {}) {
  const {
    sessionTimeout = 60, // 60 minutes
    warningTime = 5, // 5 minutes warning
    checkInterval = 1, // Check every minute
    onSessionWarning,
    onSessionExpired
  } = options

  const { user, session, signOut } = useAuth()
  const lastActivityRef = useRef(Date.now())
  const warningShownRef = useRef(false)
  const timeoutIdRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Update last activity time
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
  }, [])

  // Check session validity
  const checkSession = useCallback(() => {
    if (!user || !session) return

    const now = Date.now()
    const timeSinceActivity = now - lastActivityRef.current
    const timeoutMs = sessionTimeout * 60 * 1000
    const warningMs = warningTime * 60 * 1000

    // Check if session has expired
    if (timeSinceActivity >= timeoutMs) {
      onSessionExpired?.()
      signOut()
      return
    }

    // Check if warning should be shown
    const remainingTime = timeoutMs - timeSinceActivity
    if (remainingTime <= warningMs && !warningShownRef.current) {
      warningShownRef.current = true
      onSessionWarning?.(Math.ceil(remainingTime / (60 * 1000)))
    }
  }, [user, session, sessionTimeout, warningTime, onSessionWarning, onSessionExpired, signOut])

  // Set up activity listeners
  useEffect(() => {
    if (!user) return

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ]

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true)
    })

    // Set up session check interval
    const intervalId = setInterval(checkSession, checkInterval * 60 * 1000)
    timeoutIdRef.current = intervalId

    // Initial activity update
    updateActivity()

    return () => {
      // Clean up event listeners
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true)
      })

      // Clear interval
      if (timeoutIdRef.current) {
        clearInterval(timeoutIdRef.current)
      }
    }
  }, [user, updateActivity, checkSession, checkInterval])

  // Extend session (reset activity timer)
  const extendSession = useCallback(() => {
    updateActivity()
  }, [updateActivity])

  // Get remaining session time in minutes
  const getRemainingTime = useCallback(() => {
    if (!user) return 0

    const now = Date.now()
    const timeSinceActivity = now - lastActivityRef.current
    const timeoutMs = sessionTimeout * 60 * 1000
    const remainingMs = Math.max(0, timeoutMs - timeSinceActivity)
    
    return Math.ceil(remainingMs / (60 * 1000))
  }, [user, sessionTimeout])

  return {
    extendSession,
    getRemainingTime,
    updateActivity
  }
} 