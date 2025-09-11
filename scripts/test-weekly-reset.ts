#!/usr/bin/env npx tsx

/**
 * Script to test the weekly points reset functionality
 * This simulates what would happen every Tuesday at 3 AM
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testWeeklyReset() {
  console.log('🔄 Testing Weekly Points Reset...\n');

  try {
    // 1. First, let's check current weekly points
    console.log('📊 Current Weekly Points:');
    const { data: beforeReset, error: beforeError } = await supabase
      .from('fantasy_teams')
      .select('id, name, weekly_points, points')
      .gt('weekly_points', 0)
      .limit(5);

    if (beforeError) {
      console.error('Error fetching teams:', beforeError);
      return;
    }

    if (beforeReset && beforeReset.length > 0) {
      console.table(beforeReset.map(t => ({
        Team: t.name,
        'Weekly Points': t.weekly_points,
        'Total Points': t.points
      })));
    } else {
      console.log('No teams with weekly points found');
    }

    // 2. Call the reset function
    console.log('\n🎯 Calling reset_weekly_points()...');
    const { data, error } = await supabase.rpc('reset_weekly_points');

    if (error) {
      console.error('❌ Error calling reset function:', error);
      return;
    }

    console.log('✅ Reset function called successfully');

    // 3. Check weekly points after reset
    console.log('\n📊 Weekly Points After Reset:');
    const { data: afterReset, error: afterError } = await supabase
      .from('fantasy_teams')
      .select('id, name, weekly_points, points, last_week_reset_at')
      .limit(5);

    if (afterError) {
      console.error('Error fetching teams after reset:', afterError);
      return;
    }

    if (afterReset && afterReset.length > 0) {
      console.table(afterReset.map(t => ({
        Team: t.name,
        'Weekly Points': t.weekly_points,
        'Total Points': t.points,
        'Last Reset': new Date(t.last_week_reset_at).toLocaleString()
      })));
    }

    // 4. Test calling the Edge Function
    console.log('\n🌐 Testing Edge Function...');
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/weekly-points-reset`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Edge Function Response:', result);
    } else {
      console.log('❌ Edge Function Error:', response.status, response.statusText);
    }

    console.log('\n✨ Weekly reset test completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testWeeklyReset();