import { describe, it, expect, beforeEach } from 'vitest'
import { 
  StaircaseController,
  DEFAULT_STAIRCASE_CONFIG,
  HEARING_STAIRCASE_CONFIG,
  BST_STAIRCASE_CONFIG,
  BIT_STAIRCASE_CONFIG,
  calculateThresholdFromReversals,
  calculateStaircaseProgress
} from '../core'

describe('Staircase Algorithm', () => {
  let controller: StaircaseController

  beforeEach(() => {
    controller = new StaircaseController(DEFAULT_STAIRCASE_CONFIG)
  })

  describe('StaircaseController - Basic functionality', () => {
    it('should initialize with correct default values', () => {
      const level = controller.getCurrentLevel()
      expect(level).toBe(DEFAULT_STAIRCASE_CONFIG.initialLevel)
      expect(controller.isConverged()).toBe(false)
    })

    it('should record trial and update level correctly for 2down1up rule', () => {
      const initialLevel = controller.getCurrentLevel()
      
      // First correct response - should not change level
      const trial1 = controller.recordTrial(true)
      expect(trial1.response).toBe(true)
      expect(trial1.isReversal).toBe(false)
      expect(controller.getCurrentLevel()).toBe(initialLevel)
      
      // Second correct response - should decrease level (easier)
      const trial2 = controller.recordTrial(true)
      expect(trial2.response).toBe(true)
      expect(controller.getCurrentLevel()).toBeLessThan(initialLevel)
    })

    it('should increase level on incorrect response', () => {
      const initialLevel = controller.getCurrentLevel()
      
      // Incorrect response - should increase level (harder)
      const trial = controller.recordTrial(false)
      expect(trial.response).toBe(false)
      expect(controller.getCurrentLevel()).toBeGreaterThan(initialLevel)
    })

    it('should detect reversals correctly', () => {
      // Start with some correct responses to go down
      controller.recordTrial(true)
      controller.recordTrial(true) // Should trigger decrease
      const levelAfterDecrease = controller.getCurrentLevel()
      
      // Then incorrect response to go up - this should be a reversal
      const reversalTrial = controller.recordTrial(false)
      expect(reversalTrial.isReversal).toBe(true)
      expect(controller.getCurrentLevel()).toBeGreaterThan(levelAfterDecrease)
    })
  })

  describe('StaircaseController - Convergence', () => {
    it('should converge after sufficient reversals', () => {
      // Simulate alternating responses to create reversals
      const responses = [
        true, true,    // decrease
        false,         // increase (reversal 1)
        true, true,    // decrease (reversal 2)
        false,         // increase (reversal 3)
        true, true,    // decrease (reversal 4)
        false,         // increase (reversal 5)
        true, true,    // decrease (reversal 6)
        false,         // increase (reversal 7) - should converge
      ]
      
      responses.forEach(response => {
        controller.recordTrial(response)
      })
      
      expect(controller.isConverged()).toBe(true)
      
      const result = controller.getResult()
      expect(result).not.toBeNull()
      expect(result!.threshold).toBeGreaterThan(0)
    })

    it('should not converge prematurely', () => {
      // Only a few trials
      controller.recordTrial(true)
      controller.recordTrial(false)
      controller.recordTrial(true)
      
      expect(controller.isConverged()).toBe(false)
      expect(controller.getResult()).toBeNull()
    })
  })

  describe('Different staircase configurations', () => {
    it('should work with hearing threshold configuration', () => {
      const hearingController = new StaircaseController(HEARING_STAIRCASE_CONFIG)
      
      expect(hearingController.getCurrentLevel()).toBe(HEARING_STAIRCASE_CONFIG.initialLevel)
      
      const trial = hearingController.recordTrial(true)
      expect(trial.level).toBe(HEARING_STAIRCASE_CONFIG.initialLevel)
    })

    it('should work with BST configuration', () => {
      const bstController = new StaircaseController(BST_STAIRCASE_CONFIG)
      
      expect(bstController.getCurrentLevel()).toBe(BST_STAIRCASE_CONFIG.initialLevel)
      
      const trial = bstController.recordTrial(false)
      expect(trial.response).toBe(false)
    })

    it('should work with BIT configuration', () => {
      const bitController = new StaircaseController(BIT_STAIRCASE_CONFIG)
      
      expect(bitController.getCurrentLevel()).toBe(BIT_STAIRCASE_CONFIG.initialLevel)
      
      const trial = bitController.recordTrial(true)
      expect(trial.response).toBe(true)
    })
  })

  describe('calculateThresholdFromReversals', () => {
    it('should calculate mean threshold correctly', () => {
      const reversalPoints = [20, 16, 18, 14, 16, 12]
      const result = calculateThresholdFromReversals(reversalPoints, 'mean')
      
      expect(result.threshold).toBe(16) // (20+16+18+14+16+12)/6
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should calculate median threshold correctly', () => {
      const reversalPoints = [20, 16, 18, 14, 16, 12]
      const result = calculateThresholdFromReversals(reversalPoints, 'median')
      
      // Sorted: [12, 14, 16, 16, 18, 20], median of 6 values = (16+16)/2 = 16
      expect(result.threshold).toBe(16)
    })

    it('should handle empty reversal points', () => {
      const reversalPoints: number[] = []
      const result = calculateThresholdFromReversals(reversalPoints, 'mean')
      
      expect(result.threshold).toBe(0)
      expect(result.confidence).toBe(0)
    })
  })

  describe('calculateStaircaseProgress', () => {
    it('should calculate progress correctly', () => {
      // Record some trials to create progress
      controller.recordTrial(true)
      controller.recordTrial(true)
      controller.recordTrial(false)
      controller.recordTrial(true)
      
      const state = controller.getState()
      const progress = calculateStaircaseProgress(state, DEFAULT_STAIRCASE_CONFIG)
      
      expect(progress.trialProgress).toBeGreaterThan(0)
      expect(progress.trialProgress).toBeLessThanOrEqual(1)
      expect(progress.reversalProgress).toBeGreaterThanOrEqual(0)
      expect(progress.overallProgress).toBeGreaterThan(0)
      expect(progress.estimatedRemainingTrials).toBeGreaterThan(0)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle level bounds correctly', () => {
      const boundedConfig = {
        ...DEFAULT_STAIRCASE_CONFIG,
        minLevel: 10,
        maxLevel: 30,
        initialLevel: 15
      }
      
      const boundedController = new StaircaseController(boundedConfig)
      
      // Try to go below minimum
      for (let i = 0; i < 10; i++) {
        boundedController.recordTrial(true)
        boundedController.recordTrial(true)
      }
      
      expect(boundedController.getCurrentLevel()).toBeGreaterThanOrEqual(boundedConfig.minLevel)
      
      // Reset and try to go above maximum
      boundedController.reset()
      for (let i = 0; i < 10; i++) {
        boundedController.recordTrial(false)
      }
      
      expect(boundedController.getCurrentLevel()).toBeLessThanOrEqual(boundedConfig.maxLevel)
    })

    it('should reset correctly', () => {
      // Record some trials
      controller.recordTrial(true)
      controller.recordTrial(false)
      controller.recordTrial(true)
      
      // Reset
      controller.reset()
      
      expect(controller.getCurrentLevel()).toBe(DEFAULT_STAIRCASE_CONFIG.initialLevel)
      expect(controller.isConverged()).toBe(false)
      expect(controller.getState().totalTrials).toBe(0)
    })
  })
}) 