import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format')
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')
export const ageSchema = z.number().int().min(18).max(100, 'Age must be between 18 and 100')
export const sessionIdSchema = z.string().uuid('Invalid session ID format')

// Input sanitization
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
}

export const sanitizeNumber = (input: unknown): number | null => {
  if (typeof input === 'number' && isFinite(input)) {
    return input
  }
  
  if (typeof input === 'string') {
    const parsed = parseFloat(input)
    return isFinite(parsed) ? parsed : null
  }
  
  return null
}

// SQL injection prevention
export const sanitizeForDatabase = (input: string): string => {
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comments start
    .replace(/\*\//g, '') // Remove multi-line comments end
}

// XSS prevention
export const sanitizeHTML = (input: string): string => {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  
  return input.replace(/[&<>"'/]/g, (match) => htmlEntities[match] || match)
}

// File upload validation
export const validateFileUpload = (file: File) => {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/ogg']
  
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit')
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only WAV, MP3, and OGG files are allowed')
  }
  
  return true
}

// Request validation schemas
export const userInfoSchema = z.object({
  age: ageSchema,
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']),
  handedness: z.enum(['left', 'right', 'ambidextrous']),
  musicExperience: z.enum(['none', 'amateur', 'professional']),
  hearingImpairment: z.boolean(),
  consentGiven: z.boolean().refine(val => val === true, 'Consent must be given')
})

export const testResultSchema = z.object({
  sessionId: sessionIdSchema,
  testType: z.enum(['hearing', 'bst', 'bit', 'bfit']),
  trialIndex: z.number().int().min(0),
  stimulus: z.object({
    level: z.number(),
    frequency: z.number().optional(),
    pattern: z.string().optional()
  }),
  response: z.object({
    answer: z.string(),
    reactionTime: z.number().min(0),
    timestamp: z.string().datetime()
  }),
  isCorrect: z.boolean()
})

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})

// CSRF protection
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  return token === sessionToken && token.length === 64
}

// Content validation for admin operations
export const validateAdminOperation = (operation: string, data: unknown) => {
  const allowedOperations = ['export', 'delete', 'update', 'view']
  
  if (!allowedOperations.includes(operation)) {
    throw new Error('Invalid operation')
  }
  
  // Additional validation based on operation type
  switch (operation) {
    case 'export':
      return z.object({
        format: z.enum(['csv', 'tsv']),
        dateRange: z.object({
          start: z.string().datetime(),
          end: z.string().datetime()
        }),
        dataTypes: z.array(z.string())
      }).parse(data)
      
    case 'delete':
      return z.object({
        sessionIds: z.array(sessionIdSchema)
      }).parse(data)
      
    default:
      return data
  }
}

// Environment variable validation
export const validateEnvironmentVariables = () => {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  // Validate URL format
  try {
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
  } catch {
    throw new Error('Invalid SUPABASE_URL format')
  }
} 