import { test, expect, devices } from '@playwright/test'

const browsers = [
  'chromium',
  'firefox', 
  'webkit'
]

const mobileDevices = [
  'iPhone 12',
  'Pixel 5',
  'iPad Pro'
]

browsers.forEach(browserName => {
  test.describe(`${browserName} - Cross Browser Compatibility`, () => {
    test.use({ 
      ...browserName === 'chromium' ? devices['Desktop Chrome'] : 
        browserName === 'firefox' ? devices['Desktop Firefox'] :
        devices['Desktop Safari']
    })

    test('should load homepage correctly', async ({ page }) => {
      await page.goto('/')
      
      // Basic page load
      await expect(page.locator('h1')).toContainText('H-BAT')
      await expect(page.locator('button:has-text("テストを開始する")')).toBeVisible()
      
      // Check CSS rendering
      const button = page.locator('button:has-text("テストを開始する")')
      const buttonStyles = await button.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          backgroundColor: styles.backgroundColor,
          borderRadius: styles.borderRadius,
          padding: styles.padding
        }
      })
      
      expect(buttonStyles.backgroundColor).toBeTruthy()
      expect(buttonStyles.borderRadius).toBeTruthy()
    })

    test('should handle audio context initialization', async ({ page }) => {
      // Add audio context detection
      await page.addInitScript(() => {
        window.audioContextSupported = !!(window.AudioContext || window.webkitAudioContext)
        window.webAudioSupported = !!(window.AudioContext || window.webkitAudioContext)
      })
      
      await page.goto('/')
      
      const audioSupport = await page.evaluate(() => ({
        audioContext: window.audioContextSupported,
        webAudio: window.webAudioSupported
      }))
      
      expect(audioSupport.audioContext || audioSupport.webAudio).toBe(true)
      
      // Test audio context creation
      const contextCreated = await page.evaluate(() => {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext
          const ctx = new AudioCtx()
          return ctx.state !== undefined
        } catch (e) {
          return false
        }
      })
      
      expect(contextCreated).toBe(true)
    })

    test('should support required JavaScript features', async ({ page }) => {
      await page.goto('/')
      
      const featureSupport = await page.evaluate(() => {
        return {
          async: typeof async function() {} === 'function',
          arrow: (() => true)(),
          destructuring: (() => {
            try {
              const [a] = [1]
              return a === 1
            } catch (e) {
              return false
            }
          })(),
          promises: typeof Promise !== 'undefined',
          fetch: typeof fetch !== 'undefined',
          localStorage: typeof localStorage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined'
        }
      })
      
      expect(featureSupport.async).toBe(true)
      expect(featureSupport.arrow).toBe(true)
      expect(featureSupport.destructuring).toBe(true)
      expect(featureSupport.promises).toBe(true)
      expect(featureSupport.fetch).toBe(true)
      expect(featureSupport.localStorage).toBe(true)
      expect(featureSupport.sessionStorage).toBe(true)
    })

    test('should handle form interactions correctly', async ({ page }) => {
      await page.goto('/')
      await page.click('button:has-text("テストを開始する")')
      
      // Test form elements
      await page.fill('input[name="age"]', '25')
      await page.selectOption('select[name="gender"]', 'male')
      await page.selectOption('select[name="handedness"]', 'right')
      await page.selectOption('select[name="musical_experience"]', 'beginner')
      
      // Verify values are set correctly
      expect(await page.inputValue('input[name="age"]')).toBe('25')
      expect(await page.inputValue('select[name="gender"]')).toBe('male')
      expect(await page.inputValue('select[name="handedness"]')).toBe('right')
      expect(await page.inputValue('select[name="musical_experience"]')).toBe('beginner')
      
      // Test form submission
      await page.click('button:has-text("次へ")')
      await expect(page.locator('h2')).toContainText('聴力測定')
    })

    test('should render responsive design correctly', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto('/')
      
      const desktopLayout = await page.locator('body').evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          maxWidth: styles.maxWidth,
          padding: styles.padding
        }
      })
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      
      const tabletLayout = await page.locator('body').evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          maxWidth: styles.maxWidth,
          padding: styles.padding
        }
      })
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      
      const mobileLayout = await page.locator('body').evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          maxWidth: styles.maxWidth,
          padding: styles.padding
        }
      })
      
      // Layouts should be different across breakpoints
      expect(desktopLayout).not.toEqual(tabletLayout)
      expect(tabletLayout).not.toEqual(mobileLayout)
    })

    test('should handle CSS animations and transitions', async ({ page }) => {
      await page.goto('/')
      
      // Test button hover animations
      const button = page.locator('button:has-text("テストを開始する")')
      
      // Get initial styles
      const initialStyles = await button.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          transform: styles.transform,
          transition: styles.transition
        }
      })
      
      // Hover over button
      await button.hover()
      
      // Check if hover styles are applied
      const hoverStyles = await button.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          transform: styles.transform,
          transition: styles.transition
        }
      })
      
      expect(hoverStyles.transition).toBeTruthy()
    })

    test('should support Web Audio API features', async ({ page }) => {
      await page.goto('/')
      
      const audioFeatures = await page.evaluate(() => {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (!AudioCtx) return { supported: false }
        
        try {
          const ctx = new AudioCtx()
          return {
            supported: true,
            oscillator: typeof ctx.createOscillator === 'function',
            gain: typeof ctx.createGain === 'function',
            analyser: typeof ctx.createAnalyser === 'function',
            destination: !!ctx.destination,
            sampleRate: ctx.sampleRate,
            state: ctx.state
          }
        } catch (e) {
          return { supported: false, error: e.message }
        }
      })
      
      expect(audioFeatures.supported).toBe(true)
      expect(audioFeatures.oscillator).toBe(true)
      expect(audioFeatures.gain).toBe(true)
      expect(audioFeatures.analyser).toBe(true)
      expect(audioFeatures.destination).toBe(true)
      expect(audioFeatures.sampleRate).toBeGreaterThan(0)
    })
  })
})

mobileDevices.forEach(deviceName => {
  test.describe(`${deviceName} - Mobile Device Compatibility`, () => {
    test.use({ ...devices[deviceName] })

    test('should display mobile-optimized layout', async ({ page }) => {
      await page.goto('/')
      
      // Check mobile-specific elements
      const isMobile = await page.evaluate(() => window.innerWidth < 768)
      expect(isMobile).toBe(true)
      
      // Check touch-friendly button sizes
      const button = page.locator('button:has-text("テストを開始する")')
      const buttonBox = await button.boundingBox()
      
      expect(buttonBox?.height).toBeGreaterThan(44) // Minimum touch target size
      expect(buttonBox?.width).toBeGreaterThan(44)
    })

    test('should handle touch interactions', async ({ page }) => {
      await page.goto('/')
      
      // Test tap interaction
      await page.tap('button:has-text("テストを開始する")')
      
      // Should navigate to form
      await expect(page.locator('h2')).toContainText('基本情報')
      
      // Test form interactions with touch
      await page.tap('input[name="age"]')
      await page.fill('input[name="age"]', '25')
      
      // Test select dropdown on mobile
      await page.tap('select[name="gender"]')
      await page.selectOption('select[name="gender"]', 'male')
      
      expect(await page.inputValue('select[name="gender"]')).toBe('male')
    })

    test('should support mobile audio playback', async ({ page }) => {
      // Mobile devices often have stricter audio policies
      await page.addInitScript(() => {
        // Mock user gesture for audio
        let userGestureOccurred = false
        document.addEventListener('touchstart', () => {
          userGestureOccurred = true
        })
        
        window.hasUserGesture = () => userGestureOccurred
      })
      
      await page.goto('/')
      await page.tap('button:has-text("テストを開始する")')
      
      // Fill form and proceed to audio test
      await page.fill('input[name="age"]', '25')
      await page.selectOption('select[name="gender"]', 'male')
      await page.selectOption('select[name="handedness"]', 'right')
      await page.selectOption('select[name="musical_experience"]', 'beginner')
      await page.tap('button:has-text("次へ")')
      
      // Should reach audio test page
      await expect(page.locator('h2')).toContainText('聴力測定')
      
      // Audio play button should be enabled after user gesture
      const playButton = page.locator('button:has-text("再生")')
      await expect(playButton).toBeEnabled()
    })

    test('should handle mobile viewport and orientation', async ({ page }) => {
      await page.goto('/')
      
      // Test portrait mode
      const portraitDimensions = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
        orientation: window.innerWidth < window.innerHeight ? 'portrait' : 'landscape'
      }))
      
      expect(portraitDimensions.orientation).toBe('portrait')
      
      // Test landscape mode (simulate rotation)
      await page.setViewportSize({ 
        width: portraitDimensions.height, 
        height: portraitDimensions.width 
      })
      
      const landscapeDimensions = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      }))
      
      expect(landscapeDimensions.orientation).toBe('landscape')
      
      // Layout should adapt to orientation
      expect(landscapeDimensions.width).toBeGreaterThan(landscapeDimensions.height)
    })

    test('should handle mobile-specific performance constraints', async ({ page }) => {
      await page.goto('/')
      
      // Test page load performance on mobile
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0
        }
      })
      
      // Mobile performance should be reasonable
      expect(performanceMetrics.domContentLoaded).toBeLessThan(3000) // 3 seconds
      expect(performanceMetrics.loadComplete).toBeLessThan(5000) // 5 seconds
      expect(performanceMetrics.firstPaint).toBeLessThan(2000) // 2 seconds
    })
  })
})

test.describe('Cross-Browser Feature Compatibility', () => {
  test('should detect and handle browser-specific audio implementations', async ({ page }) => {
    await page.goto('/')
    
    const browserAudioSupport = await page.evaluate(() => {
      const userAgent = navigator.userAgent
      const isChrome = userAgent.includes('Chrome')
      const isFirefox = userAgent.includes('Firefox')
      const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome')
      
      const audioContextClass = window.AudioContext || window.webkitAudioContext
      const hasWebAudio = !!audioContextClass
      
      let audioLatency = 'unknown'
      if (hasWebAudio) {
        try {
          const ctx = new audioContextClass()
          audioLatency = ctx.baseLatency || 'not-available'
        } catch (e) {
          audioLatency = 'error'
        }
      }
      
      return {
        browser: isChrome ? 'chrome' : isFirefox ? 'firefox' : isSafari ? 'safari' : 'unknown',
        webAudio: hasWebAudio,
        audioLatency,
        userAgent: userAgent.substring(0, 50) // Truncated for test output
      }
    })
    
    expect(browserAudioSupport.webAudio).toBe(true)
    expect(['chrome', 'firefox', 'safari']).toContain(browserAudioSupport.browser)
  })

  test('should handle different autoplay policies', async ({ page }) => {
    await page.goto('/')
    
    const autoplaySupport = await page.evaluate(() => {
      return new Promise((resolve) => {
        const audio = new Audio()
        audio.muted = true
        
        const playPromise = audio.play()
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => resolve({ autoplay: true, requiresGesture: false }))
            .catch(() => resolve({ autoplay: false, requiresGesture: true }))
        } else {
          resolve({ autoplay: 'unknown', requiresGesture: true })
        }
      })
    })
    
    // Should handle both autoplay-enabled and gesture-required scenarios
    expect(typeof autoplaySupport).toBe('object')
    expect(autoplaySupport).toHaveProperty('requiresGesture')
  })

  test('should work with different CSS support levels', async ({ page }) => {
    await page.goto('/')
    
    const cssSupport = await page.evaluate(() => {
      const testDiv = document.createElement('div')
      document.body.appendChild(testDiv)
      
      const support = {
        flexbox: CSS.supports('display', 'flex'),
        grid: CSS.supports('display', 'grid'),
        customProperties: CSS.supports('--custom-property', 'value'),
        transforms: CSS.supports('transform', 'translateX(10px)'),
        transitions: CSS.supports('transition', 'all 0.3s ease')
      }
      
      document.body.removeChild(testDiv)
      return support
    })
    
    // Modern browsers should support these features
    expect(cssSupport.flexbox).toBe(true)
    expect(cssSupport.transforms).toBe(true)
    expect(cssSupport.transitions).toBe(true)
  })
}) 