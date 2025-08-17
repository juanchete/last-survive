import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutoDraftResult {
  success: boolean;
  processed_leagues: number;
  drafted_count: number;
  duration_ms: number;
  timestamp: string;
  details?: any[];
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autorización
    const authHeader = req.headers.get('authorization')
    const cronSecret = Deno.env.get('CRON_SECRET') // Configurar en Supabase Dashboard
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Solo permitir service role key o cron secret
    const isAuthorized = 
      authHeader === `Bearer ${serviceRoleKey}` ||
      (cronSecret && authHeader === `Bearer ${cronSecret}`)
    
    if (!isAuthorized) {
      console.error('[Auto-Draft] Unauthorized access attempt')
      throw new Error('Unauthorized')
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = serviceRoleKey
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    console.log('[Auto-Draft] Iniciando verificación de drafts expirados...')
    const startTime = Date.now()

    // Call the execute_auto_draft function
    const { data, error } = await supabase.rpc('execute_auto_draft')
    
    if (error) {
      console.error('[Auto-Draft] Error ejecutando función:', error)
      throw error
    }

    const result = data as AutoDraftResult
    const executionTime = Date.now() - startTime
    
    console.log(`[Auto-Draft] Completado en ${executionTime}ms:`, {
      processed_leagues: result.processed_leagues,
      drafted_count: result.drafted_count,
      duration_ms: result.duration_ms
    })
    
    // Si hay drafts activos, notificar via Realtime
    if (result.drafted_count > 0 && result.details) {
      console.log(`[Auto-Draft] Enviando ${result.details.length} notificaciones realtime...`)
      
      for (const draft of result.details) {
        try {
          // Enviar notificación al canal del draft
          const channel = supabase.channel(`draft-${draft.league_id}`)
          
          await channel.send({
            type: 'broadcast',
            event: 'draft-message',
            payload: {
              type: 'auto_draft_executed',
              teamId: draft.team_id,
              playerId: draft.player_id,
              playerName: draft.player_name,
              position: draft.position,
              slot: draft.slot,
              pickNumber: draft.pick_number,
              round: draft.round,
              timestamp: new Date().toISOString()
            }
          })
          
          // Limpiar el canal
          await supabase.removeChannel(channel)
          
        } catch (broadcastError) {
          console.error(`[Auto-Draft] Error enviando broadcast para liga ${draft.league_id}:`, broadcastError)
          // No fallar toda la operación por un error de broadcast
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Auto-draft completado: ${result.drafted_count} picks procesados en ${result.processed_leagues} ligas`,
        data: {
          processed_leagues: result.processed_leagues,
          drafted_count: result.drafted_count,
          duration_ms: result.duration_ms,
          execution_time_ms: executionTime,
          timestamp: result.timestamp,
          has_details: result.details ? result.details.length > 0 : false
        }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Autodraft-Count': String(result.drafted_count),
          'X-Execution-Time': String(executionTime)
        } 
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const statusCode = errorMessage === 'Unauthorized' ? 401 : 500
    
    console.error('[Auto-Draft] Error crítico:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    // Intentar registrar el error en la base de datos
    try {
      if (statusCode !== 401) { // No registrar errores de auth
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const errorClient = createClient(supabaseUrl, supabaseServiceKey)
        
        await errorClient.from('autodraft_logs').insert({
          processed_leagues: 0,
          drafted_count: 0,
          error: errorMessage,
          result: { success: false, error: errorMessage }
        })
      }
    } catch (logError) {
      console.error('[Auto-Draft] No se pudo registrar el error en logs:', logError)
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Error': 'true'
        } 
      }
    )
  }
})