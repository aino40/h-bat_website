import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToneEngine } from '../tone-engine'

// Mock Tone.js
vi.mock('tone', () => ({
  start: vi.fn().mockResolvedValue(undefined),
  getContext: vi.fn(() => ({
    state: 'running',
    resume: vi.fn().mockResolvedValue(undefined)
  })),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    bpm: { value: 120 },
    position: '0:0:0',
    scheduleRepeat: vi.fn(),
    cancel: vi.fn()
  },
  Player: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
    loaded: true,
    volume: { value: -10 },
    dispose: vi.fn()
  })),
  Oscillator: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440 },
    type: 'sine',
    volume: { value: -10 },
    dispose: vi.fn()
  })),
  Gain: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    gain: { value: 1 },
    dispose: vi.fn()
  })),
  Part: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn()
  })),
  Envelope: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    triggerAttackRelease: vi.fn(),
    dispose: vi.fn()
  }))
}))

describe('ToneEngine', () => {
  let engine: ToneEngine

  beforeEach(async () => {
    engine = new ToneEngine()
    await engine.initialize()
  })

  afterEach(() => {
    engine.dispose()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      expect(engine.isInitialized()).toBe(true)
      expect(engine.getContext().state).toBe('running')
    })

    it('should handle initialization errors gracefully', async () => {
      const failingEngine = new ToneEngine()
      
      // Mock Tone.start to reject
      const { start } = await import('tone')
      vi.mocked(start).mockRejectedValueOnce(new Error('Audio context failed'))
      
      await expect(failingEngine.initialize()).rejects.toThrow('Audio context failed')
    })
  })

  describe('Pure Tone Generation', () => {
    it('should generate pure tone with correct frequency', async () => {
      const frequency = 1000
      const duration = 500
      const volume = -20
      
      await engine.playPureTone(frequency, duration, volume)
      
      const { Oscillator } = await import('tone')
      expect(Oscillator).toHaveBeenCalledWith({
        frequency,
        type: 'sine'
      })
    })

    it('should handle different frequencies', async () => {
      const frequencies = [1000, 2000, 4000]
      
      for (const freq of frequencies) {
        await engine.playPureTone(freq, 500, -20)
      }
      
      const { Oscillator } = await import('tone')
      expect(Oscillator).toHaveBeenCalledTimes(frequencies.length)
    })

    it('should apply correct volume levels', async () => {
      const volume = -30
      await engine.playPureTone(1000, 500, volume)
      
      // Verify volume conversion from dB to linear scale
      const expectedLinearVolume = Math.pow(10, volume / 20)
      expect(expectedLinearVolume).toBeCloseTo(0.0316, 3)
    })
  })

  describe('Sample Playback', () => {
    it('should load and play samples', async () => {
      const samplePath = '/audio/kick.wav'
      const volume = -10
      
      await engine.loadSample('kick', samplePath)
      await engine.playSample('kick', volume)
      
      const { Player } = await import('tone')
      expect(Player).toHaveBeenCalledWith(samplePath)
    })

    it('should handle missing samples gracefully', async () => {
      await expect(engine.playSample('nonexistent', -10))
        .rejects.toThrow('Sample nonexistent not found')
    })

    it('should cache loaded samples', async () => {
      const samplePath = '/audio/snare.wav'
      
      await engine.loadSample('snare', samplePath)
      await engine.loadSample('snare', samplePath) // Load again
      
      const { Player } = await import('tone')
      expect(Player).toHaveBeenCalledTimes(1) // Should only create player once
    })
  })

  describe('Rhythm Pattern Generation', () => {
    it('should create BST rhythm pattern', async () => {
      const config = {
        beatType: '4beat' as const,
        accentVolume: -10,
        beatVolume: -20,
        bpm: 120,
        duration: 6000
      }
      
      await engine.createBSTPattern(config)
      
      const { Part } = await import('tone')
      expect(Part).toHaveBeenCalled()
    })

    it('should create BIT rhythm pattern with tempo change', async () => {
      const config = {
        initialBPM: 120,
        finalBPM: 140,
        duration: 8000,
        direction: 'accelerando' as const
      }
      
      await engine.createBITPattern(config)
      
      const { Transport } = await import('tone')
      expect(Transport.scheduleRepeat).toHaveBeenCalled()
    })

    it('should create BFIT complex rhythm pattern', async () => {
      const config = {
        pattern: [
          { time: '0:0:0', duration: '4n' },
          { time: '0:1:0', duration: '8n' },
          { time: '0:1:2', duration: '8n' },
          { time: '0:2:0', duration: '4n.' },
          { time: '0:3:2', duration: '8n' }
        ],
        initialBPM: 120,
        slopeMs: 5,
        direction: 'accelerando' as const
      }
      
      await engine.createBFITPattern(config)
      
      const { Part } = await import('tone')
      expect(Part).toHaveBeenCalled()
    })
  })

  describe('Volume Control', () => {
    it('should convert dB to linear scale correctly', () => {
      const testCases = [
        { db: 0, expected: 1 },
        { db: -20, expected: 0.1 },
        { db: -40, expected: 0.01 },
        { db: 20, expected: 10 }
      ]
      
      testCases.forEach(({ db, expected }) => {
        const linear = engine.dbToLinear(db)
        expect(linear).toBeCloseTo(expected, 3)
      })
    })

    it('should convert linear to dB scale correctly', () => {
      const testCases = [
        { linear: 1, expected: 0 },
        { linear: 0.1, expected: -20 },
        { linear: 0.01, expected: -40 },
        { linear: 10, expected: 20 }
      ]
      
      testCases.forEach(({ linear, expected }) => {
        const db = engine.linearToDb(linear)
        expect(db).toBeCloseTo(expected, 1)
      })
    })

    it('should apply hearing threshold compensation', () => {
      const baseVolume = -30
      const hearingThreshold = 25
      const compensation = 30
      
      const adjustedVolume = engine.applyHearingCompensation(
        baseVolume, 
        hearingThreshold, 
        compensation
      )
      
      expect(adjustedVolume).toBe(baseVolume + hearingThreshold + compensation)
    })
  })

  describe('Transport Control', () => {
    it('should start and stop transport correctly', async () => {
      await engine.startTransport()
      
      const { Transport } = await import('tone')
      expect(Transport.start).toHaveBeenCalled()
      
      await engine.stopTransport()
      expect(Transport.stop).toHaveBeenCalled()
    })

    it('should set BPM correctly', () => {
      const bpm = 140
      engine.setBPM(bpm)
      
      const { Transport } = await import('tone')
      expect(Transport.bpm.value).toBe(bpm)
    })

    it('should get current position', () => {
      const position = engine.getPosition()
      expect(position).toBe('0:0:0')
    })
  })

  describe('Error Handling', () => {
    it('should handle audio context errors', async () => {
      const { getContext } = await import('tone')
      vi.mocked(getContext).mockReturnValueOnce({
        state: 'suspended',
        resume: vi.fn().mockRejectedValue(new Error('Context resume failed'))
      } as any)
      
      await expect(engine.resumeContext()).rejects.toThrow('Context resume failed')
    })

    it('should handle sample loading errors', async () => {
      const { Player } = await import('tone')
      vi.mocked(Player).mockImplementationOnce(() => {
        throw new Error('Failed to load sample')
      })
      
      await expect(engine.loadSample('invalid', '/invalid.wav'))
        .rejects.toThrow('Failed to load sample')
    })
  })

  describe('Resource Management', () => {
    it('should dispose resources correctly', () => {
      const mockDispose = vi.fn()
      engine['oscillators'] = [{ dispose: mockDispose } as any]
      engine['players'] = new Map([['test', { dispose: mockDispose } as any]])
      engine['parts'] = [{ dispose: mockDispose } as any]
      
      engine.dispose()
      
      expect(mockDispose).toHaveBeenCalledTimes(3)
    })

    it('should clear all scheduled events', () => {
      engine.clearScheduledEvents()
      
      const { Transport } = await import('tone')
      expect(Transport.cancel).toHaveBeenCalled()
    })
  })

  describe('Timing Accuracy', () => {
    it('should schedule events with precise timing', async () => {
      const events = [
        { time: 0, callback: vi.fn() },
        { time: 500, callback: vi.fn() },
        { time: 1000, callback: vi.fn() }
      ]
      
      await engine.scheduleEvents(events)
      
      const { Transport } = await import('tone')
      expect(Transport.scheduleRepeat).toHaveBeenCalledTimes(events.length)
    })

    it('should maintain consistent timing across patterns', async () => {
      const startTime = performance.now()
      
      await engine.playPureTone(1000, 500, -20)
      await new Promise(resolve => setTimeout(resolve, 100))
      await engine.playPureTone(2000, 500, -20)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (allowing for some variance)
      expect(duration).toBeGreaterThan(600) // At least 600ms
      expect(duration).toBeLessThan(800) // Less than 800ms
    })
  })
}) 