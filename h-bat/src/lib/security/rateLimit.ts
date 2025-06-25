import { NextRequest } from 'next/server'

interface RateLimitOptions {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max requests per interval
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export class RateLimit {
  private interval: number
  private uniqueTokenPerInterval: number

  constructor(options: RateLimitOptions) {
    this.interval = options.interval
    this.uniqueTokenPerInterval = options.uniqueTokenPerInterval
  }

  async check(request: NextRequest, identifier?: string): Promise<RateLimitResult> {
    const key = identifier || this.getIdentifier(request)
    const now = Date.now()
    const windowStart = now - this.interval

    // Clean up old entries
    this.cleanup(windowStart)

    const current = rateLimitStore.get(key)
    
    if (!current || current.resetTime <= now) {
      // First request in window or window expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.interval
      })
      
      return {
        success: true,
        limit: this.uniqueTokenPerInterval,
        remaining: this.uniqueTokenPerInterval - 1,
        reset: now + this.interval
      }
    }

    if (current.count >= this.uniqueTokenPerInterval) {
      // Rate limit exceeded
      return {
        success: false,
        limit: this.uniqueTokenPerInterval,
        remaining: 0,
        reset: current.resetTime
      }
    }

    // Increment counter
    current.count++
    rateLimitStore.set(key, current)

    return {
      success: true,
      limit: this.uniqueTokenPerInterval,
      remaining: this.uniqueTokenPerInterval - current.count,
      reset: current.resetTime
    }
  }

  private getIdentifier(request: NextRequest): string {
    // Use IP address as identifier from headers (Vercel provides this)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded ? forwarded.split(',')[0] : realIp
    return ip || 'unknown'
  }

  private cleanup(windowStart: number) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime <= windowStart) {
        rateLimitStore.delete(key)
      }
    }
  }
}

// Pre-configured rate limiters
export const apiRateLimit = new RateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100, // 100 requests per minute
})

export const authRateLimit = new RateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 5, // 5 login attempts per 15 minutes
})

export const exportRateLimit = new RateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 10, // 10 exports per hour
})

// Middleware helper
export async function withRateLimit<T>(
  request: NextRequest,
  rateLimit: RateLimit,
  handler: () => Promise<T>
): Promise<T | Response> {
  const result = await rateLimit.check(request)
  
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString()
        }
      }
    )
  }

  return handler()
} 