#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rwxyaofgjcrrneeqlyho.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3eHlhb2ZnamNycm5lZXFseWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MzA4MDUsImV4cCI6MjA1MDEwNjgwNX0.p-bvz_Cz0VJ7bQ3Y75E0YPE48PiKfvMQQ9oCTgJCjoU";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SPORTSDATA_API_KEY = 'f1826e4060774e56a6f56bae1d9eb76e';

async function syncMissingWeek2Stats() {
  console.log('🔍 Fetching Week 2 stats from SportsData API...');

  try {
    // Fetch Week 2 stats from SportsData
    const response = await fetch(
      `https://api.sportsdata.io/v3/nfl/stats/json/FantasyGameStatsByWeek/2025REG/2?key=${SPORTSDATA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const statsData = await response.json();
    console.log(`📊 Found ${statsData.length} player stats for Week 2`);

    // Get player mappings from database - need to get ALL players in batches
    const allPlayers: any[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    console.log('🔄 Fetching all players from database in batches...');

    while (hasMore) {
      const { data: batch, error: playersError } = await supabase
        .from('players')
        .select('id, sportsdata_id, name')
        .range(offset, offset + batchSize - 1);

      if (playersError) {
        console.error('❌ Error fetching players:', playersError);
        throw playersError;
      }

      if (batch && batch.length > 0) {
        allPlayers.push(...batch);
        console.log(`   📦 Batch ${Math.floor(offset / batchSize) + 1}: ${batch.length} players (total: ${allPlayers.length})`);

        if (batch.length < batchSize) {
          hasMore = false; // Less than full batch means we've reached the end
        } else {
          offset += batchSize;
        }
      } else {
        hasMore = false;
      }
    }

    const players = allPlayers;

    // Create mapping from sportsdata_id to database id
    const playerMap = new Map(
      players?.map(p => [p.sportsdata_id, { id: p.id, name: p.name }]) || []
    );

    // Check which players already have stats for Week 2
    const { data: existingStats } = await supabase
      .from('player_stats')
      .select('player_id')
      .eq('week', 2)
      .eq('season', 2025);

    const playersWithStats = new Set(existingStats?.map(s => s.player_id) || []);

    // Process stats and find missing ones
    const missingStats = [];
    const foundPlayers = [];

    for (const stat of statsData) {
      const playerInfo = playerMap.get(String(stat.PlayerID));

      if (playerInfo && !playersWithStats.has(playerInfo.id)) {
        // This player is missing stats
        missingStats.push({
          player_id: playerInfo.id,
          week: 2,
          season: 2025,
          fantasy_points: stat.FantasyPointsPPR || stat.FantasyPoints || 0,
          actual_points: stat.FantasyPointsPPR || stat.FantasyPoints || 0,
          passing_yards: stat.PassingYards || 0,
          passing_td: stat.PassingTouchdowns || 0,
          rushing_yards: stat.RushingYards || 0,
          rushing_td: stat.RushingTouchdowns || 0,
          receiving_yards: stat.ReceivingYards || 0,
          receiving_td: stat.ReceivingTouchdowns || 0,
          field_goals: stat.FieldGoalsMade || 0,
          is_final: true
        });

        foundPlayers.push({
          name: playerInfo.name,
          id: playerInfo.id,
          points: stat.FantasyPointsPPR || stat.FantasyPoints || 0
        });
      }
    }

    console.log(`\n🔎 Found ${missingStats.length} players missing Week 2 stats:`);
    foundPlayers.forEach(p => {
      console.log(`  - ${p.name} (ID: ${p.id}): ${p.points} points`);
    });

    if (missingStats.length > 0) {
      console.log('\n📝 Inserting missing stats...');

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < missingStats.length; i += batchSize) {
        const batch = missingStats.slice(i, i + batchSize);

        const { error: insertError } = await supabase
          .from('player_stats')
          .upsert(batch, {
            onConflict: 'player_id,week,season'
          });

        if (insertError) {
          console.error(`❌ Error inserting batch: ${insertError.message}`);
        } else {
          console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}`);
        }
      }

      console.log(`\n✅ Successfully synced ${missingStats.length} missing player stats for Week 2`);
    } else {
      console.log('\n✅ All players already have Week 2 stats!');
    }

    // Specifically check Tyler Warren
    const tylerWarren = foundPlayers.find(p => p.name?.includes('Tyler Warren'));
    if (tylerWarren) {
      console.log(`\n🎯 Tyler Warren was synced with ${tylerWarren.points} points`);
    } else {
      // Check if Tyler Warren already had stats
      const { data: tylerStats } = await supabase
        .from('player_stats')
        .select('*, players!inner(name)')
        .eq('player_id', 60458)
        .eq('week', 2)
        .eq('season', 2025)
        .single();

      if (tylerStats) {
        console.log(`\n✅ Tyler Warren already has ${tylerStats.fantasy_points} points for Week 2`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the sync
syncMissingWeek2Stats();