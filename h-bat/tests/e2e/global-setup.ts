import { chromium, FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...')

  // Initialize Supabase client for test data setup
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Supabase credentials not found, skipping test data setup')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Clean up any existing test data
    await cleanupTestData(supabase)
    
    // Create test admin user
    await createTestAdmin(supabase)
    
    // Create test profile and session data
    await createTestData(supabase)
    
    console.log('✅ Global setup completed successfully')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
}

async function cleanupTestData(supabase: any) {
  console.log('🧹 Cleaning up existing test data...')
  
  // Delete test sessions and related data
  await supabase
    .from('bfit_trials')
    .delete()
    .like('session_id', 'test-%')

  await supabase
    .from('bit_trials')
    .delete()
    .like('session_id', 'test-%')

  await supabase
    .from('bst_trials')
    .delete()
    .like('session_id', 'test-%')

  await supabase
    .from('hearing_trials')
    .delete()
    .like('session_id', 'test-%')

  await supabase
    .from('hearing_thresholds')
    .delete()
    .like('session_id', 'test-%')

  await supabase
    .from('thresholds')
    .delete()
    .like('session_id', 'test-%')

  await supabase
    .from('sessions')
    .delete()
    .like('id', 'test-%')

  await supabase
    .from('profiles')
    .delete()
    .like('id', 'test-%')
}

async function createTestAdmin(supabase: any) {
  console.log('👤 Creating test admin user...')
  
  const adminEmail = 'test-admin@h-bat.test'
  const adminPassword = 'TestAdmin123!'
  
  // Create admin user in auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      name: 'Test Admin'
    }
  })

  if (authError && !authError.message.includes('already registered')) {
    throw new Error(`Failed to create admin user: ${authError.message}`)
  }

  console.log(`✅ Test admin created: ${adminEmail}`)
}

async function createTestData(supabase: any) {
  console.log('📊 Creating test data...')
  
  // Create test profiles
  const testProfiles = [
    {
      id: 'test-profile-1',
      age: 25,
      gender: 'male',
      handedness: 'right',
      musical_experience: 'beginner'
    },
    {
      id: 'test-profile-2',
      age: 30,
      gender: 'female',
      handedness: 'left',
      musical_experience: 'intermediate'
    }
  ]

  for (const profile of testProfiles) {
    await supabase.from('profiles').upsert(profile)
  }

  // Create test sessions
  const testSessions = [
    {
      id: 'test-session-1',
      profile_id: 'test-profile-1',
      status: 'completed',
      current_test: 'completed',
      started_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      completed_at: new Date(Date.now() - 86000000).toISOString()
    },
    {
      id: 'test-session-2',
      profile_id: 'test-profile-2',
      status: 'in_progress',
      current_test: 'bst',
      started_at: new Date().toISOString(),
      completed_at: null
    }
  ]

  for (const session of testSessions) {
    await supabase.from('sessions').upsert(session)
  }

  // Create test hearing thresholds
  const hearingThresholds = [
    { session_id: 'test-session-1', frequency: 1000, threshold_db: 25 },
    { session_id: 'test-session-1', frequency: 2000, threshold_db: 20 },
    { session_id: 'test-session-1', frequency: 4000, threshold_db: 30 }
  ]

  for (const threshold of hearingThresholds) {
    await supabase.from('hearing_thresholds').upsert(threshold)
  }

  // Create test thresholds
  await supabase.from('thresholds').upsert({
    session_id: 'test-session-1',
    bst_threshold_db: 12.5,
    bit_threshold_ms: 8.2,
    bfit_threshold_ms: 15.1
  })

  console.log('✅ Test data created successfully')
}

export default globalSetup 