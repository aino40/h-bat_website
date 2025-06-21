import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key for testing to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testCloudConnection() {
  try {
    console.log('🌤️ Testing Supabase Cloud Connection...')
    console.log('API URL:', supabaseUrl)
    console.log('Project ID:', process.env.SUPABASE_PROJECT_ID)
    console.log('Environment:', process.env.NODE_ENV)
    console.log('🔑 Using Service Role Key for testing (bypasses RLS)')
    console.log('')

    // Test database connection by checking table existence
    console.log('🗄️ Testing database tables...')
    
    // Check if H-BAT tables exist
    const tables = ['profiles', 'sessions', 'hearing_trials', 'hearing_thresholds', 'bst_trials', 'bit_trials', 'bfit_trials', 'thresholds']
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.log(`❌ Table '${table}': ${error.message}`)
        } else {
          console.log(`✅ Table '${table}': exists (${count} records)`)
        }
      } catch (err) {
        console.log(`❌ Table '${table}': connection error`)
      }
    }

    // Test simple query
    console.log('')
    console.log('🔍 Testing simple queries...')
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, age, gender')
        .limit(3)
      
      if (error) {
        console.log('❌ Profiles query error:', error.message)
      } else {
        console.log('✅ Profiles table query successful:')
        console.log('   Sample data:', data)
      }
    } catch (err) {
      console.log('❌ Database query test failed:', err)
    }

    // Test session data
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, profile_id, completed_at')
        .limit(3)
      
      if (error) {
        console.log('❌ Sessions query error:', error.message)
      } else {
        console.log('✅ Sessions table query successful:')
        console.log('   Sample data:', data)
      }
    } catch (err) {
      console.log('❌ Sessions query test failed:', err)
    }

    return true

  } catch (error) {
    console.error('❌ Connection test failed:', error)
    return false
  }
}

async function main() {
  const success = await testCloudConnection()
  
  console.log('')
  console.log('🎉 Supabase Cloud Connection Test Completed!')
  console.log('')
  console.log('📋 Next Steps:')
  console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard/project/' + process.env.SUPABASE_PROJECT_ID)
  console.log('2. View test data in dashboard')
  console.log('3. Start implementing H-BAT features')
  console.log('4. Test with anonymous users (RLS will apply)')
  
  process.exit(success ? 0 : 1)
}

main() 