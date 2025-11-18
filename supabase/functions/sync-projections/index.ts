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

    // 3. Get all players from database for mapping
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, stats_id, sportsdata_id, name, position');

    if (playersError) {
      console.error("❌ Error fetching players:", playersError);
      throw playersError;
    }

    console.log(`📊 Found ${players?.length || 0} players in database`);

    // 4. Create mapping by SportsData ID, Stats ID, and Name
    const sportsDataIdMap = new Map(
      players?.map(p => [p.sportsdata_id, p]).filter(([k]) => k) || []
    );
    const statsIdMap = new Map(
      players?.map(p => [p.stats_id, p]).filter(([k]) => k) || []
    );
    const nameMap = new Map(
      players?.map(p => [p.name?.toLowerCase(), p]).filter(([k]) => k) || []
    );

    // 5. Process projections and prepare updates
    const projectionsToUpdate: any[] = [];
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const projection of apiData) {
      // Try to find player by PlayerID (SportsData ID) first, then StatsID, then name
      const playerKey = projection.PlayerID?.toString();
      const statsKey = projection.StatsID?.toString();
      const playerName = projection.Name?.toLowerCase();

      let player = sportsDataIdMap.get(playerKey) ||
                   statsIdMap.get(statsKey) ||
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

    // 6. Batch update projections in database
    if (projectionsToUpdate.length > 0) {
      const chunkSize = 500;

      for (let i = 0; i < projectionsToUpdate.length; i += chunkSize) {
        const chunk = projectionsToUpdate.slice(i, i + chunkSize);

        const { error } = await supabase
          .from('player_stats')
          .upsert(chunk, {
            onConflict: 'player_id,week,season'
          });

        if (error) {
          console.error(`❌ Error updating projections batch ${i + 1}-${i + chunk.length}:`, error);
          throw error;
        }

        console.log(`✅ Updated projections batch ${i + 1}-${Math.min(i + chunk.length, projectionsToUpdate.length)}`);
      }
    }

    const result = {
      success: true,
      message: `Successfully synced projections for ${updatedCount} players (Week ${currentWeek}, Season ${season})`,
      updatedPlayers: updatedCount,
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
