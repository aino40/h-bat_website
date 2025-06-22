import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('Missing env.NEXT_PUBLIC_SUPABASE_URL - Supabase features will be disabled')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase features will be disabled')
}

// Create a mock client if environment variables are missing (for development)
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key')

// Service role client for admin operations
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = serviceRoleKey ? createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

// Database types will be generated after schema is created
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          age: number | null
          gender: string | null
          handedness: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          age?: number | null
          gender?: string | null
          handedness?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          age?: number | null
          gender?: string | null
          handedness?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          profile_id: string
          started_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      hearing_trials: {
        Row: {
          session_id: string
          frequency: number
          idx: number
          db_level: number
          correct: boolean
          created_at: string
        }
        Insert: {
          session_id: string
          frequency: number
          idx: number
          db_level: number
          correct: boolean
          created_at?: string
        }
        Update: {
          session_id?: string
          frequency?: number
          idx?: number
          db_level?: number
          correct?: boolean
          created_at?: string
        }
      }
      hearing_thresholds: {
        Row: {
          session_id: string
          frequency: number
          threshold_db: number
          created_at: string
        }
        Insert: {
          session_id: string
          frequency: number
          threshold_db: number
          created_at?: string
        }
        Update: {
          session_id?: string
          frequency?: number
          threshold_db?: number
          created_at?: string
        }
      }
      bst_trials: {
        Row: {
          session_id: string
          idx: number
          delta_db: number
          correct: boolean
          created_at: string
        }
        Insert: {
          session_id: string
          idx: number
          delta_db: number
          correct: boolean
          created_at?: string
        }
        Update: {
          session_id?: string
          idx?: number
          delta_db?: number
          correct?: boolean
          created_at?: string
        }
      }
      bit_trials: {
        Row: {
          session_id: string
          idx: number
          slope_sign: number
          correct: boolean
          created_at: string
        }
        Insert: {
          session_id: string
          idx: number
          slope_sign: number
          correct: boolean
          created_at?: string
        }
        Update: {
          session_id?: string
          idx?: number
          slope_sign?: number
          correct?: boolean
          created_at?: string
        }
      }
      bfit_trials: {
        Row: {
          session_id: string
          idx: number
          pattern_id: string
          slope_sign: number
          correct: boolean
          created_at: string
        }
        Insert: {
          session_id: string
          idx: number
          pattern_id: string
          slope_sign: number
          correct: boolean
          created_at?: string
        }
        Update: {
          session_id?: string
          idx?: number
          pattern_id?: string
          slope_sign?: number
          correct?: boolean
          created_at?: string
        }
      }
      thresholds: {
        Row: {
          session_id: string
          bst_db: number | null
          bit_slope: number | null
          bfit_slope: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          session_id: string
          bst_db?: number | null
          bit_slope?: number | null
          bfit_slope?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          session_id?: string
          bst_db?: number | null
          bit_slope?: number | null
          bfit_slope?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 