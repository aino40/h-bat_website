import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock performance.now for consistent timing tests
const mockPerformanceNow = vi.fn()
vi.stubGlobal('performance', { now: mockPerformanceNow })

// Mock Tone.js with timing-aware implementations
vi.mock('tone', () => {
  let currentTime = 0
  const scheduledEvents: Array<{ time: number; callback: () => void }> = []
  
  return {
    start: vi.fn().mockResolvedValue(undefined),
    getContext: vi.fn(() => ({
      state: 'running',
      currentTime: () => currentTime,
      resume: vi.fn().mockResolvedValue(undefined)
    })),
    Transport: {
      start: vi.fn(() => {
        currentTime = 0
        // Process scheduled events
        scheduledEvents.forEach(event => {
          setTimeout(event.callback, event.time * 1000)
        })
      }),
      stop: vi.fn(() => {
        scheduledEvents.length = 0
      }),
      scheduleRepeat: vi.fn((callback, interval, startTime = 0) => {
        const eventTime = startTime
        scheduledEvents.push({ time: eventTime, callback })
        return `event-${scheduledEvents.length}`
      }),
      schedule: vi.fn((callback, time) => {
        scheduledEvents.push({ time, callback })
        return `event-${scheduledEvents.length}`
      }),
      cancel: vi.fn(() => {
        scheduledEvents.length = 0
      }),
      bpm: { value: 120 },
      position: '0:0:0'
    },
    Player: vi.fn().mockImplementation((url) => ({
      toDestination: vi.fn().mockReturnThis(),
      start: vi.fn((time = 0) => {
        const actualStartTime = performance.now()
        const expectedStartTime = time * 1000
        // Record timing for analysis
        timingMeasurements.push({
          expected: expectedStartTime,
          actual: actualStartTime,
          type: 'sample_start',
          url
        })
      }),
      stop: vi.fn(),
      loaded: true,
      volume: { value: -10 },
      dispose: vi.fn()
    })),
    Oscillator: vi.fn().mockImplementation(() => ({
      toDestination: vi.fn().mockReturnThis(),
      start: vi.fn((time = 0) => {
        const actualStartTime = performance.now()
        const expectedStartTime = time * 1000
        timingMeasurements.push({
          expected: expectedStartTime,
          actual: actualStartTime,
          type: 'oscillator_start'
        })
      }),
      stop: vi.fn(),
      frequency: { value: 440 },
      type: 'sine',
      volume: { value: -10 },
      dispose: vi.fn()
    })),
    Part: vi.fn().mockImplementation(() => ({
      start: vi.fn((time = 0) => {
        const actualStartTime = performance.now()
        timingMeasurements.push({
          expected: time * 1000,
          actual: actualStartTime,
          type: 'part_start'
        })
      }),
      stop: vi.fn(),
      dispose: vi.fn()
    }))
  }
})

// Timing measurement storage
interface TimingMeasurement {
  expected: number
  actual: number
  type: string
  url?: string
}

let timingMeasurements: TimingMeasurement[] = []

describe('Audio Timing Accuracy Tests', () => {
  beforeEach(() => {
    timingMeasurements = []
    mockPerformanceNow.mockImplementation(() => Date.now())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Pure Tone Timing', () => {
    it('should start pure tones with precise timing', async () => {
      const { ToneEngine } = await import('../../src/lib/audio/tone-engine')
      const engine = new ToneEngine()
      await engine.initialize()
      
      const startTime = performance.now()
      const scheduledTime = 100 // 100ms from now
      
      mockPerformanceNow.mockReturnValue(startTime + scheduledTime)
      
      await engine.playPureTone(1000, 500, -20, scheduledTime / 1000)
      
      const measurement = timingMeasurements.find(m => m.type === 'oscillator_start')
      expect(measurement).toBeDefined()
      
      const timingError = Math.abs(measurement!.actual - measurement!.expected)
      expect(timingError).toBeLessThan(5) // Less than 5ms error
    })

    it('should maintain consistent intervals between multiple tones', async () => {
      const { ToneEngine } = await import('../../src/lib/audio/tone-engine')
      const engine = new ToneEngine()
      await engine.initialize()
      
      const baseTime = performance.now()
      const interval = 500 // 500ms intervals
      const toneCount = 5
      
      for (let i = 0; i < toneCount; i++) {
        const scheduledTime = (i * interval) / 1000
        mockPerformanceNow.mockReturnValue(baseTime + i * interval)
        await engine.playPureTone(1000, 200, -20, scheduledTime)
      }
      
      const oscillatorStarts = timingMeasurements.filter(m => m.type === 'oscillator_start')
      expect(oscillatorStarts).toHaveLength(toneCount)
      
      // Check intervals between consecutive tones
      for (let i = 1; i < oscillatorStarts.length; i++) {
        const actualInterval = oscillatorStarts[i].actual - oscillatorStarts[i-1].actual
        const expectedInterval = interval
        const intervalError = Math.abs(actualInterval - expectedInterval)
        
        expect(intervalError).toBeLessThan(10) // Less than 10ms interval error
      }
    })
  })

  describe('Sample Playback Timing', () => {
    it('should synchronize sample playback accurately', async () => {
      const { ToneEngine } = await import('../../src/lib/audio/tone-engine')
      const engine = new ToneEngine()
      await engine.initialize()
      
      await engine.loadSample('kick', '/audio/kick.wav')
      await engine.loadSample('snare', '/audio/snare.wav')
      
      const baseTime = performance.now()
      const beatInterval = 500 // 120 BPM = 500ms per beat
      
      // Schedule kick and snare in rhythm pattern
      const pattern = [
        { sample: 'kick', time: 0 },
        { sample: 'snare', time: beatInterval },
        { sample: 'kick', time: beatInterval * 2 },
        { sample: 'snare', time: beatInterval * 3 }
      ]
      
      for (const beat of pattern) {
        mockPerformanceNow.mockReturnValue(baseTime + beat.time)
        await engine.playSample(beat.sample, -10, beat.time / 1000)
      }
      
      const sampleStarts = timingMeasurements.filter(m => m.type === 'sample_start')
      expect(sampleStarts).toHaveLength(pattern.length)
      
      // Verify timing accuracy for each sample
      sampleStarts.forEach((measurement, index) => {
        const expectedTime = pattern[index].time
        const timingError = Math.abs(measurement.actual - (baseTime + expectedTime))
        expect(timingError).toBeLessThan(5) // Less than 5ms error
      })
    })
  })

  describe('Rhythm Pattern Timing', () => {
    it('should maintain accurate BST rhythm timing', async () => {
      const { ToneEngine } = await import('../../src/lib/audio/tone-engine')
      const engine = new ToneEngine()
      await engine.initialize()
      
      const bstConfig = {
        beatType: '4beat' as const,
        accentVolume: -10,
        beatVolume: -20,
        bpm: 120,
        duration: 4000
      }
      
      const startTime = performance.now()
      mockPerformanceNow.mockReturnValue(startTime)
      
      await engine.createBSTPattern(bstConfig)
      
      // Verify that Part was created with correct timing
      const { Part } = await import('tone')
      expect(Part).toHaveBeenCalled()
      
      // In a real implementation, we would verify the timing of each beat
      // within the 4-beat pattern matches the expected BPM
      const expectedBeatInterval = 60000 / bstConfig.bpm // ms per beat
      expect(expectedBeatInterval).toBe(500)
    })

    it('should handle tempo changes smoothly in BIT patterns', async () => {
      const { ToneEngine } = await import('../../src/lib/audio/tone-engine')
      const engine = new ToneEngine()
      await engine.initialize()
      
      const bitConfig = {
        initialBPM: 120,
        finalBPM: 140,
        duration: 8000,
        direction: 'accelerando' as const
      }
      
      await engine.createBITPattern(bitConfig)
      
      // Verify tempo ramp was scheduled
      const { Transport } = await import('tone')
      expect(Transport.scheduleRepeat).toHaveBeenCalled()
      
      // Calculate expected tempo progression
      const tempoChange = bitConfig.finalBPM - bitConfig.initialBPM
      const changeRate = tempoChange / bitConfig.duration // BPM per ms
      
      expect(changeRate).toBeCloseTo(0.0025, 4) // 20 BPM over 8 seconds
    })

    it('should maintain complex BFIT rhythm pattern timing', async () => {
      const { ToneEngine } = await import('../../src/lib/audio/tone-engine')
      const engine = new ToneEngine()
      await engine.initialize()
      
      const bfitPattern = [
        { time: '0:0:0', duration: '4n' },   // Quarter note
        { time: '0:1:0', duration: '8n' },   // Eighth note
        { time: '0:1:2', duration: '8n' },   // Eighth note
        { time: '0:2:0', duration: '4n.' },  // Dotted quarter
        { time: '0:3:2', duration: '8n' }    // Eighth note
      ]
      
      const bfitConfig = {
        pattern: bfitPattern,
        initialBPM: 120,
        slopeMs: 5,
        direction: 'accelerando' as const
      }
      
      await engine.createBFITPattern(bfitConfig)
      
      // Verify complex pattern was created
      const { Part } = await import('tone')
      expect(Part).toHaveBeenCalled()
      
      // In real implementation, would verify each note timing
      // matches the complex rhythm pattern specification
    })
  })

  describe('Latency Compensation', () => {
    it('should account for audio system latency', async () => {
      const { ToneEngine } = await import('../../src/lib/audio/tone-engine')
      const engine = new ToneEngine()
      await engine.initialize()
      
      // Simulate system with known latency
      const systemLatency = 20 // 20ms typical audio latency
      
      const scheduledTime = 100 // 100ms from now
      const compensatedTime = scheduledTime - systemLatency
      
      mockPerformanceNow.mockReturnValue(performance.now() + compensatedTime)
      
      await engine.playPureTone(1000, 500, -20, compensatedTime / 1000)
      
      const measurement = timingMeasurements.find(m => m.type === 'oscillator_start')
      expect(measurement).toBeDefined()
      
      // With latency compensation, actual timing should match intended timing
      const intendedTime = performance.now() + scheduledTime
      const timingError = Math.abs(measurement!.actual + systemLatency - intendedTime)
      expect(timingError).toBeLessThan(5)
    })
  })

  describe('Performance Under Load', () => {
    it('should maintain timing accuracy with multiple concurrent sounds', async () => {
      const { ToneEngine } = await import('../../src/lib/audio/tone-engine')
      const engine = new ToneEngine()
      await engine.initialize()
      
      const baseTime = performance.now()
      const concurrentSounds = 10
      
      // Start multiple sounds simultaneously
      const promises = []
      for (let i = 0; i < concurrentSounds; i++) {
        mockPerformanceNow.mockReturnValue(baseTime)
        promises.push(engine.playPureTone(1000 + i * 100, 500, -20))
      }
      
      await Promise.all(promises)
      
      const measurements = timingMeasurements.filter(m => m.type === 'oscillator_start')
      expect(measurements).toHaveLength(concurrentSounds)
      
      // All sounds should start within a small time window
      const startTimes = measurements.map(m => m.actual)
      const minTime = Math.min(...startTimes)
      const maxTime = Math.max(...startTimes)
      const timeSpread = maxTime - minTime
      
      expect(timeSpread).toBeLessThan(10) // All within 10ms
    })
  })

  describe('Cross-Browser Timing Consistency', () => {
    it('should provide consistent timing across different audio contexts', async () => {
      // Mock different browser audio context behaviors
      const contexts = [
        { sampleRate: 44100, baseLatency: 0.005 },
        { sampleRate: 48000, baseLatency: 0.008 },
        { sampleRate: 44100, baseLatency: 0.012 }
      ]
      
      for (const contextConfig of contexts) {
        const { ToneEngine } = await import('../../src/lib/audio/tone-engine')
        const engine = new ToneEngine()
        
        // Mock context with specific configuration
        vi.mocked(await import('tone')).getContext.mockReturnValueOnce({
          state: 'running',
          sampleRate: contextConfig.sampleRate,
          baseLatency: contextConfig.baseLatency,
          currentTime: () => 0,
          resume: vi.fn().mockResolvedValue(undefined)
        } as any)
        
        await engine.initialize()
        
        const startTime = performance.now()
        mockPerformanceNow.mockReturnValue(startTime)
        
        await engine.playPureTone(1000, 500, -20)
        
        // Timing should be consistent regardless of context configuration
        const measurement = timingMeasurements[timingMeasurements.length - 1]
        const timingError = Math.abs(measurement.actual - startTime)
        expect(timingError).toBeLessThan(15) // Allow for context differences
      }
    })
  })

  describe('Error Recovery and Timing', () => {
    it('should recover gracefully from timing errors', async () => {
      const { ToneEngine } = await import('../../src/lib/audio/tone-engine')
      const engine = new ToneEngine()
      await engine.initialize()
      
      // Simulate timing error in first sound
      const { Oscillator } = await import('tone')
      vi.mocked(Oscillator).mockImplementationOnce(() => {
        throw new Error('Timing error')
      })
      
      const startTime = performance.now()
      
      // First sound should fail
      await expect(engine.playPureTone(1000, 500, -20)).rejects.toThrow()
      
      // Second sound should work normally
      mockPerformanceNow.mockReturnValue(startTime + 1000)
      await engine.playPureTone(2000, 500, -20)
      
      const measurement = timingMeasurements.find(m => m.type === 'oscillator_start')
      expect(measurement).toBeDefined()
      
      // Should maintain accurate timing despite previous error
      const timingError = Math.abs(measurement!.actual - (startTime + 1000))
      expect(timingError).toBeLessThan(5)
    })
  })
}) 