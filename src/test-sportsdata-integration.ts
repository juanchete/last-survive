/**
 * Test file for SportsData.io integration
 * Run this in the browser console to test the provider
 */

import { sportsDataProvider } from './lib/providers/SportsDataProvider';
import { providerManager } from './lib/providers/ProviderManager';

export async function testSportsDataIntegration() {
  console.log('🧪 Testing SportsData.io Integration...\n');
  
  const results = {
    healthCheck: { success: false, data: null as any, error: null as any },
    nflState: { success: false, data: null as any, error: null as any },
    players: { success: false, data: null as any, error: null as any },
    stats: { success: false, data: null as any, error: null as any },
    projections: { success: false, data: null as any, error: null as any },
  };

  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...');
  try {
    const health = await sportsDataProvider.healthCheck();
    results.healthCheck.success = health.healthy;
    results.healthCheck.data = health;
    console.log('✅ Health Check:', health.healthy ? 'PASSED' : 'FAILED', health);
  } catch (error) {
    results.healthCheck.error = error;
    console.error('❌ Health Check Error:', error);
  }

  // Test 2: Get NFL State
  console.log('\n2️⃣ Testing NFL State...');
  try {
    const state = await sportsDataProvider.getNFLState();
    results.nflState.success = !state.error;
    results.nflState.data = state.data;
    results.nflState.error = state.error;
    console.log(state.error ? '❌' : '✅', 'NFL State:', state.data || state.error);
  } catch (error) {
    results.nflState.error = error;
    console.error('❌ NFL State Error:', error);
  }

  // Test 3: Get Players (limited sample)
  console.log('\n3️⃣ Testing Players Endpoint...');
  try {
    const players = await sportsDataProvider.getAllPlayers();
    results.players.success = !players.error;
    if (players.data) {
      const playerCount = Object.keys(players.data).length;
      const samplePlayers = Object.values(players.data).slice(0, 3);
      results.players.data = { count: playerCount, sample: samplePlayers };
      console.log('✅ Players Fetched:', playerCount, 'players');
      console.log('Sample:', samplePlayers);
    } else {
      results.players.error = players.error;
      console.error('❌ Players Error:', players.error);
    }
  } catch (error) {
    results.players.error = error;
    console.error('❌ Players Error:', error);
  }

  // Test 4: Get Weekly Stats (current week)
  console.log('\n4️⃣ Testing Weekly Stats...');
  try {
    const currentYear = new Date().getFullYear();
    const stats = await sportsDataProvider.getWeeklyStats(currentYear, 1, 'regular');
    results.stats.success = !stats.error;
    if (stats.data) {
      const statsCount = Object.keys(stats.data).length;
      const sampleStats = Object.values(stats.data).slice(0, 3);
      results.stats.data = { count: statsCount, sample: sampleStats };
      console.log('✅ Stats Fetched:', statsCount, 'player stats');
      console.log('Sample:', sampleStats);
    } else {
      results.stats.error = stats.error;
      console.error('❌ Stats Error:', stats.error);
    }
  } catch (error) {
    results.stats.error = error;
    console.error('❌ Stats Error:', error);
  }

  // Test 5: Get Weekly Projections
  console.log('\n5️⃣ Testing Weekly Projections...');
  try {
    const currentYear = new Date().getFullYear();
    const projections = await sportsDataProvider.getWeeklyProjections(currentYear, 1, 'regular');
    results.projections.success = !projections.error;
    if (projections.data) {
      const projCount = Object.keys(projections.data).length;
      const sampleProj = Object.values(projections.data).slice(0, 3);
      results.projections.data = { count: projCount, sample: sampleProj };
      console.log('✅ Projections Fetched:', projCount, 'player projections');
      console.log('Sample:', sampleProj);
    } else {
      results.projections.error = projections.error;
      console.error('❌ Projections Error:', projections.error);
    }
  } catch (error) {
    results.projections.error = error;
    console.error('❌ Projections Error:', error);
  }

  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('================');
  const allTests = Object.entries(results);
  const passedTests = allTests.filter(([_, result]) => result.success);
  
  allTests.forEach(([name, result]) => {
    console.log(`${result.success ? '✅' : '❌'} ${name}: ${result.success ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log(`\n🎯 Overall: ${passedTests.length}/${allTests.length} tests passed`);
  
  // Test Provider Manager
  console.log('\n6️⃣ Testing Provider Manager...');
  try {
    // Switch to SportsData
    providerManager.switchProvider('sportsdata');
    console.log('✅ Switched to SportsData provider');
    
    // Test provider manager health
    const managerHealth = await providerManager.healthCheck();
    console.log('Provider Manager Health:', managerHealth);
    
    // Get provider stats
    const providerStats = await providerManager.getProviderStats();
    console.log('Provider Stats:', providerStats);
  } catch (error) {
    console.error('❌ Provider Manager Error:', error);
  }
  
  return results;
}

// Make it available globally for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testSportsData = testSportsDataIntegration;
  console.log('💡 Run `testSportsData()` in the console to test SportsData.io integration');
}