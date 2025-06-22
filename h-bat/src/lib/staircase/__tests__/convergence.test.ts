import { describe, it, expect, beforeEach } from 'vitest'
import {
  detectReversals,
  calculateThresholdFromReversals,
  calculateStatistics,
  analyzeConvergence,
  predictConvergence,
  getConvergenceConfig,
  validateConvergenceConfig,
  DEFAULT_CONVERGENCE_CONFIGS,
  type ConvergenceConfig,
  type ReversalPoint,
  type ConvergenceAnalysis
} from '../convergence'
import { StaircaseTrial } from '../core'

describe('Staircase Convergence Algorithms', () => {
  let mockTrials: StaircaseTrial[]
  let testConfig: ConvergenceConfig

  beforeEach(() => {
    testConfig = {
      minReversals: 6,
      thresholdReversals: 6,
      maxCoefficientOfVariation: 0.15,
      minTrialsAfterLastReversal: 2,
      maxStandardDeviation: 3.0,
      strictMode: false
    }

    // Create mock trials with a typical staircase pattern
    mockTrials = [
      { trialNumber: 0, level: 50, response: false, responseTime: 1000, timestamp: new Date('2024-01-01T10:00:00Z'), isReversal: false, stepSize: 8, direction: 'up' },
      { trialNumber: 1, level: 58, response: false, responseTime: 950, timestamp: new Date('2024-01-01T10:00:01Z'), isReversal: false, stepSize: 8, direction: 'up' },
      { trialNumber: 2, level: 66, response: true, responseTime: 1100, timestamp: new Date('2024-01-01T10:00:02Z'), isReversal: false, stepSize: 4, direction: 'down' },
      { trialNumber: 3, level: 62, response: true, responseTime: 1050, timestamp: new Date('2024-01-01T10:00:03Z'), isReversal: false, stepSize: 4, direction: 'down' },
      { trialNumber: 4, level: 58, response: false, responseTime: 1200, timestamp: new Date('2024-01-01T10:00:04Z'), isReversal: true, stepSize: 4, direction: 'up' },
      { trialNumber: 5, level: 62, response: true, responseTime: 1000, timestamp: new Date('2024-01-01T10:00:05Z'), isReversal: true, stepSize: 2, direction: 'down' },
      { trialNumber: 6, level: 60, response: false, responseTime: 1100, timestamp: new Date('2024-01-01T10:00:06Z'), isReversal: true, stepSize: 2, direction: 'up' },
      { trialNumber: 7, level: 62, response: true, responseTime: 950, timestamp: new Date('2024-01-01T10:00:07Z'), isReversal: true, stepSize: 2, direction: 'down' },
      { trialNumber: 8, level: 60, response: false, responseTime: 1150, timestamp: new Date('2024-01-01T10:00:08Z'), isReversal: true, stepSize: 2, direction: 'up' },
      { trialNumber: 9, level: 62, response: true, responseTime: 1000, timestamp: new Date('2024-01-01T10:00:09Z'), isReversal: true, stepSize: 2, direction: 'down' },
      { trialNumber: 10, level: 60, response: true, responseTime: 1050, timestamp: new Date('2024-01-01T10:00:10Z'), isReversal: false, stepSize: 2, direction: 'down' },
      { trialNumber: 11, level: 58, response: true, responseTime: 1000, timestamp: new Date('2024-01-01T10:00:11Z'), isReversal: false, stepSize: 2, direction: 'down' }
    ]
  })

  describe('detectReversals', () => {
    it('should detect no reversals with insufficient trials', () => {
      const shortTrials = mockTrials.slice(0, 2)
      const reversals = detectReversals(shortTrials)
      expect(reversals).toHaveLength(0)
    })

    it('should detect reversals correctly in a typical staircase', () => {
      const reversals = detectReversals(mockTrials)
      expect(reversals).toHaveLength(6)
      
      // Check first reversal (from up to down at trial 4)
      expect(reversals[0]).toMatchObject({
        trialIndex: 4,
        level: 58,
        previousDirection: 'up',
        newDirection: 'down'
      })
      
      // Check second reversal (from down to up at trial 5)
      expect(reversals[1]).toMatchObject({
        trialIndex: 5,
        level: 62,
        previousDirection: 'down',
        newDirection: 'up'
      })
    })

    it('should handle trials with no level changes', () => {
      const flatTrials: StaircaseTrial[] = [
        { trialNumber: 0, level: 50, response: true, responseTime: 1000, timestamp: new Date(), isReversal: false, stepSize: 0, direction: null },
        { trialNumber: 1, level: 50, response: true, responseTime: 1000, timestamp: new Date(), isReversal: false, stepSize: 0, direction: null },
        { trialNumber: 2, level: 50, response: false, responseTime: 1000, timestamp: new Date(), isReversal: false, stepSize: 0, direction: null }
      ]
      
      const reversals = detectReversals(flatTrials)
      expect(reversals).toHaveLength(0)
    })

    it('should correctly identify reversal timestamps', () => {
      const reversals = detectReversals(mockTrials)
      expect(reversals[0].timestamp).toEqual(new Date('2024-01-01T10:00:04Z'))
    })
  })

  describe('calculateThresholdFromReversals', () => {
    it('should calculate threshold from the last N reversals', () => {
      const reversals = detectReversals(mockTrials)
      const result = calculateThresholdFromReversals(reversals, testConfig)
      
      expect(result.threshold).toBeCloseTo(60.67, 1) // Average of last 6 reversal levels
      expect(result.levels).toHaveLength(6)
    })

    it('should throw error with insufficient reversals', () => {
      const shortReversals: ReversalPoint[] = [
        { trialIndex: 4, level: 58, previousDirection: 'up', newDirection: 'down', stepSize: 4, timestamp: new Date() }
      ]
      
      expect(() => calculateThresholdFromReversals(shortReversals, testConfig))
        .toThrow('Not enough reversals for threshold calculation')
    })

    it('should use only the specified number of recent reversals', () => {
      const reversals = detectReversals(mockTrials)
      const config = { ...testConfig, thresholdReversals: 4 }
      const result = calculateThresholdFromReversals(reversals, config)
      
      expect(result.levels).toHaveLength(4)
    })
  })

  describe('calculateStatistics', () => {
    it('should calculate statistics correctly for valid data', () => {
      const levels = [60, 62, 60, 62, 60, 62]
      const stats = calculateStatistics(levels)
      
      expect(stats.mean).toBe(61)
      expect(stats.standardDeviation).toBeCloseTo(1.095, 2)
      expect(stats.coefficientOfVariation).toBeCloseTo(0.018, 3)
    })

    it('should handle empty array', () => {
      const stats = calculateStatistics([])
      expect(stats.mean).toBe(0)
      expect(stats.standardDeviation).toBe(0)
      expect(stats.coefficientOfVariation).toBe(0)
    })

    it('should handle single value', () => {
      const stats = calculateStatistics([50])
      expect(stats.mean).toBe(50)
      expect(stats.standardDeviation).toBe(0)
      expect(stats.coefficientOfVariation).toBe(0)
    })

    it('should handle zero mean correctly', () => {
      const levels = [-1, 0, 1]
      const stats = calculateStatistics(levels)
      expect(stats.mean).toBe(0)
      expect(stats.coefficientOfVariation).toBe(0)
    })
  })

  describe('analyzeConvergence', () => {
    it('should detect convergence when criteria are met', () => {
      const analysis = analyzeConvergence(mockTrials, testConfig)
      
      expect(analysis.hasConverged).toBe(true)
      expect(analysis.reversalCount).toBe(6)
      expect(analysis.threshold).toBeCloseTo(60.67, 1)
      expect(analysis.confidence).toBeGreaterThan(0.5)
      expect(analysis.reason).toContain('Converged')
    })

    it('should not converge with insufficient reversals', () => {
      const shortTrials = mockTrials.slice(0, 6)
      const analysis = analyzeConvergence(shortTrials, testConfig)
      
      expect(analysis.hasConverged).toBe(false)
      expect(analysis.reason).toContain('Need 6 reversals')
    })

    it('should not converge with high coefficient of variation', () => {
      const strictConfig = { ...testConfig, maxCoefficientOfVariation: 0.01 }
      const analysis = analyzeConvergence(mockTrials, strictConfig)
      
      expect(analysis.hasConverged).toBe(false)
      expect(analysis.reason).toContain('CV:')
    })

    it('should respect strict mode requirements', () => {
      const strictConfig = { 
        ...testConfig, 
        strictMode: true,
        maxStandardDeviation: 0.1 // Very strict requirement
      }
      const analysis = analyzeConvergence(mockTrials, strictConfig)
      
      expect(analysis.hasConverged).toBe(false)
      expect(analysis.reason).toContain('Not converged (strict)')
    })

    it('should calculate trials since last reversal correctly', () => {
      const analysis = analyzeConvergence(mockTrials, testConfig)
      expect(analysis.trialsSinceLastReversal).toBe(2) // Trials 10 and 11 after last reversal at trial 9
    })

    it('should handle errors gracefully', () => {
      const invalidTrials: StaircaseTrial[] = []
      const analysis = analyzeConvergence(invalidTrials, testConfig)
      
      expect(analysis.hasConverged).toBe(false)
      expect(analysis.reason).toContain('Insufficient data')
    })
  })

  describe('predictConvergence', () => {
    it('should predict zero trials if already converged', () => {
      const prediction = predictConvergence(mockTrials, testConfig)
      
      expect(prediction.estimatedTrialsToConvergence).toBe(0)
      expect(prediction.confidence).toBe(1.0)
      expect(prediction.reasoning).toBe('Already converged')
    })

    it('should estimate trials needed when insufficient reversals', () => {
      const shortTrials = mockTrials.slice(0, 6)
      const prediction = predictConvergence(shortTrials, testConfig)
      
      expect(prediction.estimatedTrialsToConvergence).toBeGreaterThan(0)
      expect(prediction.confidence).toBeLessThan(1.0)
      expect(prediction.reasoning).toContain('more reversals')
    })

    it('should estimate based on stability when CV is too high', () => {
      const strictConfig = { ...testConfig, maxCoefficientOfVariation: 0.001 }
      const prediction = predictConvergence(mockTrials, strictConfig)
      
      expect(prediction.estimatedTrialsToConvergence).toBeGreaterThan(0)
      expect(prediction.reasoning).toContain('CV needs to improve')
    })

    it('should handle edge case with no reversals', () => {
      const noReversalTrials = mockTrials.slice(0, 3)
      const prediction = predictConvergence(noReversalTrials, testConfig)
      
      expect(prediction.estimatedTrialsToConvergence).toBeGreaterThan(0)
      expect(prediction.confidence).toBeLessThan(1.0)
    })
  })

  describe('getConvergenceConfig', () => {
    it('should return correct config for each test type', () => {
      expect(getConvergenceConfig('hearing')).toEqual(DEFAULT_CONVERGENCE_CONFIGS.hearing)
      expect(getConvergenceConfig('bst')).toEqual(DEFAULT_CONVERGENCE_CONFIGS.bst)
      expect(getConvergenceConfig('bit')).toEqual(DEFAULT_CONVERGENCE_CONFIGS.bit)
      expect(getConvergenceConfig('bfit')).toEqual(DEFAULT_CONVERGENCE_CONFIGS.bfit)
    })

    it('should handle case insensitive test types', () => {
      expect(getConvergenceConfig('BST')).toEqual(DEFAULT_CONVERGENCE_CONFIGS.bst)
      expect(getConvergenceConfig('Hearing')).toEqual(DEFAULT_CONVERGENCE_CONFIGS.hearing)
    })

    it('should return hearing config for unknown test types', () => {
      expect(getConvergenceConfig('unknown')).toEqual(DEFAULT_CONVERGENCE_CONFIGS.hearing)
    })
  })

  describe('validateConvergenceConfig', () => {
    it('should validate correct configuration', () => {
      const errors = validateConvergenceConfig(testConfig)
      expect(errors).toHaveLength(0)
    })

    it('should detect invalid minReversals', () => {
      const invalidConfig = { ...testConfig, minReversals: 1 }
      const errors = validateConvergenceConfig(invalidConfig)
      expect(errors).toContain('minReversals must be at least 2')
    })

    it('should detect thresholdReversals > minReversals', () => {
      const invalidConfig = { ...testConfig, minReversals: 4, thresholdReversals: 6 }
      const errors = validateConvergenceConfig(invalidConfig)
      expect(errors).toContain('thresholdReversals cannot be greater than minReversals')
    })

    it('should detect invalid coefficient of variation', () => {
      const invalidConfig1 = { ...testConfig, maxCoefficientOfVariation: 0 }
      const invalidConfig2 = { ...testConfig, maxCoefficientOfVariation: 1.5 }
      
      expect(validateConvergenceConfig(invalidConfig1)).toContain('maxCoefficientOfVariation must be between 0 and 1')
      expect(validateConvergenceConfig(invalidConfig2)).toContain('maxCoefficientOfVariation must be between 0 and 1')
    })

    it('should detect negative minTrialsAfterLastReversal', () => {
      const invalidConfig = { ...testConfig, minTrialsAfterLastReversal: -1 }
      const errors = validateConvergenceConfig(invalidConfig)
      expect(errors).toContain('minTrialsAfterLastReversal must be non-negative')
    })

    it('should detect invalid maxStandardDeviation', () => {
      const invalidConfig = { ...testConfig, maxStandardDeviation: -1 }
      const errors = validateConvergenceConfig(invalidConfig)
      expect(errors).toContain('maxStandardDeviation must be positive if specified')
    })

    it('should handle multiple validation errors', () => {
      const invalidConfig = {
        ...testConfig,
        minReversals: 1,
        maxCoefficientOfVariation: 2,
        minTrialsAfterLastReversal: -1
      }
      const errors = validateConvergenceConfig(invalidConfig)
      expect(errors.length).toBeGreaterThan(1)
    })
  })

  describe('DEFAULT_CONVERGENCE_CONFIGS', () => {
    it('should have valid configurations for all test types', () => {
      Object.entries(DEFAULT_CONVERGENCE_CONFIGS).forEach(([testType, config]) => {
        const errors = validateConvergenceConfig(config)
        expect(errors).toHaveLength(0)
      })
    })

    it('should have appropriate strictness for different test types', () => {
      expect(DEFAULT_CONVERGENCE_CONFIGS.hearing.strictMode).toBe(false)
      expect(DEFAULT_CONVERGENCE_CONFIGS.bst.strictMode).toBe(true)
      expect(DEFAULT_CONVERGENCE_CONFIGS.bit.strictMode).toBe(true)
      expect(DEFAULT_CONVERGENCE_CONFIGS.bfit.strictMode).toBe(true)
    })

    it('should have reasonable threshold requirements', () => {
      Object.values(DEFAULT_CONVERGENCE_CONFIGS).forEach(config => {
        expect(config.minReversals).toBeGreaterThanOrEqual(6)
        expect(config.thresholdReversals).toBeGreaterThanOrEqual(6)
        expect(config.maxCoefficientOfVariation).toBeGreaterThan(0)
        expect(config.maxCoefficientOfVariation).toBeLessThanOrEqual(0.2)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle trials with identical levels', () => {
      const identicalTrials: StaircaseTrial[] = Array(10).fill(null).map((_, i) => ({
        trialNumber: i,
        level: 50,
        response: i % 2 === 0,
        responseTime: 1000,
        timestamp: new Date(),
        isReversal: false,
        stepSize: 0,
        direction: null
      }))
      
      const analysis = analyzeConvergence(identicalTrials, testConfig)
      expect(analysis.hasConverged).toBe(false)
      expect(analysis.reversalCount).toBe(0)
    })

    it('should handle extreme coefficient of variation', () => {
      const extremeTrials: StaircaseTrial[] = [
        ...mockTrials.slice(0, 8),
        { trialNumber: 8, level: 100, response: false, responseTime: 1000, timestamp: new Date(), isReversal: true, stepSize: 40, direction: 'up' },
        { trialNumber: 9, level: 20, response: true, responseTime: 1000, timestamp: new Date(), isReversal: true, stepSize: 80, direction: 'down' }
      ]
      
      const analysis = analyzeConvergence(extremeTrials, testConfig)
      expect(analysis.coefficientOfVariation).toBeGreaterThan(testConfig.maxCoefficientOfVariation)
      expect(analysis.hasConverged).toBe(false)
    })

    it('should handle very large trial numbers', () => {
      const largeTrials = mockTrials.map(trial => ({
        ...trial,
        trialNumber: trial.trialNumber + 1000
      }))
      
      const analysis = analyzeConvergence(largeTrials, testConfig)
      expect(analysis.reversalCount).toBe(6)
    })
  })
}) 