'use client'

import { useEffect } from 'react'
import { getCurrentConfig } from '@/config/environment'

interface PerformanceMetrics {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

export function PerformanceMonitor() {
  useEffect(() => {
    const config = getCurrentConfig()
    
    if (!config.ENABLE_DEVTOOLS && typeof window === 'undefined') {
      return
    }

    // Web Vitals monitoring
    const observeWebVitals = () => {
      // Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const metric: PerformanceMetrics = {
            name: entry.name,
            value: entry.startTime,
            rating: 'good'
          }

          // Log performance metrics
          if (config.LOG_LEVEL === 'debug') {
            console.log('Performance metric:', metric)
          }

          // Send to analytics (if configured)
          if (process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID) {
            // Vercel Analytics integration
            window.va?.('event', 'performance', {
              metric: metric.name,
              value: metric.value,
              rating: metric.rating
            })
          }
        })
      })

      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] })

      // Cleanup
      return () => observer.disconnect()
    }

    // Memory monitoring
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        
        const memoryInfo = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        }

        if (config.LOG_LEVEL === 'debug') {
          console.log('Memory usage:', memoryInfo)
        }

        // Warn if memory usage is high
        if (memoryInfo.usagePercentage > 80) {
          console.warn('High memory usage detected:', memoryInfo.usagePercentage.toFixed(2) + '%')
        }
      }
    }

    // Audio performance monitoring
    const monitorAudioPerformance = () => {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const audioContext = new AudioContext()
        
        const audioMetrics = {
          sampleRate: audioContext.sampleRate,
          baseLatency: audioContext.baseLatency,
          outputLatency: audioContext.outputLatency,
          state: audioContext.state
        }

        if (config.LOG_LEVEL === 'debug') {
          console.log('Audio performance:', audioMetrics)
        }

        audioContext.close()
      }
    }

    // Bundle size monitoring
    const monitorBundleSize = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        
        const jsResources = resources.filter(resource => 
          resource.name.includes('.js') && 
          resource.name.includes('/_next/')
        )

        const totalJSSize = jsResources.reduce((total, resource) => {
          return total + (resource.transferSize || 0)
        }, 0)

        if (config.LOG_LEVEL === 'debug') {
          console.log('Bundle size metrics:', {
            totalJSSize: `${(totalJSSize / 1024).toFixed(2)} KB`,
            resourceCount: jsResources.length,
            resources: jsResources.map(r => ({
              name: r.name.split('/').pop(),
              size: `${((r.transferSize || 0) / 1024).toFixed(2)} KB`
            }))
          })
        }
      }
    }

    // Initialize monitoring
    const cleanup = observeWebVitals()
    monitorMemory()
    monitorAudioPerformance()
    monitorBundleSize()

    // Periodic monitoring
    const interval = setInterval(() => {
      monitorMemory()
    }, 30000) // Every 30 seconds

    return () => {
      cleanup?.()
      clearInterval(interval)
    }
  }, [])

  // Don't render anything in production
  return null
}

// Performance timing utilities
export const measurePerformance = (name: string, fn: () => void | Promise<void>) => {
  const start = performance.now()
  
  const result = fn()
  
  if (result instanceof Promise) {
    return result.then(() => {
      const end = performance.now()
      console.log(`${name} took ${end - start} milliseconds`)
    })
  } else {
    const end = performance.now()
    console.log(`${name} took ${end - start} milliseconds`)
  }
}

// Bundle size analyzer helper
export const analyzeBundleSize = () => {
  if (typeof window === 'undefined') return

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  
  const analysis = {
    total: 0,
    javascript: 0,
    css: 0,
    images: 0,
    other: 0,
    resources: [] as Array<{
      name: string
      type: string
      size: number
      compressed: number
    }>
  }

  resources.forEach(resource => {
    const size = resource.transferSize || 0
    const decodedSize = resource.decodedBodySize || 0
    const url = new URL(resource.name)
    const filename = url.pathname.split('/').pop() || ''
    
    analysis.total += size
    
    if (filename.endsWith('.js')) {
      analysis.javascript += size
    } else if (filename.endsWith('.css')) {
      analysis.css += size
    } else if (/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(filename)) {
      analysis.images += size
    } else {
      analysis.other += size
    }

    analysis.resources.push({
      name: filename,
      type: filename.split('.').pop() || 'unknown',
      size: decodedSize,
      compressed: size
    })
  })

  return analysis
} 