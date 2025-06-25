// Environment configuration management
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_STAGING: process.env.VERCEL_ENV === 'preview',
} as const

export const APP_CONFIG = {
  // Application URLs
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Supabase configuration
  SUPABASE: {
    URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PROJECT_ID: process.env.SUPABASE_PROJECT_ID,
  },
  
  // Audio configuration
  AUDIO: {
    SAMPLE_RATE: parseInt(process.env.NEXT_PUBLIC_AUDIO_SAMPLE_RATE || '44100'),
    BUFFER_SIZE: parseInt(process.env.NEXT_PUBLIC_AUDIO_BUFFER_SIZE || '256'),
  },
  
  // Test configuration
  TEST: {
    MAX_TRIALS: parseInt(process.env.NEXT_PUBLIC_MAX_TRIALS || '50'),
    TARGET_REVERSALS: parseInt(process.env.NEXT_PUBLIC_TARGET_REVERSALS || '6'),
    INITIAL_STEP_SIZE: parseInt(process.env.NEXT_PUBLIC_INITIAL_STEP_SIZE || '8'),
  },
  
  // Admin configuration
  ADMIN: {
    EMAIL: process.env.ADMIN_EMAIL,
    PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  },
  
  // Security configuration
  SECURITY: {
    CSP_REPORT_URI: process.env.CSP_REPORT_URI,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || [],
  },
  
  // Monitoring configuration
  MONITORING: {
    SENTRY_DSN: process.env.SENTRY_DSN,
    VERCEL_ANALYTICS_ID: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID,
  }
} as const

// Environment-specific configurations
export const ENVIRONMENT_CONFIG = {
  development: {
    LOG_LEVEL: 'debug',
    API_TIMEOUT: 10000,
    ENABLE_DEVTOOLS: true,
    MOCK_AUDIO: false,
  },
  
  staging: {
    LOG_LEVEL: 'info',
    API_TIMEOUT: 8000,
    ENABLE_DEVTOOLS: false,
    MOCK_AUDIO: false,
  },
  
  production: {
    LOG_LEVEL: 'error',
    API_TIMEOUT: 5000,
    ENABLE_DEVTOOLS: false,
    MOCK_AUDIO: false,
  }
} as const

export const getCurrentConfig = () => {
  if (ENV.IS_PRODUCTION) return ENVIRONMENT_CONFIG.production
  if (ENV.IS_STAGING) return ENVIRONMENT_CONFIG.staging
  return ENVIRONMENT_CONFIG.development
}

// Validation helper
export const validateEnvironment = () => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Initialize validation in production
if (ENV.IS_PRODUCTION) {
  validateEnvironment()
} 