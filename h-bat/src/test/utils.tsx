import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  testId?: string
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { ...renderOptions } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="test-wrapper">
      {children}
    </div>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Test data factories
export const createMockProfile = (overrides = {}) => ({
  id: 'test-profile-id',
  age: 25,
  gender: 'male' as const,
  handedness: 'right' as const,
  musical_experience: 'beginner' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const createMockSession = (overrides = {}) => ({
  id: 'test-session-id',
  profile_id: 'test-profile-id',
  started_at: new Date().toISOString(),
  completed_at: null,
  status: 'in_progress' as const,
  current_test: 'hearing_threshold' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const createMockHearingThreshold = (overrides = {}) => ({
  session_id: 'test-session-id',
  frequency: 1000,
  threshold_db: 25,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const createMockBSTTrial = (overrides = {}) => ({
  session_id: 'test-session-id',
  trial_index: 1,
  delta_db: 10,
  correct: true,
  response_time: 1500,
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createMockBITrial = (overrides = {}) => ({
  session_id: 'test-session-id',
  trial_index: 1,
  slope_ms: 5,
  slope_sign: 1,
  correct: true,
  response_time: 2000,
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createMockBFITTrial = (overrides = {}) => ({
  session_id: 'test-session-id',
  trial_index: 1,
  pattern_id: 1,
  slope_ms: 8,
  slope_sign: -1,
  correct: false,
  response_time: 2500,
  created_at: new Date().toISOString(),
  ...overrides,
})

// Audio test helpers
export const mockAudioContext = () => {
  const mockContext = {
    createOscillator: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 440 },
      type: 'sine'
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { value: 1 }
    })),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }
  
  return mockContext
}

// Staircase test helpers
export const createStaircaseHistory = (responses: boolean[]) => {
  return responses.map((correct, index) => ({
    trial: index + 1,
    correct,
    level: 20 - (correct ? 2 : -2) * index, // Mock level progression
  }))
}

// Wait for async operations in tests
export const waitFor = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms))

// Mock user interactions
export const mockUserClick = async (element: HTMLElement) => {
  const { fireEvent } = await import('@testing-library/react')
  fireEvent.click(element)
}

export const mockUserInput = async (element: HTMLElement, value: string) => {
  const { fireEvent } = await import('@testing-library/react')
  fireEvent.change(element, { target: { value } })
}

// Re-export testing library utilities
export * from '@testing-library/react'
export { vi } from 'vitest' 