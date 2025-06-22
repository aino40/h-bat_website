import { describe, it, expect, beforeEach } from 'vitest'
import {
  StaircaseStatistics,
  calculateThreshold,
  analyzeTrialHistory,
  compareResults,
  DEFAULT_STATISTICS_CONFIGS,
  type StatisticsConfig,
  type LearningCurveAnalysis,
  type PerformanceMetrics,
  type ErrorPatternAnalysis,
  type MultiSessionComparison
} from '../statistics'
import { StaircaseTrial, StaircaseResult } from '../core'

describe('Staircase Statistics Module', () => {
  let mockTrials: StaircaseTrial[]
  let mockResults: StaircaseResult[]
  let testConfig: StatisticsConfig

  beforeEach(() => {
    testConfig = {
      method: 'mean',
      confidenceLevel: 0.95,
      outlierThreshold: 2.0,
      removeOutliers: true,
      minDataPoints: 6,
      learningCurve: {
        windowSize: 10,
        minImprovement: 0.05,
        stabilityThreshold: 0.1
      }
    }

    // Create realistic trial data with learning pattern
    mockTrials = [
      { trialNumber: 0, level: 50, response: false, responseTime: 1200, timestamp: new Date('2024-01-01T10:00:00Z'), isReversal: false, stepSize: 8, direction: 'up' },
      { trialNumber: 1, level: 58, response: false, responseTime: 1100, timestamp: new Date('2024-01-01T10:00:01Z'), isReversal: false, stepSize: 8, direction: 'up' },
      { trialNumber: 2, level: 66, response: true, responseTime: 1050, timestamp: new Date('2024-01-01T10:00:02Z'), isReversal: false, stepSize: 4, direction: 'down' },
      { trialNumber: 3, level: 62, response: true, responseTime: 1000, timestamp: new Date('2024-01-01T10:00:03Z'), isReversal: false, stepSize: 4, direction: 'down' },
      { trialNumber: 4, level: 58, response: false, responseTime: 950, timestamp: new Date('2024-01-01T10:00:04Z'), isReversal: true, stepSize: 4, direction: 'up' },
      { trialNumber: 5, level: 62, response: true, responseTime: 900, timestamp: new Date('2024-01-01T10:00:05Z'), isReversal: true, stepSize: 2, direction: 'down' },
      { trialNumber: 6, level: 60, response: false, responseTime: 850, timestamp: new Date('2024-01-01T10:00:06Z'), isReversal: true, stepSize: 2, direction: 'up' },
      { trialNumber: 7, level: 62, response: true, responseTime: 800, timestamp: new Date('2024-01-01T10:00:07Z'), isReversal: true, stepSize: 2, direction: 'down' },
      { trialNumber: 8, level: 60, response: false, responseTime: 750, timestamp: new Date('2024-01-01T10:00:08Z'), isReversal: true, stepSize: 2, direction: 'up' },
      { trialNumber: 9, level: 62, response: true, responseTime: 700, timestamp: new Date('2024-01-01T10:00:09Z'), isReversal: true, stepSize: 2, direction: 'down' },
      { trialNumber: 10, level: 60, response: true, responseTime: 650, timestamp: new Date('2024-01-01T10:00:10Z'), isReversal: false, stepSize: 2, direction: 'down' },
      { trialNumber: 11, level: 58, response: true, responseTime: 600, timestamp: new Date('2024-01-01T10:00:11Z'), isReversal: false, stepSize: 2, direction: 'down' }
    ]

    mockResults = [
      {
        threshold: 61.0,
        standardDeviation: 1.5,
        trials: mockTrials,
        reversalCount: 6,
        converged: true,
        duration: 12000,
        completedAt: new Date('2024-01-01T10:00:12Z')
      },
      {
        threshold: 59.5,
        standardDeviation: 1.2,
        trials: mockTrials.slice(0, 10),
        reversalCount: 5,
        converged: true,
        duration: 10000,
        completedAt: new Date('2024-01-02T10:00:10Z')
      }
    ]
  })

  describe('StaircaseStatistics Class', () => {
    let statistics: StaircaseStatistics

    beforeEach(() => {
      statistics = new StaircaseStatistics(testConfig)
    })

    describe('Constructor and Configuration', () => {
      it('should initialize with correct configuration', () => {
        expect(statistics.getConfig()).toEqual(testConfig)
      })

      it('should use default configuration when none provided', () => {
        const defaultStats = new StaircaseStatistics()
        const config = defaultStats.getConfig()
        expect(config.method).toBe('mean')
        expect(config.confidenceLevel).toBe(0.95)
      })

      it('should validate configuration parameters', () => {
        const invalidConfig = { ...testConfig, confidenceLevel: 1.5 }
        expect(() => new StaircaseStatistics(invalidConfig)).toThrow()
      })
    })

    describe('Threshold Calculation', () => {
      it('should calculate threshold using mean method', () => {
        const reversalLevels = [60, 62, 60, 62, 60, 62]
        const result = statistics.calculateThreshold(reversalLevels)
        
        expect(result.threshold).toBe(61)
        expect(result.method).toBe('mean')
        expect(result.confidence).toBeDefined()
      })

      it('should calculate threshold using median method', () => {
        const medianConfig = { ...testConfig, method: 'median' as const }
        const medianStats = new StaircaseStatistics(medianConfig)
        const reversalLevels = [60, 62, 60, 62, 60, 62]
        const result = medianStats.calculateThreshold(reversalLevels)
        
        expect(result.threshold).toBe(61) // Median of [60,60,60,62,62,62]
        expect(result.method).toBe('median')
      })

      it('should calculate threshold using trimmed mean method', () => {
        const trimmedConfig = { ...testConfig, method: 'trimmed_mean' as const }
        const trimmedStats = new StaircaseStatistics(trimmedConfig)
        const reversalLevels = [58, 60, 62, 60, 62, 64] // Include outliers
        const result = trimmedStats.calculateThreshold(reversalLevels)
        
        expect(result.threshold).toBeCloseTo(61, 1) // Should exclude extreme values
        expect(result.method).toBe('trimmed_mean')
      })

      it('should remove outliers when configured', () => {
        const levelsWithOutlier = [60, 62, 60, 62, 60, 100] // 100 is outlier
        const result = statistics.calculateThreshold(levelsWithOutlier)
        
        expect(result.outliers).toContain(100)
        expect(result.threshold).toBeCloseTo(60.8, 1) // Calculated without outlier
      })

      it('should calculate confidence intervals', () => {
        const reversalLevels = [60, 62, 60, 62, 60, 62]
        const result = statistics.calculateThreshold(reversalLevels)
        
        expect(result.confidence.lower).toBeLessThan(result.threshold)
        expect(result.confidence.upper).toBeGreaterThan(result.threshold)
        expect(result.confidence.level).toBe(0.95)
      })

      it('should handle insufficient data points', () => {
        const fewLevels = [60, 62]
        expect(() => statistics.calculateThreshold(fewLevels)).toThrow()
      })

      it('should handle identical values', () => {
        const identicalLevels = [60, 60, 60, 60, 60, 60]
        const result = statistics.calculateThreshold(identicalLevels)
        
        expect(result.threshold).toBe(60)
        expect(result.standardDeviation).toBe(0)
        expect(result.coefficientOfVariation).toBe(0)
      })
    })

    describe('Learning Curve Analysis', () => {
      it('should analyze learning curve progression', () => {
        const analysis = statistics.analyzeLearningCurve(mockTrials)
        
        expect(analysis.learningRate).toBeGreaterThan(0) // Should show improvement
        expect(analysis.stabilityIndex).toBeGreaterThan(0)
        expect(analysis.convergencePoint).toBeGreaterThan(0)
        expect(analysis.plateauReached).toBeDefined()
      })

      it('should detect plateau in learning', () => {
        // Create trials with plateau (no improvement in later trials)
        const plateauTrials = mockTrials.map((trial, index) => ({
          ...trial,
          responseTime: index < 6 ? 1200 - index * 100 : 600 // Plateau after trial 6
        }))
        
        const analysis = statistics.analyzeLearningCurve(plateauTrials)
        expect(analysis.plateauReached).toBe(true)
        expect(analysis.convergencePoint).toBeLessThanOrEqual(6)
      })

      it('should calculate learning metrics correctly', () => {
        const analysis = statistics.analyzeLearningCurve(mockTrials)
        
        expect(analysis.learningRate).toBeGreaterThan(-1) // Improvement rate
        expect(analysis.learningRate).toBeLessThan(1)
        expect(analysis.stabilityIndex).toBeGreaterThanOrEqual(0)
        expect(analysis.stabilityIndex).toBeLessThanOrEqual(1)
      })

      it('should handle trials with no learning pattern', () => {
        const randomTrials = mockTrials.map(trial => ({
          ...trial,
          responseTime: Math.random() * 1000 + 500 // Random response times
        }))
        
        const analysis = statistics.analyzeLearningCurve(randomTrials)
        expect(analysis.learningRate).toBeCloseTo(0, 1) // No clear learning
        expect(analysis.stabilityIndex).toBeLessThan(0.5) // Low stability
      })
    })

    describe('Performance Metrics', () => {
      it('should calculate accuracy metrics', () => {
        const metrics = statistics.calculatePerformanceMetrics(mockTrials)
        
        expect(metrics.accuracy).toBeGreaterThan(0)
        expect(metrics.accuracy).toBeLessThanOrEqual(1)
        expect(metrics.correctResponses).toBeGreaterThan(0)
        expect(metrics.totalResponses).toBe(mockTrials.length)
      })

      it('should calculate response time statistics', () => {
        const metrics = statistics.calculatePerformanceMetrics(mockTrials)
        
        expect(metrics.responseTime.mean).toBeGreaterThan(0)
        expect(metrics.responseTime.median).toBeGreaterThan(0)
        expect(metrics.responseTime.standardDeviation).toBeGreaterThanOrEqual(0)
        expect(metrics.responseTime.range.min).toBeLessThanOrEqual(metrics.responseTime.range.max)
      })

      it('should calculate consistency metrics', () => {
        const metrics = statistics.calculatePerformanceMetrics(mockTrials)
        
        expect(metrics.consistency.reactionTimeVariability).toBeGreaterThanOrEqual(0)
        expect(metrics.consistency.responsePatternStability).toBeGreaterThanOrEqual(0)
        expect(metrics.consistency.responsePatternStability).toBeLessThanOrEqual(1)
      })

      it('should calculate adaptation metrics', () => {
        const metrics = statistics.calculatePerformanceMetrics(mockTrials)
        
        expect(metrics.adaptation.adaptationRate).toBeDefined()
        expect(metrics.adaptation.levelAdjustmentEfficiency).toBeGreaterThanOrEqual(0)
        expect(metrics.adaptation.levelAdjustmentEfficiency).toBeLessThanOrEqual(1)
      })
    })

    describe('Error Pattern Analysis', () => {
      it('should classify error patterns', () => {
        const analysis = statistics.analyzeErrorPatterns(mockTrials)
        
        expect(analysis.errorRate).toBeGreaterThanOrEqual(0)
        expect(analysis.errorRate).toBeLessThanOrEqual(1)
        expect(analysis.patterns.random).toBeDefined()
        expect(analysis.patterns.systematic).toBeDefined()
        expect(analysis.patterns.learning).toBeDefined()
      })

      it('should detect systematic errors', () => {
        // Create trials with systematic bias (always wrong on high levels)
        const biasedTrials = mockTrials.map(trial => ({
          ...trial,
          response: trial.level < 60 ? true : false // Systematic bias
        }))
        
        const analysis = statistics.analyzeErrorPatterns(biasedTrials)
        expect(analysis.patterns.systematic).toBeGreaterThan(0.5)
      })

      it('should detect random errors', () => {
        // Create trials with random errors
        const randomTrials = mockTrials.map(trial => ({
          ...trial,
          response: Math.random() > 0.5 // Random responses
        }))
        
        const analysis = statistics.analyzeErrorPatterns(randomTrials)
        expect(analysis.patterns.random).toBeGreaterThan(0.3)
      })

      it('should detect learning-related errors', () => {
        // Create trials showing improvement over time
        const learningTrials = mockTrials.map((trial, index) => ({
          ...trial,
          response: Math.random() > (0.8 - index * 0.05) // Improving accuracy
        }))
        
        const analysis = statistics.analyzeErrorPatterns(learningTrials)
        expect(analysis.patterns.learning).toBeGreaterThan(0.3)
      })
    })

    describe('Multi-Session Comparison', () => {
      it('should compare multiple sessions', () => {
        const comparison = statistics.compareMultipleSessions(mockResults)
        
        expect(comparison.sessions).toHaveLength(2)
        expect(comparison.trend.direction).toBeDefined()
        expect(comparison.trend.significance).toBeGreaterThanOrEqual(0)
        expect(comparison.trend.significance).toBeLessThanOrEqual(1)
      })

      it('should detect improvement trends', () => {
        const improvingResults = [
          { ...mockResults[0], threshold: 65 },
          { ...mockResults[1], threshold: 60 }
        ]
        
        const comparison = statistics.compareMultipleSessions(improvingResults)
        expect(comparison.trend.direction).toBe('improving')
      })

      it('should detect declining trends', () => {
        const decliningResults = [
          { ...mockResults[0], threshold: 55 },
          { ...mockResults[1], threshold: 60 }
        ]
        
        const comparison = statistics.compareMultipleSessions(decliningResults)
        expect(comparison.trend.direction).toBe('declining')
      })

      it('should detect stable performance', () => {
        const stableResults = [
          { ...mockResults[0], threshold: 60 },
          { ...mockResults[1], threshold: 60.1 }
        ]
        
        const comparison = statistics.compareMultipleSessions(stableResults)
        expect(comparison.trend.direction).toBe('stable')
      })

      it('should calculate effect sizes', () => {
        const comparison = statistics.compareMultipleSessions(mockResults)
        expect(comparison.effectSize).toBeDefined()
        expect(typeof comparison.effectSize).toBe('number')
      })
    })
  })

  describe('Utility Functions', () => {
    describe('calculateThreshold', () => {
      it('should calculate threshold with default configuration', () => {
        const reversalLevels = [60, 62, 60, 62, 60, 62]
        const result = calculateThreshold(reversalLevels)
        
        expect(result.threshold).toBe(61)
        expect(result.method).toBe('mean')
      })

      it('should accept custom configuration', () => {
        const reversalLevels = [60, 62, 60, 62, 60, 62]
        const customConfig = { ...testConfig, method: 'median' as const }
        const result = calculateThreshold(reversalLevels, customConfig)
        
        expect(result.method).toBe('median')
      })
    })

    describe('analyzeTrialHistory', () => {
      it('should provide comprehensive trial analysis', () => {
        const analysis = analyzeTrialHistory(mockTrials)
        
        expect(analysis.summary).toBeDefined()
        expect(analysis.learningCurve).toBeDefined()
        expect(analysis.performance).toBeDefined()
        expect(analysis.errorPatterns).toBeDefined()
      })

      it('should handle empty trial history', () => {
        expect(() => analyzeTrialHistory([])).toThrow()
      })

      it('should handle single trial', () => {
        const singleTrial = [mockTrials[0]]
        const analysis = analyzeTrialHistory(singleTrial)
        
        expect(analysis.summary.totalTrials).toBe(1)
        expect(analysis.performance.accuracy).toBeDefined()
      })
    })

    describe('compareResults', () => {
      it('should compare two result sets', () => {
        const comparison = compareResults(mockResults[0], mockResults[1])
        
        expect(comparison.thresholdDifference).toBeDefined()
        expect(comparison.improvementPercent).toBeDefined()
        expect(comparison.significance).toBeDefined()
      })

      it('should handle identical results', () => {
        const comparison = compareResults(mockResults[0], mockResults[0])
        
        expect(comparison.thresholdDifference).toBe(0)
        expect(comparison.improvementPercent).toBe(0)
      })

      it('should calculate statistical significance', () => {
        const comparison = compareResults(mockResults[0], mockResults[1])
        
        expect(comparison.significance).toBeGreaterThanOrEqual(0)
        expect(comparison.significance).toBeLessThanOrEqual(1)
        expect(comparison.isSignificant).toBeDefined()
      })
    })
  })

  describe('DEFAULT_STATISTICS_CONFIGS', () => {
    it('should have valid configurations for all test types', () => {
      const testTypes = ['hearing', 'bst', 'bit', 'bfit']
      
      testTypes.forEach(testType => {
        const config = DEFAULT_STATISTICS_CONFIGS[testType]
        expect(config).toBeDefined()
        expect(config.method).toBeDefined()
        expect(config.confidenceLevel).toBeGreaterThan(0)
        expect(config.confidenceLevel).toBeLessThan(1)
      })
    })

    it('should have appropriate settings for different test types', () => {
      expect(DEFAULT_STATISTICS_CONFIGS.hearing.outlierThreshold).toBe(2.5)
      expect(DEFAULT_STATISTICS_CONFIGS.bst.outlierThreshold).toBe(2.0)
      expect(DEFAULT_STATISTICS_CONFIGS.bit.outlierThreshold).toBe(2.0)
      expect(DEFAULT_STATISTICS_CONFIGS.bfit.outlierThreshold).toBe(2.0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    let statistics: StaircaseStatistics

    beforeEach(() => {
      statistics = new StaircaseStatistics(testConfig)
    })

    it('should handle extreme outliers', () => {
      const levelsWithExtremeOutlier = [60, 62, 60, 62, 60, 1000]
      const result = statistics.calculateThreshold(levelsWithExtremeOutlier)
      
      expect(result.outliers).toContain(1000)
      expect(result.threshold).toBeCloseTo(60.8, 1)
    })

    it('should handle negative values', () => {
      const negativeConfig = { ...testConfig, removeOutliers: false }
      const negativeStats = new StaircaseStatistics(negativeConfig)
      const levelsWithNegative = [-10, 60, 62, 60, 62, 60]
      
      const result = negativeStats.calculateThreshold(levelsWithNegative)
      expect(result.threshold).toBeDefined()
    })

    it('should handle very large datasets', () => {
      const largeLevels = Array(1000).fill(null).map((_, i) => 60 + Math.sin(i * 0.1) * 2)
      const result = statistics.calculateThreshold(largeLevels)
      
      expect(result.threshold).toBeCloseTo(60, 0)
      expect(result.confidence).toBeDefined()
    })

    it('should handle trials with missing data', () => {
      const trialsWithMissing = mockTrials.map((trial, index) => 
        index % 3 === 0 ? { ...trial, responseTime: 0 } : trial
      )
      
      const metrics = statistics.calculatePerformanceMetrics(trialsWithMissing)
      expect(metrics.responseTime.mean).toBeGreaterThan(0)
    })

    it('should validate input parameters', () => {
      expect(() => statistics.calculateThreshold([])).toThrow()
      expect(() => statistics.calculateThreshold([NaN, 60, 62])).toThrow()
      expect(() => statistics.analyzeLearningCurve([])).toThrow()
    })

    it('should handle configuration edge cases', () => {
      const edgeConfig = {
        ...testConfig,
        confidenceLevel: 0.99,
        outlierThreshold: 0.5,
        minDataPoints: 100
      }
      
      const edgeStats = new StaircaseStatistics(edgeConfig)
      expect(() => edgeStats.calculateThreshold([60, 62, 60])).toThrow() // Too few data points
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', () => {
      const largeTrials = Array(10000).fill(null).map((_, i) => ({
        ...mockTrials[0],
        trialNumber: i,
        level: 60 + Math.sin(i * 0.01) * 5,
        response: Math.random() > 0.3,
        responseTime: 800 + Math.random() * 400,
        timestamp: new Date(Date.now() + i * 1000)
      }))
      
      const startTime = Date.now()
      const analysis = analyzeTrialHistory(largeTrials)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      expect(analysis.summary.totalTrials).toBe(10000)
    })

    it('should cache expensive calculations', () => {
      const statistics = new StaircaseStatistics(testConfig)
      const levels = [60, 62, 60, 62, 60, 62]
      
      // First calculation
      const start1 = Date.now()
      statistics.calculateThreshold(levels)
      const time1 = Date.now() - start1
      
      // Second calculation (should be faster due to caching)
      const start2 = Date.now()
      statistics.calculateThreshold(levels)
      const time2 = Date.now() - start2
      
      expect(time2).toBeLessThanOrEqual(time1)
    })
  })
}) 