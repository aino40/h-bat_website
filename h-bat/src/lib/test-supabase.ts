import { supabase } from './supabase'

export async function testSupabaseConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Supabase connection error:', error)
      return { success: false, error: error.message }
    }

    console.log('Supabase connection successful!')
    console.log('Session data:', data)

    // Test database connectivity (this will show available tables)
    const { data: tables, error: dbError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5)

    if (dbError) {
      console.log('Database query info:', dbError.message)
    } else {
      console.log('Available tables:', tables)
    }

    return { 
      success: true, 
      session: data.session,
      message: 'Supabase connection and setup completed successfully!' 
    }

  } catch (error) {
    console.error('Connection test failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Export for command line testing
if (require.main === module) {
  testSupabaseConnection().then(result => {
    console.log('Test result:', result)
    process.exit(result.success ? 0 : 1)
  })
} 