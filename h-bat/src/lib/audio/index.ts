// H-BAT Audio Processing Library
// F-1 to F-6 Complete Implementation

// Core Audio Engine (F-1, F-2)
export {
  // Types
  type AudioEngineState,
  AudioEngineError,
  
  // Core functions
  initializeAudioEngine,
  startAudioWithUserGesture,
  stopAudioEngine,
  getAudioEngineState,
  setMasterVolume,
  getMasterVolume,
  dbSplToToneVolume,
  toneVolumeToDbSpl,
  checkAudioContextState,
  checkAudioSupport,
  performAudioHealthCheck
} from './core'

// React Context Integration (F-2)
export {
  // Components
  AudioProvider,
  
  // Hooks
  useAudio,
  useAudioState,
  useAudioVolume,
  useAudioPermission
} from '../../contexts/AudioContext'

// Sample Management (F-3)
export {
  // Types
  type AudioSample,
  type SampleId,
  SAMPLE_CONFIG,
  
  // Functions
  preloadAudioSamples,
  loadSample,
  getSamplePlayer,
  getSampleBuffer,
  getSampleLoadingStatus,
  createCustomPlayer,
  checkSampleFiles,
  sampleManager
} from './samples'

// Calibration System (F-4)
export {
  // Types
  type CalibrationConfig,
  type HearingThreshold,
  DEFAULT_CALIBRATION,
  
  // Functions
  setHearingThreshold,
  getTestVolume,
  getHearingThreshold,
  getAllHearingThresholds,
  checkVolumeSafety,
  setupHBatCalibration,
  getHBatTestVolumes,
  calibrationManager
} from './calibration'

// Permission Management (F-5)
export {
  // Types
  type AudioPermissionState,
  type UserGestureType,
  
  // Functions
  requestAudioPermission,
  startListeningForUserGesture,
  stopListeningForUserGesture,
  getAudioPermissionState,
  isAudioReady,
  checkBrowserAudioSupport,
  diagnoseAudioIssues,
  ensureHBatAudioReady,
  audioPermissionManager
} from './permissions'

// Error Handling & Fallback (F-6)
export {
  // Types
  AudioErrorType,
  type AudioErrorInfo,
  FallbackStrategy,
  type RecoveryConfig,
  DEFAULT_RECOVERY_CONFIG,
  
  // Functions
  handleAudioError,
  registerAudioRecoveryCallback,
  getAudioErrorHistory,
  getAudioErrorStatistics,
  setupHBatErrorHandling,
  audioErrorHandler
} from './errorHandling'

// Import for convenience functions
import { initializeAudioEngine } from './core'
import { preloadAudioSamples } from './samples'
import { setupHBatCalibration, getHBatTestVolumes } from './calibration'
import { ensureHBatAudioReady } from './permissions'
import { handleAudioError, AudioErrorType, setupHBatErrorHandling } from './errorHandling'

// Convenience exports for H-BAT specific usage
export const HBatAudio = {
  // Initialization
  async initialize() {
    console.log('🎵 Initializing H-BAT Audio System...')
    
    try {
      // Setup error handling
      setupHBatErrorHandling()
      
      // Initialize audio engine
      const engineSuccess = await initializeAudioEngine()
      if (!engineSuccess) {
        throw new Error('Failed to initialize audio engine')
      }
      
      // Preload samples
      const samplesSuccess = await preloadAudioSamples()
      if (!samplesSuccess) {
        console.warn('⚠️ Some audio samples failed to load')
      }
      
      console.log('✅ H-BAT Audio System initialized successfully')
      return true
      
    } catch (error) {
      console.error('❌ H-BAT Audio System initialization failed:', error)
      await handleAudioError(
        AudioErrorType.INITIALIZATION_FAILED,
        'H-BAT audio system initialization failed',
        error instanceof Error ? error : undefined
      )
      return false
    }
  },
  
  // Health check
  async healthCheck() {
    return await ensureHBatAudioReady()
  },
  
  // Setup calibration
  setupCalibration(thresholds: { frequency: number; threshold: number }[]) {
    setupHBatCalibration(thresholds)
  },
  
  // Get test volumes
  getTestVolumes() {
    return getHBatTestVolumes()
  }
} 