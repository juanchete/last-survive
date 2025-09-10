#!/usr/bin/env tsx

/**
 * Daily Projections Update Script
 * 
 * This script should be run daily at 6 AM to update player projections
 * Can be scheduled using cron, GitHub Actions, or any task scheduler
 * 
 * Usage:
 * - npm run update-projections (current week)
 * - npm run update-projections -- --week=3 --season=2024 (specific week)
 * - npm run update-projections -- --status (check status only)
 */

import { dailyProjectionsSync } from '../lib/daily-projections-sync';

interface ScriptArgs {
  week?: number;
  season?: number;
  status?: boolean;
  help?: boolean;
}

function parseArgs(): ScriptArgs {
  const args = process.argv.slice(2);
  const parsed: ScriptArgs = {};
  
  args.forEach(arg => {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--status') {
      parsed.status = true;
    } else if (arg.startsWith('--week=')) {
      parsed.week = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--season=')) {
      parsed.season = parseInt(arg.split('=')[1]);
    }
  });
  
  return parsed;
}

function showHelp() {
  console.log(`
🏈 Daily Projections Update Script

Usage:
  npm run update-projections                    Update projections for current week
  npm run update-projections -- --status       Check projection status
  npm run update-projections -- --week=3       Update projections for specific week
  npm run update-projections -- --season=2024  Update for specific season
  npm run update-projections -- --help         Show this help

Examples:
  npm run update-projections -- --week=5 --season=2024
  npm run update-projections -- --status

Scheduling:
  # Run daily at 6 AM
  0 6 * * * cd /path/to/project && npm run update-projections

Environment Variables:
  SUPABASE_URL      - Your Supabase project URL
  SUPABASE_ANON_KEY - Your Supabase anonymous key
  
`);
}

async function checkStatus(week?: number, season?: number) {
  console.log('📊 Checking projection status...\n');
  
  try {
    const status = await dailyProjectionsSync.getProjectionStatus(week, season);
    
    console.log('Projection Status:');
    console.log('==================');
    console.log(`Week: ${week || 'Current'}`);
    console.log(`Season: ${season || 'Current'}`);
    console.log(`Total Players: ${status.totalPlayers}`);
    console.log(`Players with Projections: ${status.playersWithProjections}`);
    console.log(`Update Percentage: ${status.updatePercentage}%`);
    console.log(`Last Updated: ${status.lastUpdated ? new Date(status.lastUpdated).toLocaleString() : 'Never'}`);
    
    if (status.updatePercentage < 50) {
      console.log('\n⚠️  Warning: Less than 50% of players have updated projections');
      console.log('   Consider running the update script');
    } else if (status.updatePercentage === 100) {
      console.log('\n✅ All players have updated projections!');
    } else {
      console.log(`\n📈 ${status.updatePercentage}% of players have updated projections`);
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error);
    process.exit(1);
  }
}

async function updateProjections(week?: number, season?: number) {
  const startTime = Date.now();
  
  console.log('🔄 Starting daily projections update...');
  console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);
  
  try {
    let result;
    
    if (week && season) {
      console.log(`📅 Updating projections for Season ${season}, Week ${week}`);
      result = await dailyProjectionsSync.updateProjectionsForWeek(season, week);
    } else {
      console.log('📅 Updating projections for current week');
      result = await dailyProjectionsSync.updateCurrentWeekProjections();
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (result.success) {
      console.log('\n✅ Update completed successfully!');
      console.log('=================================');
      console.log(`Message: ${result.message}`);
      console.log(`Players Updated: ${result.updatedPlayers}`);
      if (result.week && result.season) {
        console.log(`Week: ${result.week}`);
        console.log(`Season: ${result.season}`);
      }
      console.log(`Duration: ${duration}s`);
      console.log(`Completed at: ${new Date().toLocaleString()}`);
    } else {
      console.log('\n❌ Update failed!');
      console.log('==================');
      console.log(`Error: ${result.message}`);
      console.log(`Duration: ${duration}s`);
      process.exit(1);
    }
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n💥 Unexpected error during update!');
    console.log('===================================');
    console.error('Error:', error);
    console.log(`Duration: ${duration}s`);
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs();
  
  // Handle help
  if (args.help) {
    showHelp();
    return;
  }
  
  // Validate environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    console.error('\n   Add them to your .env file or environment');
    process.exit(1);
  }
  
  console.log('🏈 NFL Fantasy Projections Update');
  console.log('==================================\n');
  
  try {
    // Handle status check
    if (args.status) {
      await checkStatus(args.week, args.season);
      return;
    }
    
    // Handle projection updates
    await updateProjections(args.week, args.season);
    
    // Show final status
    console.log('\n📊 Final Status:');
    console.log('================');
    await checkStatus(args.week, args.season);
    
  } catch (error) {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  }
}

// Handle script termination gracefully
process.on('SIGINT', () => {
  console.log('\n⏹️  Script interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Script terminated');
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}