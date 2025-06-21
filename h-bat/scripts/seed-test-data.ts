#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface TestProfile {
  id: string
  age: number
  gender: 'male' | 'female' | 'other'
  handedness: 'right' | 'left' | 'both'
}

interface TestSession {
  id: string
  profile_id: string
  completed_at?: string | null
}

async function clearExistingData() {
  console.log('🧹 Clearing existing test data...')
  
  // Delete in reverse order due to foreign key constraints
  await supabase.from('thresholds').delete().neq('session_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('bfit_trials').delete().neq('session_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('bit_trials').delete().neq('session_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('bst_trials').delete().neq('session_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('hearing_thresholds').delete().neq('session_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('hearing_trials').delete().neq('session_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  console.log('✅ Existing data cleared')
}

async function seedProfiles(): Promise<TestProfile[]> {
  console.log('👥 Seeding profiles...')
  
  const profiles: Omit<TestProfile, 'id'>[] = [
    { age: 25, gender: 'male', handedness: 'right' },
    { age: 32, gender: 'female', handedness: 'right' },
    { age: 28, gender: 'male', handedness: 'left' },
    { age: 45, gender: 'female', handedness: 'right' },
    { age: 19, gender: 'other', handedness: 'both' },
    { age: 38, gender: 'male', handedness: 'right' },
    { age: 29, gender: 'female', handedness: 'left' },
    { age: 52, gender: 'male', handedness: 'right' },
    { age: 23, gender: 'female', handedness: 'right' },
    { age: 41, gender: 'male', handedness: 'right' }
  ]
  
  const { data, error } = await supabase
    .from('profiles')
    .insert(profiles)
    .select()
  
  if (error) {
    throw new Error(`Failed to seed profiles: ${error.message}`)
  }
  
  console.log(`✅ Created ${data.length} profiles`)
  return data as TestProfile[]
}

async function seedSessions(profiles: TestProfile[]): Promise<TestSession[]> {
  console.log('📋 Seeding sessions...')
  
  const sessions: Omit<TestSession, 'id'>[] = []
  
  // Create 2-3 sessions per profile
  profiles.forEach((profile, index) => {
    const sessionCount = Math.floor(Math.random() * 2) + 2 // 2-3 sessions
    
    for (let i = 0; i < sessionCount; i++) {
      const isCompleted = Math.random() > 0.3 // 70% completion rate
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30)) // Last 30 days
      
      sessions.push({
        profile_id: profile.id,
        completed_at: isCompleted ? new Date(startDate.getTime() + Math.random() * 3600000).toISOString() : null
      })
    }
  })
  
  const { data, error } = await supabase
    .from('sessions')
    .insert(sessions)
    .select()
  
  if (error) {
    throw new Error(`Failed to seed sessions: ${error.message}`)
  }
  
  console.log(`✅ Created ${data.length} sessions`)
  return data as TestSession[]
}

async function seedHearingData(sessions: TestSession[]) {
  console.log('🔊 Seeding hearing test data...')
  
  // Only seed completed sessions
  const completedSessions = sessions.filter(s => s.completed_at)
  
  for (const session of completedSessions) {
    const frequencies = [1000, 2000, 4000]
    
    for (const frequency of frequencies) {
      // Generate realistic hearing trials
      const trials = []
      let currentLevel = 40 // Start at 40dB
      let reversals = 0
      const targetReversals = 6
      let goingUp = false
      
      for (let idx = 0; idx < 30 && reversals < targetReversals; idx++) {
        // Simulate hearing threshold around 20-30dB
        const actualThreshold = 20 + Math.random() * 10
        const isCorrect = currentLevel > actualThreshold
        
        trials.push({
          session_id: session.id,
          frequency,
          idx,
          db_level: currentLevel,
          correct: isCorrect
        })
        
        // Staircase logic
        const previousDirection: boolean = goingUp
        if (isCorrect) {
          currentLevel -= (reversals < 2) ? 8 : (reversals < 4) ? 4 : 2
          goingUp = false
        } else {
          currentLevel += (reversals < 2) ? 8 : (reversals < 4) ? 4 : 2
          goingUp = true
        }
        
        // Count reversals
        if (idx > 0 && previousDirection !== goingUp) {
          reversals++
        }
        
        // Keep within bounds
        currentLevel = Math.max(0, Math.min(80, currentLevel))
      }
      
      // Insert trials
      const { error: trialsError } = await supabase
        .from('hearing_trials')
        .insert(trials)
      
      if (trialsError) {
        console.error(`Failed to insert hearing trials: ${trialsError.message}`)
        continue
      }
      
      // Calculate and insert threshold
      const lastTrials = trials.slice(-6) // Last 6 reversals
      const threshold = lastTrials.reduce((sum, trial) => sum + trial.db_level, 0) / lastTrials.length
      
      const { error: thresholdError } = await supabase
        .from('hearing_thresholds')
        .insert({
          session_id: session.id,
          frequency,
          threshold_db: threshold
        })
      
      if (thresholdError) {
        console.error(`Failed to insert hearing threshold: ${thresholdError.message}`)
      }
    }
  }
  
  console.log(`✅ Created hearing data for ${completedSessions.length} sessions`)
}

async function seedBSTData(sessions: TestSession[]) {
  console.log('🥁 Seeding BST test data...')
  
  const completedSessions = sessions.filter(s => s.completed_at)
  
  for (const session of completedSessions) {
    const trials = []
    let currentDelta = 20 // Start at 20dB difference
    let reversals = 0
    const targetReversals = 6
    let goingDown = true
    
    for (let idx = 0; idx < 40 && reversals < targetReversals; idx++) {
      const patternType = Math.random() > 0.5 ? 2 : 3 // Random 2 or 3 beat
      
      // Simulate BST threshold around 8-15dB
      const actualThreshold = 8 + Math.random() * 7
      const isCorrect = currentDelta > actualThreshold
      
      trials.push({
        session_id: session.id,
        idx,
        delta_db: currentDelta,
        pattern_type: patternType,
        correct: isCorrect
      })
      
      // Staircase logic
      const previousDirection: boolean = goingDown
      if (isCorrect) {
        currentDelta *= 0.7 // Decrease by 30%
        goingDown = true
      } else {
        currentDelta *= 1.4 // Increase by 40%
        goingDown = false
      }
      
      // Count reversals
      if (idx > 0 && previousDirection !== goingDown) {
        reversals++
      }
      
      // Keep within bounds
      currentDelta = Math.max(1, Math.min(40, currentDelta))
    }
    
    // Insert trials
    const { error: trialsError } = await supabase
      .from('bst_trials')
      .insert(trials)
    
    if (trialsError) {
      console.error(`Failed to insert BST trials: ${trialsError.message}`)
      continue
    }
  }
  
  console.log(`✅ Created BST data for ${completedSessions.length} sessions`)
}

async function seedBITData(sessions: TestSession[]) {
  console.log('⏱️ Seeding BIT test data...')
  
  const completedSessions = sessions.filter(s => s.completed_at)
  
  for (const session of completedSessions) {
    const trials = []
    let currentSlope = 5 // Start at 5ms/beat
    let reversals = 0
    const targetReversals = 6
    let goingDown = true
    
    for (let idx = 0; idx < 40 && reversals < targetReversals; idx++) {
      const slopeSign = Math.random() > 0.5 ? 1 : -1 // Random accelerando/ritardando
      
      // Simulate BIT threshold around 2-4ms/beat
      const actualThreshold = 2 + Math.random() * 2
      const isCorrect = currentSlope > actualThreshold
      
      trials.push({
        session_id: session.id,
        idx,
        slope_ms_per_beat: currentSlope,
        slope_sign: slopeSign,
        correct: isCorrect
      })
      
      // Staircase logic
      const previousDirection: boolean = goingDown
      if (isCorrect) {
        currentSlope *= 0.7 // Decrease by 30%
        goingDown = true
      } else {
        currentSlope *= 1.4 // Increase by 40%
        goingDown = false
      }
      
      // Count reversals
      if (idx > 0 && previousDirection !== goingDown) {
        reversals++
      }
      
      // Keep within bounds
      currentSlope = Math.max(0.5, Math.min(20, currentSlope))
    }
    
    // Insert trials
    const { error: trialsError } = await supabase
      .from('bit_trials')
      .insert(trials)
    
    if (trialsError) {
      console.error(`Failed to insert BIT trials: ${trialsError.message}`)
      continue
    }
  }
  
  console.log(`✅ Created BIT data for ${completedSessions.length} sessions`)
}

async function seedBFITData(sessions: TestSession[]) {
  console.log('🎼 Seeding BFIT test data...')
  
  const completedSessions = sessions.filter(s => s.completed_at)
  const patterns = ['pattern_a', 'pattern_b', 'pattern_c']
  
  for (const session of completedSessions) {
    const trials = []
    let currentSlope = 8 // Start at 8ms/beat (harder than BIT)
    let reversals = 0
    const targetReversals = 6
    let goingDown = true
    
    for (let idx = 0; idx < 40 && reversals < targetReversals; idx++) {
      const patternId = patterns[Math.floor(Math.random() * patterns.length)]
      const slopeSign = Math.random() > 0.5 ? 1 : -1
      
      // Simulate BFIT threshold around 4-8ms/beat (harder than BIT)
      const actualThreshold = 4 + Math.random() * 4
      const isCorrect = currentSlope > actualThreshold
      
      trials.push({
        session_id: session.id,
        idx,
        pattern_id: patternId,
        slope_ms_per_beat: currentSlope,
        slope_sign: slopeSign,
        correct: isCorrect
      })
      
      // Staircase logic
      const previousDirection: boolean = goingDown
      if (isCorrect) {
        currentSlope *= 0.7 // Decrease by 30%
        goingDown = true
      } else {
        currentSlope *= 1.4 // Increase by 40%
        goingDown = false
      }
      
      // Count reversals
      if (idx > 0 && previousDirection !== goingDown) {
        reversals++
      }
      
      // Keep within bounds
      currentSlope = Math.max(1, Math.min(30, currentSlope))
    }
    
    // Insert trials
    const { error: trialsError } = await supabase
      .from('bfit_trials')
      .insert(trials)
    
    if (trialsError) {
      console.error(`Failed to insert BFIT trials: ${trialsError.message}`)
      continue
    }
  }
  
  console.log(`✅ Created BFIT data for ${completedSessions.length} sessions`)
}

async function seedThresholds(sessions: TestSession[]) {
  console.log('📊 Calculating and seeding final thresholds...')
  
  const completedSessions = sessions.filter(s => s.completed_at)
  
  for (const session of completedSessions) {
    // Calculate BST threshold from last 6 reversals
    const { data: bstTrials } = await supabase
      .from('bst_trials')
      .select('delta_db')
      .eq('session_id', session.id)
      .order('idx', { ascending: false })
      .limit(6)
    
    // Calculate BIT threshold from last 6 reversals
    const { data: bitTrials } = await supabase
      .from('bit_trials')
      .select('slope_ms_per_beat')
      .eq('session_id', session.id)
      .order('idx', { ascending: false })
      .limit(6)
    
    // Calculate BFIT threshold from last 6 reversals
    const { data: bfitTrials } = await supabase
      .from('bfit_trials')
      .select('slope_ms_per_beat')
      .eq('session_id', session.id)
      .order('idx', { ascending: false })
      .limit(6)
    
    const bstThreshold = bstTrials && bstTrials.length > 0 
      ? bstTrials.reduce((sum, trial) => sum + trial.delta_db, 0) / bstTrials.length 
      : null
    
    const bitThreshold = bitTrials && bitTrials.length > 0 
      ? bitTrials.reduce((sum, trial) => sum + trial.slope_ms_per_beat, 0) / bitTrials.length 
      : null
    
    const bfitThreshold = bfitTrials && bfitTrials.length > 0 
      ? bfitTrials.reduce((sum, trial) => sum + trial.slope_ms_per_beat, 0) / bfitTrials.length 
      : null
    
    // Insert threshold summary
    const { error } = await supabase
      .from('thresholds')
      .insert({
        session_id: session.id,
        bst_threshold_db: bstThreshold,
        bit_threshold_ms: bitThreshold,
        bfit_threshold_ms: bfitThreshold
      })
    
    if (error) {
      console.error(`Failed to insert thresholds: ${error.message}`)
    }
  }
  
  console.log(`✅ Created thresholds for ${completedSessions.length} sessions`)
}

async function main() {
  try {
    console.log('🌱 Starting H-BAT test data seeding...')
    console.log('Database URL:', supabaseUrl)
    console.log('')
    
    // Clear existing data
    await clearExistingData()
    
    // Seed data in order
    const profiles = await seedProfiles()
    const sessions = await seedSessions(profiles)
    
    await seedHearingData(sessions)
    await seedBSTData(sessions)
    await seedBITData(sessions)
    await seedBFITData(sessions)
    await seedThresholds(sessions)
    
    console.log('')
    console.log('🎉 Test data seeding completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`   - Profiles: ${profiles.length}`)
    console.log(`   - Sessions: ${sessions.length}`)
    console.log(`   - Completed: ${sessions.filter(s => s.completed_at).length}`)
    console.log('')
    console.log('🔗 View data at: https://supabase.com/dashboard/project/' + process.env.SUPABASE_PROJECT_ID)
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run the seeding script
main() 