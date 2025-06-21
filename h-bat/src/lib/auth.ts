import { supabase } from './supabase'

// Admin domain for admin user identification
const ADMIN_DOMAIN = '@admin.h-bat.com'

/**
 * Check if a user is an admin based on their email domain
 */
export function isAdminUser(email: string): boolean {
  return email.endsWith(ADMIN_DOMAIN)
}

/**
 * Sign up a new admin user
 */
export async function signUpAdmin(email: string, password: string) {
  if (!isAdminUser(email)) {
    throw new Error('Admin email must end with @admin.h-bat.com')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'admin',
        is_admin: true
      }
    }
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Sign in a user (admin or regular)
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw error
  }
}

/**
 * Get the current user session
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw error
  }

  return user
}

/**
 * Get the current session
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    throw error
  }

  return session
}

/**
 * Check if current user is admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user?.email) {
    return false
  }

  return isAdminUser(user.email)
} 