import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TuesdayProcessResult {
  success: boolean;
  message: string;
  timestamp: string;
  total_processed: number;
  successful_eliminations: number;
  successful_advancements: number;
  results: Array<{
    league_id: string;
    league_name: string;
    week_processed: number;
    result: {
      success: boolean;
      message: string;
      elimination?: any;
      advancement?: any;
      eliminated_team?: {
        id: string;
        name: string;
        points: number;
        userId: string;
      };
    };
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticación
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

    // Obtener parámetros de la request
    let requestData: any = {};
    if (req.method === "POST") {
      try {
        requestData = await req.json();
      } catch {
        requestData = {};
      }
    }

    const action = requestData.action || "tuesday_3am_process";
    const season = requestData.season || new Date().getFullYear();
    const leagueId = requestData.league_id;

    console.log(`🚀 Procesamiento automático iniciado:`, {
      action,
      season,
      leagueId: leagueId || "todas las ligas",
      timestamp: new Date().toISOString()
    });

    let result: TuesdayProcessResult;

    if (action === "tuesday_3am_process") {
      // 1. Final stats sync before elimination
      console.log("📊 Performing final stats sync before elimination...");
      try {
        // Get current week to sync
        const { data: currentWeekData } = await supabase
          .from('weeks')
          .select('number')
          .eq('status', 'active')
          .single();

        const currentWeek = currentWeekData?.number || 1;

        // Call our sync-weekly-stats Edge Function
        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-weekly-stats?week=${currentWeek}&season=${season}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            automated: true,
            trigger: 'pre-elimination',
            note: 'Final sync before Tuesday elimination process'
          })
        });

        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          console.log("✅ Final stats sync completed:", syncResult);
        } else {
          console.warn("⚠️ Final stats sync failed, continuing with elimination...");
        }
      } catch (syncError) {
        console.warn("⚠️ Final stats sync error:", syncError);
        // Continue with elimination even if sync fails
      }

      // 2. Wait a moment for any database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 2.5. Sync projections for current week BEFORE elimination
      console.log("📊 Syncing projections for current week BEFORE elimination...");
      try {
        const syncProjectionsResponse = await fetch(
          `${supabaseUrl}/functions/v1/sync-projections`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              season: season,
              seasonType: 'REG',
              automated: true,
              trigger: 'pre-elimination',
              note: 'Current week projections before elimination'
            })
          }
        );

        if (syncProjectionsResponse.ok) {
          const syncResult = await syncProjectionsResponse.json();
          console.log("✅ Current week projections synced:", syncResult);
        } else {
          console.warn("⚠️ Current week projections sync failed, continuing...");
        }
      } catch (syncError) {
        console.warn("⚠️ Projections sync error:", syncError);
        // Continue with elimination even if projections sync fails
      }

      // Wait for database operations to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Update weekly_points for all teams before elimination
      console.log("📊 Updating weekly_points for all teams...");
      try {
        // Get current week
        const { data: currentWeekData } = await supabase
          .from('weeks')
          .select('number')
          .eq('status', 'active')
          .single();

        const currentWeek = currentWeekData?.number || 1;

        // Update weekly_points for all active leagues
        const { data: updateResult, error: updateError } = await supabase.rpc(
          "update_all_leagues_weekly_points",
          {
            p_week: currentWeek,
            p_season: season
          }
        );

        if (updateError) {
          console.warn("⚠️ Error updating weekly_points:", updateError);
          console.warn("⚠️ Continuing with elimination using calculated points...");
        } else {
          console.log("✅ Weekly points updated for all leagues:", updateResult);
        }
      } catch (updateError) {
        console.warn("⚠️ Failed to update weekly_points:", updateError);
        console.warn("⚠️ Continuing with elimination...");
      }

      // 4. Proceed with elimination process
      console.log("🏈 Starting elimination process...");
      const { data, error } = await supabase.rpc("process_all_leagues_tuesday_3am", {
        season_year: season
      });

      if (error) {
        console.error("❌ Error en función SQL:", error);
        console.error("❌ Error details:", JSON.stringify(error, null, 2));
        throw new Error(`Error procesando martes 3 AM: ${error.message} | Code: ${error.code} | Details: ${error.details} | Hint: ${error.hint}`);
      }

      result = data as TuesdayProcessResult;
      console.log("🎉 Procesamiento martes 3 AM completado:", {
        eliminations: result.successful_eliminations,
        advancements: result.successful_advancements,
        total: result.total_processed
      });

      // 5. Sync projections for NEXT week after advancement
      console.log("📊 Syncing projections for NEXT week after advancement...");
      try {
        // Get NEW current week after advancement
        const { data: newWeekData } = await supabase
          .from('weeks')
          .select('number')
          .eq('status', 'active')
          .single();

        const newWeek = newWeekData?.number || 1;
        console.log(`📅 New active week after advancement: ${newWeek}`);

        const syncNextWeekResponse = await fetch(
          `${supabaseUrl}/functions/v1/sync-projections`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              season: season,
              seasonType: 'REG',
              automated: true,
              trigger: 'post-advancement',
              note: `Next week (${newWeek}) projections after advancement`
            })
          }
        );

        if (syncNextWeekResponse.ok) {
          const syncResult = await syncNextWeekResponse.json();
          console.log("✅ Next week projections synced:", syncResult);
        } else {
          console.warn("⚠️ Next week projections sync failed");
        }
      } catch (syncError) {
        console.warn("⚠️ Next week projections sync error:", syncError);
        // Don't fail the entire process if projections sync fails
      }

    } else if (action === "test_single_league" && leagueId) {
      // Testing para una liga específica
      const { data, error } = await supabase.rpc("simulate_tuesday_3am_process", {
        league_id: leagueId,
        season_year: season
      });

      if (error) {
        throw new Error(`Error en simulación: ${error.message}`);
      }

      result = {
        success: data.success,
        message: data.message,
        timestamp: new Date().toISOString(),
        total_processed: 1,
        successful_eliminations: data.elimination?.eliminated_team ? 1 : 0,
        successful_advancements: data.advancement?.success ? 1 : 0,
        results: [{
          league_id: leagueId,
          league_name: "Test League",
          week_processed: data.elimination?.week || 1,
          result: data
        }]
      };

    } else {
      throw new Error(`Acción no válida: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("💥 Error crítico en weekly-elimination:", error);

    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    const errorStack = error instanceof Error ? error.stack : undefined;

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ============================================
// FUNCIONES DE UTILIDAD Y COMPATIBILIDAD
// ============================================

// Obtener semana actual de la NFL (simplificado)
function getCurrentNFLWeek(): number {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 1); // Septiembre 1

  // Si estamos antes del inicio de temporada, retornar semana 1
  if (now < seasonStart) {
    return 1;
  }

  // Calcular semana basada en días desde inicio de temporada
  const daysDiff = Math.floor(
    (now.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const week = Math.floor(daysDiff / 7) + 1;

  // Limitar a semanas válidas (1-18)
  return Math.min(Math.max(week, 1), 18);
}
