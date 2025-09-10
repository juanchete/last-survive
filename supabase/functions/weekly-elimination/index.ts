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
      // Usar la nueva función SQL integrada
      const { data, error } = await supabase.rpc("process_all_leagues_tuesday_3am", {
        season_year: season
      });

      if (error) {
        console.error("❌ Error en función SQL:", error);
        throw new Error(`Error procesando martes 3 AM: ${error.message}`);
      }

      result = data as TuesdayProcessResult;
      console.log("🎉 Procesamiento martes 3 AM completado:", {
        eliminations: result.successful_eliminations,
        advancements: result.successful_advancements,
        total: result.total_processed
      });

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
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
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
