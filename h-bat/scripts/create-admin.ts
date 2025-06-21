#!/usr/bin/env tsx

/**
 * Admin Account Creation Script
 * 
 * This script creates an admin account for the H-BAT system.
 * Admin accounts must have email addresses ending with @admin.h-bat.com
 * 
 * Usage:
 *   npm run admin:create
 *   or
 *   npx tsx scripts/create-admin.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

function askPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    
    let password = ''
    
    const onData = (char: string) => {
      char = char.toString()
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdin.removeListener('data', onData)
          console.log('')
          resolve(password)
          break
        case '\u0003':
          process.exit()
          break
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1)
            process.stdout.write('\b \b')
          }
          break
        default:
          password += char
          process.stdout.write('*')
          break
      }
    }
    
    process.stdin.on('data', onData)
  })
}

async function createAdminAccount() {
  console.log('🔐 H-BAT Admin Account Creation')
  console.log('=====================================\n')

  try {
    // Get admin email
    const email = await askQuestion('Admin email address (must end with @admin.h-bat.com): ')
    
    if (!email.endsWith('@admin.h-bat.com')) {
      console.error('❌ Error: Admin email must end with @admin.h-bat.com')
      rl.close()
      return
    }

    // Get password
    const password = await askPassword('Password (minimum 8 characters): ')
    
    if (password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters long')
      rl.close()
      return
    }

    // Confirm password
    const confirmPassword = await askPassword('Confirm password: ')
    
    if (password !== confirmPassword) {
      console.error('❌ Error: Passwords do not match')
      rl.close()
      return
    }

    console.log('\n⏳ Creating admin account...')

    // Create admin user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        is_admin: true,
        created_by: 'admin-script',
        created_at: new Date().toISOString()
      }
    })

    if (error) {
      console.error('❌ Error creating admin account:', error.message)
      rl.close()
      return
    }

    console.log('✅ Admin account created successfully!')
    console.log(`📧 Email: ${email}`)
    console.log(`🆔 User ID: ${data.user?.id}`)
    console.log('\n🎯 Next steps:')
    console.log('1. The admin can now log in at /admin/login')
    console.log('2. Access the admin dashboard at /admin/dashboard')
    console.log('3. Manage H-BAT system settings and data')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  } finally {
    rl.close()
  }
}

async function listAdminAccounts() {
  console.log('📋 Existing Admin Accounts')
  console.log('==========================\n')

  try {
    const { data, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('❌ Error fetching users:', error.message)
      return
    }

    const adminUsers = data.users.filter(user => 
      user.email?.endsWith('@admin.h-bat.com') || 
      user.user_metadata?.is_admin === true
    )

    if (adminUsers.length === 0) {
      console.log('ℹ️  No admin accounts found')
    } else {
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
        console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`)
        console.log('')
      })
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--list') || args.includes('-l')) {
    await listAdminAccounts()
  } else {
    await createAdminAccount()
  }
}

// Run the script
main().catch(console.error) 