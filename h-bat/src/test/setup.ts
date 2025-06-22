import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.AudioContext for tests
global.AudioContext = class MockAudioContext {
  createOscillator() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 440 },
      type: 'sine'
    }
  }
  
  createGain() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { value: 1 }
    }
  }
  
  get destination() {
    return { connect: vi.fn(), disconnect: vi.fn() }
  }
  
  close() {
    return Promise.resolve()
  }
  
  get state() {
    return 'running'
  }
  
  resume() {
    return Promise.resolve()
  }
} as unknown as typeof AudioContext

// Mock window.webkitAudioContext
;(global as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext = global.AudioContext 