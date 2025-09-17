#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rwxyaofgjcrrneeqlyho.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3eHlhb2ZnamNycm5lZXFseWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MzA4MDUsImV4cCI6MjA1MDEwNjgwNX0.p-bvz_Cz0VJ7bQ3Y75E0YPE48PiKfvMQQ9oCTgJCjoU";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncWeek2Stats() {
  const week = 2;
  const season = 2025;

  try {
    // Fetch stats directly from SportsData API
    const response = await fetch(`https://api.sportsdata.io/v3/nfl/stats/json/FantasyGameStatsByWeek/${season}REG/${week}?key=f1826e4060774e56a6f56bae1d9eb76e`);

    if (!response.ok) {
      console.error('Error fetching stats:', response.status);
      return false;
    }

    const data = await response.json();

    if (!data || !Array.isArray(data)) {
      console.error('Invalid stats response');
      return false;
    }

    console.log(`Found ${data.length} stat records from SportsData`);

    // Get all players with sportsdata_id
    const { data: players } = await supabase
      .from('players')
      .select('id, sportsdata_id, name, position');

    if (!players) {
      console.error('No players found in database');
      return false;
    }

    console.log(`Found ${players.length} players in database`);

    // Create mapping from sportsdata_id to database id
    const playerMap = new Map(
      players.map(p => [p.sportsdata_id, { id: p.id, name: p.name, position: p.position }])
    );

    // Map stats to our database format
    const stats = data
      .map((stat: any) => {
        const playerInfo = playerMap.get(String(stat.PlayerID));
        if (!playerInfo) return null;

        return {
          player_id: playerInfo.id,
          week: week,
          season: season,
          fantasy_points: stat.FantasyPointsPPR || stat.FantasyPoints || 0,
          actual_points: stat.FantasyPointsPPR || stat.FantasyPoints || 0,
          passing_yards: stat.PassingYards || 0,
          passing_td: stat.PassingTouchdowns || 0,
          rushing_yards: stat.RushingYards || 0,
          rushing_td: stat.RushingTouchdowns || 0,
          receiving_yards: stat.ReceivingYards || 0,
          receiving_td: stat.ReceivingTouchdowns || 0,
          field_goals: stat.FieldGoalsMade || 0,
          tackles: stat.Tackles || 0,
          sacks: stat.Sacks || 0,
          interceptions: stat.Interceptions || 0,
          is_final: true
        };
      })
      .filter(s => s !== null);

    console.log(`Mapped ${stats.length} valid player stats`);

    // Show some key players being updated
    const keyPlayers = stats
      .filter(s => s.fantasy_points > 5)
      .sort((a, b) => b.fantasy_points - a.fantasy_points)
      .slice(0, 10);

    if (keyPlayers.length > 0) {
      console.log('🌟 Top scoring players being synced:');
      for (const stat of keyPlayers) {
        const playerInfo = Array.from(playerMap.values()).find(p => p.id === stat.player_id);
        console.log(`  - ${playerInfo?.name}: ${stat.fantasy_points} points`);
      }
    }

    // Insert stats in batches
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < stats.length; i += batchSize) {
      const batch = stats.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from('player_stats')
        .upsert(batch, {
          onConflict: 'player_id,week,season'
        });

      if (insertError) {
        console.error(`Error inserting stats batch ${i / batchSize + 1}:`, insertError);
      } else {
        totalInserted += batch.length;
        console.log(`✅ Inserted stats batch ${i / batchSize + 1} (${batch.length} records)`);
      }
    }

    console.log(`\n✅ Successfully synced ${totalInserted} stat records`);

    // Recalculate team points
    console.log('🔄 Recalculating team weekly points...');

    const { error: teamUpdateError } = await supabase.rpc('update_fantasy_team_points_improved');

    if (teamUpdateError) {
      console.error('❌ Error updating team points:', teamUpdateError);
    } else {
      console.log('✅ Team points updated successfully');
    }

    return true;
  } catch (err) {
    console.error('❌ Error in syncStats:', err);
    return false;
  }
}

// Run the sync
syncWeek2Stats();