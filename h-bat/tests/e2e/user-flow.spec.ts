import { test, expect } from '@playwright/test'

test.describe('User Flow - Complete H-BAT Test', () => {
  test.beforeEach(async ({ page }) => {
    // Enable audio context for tests
    await page.addInitScript(() => {
      // Mock audio context for tests
      window.AudioContext = window.AudioContext || class MockAudioContext {
        state = 'running'
        createOscillator() {
          return {
            connect: () => {},
            disconnect: () => {},
            start: () => {},
            stop: () => {},
            frequency: { value: 440 }
          }
        }
        createGain() {
          return {
            connect: () => {},
            disconnect: () => {},
            gain: { value: 1 }
          }
        }
        get destination() { return {} }
        resume() { return Promise.resolve() }
      }
    })
  })

  test('should complete full user journey from landing to results', async ({ page }) => {
    // Step 1: Landing page
    await page.goto('/')
    
    await expect(page.locator('h1')).toContainText('H-BAT')
    await expect(page.locator('text=リズム知覚テスト')).toBeVisible()
    
    // Accept consent and start test
    await page.click('button:has-text("テストを開始する")')
    
    // Step 2: User information form
    await expect(page.locator('h2')).toContainText('基本情報')
    
    await page.fill('input[name="age"]', '25')
    await page.selectOption('select[name="gender"]', 'male')
    await page.selectOption('select[name="handedness"]', 'right')
    await page.selectOption('select[name="musical_experience"]', 'beginner')
    
    await page.click('button:has-text("次へ")')
    
    // Step 3: Hearing threshold calibration
    await expect(page.locator('h2')).toContainText('聴力測定')
    
    // Simulate hearing threshold test for 1kHz
    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("再生")')
      await page.waitForTimeout(1000)
      
      // Alternate between "聞こえた" and "聞こえなかった" to simulate convergence
      const response = i % 3 === 0 ? '聞こえなかった' : '聞こえた'
      await page.click(`button:has-text("${response}")`)
      await page.waitForTimeout(500)
      
      // Check if we've moved to next frequency or completed
      const nextButton = page.locator('button:has-text("次の周波数")')
      const continueButton = page.locator('button:has-text("テストを続ける")')
      
      if (await nextButton.isVisible()) {
        await nextButton.click()
        break
      } else if (await continueButton.isVisible()) {
        await continueButton.click()
        break
      }
    }
    
    // Step 4: BST Test
    await expect(page.locator('h2')).toContainText('拍子判定テスト')
    
    for (let i = 0; i < 8; i++) {
      await page.click('button:has-text("再生")')
      await page.waitForTimeout(6000) // Wait for 6-second audio
      
      // Randomly choose between 2拍子 and 3拍子
      const response = i % 2 === 0 ? '2拍子' : '3拍子'
      await page.click(`button:has-text("${response}")`)
      await page.waitForTimeout(1000)
      
      // Check if test is complete
      const nextTestButton = page.locator('button:has-text("次のテスト")')
      if (await nextTestButton.isVisible()) {
        await nextTestButton.click()
        break
      }
    }
    
    // Step 5: BIT Test
    await expect(page.locator('h2')).toContainText('テンポ変化テスト')
    
    for (let i = 0; i < 8; i++) {
      await page.click('button:has-text("再生")')
      await page.waitForTimeout(8000) // Wait for 8-second audio
      
      // Randomly choose between accelerando and ritardando
      const response = i % 2 === 0 ? '速くなった' : '遅くなった'
      await page.click(`button:has-text("${response}")`)
      await page.waitForTimeout(1000)
      
      const nextTestButton = page.locator('button:has-text("次のテスト")')
      if (await nextTestButton.isVisible()) {
        await nextTestButton.click()
        break
      }
    }
    
    // Step 6: BFIT Test
    await expect(page.locator('h2')).toContainText('複雑リズムテスト')
    
    for (let i = 0; i < 8; i++) {
      await page.click('button:has-text("再生")')
      await page.waitForTimeout(10000) // Wait for complex rhythm
      
      // First judge beat finding
      await page.click('button:has-text("ビートを感じた")')
      await page.waitForTimeout(500)
      
      // Then judge tempo direction
      const response = i % 2 === 0 ? '速くなった' : '遅くなった'
      await page.click(`button:has-text("${response}")`)
      await page.waitForTimeout(1000)
      
      const resultsButton = page.locator('button:has-text("結果を見る")')
      if (await resultsButton.isVisible()) {
        await resultsButton.click()
        break
      }
    }
    
    // Step 7: Results page
    await expect(page.locator('h2')).toContainText('テスト結果')
    
    // Check that all test results are displayed
    await expect(page.locator('text=聴力レベル')).toBeVisible()
    await expect(page.locator('text=拍子認識')).toBeVisible()
    await expect(page.locator('text=テンポ感知')).toBeVisible()
    await expect(page.locator('text=複雑リズム')).toBeVisible()
    
    // Check that charts are rendered
    await expect(page.locator('[data-testid="results-chart"]')).toBeVisible()
    
    // Step 8: Thank you page
    await page.click('button:has-text("完了")')
    
    await expect(page.locator('h1')).toContainText('ありがとうございました')
    await expect(page.locator('text=テストが完了しました')).toBeVisible()
  })

  test('should handle test interruption and resume', async ({ page }) => {
    // Start test flow
    await page.goto('/')
    await page.click('button:has-text("テストを開始する")')
    
    // Fill user info
    await page.fill('input[name="age"]', '30')
    await page.selectOption('select[name="gender"]', 'female')
    await page.selectOption('select[name="handedness"]', 'right')
    await page.selectOption('select[name="musical_experience"]', 'intermediate')
    await page.click('button:has-text("次へ")')
    
    // Start hearing test but interrupt
    await expect(page.locator('h2')).toContainText('聴力測定')
    await page.click('button:has-text("再生")')
    
    // Simulate page refresh (interruption)
    await page.reload()
    
    // Should be able to resume from where left off
    await expect(page.locator('text=中断されたテストがあります')).toBeVisible()
    await page.click('button:has-text("続きから開始")')
    
    // Should be back in hearing test
    await expect(page.locator('h2')).toContainText('聴力測定')
  })

  test('should validate user input properly', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("テストを開始する")')
    
    // Try to proceed without filling required fields
    await page.click('button:has-text("次へ")')
    
    // Should show validation errors
    await expect(page.locator('text=年齢を入力してください')).toBeVisible()
    await expect(page.locator('text=性別を選択してください')).toBeVisible()
    
    // Fill invalid age
    await page.fill('input[name="age"]', '150')
    await page.click('button:has-text("次へ")')
    
    await expect(page.locator('text=有効な年齢を入力してください')).toBeVisible()
    
    // Fill valid data
    await page.fill('input[name="age"]', '25')
    await page.selectOption('select[name="gender"]', 'male')
    await page.selectOption('select[name="handedness"]', 'right')
    await page.selectOption('select[name="musical_experience"]', 'beginner')
    
    // Should be able to proceed
    await page.click('button:has-text("次へ")')
    await expect(page.locator('h2')).toContainText('聴力測定')
  })

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    // Check mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible()
    await expect(page.locator('button:has-text("テストを開始する")')).toBeVisible()
    
    // Mobile touch interactions
    await page.tap('button:has-text("テストを開始する")')
    
    // Check mobile form layout
    await expect(page.locator('form')).toHaveClass(/mobile/)
    
    // Test mobile audio controls
    await page.fill('input[name="age"]', '25')
    await page.selectOption('select[name="gender"]', 'male')
    await page.selectOption('select[name="handedness"]', 'right')
    await page.selectOption('select[name="musical_experience"]', 'beginner')
    await page.tap('button:has-text("次へ")')
    
    // Check mobile audio test interface
    await expect(page.locator('[data-testid="mobile-audio-controls"]')).toBeVisible()
  })
}) 