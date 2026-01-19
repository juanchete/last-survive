import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");
    const sportsDataApiKey = Deno.env.get("SPORTSDATA_API_KEY") || "f1826e4060774e56a6f56bae1d9eb76e";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    const isAuthorized =
      (authHeader === `Bearer ${supabaseServiceKey}`) ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get parameters from request
    let requestData: any = {};
    if (req.method === "POST") {
      try {
        requestData = await req.json();
      } catch {
        requestData = {};
      }
    }

    const season = requestData.season || new Date().getFullYear();
    const seasonType = requestData.seasonType || "REG";

    console.log(`🔄 Starting projections sync:`, {
      season,
      seasonType,
      timestamp: new Date().toISOString()
    });

    // 1. Get current week from database
    const { data: currentWeekData, error: weekError } = await supabase
      .from('weeks')
      .select('number')
      .eq('status', 'active')
      .single();

    if (weekError) {
      console.error("❌ Error getting current week:", weekError);
      throw new Error(`Error getting current week: ${weekError.message}`);
    }

    const currentWeek = currentWeekData?.number || 1;
    console.log(`📅 Current week: ${currentWeek}`);

    // 2. Fetch projections from SportsData API
    const apiUrl = `https://api.sportsdata.io/v3/nfl/projections/json/PlayerGameProjectionStatsByWeek/${season}${seasonType}/${currentWeek}?key=${sportsDataApiKey}`;
    console.log(`🔄 Fetching projections from SportsData API...`);

    const apiResponse = await fetch(apiUrl);
    if (!apiResponse.ok) {
      throw new Error(`SportsData API error: ${apiResponse.statusText}`);
    }

    const apiData = await apiResponse.json();
    console.log(`📊 Received ${apiData.length} player projections`);

    // 3. Get all players from database for mapping (with batching to handle 1800+ players)
    const allPlayers: any[] = [];
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    console.log('🔄 Fetching all players from database in batches...');

    while (hasMore) {
      const { data: batch, error: playersError } = await supabase
        .from('players')
        .select('id, stats_id, sportsdata_id, name, position')
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
    console.log(`📊 Total players loaded: ${players.length}`);

    // 4. Create mapping by SportsData ID (string AND number), Stats ID, and Name
    // This ensures we match regardless of type inconsistencies between API and DB
    const sportsDataIdMap = new Map();
    players?.forEach(p => {
      if (p.sportsdata_id) {
        sportsDataIdMap.set(String(p.sportsdata_id), p); // String version
        sportsDataIdMap.set(parseInt(p.sportsdata_id), p); // Number version
      }
    });

    const statsIdMap = new Map(
      players?.map(p => [p.stats_id, p]).filter(([k]) => k) || []
    );

    const nameMap = new Map(
      players?.map(p => [p.name?.toLowerCase(), p]).filter(([k]) => k) || []
    );

    console.log(`🗺️ Created mappings: ${sportsDataIdMap.size / 2} SportsData IDs, ${statsIdMap.size} Stats IDs, ${nameMap.size} Names`);

    // 5. Process projections and prepare updates
    const projectionsToUpdate: any[] = [];
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const projection of apiData) {
      // Try to find player by PlayerID (SportsData ID) first, then StatsID, then name
      // Use multiple strategies to maximize match rate
      const playerKey = projection.PlayerID;
      const statsKey = projection.StatsID;
      const playerName = projection.Name?.toLowerCase();

      let player = sportsDataIdMap.get(playerKey) ||  // Try as-is (number)
                   sportsDataIdMap.get(String(playerKey)) ||  // Try as string
                   sportsDataIdMap.get(parseInt(playerKey)) ||  // Try as parsed number
                   statsIdMap.get(statsKey) ||
                   statsIdMap.get(String(statsKey)) ||
                   (playerName ? nameMap.get(playerName) : null);

      if (player) {
        // Calculate fantasy points (PPR scoring)
        const fantasyPoints = projection.FantasyPointsPPR || projection.FantasyPoints || 0;

        projectionsToUpdate.push({
          player_id: player.id,
          week: currentWeek,
          season: season,

          // Projected points and stats
          projected_points: Number(fantasyPoints) || 0,
          projected_passing_yards: Math.round(Number(projection.PassingYards) || 0),
          projected_passing_td: Math.round(Number(projection.PassingTouchdowns) || 0),
          projected_rushing_yards: Math.round(Number(projection.RushingYards) || 0),
          projected_rushing_td: Math.round(Number(projection.RushingTouchdowns) || 0),
          projected_receiving_yards: Math.round(Number(projection.ReceivingYards) || 0),
          projected_receiving_td: Math.round(Number(projection.ReceivingTouchdowns) || 0),
          projected_receptions: Math.round(Number(projection.Receptions) || 0),

          // Opponent (CRITICAL: prevents "BYE" display)
          opponent: projection.Opponent || null,

          // Mark as updated
          is_projection_updated: true,
          projection_last_updated: new Date().toISOString()
        });

        updatedCount++;
      } else {
        notFoundCount++;
      }
    }

    console.log(`📈 Prepared ${projectionsToUpdate.length} projection updates (${notFoundCount} players not found)`);

    // 6. Robust batch update projections in database with fallback strategy
    let successCount = 0;
    let errorCount = 0;

    if (projectionsToUpdate.length > 0) {
      const chunkSize = 100; // Reduced from 500 to 100 for better reliability

      for (let i = 0; i < projectionsToUpdate.length; i += chunkSize) {
        const chunk = projectionsToUpdate.slice(i, i + chunkSize);
        const batchNum = Math.floor(i / chunkSize) + 1;

        try {
          const { error: upsertError } = await supabase
            .from('player_stats')
            .upsert(chunk, {
              onConflict: 'player_id,week,season',
              ignoreDuplicates: false
            });

          if (upsertError) {
            // If batch upsert fails, try individual delete + insert
            console.warn(`⚠️ Batch ${batchNum} upsert failed, trying individual operations...`);

            for (const projection of chunk) {
              try {
                // First delete existing record
                await supabase
                  .from('player_stats')
                  .delete()
                  .eq('player_id', projection.player_id)
                  .eq('week', projection.week)
                  .eq('season', projection.season);

                // Then insert new record
                const { error: insertError } = await supabase
                  .from('player_stats')
                  .insert(projection);

                if (insertError) {
                  console.error(`❌ Failed to insert projection for player ${projection.player_id}:`, insertError);
                  errorCount++;
                } else {
                  successCount++;
                }
              } catch (individualError) {
                console.error(`❌ Individual operation failed for player ${projection.player_id}:`, individualError);
                errorCount++;
              }
            }
          } else {
            successCount += chunk.length;
            console.log(`✅ Batch ${batchNum}: Updated ${chunk.length} projections (${successCount}/${projectionsToUpdate.length} total)`);
          }
        } catch (batchError) {
          console.error(`❌ Batch ${batchNum} error:`, batchError);
          errorCount += chunk.length;
        }

        // Pause between batches to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Projections sync complete: ${successCount} success, ${errorCount} errors`);
    }

    const result = {
      success: true,
      message: `Successfully synced projections for ${successCount} players (${errorCount} errors, ${notFoundCount} not found) - Week ${currentWeek}, Season ${season}`,
      updatedPlayers: successCount,
      errorPlayers: errorCount,
      notFoundPlayers: notFoundCount,
      week: currentWeek,
      season: season,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Projections sync completed:', result.message);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("💥 Error in sync-projections:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
