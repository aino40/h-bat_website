'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isAdminUser } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        setIsAdmin(session?.user?.email ? isAdminUser(session.user.email) : false)
      }
      
      setIsLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.warn('Auth state changed:', event, session?.user?.email)
        
        setSession(session)
        setUser(session?.user ?? null)
        setIsAdmin(session?.user?.email ? isAdminUser(session.user.email) : false)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setIsLoading(false)
      throw error
    }

    // State will be updated by the auth state change listener
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      setIsLoading(false)
      throw error
    }

    // State will be updated by the auth state change listener
  }

  const handleSignUp = async (email: string, password: string) => {
    setIsLoading(true)
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: isAdminUser(email) ? 'admin' : 'user',
          is_admin: isAdminUser(email)
        }
      }
    })

    if (error) {
      setIsLoading(false)
      throw error
    }

    // State will be updated by the auth state change listener
  }

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAdmin,
    signIn: handleSignIn,
    signOut: handleSignOut,
    signUp: handleSignUp
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 