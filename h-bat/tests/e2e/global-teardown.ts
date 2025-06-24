import { createClient } from '@supabase/supabase-js'

async function globalTeardown() {
  console.log('🧹 Starting global teardown for E2E tests...')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('⚠️ Supabase credentials not found, skipping cleanup')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Clean up test data
    await cleanupTestData(supabase)
    
    // Clean up test admin user
    await cleanupTestAdmin(supabase)
    
    console.log('✅ Global teardown completed successfully')
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw error to avoid failing the test suite
  }
}

async function cleanupTestData(supabase: any) {
  console.log('🗑️ Cleaning up test data...')
  
  // Delete in reverse order of dependencies
  const tables = [
    'bfit_trials',
    'bit_trials', 
    'bst_trials',
    'hearing_trials',
    'hearing_thresholds',
    'thresholds',
    'sessions',
    'profiles'
  ]

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .or('id.like.test-%,session_id.like.test-%,profile_id.like.test-%')
      
      if (error && !error.message.includes('No rows')) {
        console.warn(`⚠️ Failed to clean ${table}:`, error.message)
      }
    } catch (err) {
      console.warn(`⚠️ Error cleaning ${table}:`, err)
    }
  }
}

async function cleanupTestAdmin(supabase: any) {
  console.log('👤 Cleaning up test admin user...')
  
  try {
    // Get test admin user
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.warn('⚠️ Failed to list users:', listError.message)
      return
    }

    const testAdmin = users.users.find((user: any) => 
      user.email === 'test-admin@h-bat.test'
    )

    if (testAdmin) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(testAdmin.id)
      
      if (deleteError) {
        console.warn('⚠️ Failed to delete test admin:', deleteError.message)
      } else {
        console.log('✅ Test admin user deleted')
      }
    }
  } catch (err) {
    console.warn('⚠️ Error cleaning up test admin:', err)
  }
}

export default globalTeardown 