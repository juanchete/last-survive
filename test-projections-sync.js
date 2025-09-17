#!/usr/bin/env node

/**
 * Test script para sincronizar proyecciones de la semana 3
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tvzktsamnoiyjbayimvh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2emt0c2Ftbm9peWpiYXlpbXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTc2MzYsImV4cCI6MjA2MjMzMzYzNn0.Gcf1g2hLfUIFwO80mSxi34gbmCyZpu5L6qpH9ZCmqq0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProjectionsSync() {
  console.log('🔄 Testing projections sync for Week 3...')

  try {
    // Test the edge function directly
    console.log('📡 Calling Edge Function for projections...')

    const { data, error } = await supabase.functions.invoke('sportsdata-proxy', {
      body: {
        endpoint: '/projections',
        season: '2025',
        week: '3'
      }
    })

    if (error) {
      console.error('❌ Edge Function Error:', error)
      return
    }

    console.log('✅ Edge Function Success!')
    console.log(`📊 Received ${data?.length || 0} projections`)

    // Test a few specific players
    const testPlayers = ['Bucky Irving', 'Dylan Sampson', 'Tyler Warren', 'C.J. Stroud']

    testPlayers.forEach(playerName => {
      const player = data?.find(p => p.Name && p.Name.toLowerCase().includes(playerName.toLowerCase()))
      if (player) {
        console.log(`✅ ${playerName}: ${player.FantasyPoints} points`)
      } else {
        console.log(`❌ ${playerName}: Not found in projections`)
      }
    })

    console.log('\n🗄️ Now testing database sync...')

    // Import and test the dailyProjectionsSync
    const { dailyProjectionsSync } = await import('./src/lib/daily-projections-sync.js')

    const result = await dailyProjectionsSync.updateProjectionsForWeek(2025, 3, 'regular')

    console.log('📝 Sync Result:', result)

    if (result.success) {
      console.log(`✅ Successfully synced ${result.updatedPlayers} players!`)

      // Verify specific players
      console.log('\n🔍 Verifying database updates...')

      for (const playerName of ['Bucky Irving', 'Dylan Sampson', 'Tyler Warren']) {
        const { data: playerData } = await supabase
          .from('players')
          .select('id, name')
          .ilike('name', `%${playerName}%`)
          .single()

        if (playerData) {
          const { data: statsData } = await supabase
            .from('player_stats')
            .select('projected_points, is_projection_updated')
            .eq('player_id', playerData.id)
            .eq('week', 3)
            .eq('season', 2025)
            .single()

          if (statsData) {
            console.log(`✅ ${playerName}: ${statsData.projected_points} points (updated: ${statsData.is_projection_updated})`)
          } else {
            console.log(`❌ ${playerName}: No stats found in database`)
          }
        } else {
          console.log(`❌ ${playerName}: Player not found in database`)
        }
      }
    } else {
      console.error('❌ Sync failed:', result.message)
    }

  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

testProjectionsSync()