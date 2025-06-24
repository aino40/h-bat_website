'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TestStep, DEFAULT_TEST_STEPS } from '@/components/navigation/TestProgress'

export interface TestSession {
  id: string
  startedAt: string
  currentStep: string
  completedSteps: string[]
  userInfo?: Record<string, unknown>
  hearingThresholds?: Record<string, number>
  testResults?: Record<string, unknown>
}

export function useTestNavigation() {
  const router = useRouter()
  const [session, setSession] = useState<TestSession | null>(null)
  const [steps, setSteps] = useState<TestStep[]>(DEFAULT_TEST_STEPS)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize or load existing session
  useEffect(() => {
    const initializeSession = () => {
      try {
        const existingSession = localStorage.getItem('h-bat-session')
        const userInfo = localStorage.getItem('h-bat-user-info')
        
        if (existingSession) {
          const sessionData = JSON.parse(existingSession)
          setSession(sessionData)
          updateStepsStatus(sessionData.currentStep, sessionData.completedSteps)
        } else if (userInfo) {
          // Create new session if user info exists
          const newSession: TestSession = {
            id: `session_${Date.now()}`,
            startedAt: new Date().toISOString(),
            currentStep: 'hearing',
            completedSteps: [],
            userInfo: JSON.parse(userInfo)
          }
          setSession(newSession)
          localStorage.setItem('h-bat-session', JSON.stringify(newSession))
          updateStepsStatus('hearing', [])
        }
      } catch (error) {
        console.error('Error initializing session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [])

  // Update steps status based on current and completed steps
  const updateStepsStatus = useCallback((currentStep: string, completedSteps: string[]) => {
    setSteps(prevSteps => prevSteps.map(step => ({
      ...step,
      status: completedSteps.includes(step.id) 
        ? 'completed'
        : step.id === currentStep
        ? 'current'
        : 'pending'
    })))
  }, [])

  // Navigate to specific test step
  const navigateToStep = useCallback((stepId: string) => {
    if (!session) return

    const stepRoutes: Record<string, string> = {
      hearing: '/test/hearing',
      bst: '/test/bst',
      bit: '/test/bit',
      bfit: '/test/bfit'
    }

    const route = stepRoutes[stepId]
    if (route) {
      // Update session
      const updatedSession = {
        ...session,
        currentStep: stepId
      }
      setSession(updatedSession)
      localStorage.setItem('h-bat-session', JSON.stringify(updatedSession))
      updateStepsStatus(stepId, session.completedSteps)
      
      // Navigate
      router.push(route)
    }
  }, [session, router, updateStepsStatus])

  // Complete current step and move to next
  const completeCurrentStep = useCallback((testResults?: Record<string, unknown>) => {
    if (!session) return

    const currentStepIndex = steps.findIndex(step => step.id === session.currentStep)
    const nextStep = steps[currentStepIndex + 1]
    
    const updatedCompletedSteps = [...session.completedSteps, session.currentStep]
    const updatedSession = {
      ...session,
      completedSteps: updatedCompletedSteps,
      currentStep: nextStep?.id || 'completed',
      testResults: {
        ...session.testResults,
        [session.currentStep]: testResults
      }
    }

    setSession(updatedSession)
    localStorage.setItem('h-bat-session', JSON.stringify(updatedSession))

    if (nextStep) {
      updateStepsStatus(nextStep.id, updatedCompletedSteps)
      navigateToStep(nextStep.id)
    } else {
      // All tests completed, go to results
      router.push('/results')
    }
  }, [session, steps, router, updateStepsStatus, navigateToStep])

  // Save test result for current step
  const saveTestResult = useCallback((stepId: string, result: Record<string, unknown>) => {
    if (!session) return

    const updatedSession = {
      ...session,
      testResults: {
        ...session.testResults,
        [stepId]: result
      }
    }

    setSession(updatedSession)
    localStorage.setItem('h-bat-session', JSON.stringify(updatedSession))
  }, [session])

  // Save hearing thresholds
  const saveHearingThresholds = useCallback((thresholds: Record<string, number>) => {
    if (!session) return

    const updatedSession = {
      ...session,
      hearingThresholds: thresholds
    }

    setSession(updatedSession)
    localStorage.setItem('h-bat-session', JSON.stringify(updatedSession))
  }, [session])

  // Get progress percentage
  const getProgress = useCallback(() => {
    if (!session) return 0
    
    const totalSteps = steps.length
    const completedCount = session.completedSteps.length
    const currentStepProgress = session.currentStep !== 'completed' ? 0.5 : 0
    
    return Math.min(100, ((completedCount + currentStepProgress) / totalSteps) * 100)
  }, [session, steps])

  // Reset session (for testing or restart)
  const resetSession = useCallback(() => {
    localStorage.removeItem('h-bat-session')
    localStorage.removeItem('h-bat-user-info')
    localStorage.removeItem('h-bat-consent')
    setSession(null)
    setSteps(DEFAULT_TEST_STEPS)
    router.push('/')
  }, [router])

  // Check if step is accessible
  const isStepAccessible = useCallback((stepId: string) => {
    if (!session) return false
    
    const stepIndex = steps.findIndex(step => step.id === stepId)
    const currentStepIndex = steps.findIndex(step => step.id === session.currentStep)
    
    // Can access completed steps or current step
    return session.completedSteps.includes(stepId) || stepIndex <= currentStepIndex
  }, [session, steps])

  return {
    session,
    steps,
    isLoading,
    currentStep: session?.currentStep || '',
    completedSteps: session?.completedSteps || [],
    progress: getProgress(),
    navigateToStep,
    completeCurrentStep,
    saveTestResult,
    saveHearingThresholds,
    resetSession,
    isStepAccessible
  }
} 