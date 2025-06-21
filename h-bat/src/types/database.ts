export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bfit_trials: {
        Row: {
          correct: boolean
          created_at: string | null
          idx: number
          pattern_id: string
          session_id: string
          slope_ms_per_beat: number
          slope_sign: number
        }
        Insert: {
          correct: boolean
          created_at?: string | null
          idx: number
          pattern_id: string
          session_id: string
          slope_ms_per_beat: number
          slope_sign: number
        }
        Update: {
          correct?: boolean
          created_at?: string | null
          idx?: number
          pattern_id?: string
          session_id?: string
          slope_ms_per_beat?: number
          slope_sign?: number
        }
        Relationships: [
          {
            foreignKeyName: "bfit_trials_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bit_trials: {
        Row: {
          correct: boolean
          created_at: string | null
          idx: number
          session_id: string
          slope_ms_per_beat: number
          slope_sign: number
        }
        Insert: {
          correct: boolean
          created_at?: string | null
          idx: number
          session_id: string
          slope_ms_per_beat: number
          slope_sign: number
        }
        Update: {
          correct?: boolean
          created_at?: string | null
          idx?: number
          session_id?: string
          slope_ms_per_beat?: number
          slope_sign?: number
        }
        Relationships: [
          {
            foreignKeyName: "bit_trials_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bst_trials: {
        Row: {
          correct: boolean
          created_at: string | null
          delta_db: number
          idx: number
          pattern_type: number
          session_id: string
        }
        Insert: {
          correct: boolean
          created_at?: string | null
          delta_db: number
          idx: number
          pattern_type: number
          session_id: string
        }
        Update: {
          correct?: boolean
          created_at?: string | null
          delta_db?: number
          idx?: number
          pattern_type?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bst_trials_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hearing_thresholds: {
        Row: {
          created_at: string | null
          frequency: number
          session_id: string
          threshold_db: number
        }
        Insert: {
          created_at?: string | null
          frequency: number
          session_id: string
          threshold_db: number
        }
        Update: {
          created_at?: string | null
          frequency?: number
          session_id?: string
          threshold_db?: number
        }
        Relationships: [
          {
            foreignKeyName: "hearing_thresholds_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hearing_trials: {
        Row: {
          correct: boolean
          created_at: string | null
          db_level: number
          frequency: number
          idx: number
          session_id: string
        }
        Insert: {
          correct: boolean
          created_at?: string | null
          db_level: number
          frequency: number
          idx: number
          session_id: string
        }
        Update: {
          correct?: boolean
          created_at?: string | null
          db_level?: number
          frequency?: number
          idx?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hearing_trials_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string | null
          gender: string | null
          handedness: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          gender?: string | null
          handedness?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          gender?: string | null
          handedness?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          profile_id: string
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          profile_id: string
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thresholds: {
        Row: {
          bfit_threshold_ms: number | null
          bit_threshold_ms: number | null
          bst_threshold_db: number | null
          created_at: string | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          bfit_threshold_ms?: number | null
          bit_threshold_ms?: number | null
          bst_threshold_db?: number | null
          created_at?: string | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          bfit_threshold_ms?: number | null
          bit_threshold_ms?: number | null
          bst_threshold_db?: number | null
          created_at?: string | null
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thresholds_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
