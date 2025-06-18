// H-BAT Application Type Definitions

// User Profile Types
export interface UserProfile {
  id: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  handedness: 'left' | 'right' | 'ambidextrous';
  created_at: string;
}

// Session Types
export interface Session {
  id: string;
  profile_id: string;
  started_at: string;
  completed_at?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
}

// Hearing Threshold Types
export interface HearingTrial {
  session_id: string;
  frequency: 1000 | 2000 | 4000; // Hz
  idx: number;
  db_level: number;
  correct: boolean;
  timestamp: string;
}

export interface HearingThreshold {
  session_id: string;
  frequency: 1000 | 2000 | 4000; // Hz
  threshold_db: number;
}

// BST (Beat Saliency Test) Types
export interface BSTTrial {
  session_id: string;
  idx: number;
  delta_db: number;
  beat_pattern: 2 | 3; // 2-beat or 3-beat
  user_response: 2 | 3;
  correct: boolean;
  timestamp: string;
}

// BIT (Beat Interval Test) Types
export interface BITTrial {
  session_id: string;
  idx: number;
  slope_ms_per_beat: number;
  slope_sign: 1 | -1; // 1 for accelerando, -1 for ritardando
  user_response: 'accelerando' | 'ritardando';
  correct: boolean;
  timestamp: string;
}

// BFIT (Beat Finding & Interval Test) Types
export interface BFITTrial {
  session_id: string;
  idx: number;
  pattern_id: string;
  slope_ms_per_beat: number;
  slope_sign: 1 | -1;
  user_response: 'accelerando' | 'ritardando';
  correct: boolean;
  timestamp: string;
}

// Final Thresholds
export interface Thresholds {
  session_id: string;
  bst_threshold_db: number;
  bit_threshold_ms: number;
  bfit_threshold_ms: number;
}

// Test Configuration
export interface TestConfig {
  bst_initial_delta_db: number;
  bit_initial_slope_ms: number;
  bfit_initial_slope_ms: number;
  hearing_threshold_initial_db: number;
  hearing_threshold_max_db: number;
  reversal_count: number;
}

// Audio Context Types
export interface AudioState {
  isInitialized: boolean;
  isPlaying: boolean;
  volume: number;
  sampleRate: number;
}

// Staircase Algorithm Types
export interface StaircaseState {
  level: number;
  direction: 'up' | 'down';
  reversals: number[];
  trial_history: boolean[];
  is_converged: boolean;
}

// UI Component Types
export interface TestProgress {
  current_step: number;
  total_steps: number;
  step_name: string;
  progress_percentage: number;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Export CSV Types
export interface CSVExportConfig {
  start_date: string;
  end_date: string;
  include_trials: boolean;
  include_thresholds: boolean;
  format: 'csv' | 'tsv';
}

export interface ExportedSessionData {
  profile: UserProfile;
  session: Session;
  hearing_thresholds: HearingThreshold[];
  thresholds: Thresholds;
  trials?: {
    hearing: HearingTrial[];
    bst: BSTTrial[];
    bit: BITTrial[];
    bfit: BFITTrial[];
  };
} 