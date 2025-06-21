-- H-BAT Row Level Security (RLS) Policies
-- Implements security policies for H-BAT rhythm perception test application

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearing_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearing_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bst_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bit_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bfit_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE thresholds ENABLE ROW LEVEL SECURITY;

-- Create admin role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin;
    END IF;
END
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.email LIKE '%@admin.h-bat.com'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's profile ID
CREATE OR REPLACE FUNCTION get_user_profile_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PROFILES TABLE POLICIES
-- =============================================================================

-- Allow anonymous users to create profiles (for test participants)
CREATE POLICY "Allow anonymous profile creation" ON profiles
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT 
    TO authenticated
    USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE 
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT 
    TO authenticated
    USING (is_admin());

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE 
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =============================================================================
-- SESSIONS TABLE POLICIES
-- =============================================================================

-- Allow authenticated users to create sessions for their profile
CREATE POLICY "Users can create own sessions" ON sessions
    FOR INSERT 
    TO authenticated
    WITH CHECK (profile_id = auth.uid());

-- Allow anonymous users to create sessions (for test participants)
CREATE POLICY "Allow anonymous session creation" ON sessions
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Allow users to read their own sessions
CREATE POLICY "Users can read own sessions" ON sessions
    FOR SELECT 
    TO authenticated
    USING (profile_id = auth.uid());

-- Allow users to update their own sessions
CREATE POLICY "Users can update own sessions" ON sessions
    FOR UPDATE 
    TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

-- Allow admins to read all sessions
CREATE POLICY "Admins can read all sessions" ON sessions
    FOR SELECT 
    TO authenticated
    USING (is_admin());

-- Allow admins to update all sessions
CREATE POLICY "Admins can update all sessions" ON sessions
    FOR UPDATE 
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =============================================================================
-- HEARING_TRIALS TABLE POLICIES
-- =============================================================================

-- Allow users to insert hearing trials for their own sessions
CREATE POLICY "Users can insert own hearing trials" ON hearing_trials
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = hearing_trials.session_id 
            AND sessions.profile_id = auth.uid()
        )
    );

-- Allow anonymous users to insert hearing trials
CREATE POLICY "Allow anonymous hearing trials insertion" ON hearing_trials
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Allow users to read their own hearing trials
CREATE POLICY "Users can read own hearing trials" ON hearing_trials
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = hearing_trials.session_id 
            AND sessions.profile_id = auth.uid()
        )
    );

-- Allow admins to read all hearing trials
CREATE POLICY "Admins can read all hearing trials" ON hearing_trials
    FOR SELECT 
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- HEARING_THRESHOLDS TABLE POLICIES
-- =============================================================================

-- Allow users to insert/update hearing thresholds for their own sessions
CREATE POLICY "Users can manage own hearing thresholds" ON hearing_thresholds
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = hearing_thresholds.session_id 
            AND sessions.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = hearing_thresholds.session_id 
            AND sessions.profile_id = auth.uid()
        )
    );

-- Allow anonymous users to insert hearing thresholds
CREATE POLICY "Allow anonymous hearing thresholds insertion" ON hearing_thresholds
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Allow admins to manage all hearing thresholds
CREATE POLICY "Admins can manage all hearing thresholds" ON hearing_thresholds
    FOR ALL 
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =============================================================================
-- BST_TRIALS TABLE POLICIES
-- =============================================================================

-- Allow users to insert BST trials for their own sessions
CREATE POLICY "Users can insert own BST trials" ON bst_trials
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = bst_trials.session_id 
            AND sessions.profile_id = auth.uid()
        )
    );

-- Allow anonymous users to insert BST trials
CREATE POLICY "Allow anonymous BST trials insertion" ON bst_trials
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Allow users to read their own BST trials
CREATE POLICY "Users can read own BST trials" ON bst_trials
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = bst_trials.session_id 
            AND sessions.profile_id = auth.uid()
        )
    );

-- Allow admins to read all BST trials
CREATE POLICY "Admins can read all BST trials" ON bst_trials
    FOR SELECT 
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- BIT_TRIALS TABLE POLICIES
-- =============================================================================

-- Allow users to insert BIT trials for their own sessions
CREATE POLICY "Users can insert own BIT trials" ON bit_trials
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = bit_trials.session_id 
            AND sessions.profile_id = auth.uid()
        )
    );

-- Allow anonymous users to insert BIT trials
CREATE POLICY "Allow anonymous BIT trials insertion" ON bit_trials
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Allow users to read their own BIT trials
CREATE POLICY "Users can read own BIT trials" ON bit_trials
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = bit_trials.session_id 
            AND sessions.profile_id = auth.uid()
        )
    );

-- Allow admins to read all BIT trials
CREATE POLICY "Admins can read all BIT trials" ON bit_trials
    FOR SELECT 
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- BFIT_TRIALS TABLE POLICIES
-- =============================================================================

-- Allow users to insert BFIT trials for their own sessions
CREATE POLICY "Users can insert own BFIT trials" ON bfit_trials
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = bfit_trials.session_id 
            AND sessions.profile_id = auth.uid()
        )
    );

-- Allow anonymous users to insert BFIT trials
CREATE POLICY "Allow anonymous BFIT trials insertion" ON bfit_trials
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Allow users to read their own BFIT trials
CREATE POLICY "Users can read own BFIT trials" ON bfit_trials
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = bfit_trials.session_id 
            AND sessions.profile_id = auth.uid()
        )
    );

-- Allow admins to read all BFIT trials
CREATE POLICY "Admins can read all BFIT trials" ON bfit_trials
    FOR SELECT 
    TO authenticated
    USING (is_admin());

-- =============================================================================
-- THRESHOLDS TABLE POLICIES
-- =============================================================================

-- Allow users to manage thresholds for their own sessions
CREATE POLICY "Users can manage own thresholds" ON thresholds
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = thresholds.session_id 
            AND sessions.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = thresholds.session_id 
            AND sessions.profile_id = auth.uid()
        )
    );

-- Allow anonymous users to insert thresholds
CREATE POLICY "Allow anonymous thresholds insertion" ON thresholds
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Allow admins to manage all thresholds
CREATE POLICY "Admins can manage all thresholds" ON thresholds
    FOR ALL 
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant necessary permissions to anonymous users (for test participants)
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON profiles TO anon;
GRANT INSERT ON sessions TO anon;
GRANT INSERT ON hearing_trials TO anon;
GRANT INSERT ON hearing_thresholds TO anon;
GRANT INSERT ON bst_trials TO anon;
GRANT INSERT ON bit_trials TO anon;
GRANT INSERT ON bfit_trials TO anon;
GRANT INSERT ON thresholds TO anon;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION is_admin() IS 'Check if current user has admin privileges';
COMMENT ON FUNCTION get_user_profile_id() IS 'Get the profile ID for the current authenticated user';
