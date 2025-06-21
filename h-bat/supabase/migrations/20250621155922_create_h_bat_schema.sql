-- H-BAT Database Schema Migration
-- Creates all tables, indexes, and constraints for the H-BAT rhythm perception test application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles table (被験者プロフィール)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    age INTEGER,
    gender VARCHAR(10),
    handedness VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_age CHECK (age >= 0 AND age <= 150),
    CONSTRAINT check_gender CHECK (gender IN ('male', 'female', 'other')),
    CONSTRAINT check_handedness CHECK (handedness IN ('right', 'left', 'both'))
);

-- 2. sessions table (テストセッション)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. hearing_trials table (聴力閾値測定試行)
CREATE TABLE hearing_trials (
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    frequency INTEGER NOT NULL,
    idx INTEGER NOT NULL,
    db_level REAL NOT NULL,
    correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite primary key
    PRIMARY KEY (session_id, frequency, idx),
    
    -- Constraints
    CONSTRAINT check_frequency CHECK (frequency IN (1000, 2000, 4000)),
    CONSTRAINT check_db_level CHECK (db_level >= 0 AND db_level <= 120),
    CONSTRAINT check_idx_positive CHECK (idx >= 0)
);

-- 4. hearing_thresholds table (聴力閾値結果)
CREATE TABLE hearing_thresholds (
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    frequency INTEGER NOT NULL,
    threshold_db REAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite primary key
    PRIMARY KEY (session_id, frequency),
    
    -- Constraints
    CONSTRAINT check_frequency CHECK (frequency IN (1000, 2000, 4000)),
    CONSTRAINT check_threshold_db CHECK (threshold_db >= 0 AND threshold_db <= 120)
);

-- 5. bst_trials table (BST試行データ)
CREATE TABLE bst_trials (
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    delta_db REAL NOT NULL,
    pattern_type INTEGER NOT NULL,
    correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite primary key
    PRIMARY KEY (session_id, idx),
    
    -- Constraints
    CONSTRAINT check_delta_db CHECK (delta_db >= 0 AND delta_db <= 60),
    CONSTRAINT check_pattern_type CHECK (pattern_type IN (2, 3)),
    CONSTRAINT check_idx_positive CHECK (idx >= 0)
);

-- 6. bit_trials table (BIT試行データ)
CREATE TABLE bit_trials (
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    slope_ms_per_beat REAL NOT NULL,
    slope_sign INTEGER NOT NULL,
    correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite primary key
    PRIMARY KEY (session_id, idx),
    
    -- Constraints
    CONSTRAINT check_slope_sign CHECK (slope_sign IN (-1, 1)),
    CONSTRAINT check_idx_positive CHECK (idx >= 0)
);

-- 7. bfit_trials table (BFIT試行データ)
CREATE TABLE bfit_trials (
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    pattern_id VARCHAR(50) NOT NULL,
    slope_ms_per_beat REAL NOT NULL,
    slope_sign INTEGER NOT NULL,
    correct BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite primary key
    PRIMARY KEY (session_id, idx),
    
    -- Constraints
    CONSTRAINT check_slope_sign CHECK (slope_sign IN (-1, 1)),
    CONSTRAINT check_idx_positive CHECK (idx >= 0),
    CONSTRAINT check_pattern_id_not_empty CHECK (pattern_id != '')
);

-- 8. thresholds table (最終閾値結果)
CREATE TABLE thresholds (
    session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    bst_threshold_db REAL,
    bit_threshold_ms REAL,
    bfit_threshold_ms REAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_bst_threshold CHECK (bst_threshold_db IS NULL OR (bst_threshold_db >= 0 AND bst_threshold_db <= 60)),
    CONSTRAINT check_bit_threshold CHECK (bit_threshold_ms IS NULL OR bit_threshold_ms > 0),
    CONSTRAINT check_bfit_threshold CHECK (bfit_threshold_ms IS NULL OR bfit_threshold_ms > 0)
);

-- Performance Indexes
-- セッション検索用
CREATE INDEX idx_sessions_profile_id ON sessions(profile_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- 試行データ検索用
CREATE INDEX idx_hearing_trials_session_frequency ON hearing_trials(session_id, frequency);
CREATE INDEX idx_bst_trials_session ON bst_trials(session_id);
CREATE INDEX idx_bit_trials_session ON bit_trials(session_id);
CREATE INDEX idx_bfit_trials_session ON bfit_trials(session_id);

-- 管理者ダッシュボード用
CREATE INDEX idx_sessions_completed_at ON sessions(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thresholds_updated_at BEFORE UPDATE ON thresholds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE profiles IS '被験者プロフィール情報';
COMMENT ON TABLE sessions IS 'テストセッション管理';
COMMENT ON TABLE hearing_trials IS '聴力閾値測定の試行データ';
COMMENT ON TABLE hearing_thresholds IS '聴力閾値測定の最終結果';
COMMENT ON TABLE bst_trials IS 'Beat Saliency Test（拍子判別）の試行データ';
COMMENT ON TABLE bit_trials IS 'Beat Interval Test（テンポ変化判別）の試行データ';
COMMENT ON TABLE bfit_trials IS 'Beat Finding & Interval Test（複雑リズム）の試行データ';
COMMENT ON TABLE thresholds IS '各テストの最終閾値結果';

-- Column comments for key fields
COMMENT ON COLUMN hearing_trials.frequency IS '周波数（Hz）: 1000, 2000, 4000';
COMMENT ON COLUMN hearing_trials.db_level IS '音圧レベル（dB SPL）';
COMMENT ON COLUMN bst_trials.delta_db IS '強拍・弱拍の音量差（dB）';
COMMENT ON COLUMN bst_trials.pattern_type IS 'パターンタイプ（2=2拍子, 3=3拍子）';
COMMENT ON COLUMN bit_trials.slope_ms_per_beat IS 'IOI変化率（ms/beat）';
COMMENT ON COLUMN bit_trials.slope_sign IS '方向（1=加速, -1=減速）';
COMMENT ON COLUMN bfit_trials.pattern_id IS 'リズムパターンID';
COMMENT ON COLUMN bfit_trials.slope_ms_per_beat IS 'IOI変化率（ms/beat）';
COMMENT ON COLUMN bfit_trials.slope_sign IS '方向（1=加速, -1=減速）';
