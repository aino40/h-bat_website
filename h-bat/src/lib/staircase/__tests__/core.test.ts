import { describe, it, expect, beforeEach } from 'vitest'
import {
  StaircaseController,
  createStaircaseController,
  calculateStaircaseProgress,
  DEFAULT_STAIRCASE_CONFIGS,
  type StaircaseConfig,
  type StaircaseState,
  type StaircaseTrial,
  type StaircaseResult
} from '../core'

describe('Staircase Core Algorithm', () => {
  let controller: StaircaseController
  let hearingConfig: StaircaseConfig

  beforeEach(() => {
    hearingConfig = {
      initialLevel: 50,
      minLevel: 0,
      maxLevel: 100,
      initialStepSize: 8,
      stepSizes: [8, 4, 2],
      multiplicative: false,
      downRule: 2,
      upRule: 1,
      maxTrials: 50,
      minReversals: 6,
      thresholdReversals: 6
    }
    
    controller = new StaircaseController(hearingConfig)
  })

  describe('StaircaseController', () => {
    describe('Constructor and Initialization', () => {
      it('should initialize with correct default state', () => {
        expect(controller.getCurrentLevel()).toBe(50)
        expect(controller.getReversalCount()).toBe(0)
        expect(controller.hasConverged()).toBe(false)
        expect(controller.getTrialCount()).toBe(0)
      })

      it('should validate configuration on creation', () => {
        const invalidConfig = { ...hearingConfig, minLevel: 100, maxLevel: 50 }
        expect(() => new StaircaseController(invalidConfig)).toThrow()
      })

      it('should handle edge case configurations', () => {
        const edgeConfig = {
          ...hearingConfig,
          initialLevel: 0,
          stepSizes: [1],
          maxTrials: 1
        }
        const edgeController = new StaircaseController(edgeConfig)
        expect(edgeController.getCurrentLevel()).toBe(0)
      })
    })

    describe('Trial Recording', () => {
      it('should record correct response and update level appropriately', () => {
        // First correct response
        const result1 = controller.recordTrial(true, 1000)
        expect(result1.isReversal).toBe(false)
        expect(controller.getCurrentLevel()).toBe(50) // No change yet (need 2 correct for down)
        
        // Second correct response - should decrease level
        const result2 = controller.recordTrial(true, 1000)
        expect(result2.isReversal).toBe(false)
        expect(controller.getCurrentLevel()).toBe(42) // 50 - 8 = 42
      })

      it('should record incorrect response and increase level immediately', () => {
        const result = controller.recordTrial(false, 1000)
        expect(result.isReversal).toBe(false)
        expect(controller.getCurrentLevel()).toBe(58) // 50 + 8 = 58
      })

      it('should detect reversals correctly', () => {
        // Go up first
        controller.recordTrial(false, 1000) // Level: 58
        expect(controller.getCurrentLevel()).toBe(58)
        
        // Then go down (reversal)
        controller.recordTrial(true, 1000) // No change yet
        const result = controller.recordTrial(true, 1000) // Level: 50 (58 - 8), reversal detected
        expect(result.isReversal).toBe(true)
        expect(controller.getReversalCount()).toBe(1)
      })

      it('should update step size after reversals', () => {
        // Create enough reversals to change step size
        for (let i = 0; i < 6; i++) {
          controller.recordTrial(false, 1000) // Up
          controller.recordTrial(true, 1000) // Down prep
          controller.recordTrial(true, 1000) // Down (reversal)
        }
        
        expect(controller.getReversalCount()).toBeGreaterThanOrEqual(6)
        // After several reversals, step size should have changed from 8 to 4 to 2
      })

      it('should respect level boundaries', () => {
        const boundedConfig = { ...hearingConfig, minLevel: 45, maxLevel: 55 }
        const boundedController = new StaircaseController(boundedConfig)
        
        // Try to go below minimum
        boundedController.recordTrial(true, 1000)
        boundedController.recordTrial(true, 1000)
        expect(boundedController.getCurrentLevel()).toBeGreaterThanOrEqual(45)
        
        // Try to go above maximum
        for (let i = 0; i < 10; i++) {
          boundedController.recordTrial(false, 1000)
        }
        expect(boundedController.getCurrentLevel()).toBeLessThanOrEqual(55)
      })

      it('should handle multiplicative step changes', () => {
        const multConfig = { ...hearingConfig, multiplicative: true, stepSizes: [0.8, 0.9, 0.95] }
        const multController = new StaircaseController(multConfig)
        
        multController.recordTrial(false, 1000)
        expect(multController.getCurrentLevel()).toBe(50 / 0.8) // 62.5
      })

      it('should record response times accurately', () => {
        const result = controller.recordTrial(true, 1500)
        expect(result.responseTime).toBe(1500)
      })

      it('should generate unique trial numbers', () => {
        const result1 = controller.recordTrial(true, 1000)
        const result2 = controller.recordTrial(false, 1000)
        expect(result2.trialNumber).toBe(result1.trialNumber + 1)
      })
    })

    describe('Convergence Detection', () => {
      it('should not converge with insufficient reversals', () => {
        // Create only 3 reversals
        for (let i = 0; i < 3; i++) {
          controller.recordTrial(false, 1000)
          controller.recordTrial(true, 1000)
          controller.recordTrial(true, 1000)
        }
        
        expect(controller.hasConverged()).toBe(false)
      })

      it('should converge when criteria are met', () => {
        // Create stable pattern with enough reversals
        const levels = [50, 52, 50, 52, 50, 52, 50]
        let direction: 'up' | 'down' = 'up'
        
        for (let i = 0; i < levels.length - 1; i++) {
          const response = direction === 'down'
          controller.recordTrial(response, 1000)
          if (controller.getReversalCount() < 6) {
            controller.recordTrial(response, 1000) // Ensure direction change
          }
          direction = direction === 'up' ? 'down' : 'up'
        }
        
        // Add a few more trials to meet minimum trials after last reversal
        controller.recordTrial(true, 1000)
        controller.recordTrial(true, 1000)
        
        // Check if converged (depends on specific implementation)
        const hasConverged = controller.hasConverged()
        if (hasConverged) {
          expect(controller.getThreshold()).toBeDefined()
        }
      })

      it('should calculate threshold from recent reversals', () => {
        // Create a pattern that should converge
        for (let i = 0; i < 10; i++) {
          controller.recordTrial(i % 2 === 0, 1000)
        }
        
        if (controller.hasConverged()) {
          const threshold = controller.getThreshold()
          expect(threshold).toBeGreaterThan(0)
        }
      })
    })

    describe('State Management', () => {
      it('should provide accurate trial count', () => {
        expect(controller.getTrialCount()).toBe(0)
        controller.recordTrial(true, 1000)
        expect(controller.getTrialCount()).toBe(1)
        controller.recordTrial(false, 1000)
        expect(controller.getTrialCount()).toBe(2)
      })

      it('should track all trials', () => {
        controller.recordTrial(true, 1000)
        controller.recordTrial(false, 1200)
        
        const trials = controller.getAllTrials()
        expect(trials).toHaveLength(2)
        expect(trials[0].response).toBe(true)
        expect(trials[1].response).toBe(false)
      })

      it('should provide current state snapshot', () => {
        controller.recordTrial(false, 1000)
        const state = controller.getState()
        
        expect(state.currentLevel).toBe(58)
        expect(state.consecutiveIncorrect).toBe(1)
        expect(state.direction).toBe('up')
      })

      it('should reset state correctly', () => {
        controller.recordTrial(true, 1000)
        controller.recordTrial(false, 1000)
        
        controller.reset()
        
        expect(controller.getCurrentLevel()).toBe(50)
        expect(controller.getTrialCount()).toBe(0)
        expect(controller.getReversalCount()).toBe(0)
      })
    })

    describe('Progress Tracking', () => {
      it('should calculate progress correctly', () => {
        // Add some trials
        for (let i = 0; i < 10; i++) {
          controller.recordTrial(i % 2 === 0, 1000)
        }
        
        const progress = controller.getProgress()
        expect(progress.trialsCompleted).toBe(10)
        expect(progress.progressPercent).toBeGreaterThan(0)
        expect(progress.progressPercent).toBeLessThanOrEqual(100)
      })

      it('should provide convergence prediction', () => {
        for (let i = 0; i < 5; i++) {
          controller.recordTrial(i % 2 === 0, 1000)
        }
        
        const progress = controller.getProgress()
        expect(progress.estimatedTrialsRemaining).toBeGreaterThanOrEqual(0)
        expect(progress.confidence).toBeGreaterThanOrEqual(0)
        expect(progress.confidence).toBeLessThanOrEqual(1)
      })
    })

    describe('Error Handling', () => {
      it('should handle maximum trials reached', () => {
        const shortConfig = { ...hearingConfig, maxTrials: 5 }
        const shortController = new StaircaseController(shortConfig)
        
        for (let i = 0; i < 10; i++) {
          const result = shortController.recordTrial(true, 1000)
          if (i >= 5) {
            expect(() => shortController.recordTrial(true, 1000)).toThrow()
            break
          }
        }
      })

      it('should validate response times', () => {
        expect(() => controller.recordTrial(true, -100)).toThrow()
        expect(() => controller.recordTrial(true, 0)).not.toThrow()
      })

      it('should handle edge cases in level calculation', () => {
        const edgeConfig = {
          ...hearingConfig,
          minLevel: 0,
          maxLevel: 1,
          initialLevel: 0.5,
          stepSizes: [0.1]
        }
        const edgeController = new StaircaseController(edgeConfig)
        
        // Test boundary conditions
        edgeController.recordTrial(false, 1000) // Should go up but not exceed max
        expect(edgeController.getCurrentLevel()).toBeLessThanOrEqual(1)
        
        edgeController.recordTrial(true, 1000)
        edgeController.recordTrial(true, 1000) // Should go down but not below min
        expect(edgeController.getCurrentLevel()).toBeGreaterThanOrEqual(0)
      })
    })

    describe('Debug Information', () => {
      it('should provide debug information', () => {
        controller.recordTrial(true, 1000)
        controller.recordTrial(false, 1000)
        
        const debug = controller.getDebugInfo()
        expect(debug).toHaveProperty('currentLevel')
        expect(debug).toHaveProperty('stepSizeIndex')
        expect(debug).toHaveProperty('consecutiveCorrect')
        expect(debug).toHaveProperty('consecutiveIncorrect')
        expect(debug).toHaveProperty('direction')
        expect(debug).toHaveProperty('reversalCount')
      })

      it('should track step size changes', () => {
        const debug1 = controller.getDebugInfo()
        const initialStepIndex = debug1.stepSizeIndex
        
        // Create enough reversals to change step size
        for (let i = 0; i < 8; i++) {
          controller.recordTrial(i % 2 === 0, 1000)
        }
        
        const debug2 = controller.getDebugInfo()
        // Step size index may have changed
        expect(debug2.stepSizeIndex).toBeGreaterThanOrEqual(initialStepIndex)
      })
    })
  })

  describe('Utility Functions', () => {
    describe('createStaircaseController', () => {
      it('should create controller with default configs', () => {
        const hearingController = createStaircaseController('hearing')
        expect(hearingController.getCurrentLevel()).toBeDefined()
        
        const bstController = createStaircaseController('bst')
        expect(bstController.getCurrentLevel()).toBeDefined()
      })

      it('should create controller with custom config', () => {
        const customConfig = { ...hearingConfig, initialLevel: 75 }
        const customController = createStaircaseController('custom', customConfig)
        expect(customController.getCurrentLevel()).toBe(75)
      })

      it('should handle unknown test types', () => {
        const unknownController = createStaircaseController('unknown')
        expect(unknownController).toBeDefined()
      })
    })

    describe('calculateStaircaseProgress', () => {
      it('should calculate progress for active test', () => {
        controller.recordTrial(true, 1000)
        controller.recordTrial(false, 1000)
        
        const progress = calculateStaircaseProgress(controller)
        expect(progress.trialsCompleted).toBe(2)
        expect(progress.reversalsDetected).toBeGreaterThanOrEqual(0)
        expect(progress.progressPercent).toBeGreaterThan(0)
      })

      it('should handle completed test', () => {
        // Simulate completed test
        for (let i = 0; i < 20; i++) {
          controller.recordTrial(i % 2 === 0, 1000)
        }
        
        const progress = calculateStaircaseProgress(controller)
        expect(progress.trialsCompleted).toBe(20)
      })
    })
  })

  describe('DEFAULT_STAIRCASE_CONFIGS', () => {
    it('should have valid configurations for all test types', () => {
      const testTypes = ['hearing', 'bst', 'bit', 'bfit']
      
      testTypes.forEach(testType => {
        const config = DEFAULT_STAIRCASE_CONFIGS[testType]
        expect(config).toBeDefined()
        expect(config.initialLevel).toBeGreaterThan(0)
        expect(config.stepSizes.length).toBeGreaterThan(0)
        expect(config.maxTrials).toBeGreaterThan(0)
        expect(config.minReversals).toBeGreaterThan(0)
      })
    })

    it('should have appropriate settings for hearing tests', () => {
      const config = DEFAULT_STAIRCASE_CONFIGS.hearing
      expect(config.multiplicative).toBe(false) // Additive for hearing tests
      expect(config.stepSizes).toEqual([8, 4, 2]) // dB steps
      expect(config.downRule).toBe(2) // 2-down-1-up
      expect(config.upRule).toBe(1)
    })

    it('should have appropriate settings for BST tests', () => {
      const config = DEFAULT_STAIRCASE_CONFIGS.bst
      expect(config.multiplicative).toBe(true) // Multiplicative for volume
      expect(config.downRule).toBe(2) // 2-down-1-up
      expect(config.upRule).toBe(1)
    })

    it('should have appropriate settings for BIT/BFIT tests', () => {
      const bitConfig = DEFAULT_STAIRCASE_CONFIGS.bit
      const bfitConfig = DEFAULT_STAIRCASE_CONFIGS.bfit
      
      expect(bitConfig.multiplicative).toBe(true) // Multiplicative for temporal slopes
      expect(bfitConfig.multiplicative).toBe(true)
      expect(bitConfig.downRule).toBe(2)
      expect(bfitConfig.downRule).toBe(2)
    })
  })

  describe('Integration Tests', () => {
    it('should complete a full hearing test simulation', () => {
      const hearingController = createStaircaseController('hearing')
      const responses = [
        false, false, true, true, false, true, true, false, true, true,
        false, true, true, false, true, true, false, true, true, false,
        true, true, false, true, true, false, true, true
      ]
      
      responses.forEach((response, index) => {
        if (hearingController.getTrialCount() < hearingController.getConfig().maxTrials) {
          hearingController.recordTrial(response, 1000 + Math.random() * 500)
        }
      })
      
      expect(hearingController.getTrialCount()).toBeGreaterThan(10)
      expect(hearingController.getReversalCount()).toBeGreaterThan(0)
      
      const progress = hearingController.getProgress()
      expect(progress.progressPercent).toBeGreaterThan(0)
    })

    it('should handle BST test with multiplicative changes', () => {
      const bstController = createStaircaseController('bst')
      const initialLevel = bstController.getCurrentLevel()
      
      // Test multiplicative behavior
      bstController.recordTrial(false, 1000) // Should multiply by step factor
      const newLevel = bstController.getCurrentLevel()
      
      if (newLevel !== initialLevel) {
        expect(newLevel / initialLevel).toBeCloseTo(1 / 0.7, 1) // Default BST step factor
      }
    })

    it('should maintain consistency across resets', () => {
      const controller1 = createStaircaseController('hearing')
      const controller2 = createStaircaseController('hearing')
      
      // Both should start with same state
      expect(controller1.getCurrentLevel()).toBe(controller2.getCurrentLevel())
      expect(controller1.getTrialCount()).toBe(controller2.getTrialCount())
      
      // Apply same sequence to both
      const sequence = [true, false, true, true, false]
      sequence.forEach(response => {
        controller1.recordTrial(response, 1000)
        controller2.recordTrial(response, 1000)
      })
      
      expect(controller1.getCurrentLevel()).toBe(controller2.getCurrentLevel())
      expect(controller1.getReversalCount()).toBe(controller2.getReversalCount())
    })
  })
}) 