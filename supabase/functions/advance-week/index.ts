import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IAdvanceWeekRequest {
  leagueId: string;
}

interface ITeamWithPoints {
  id: string;
  name: string;
  user_id: string;
  weekly_points: number;
  email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { leagueId }: IAdvanceWeekRequest = await req.json()

    if (!leagueId) {
      throw new Error('League ID is required')
    }

    console.log(`Starting week transition for league: ${leagueId}`)

    // Paso 1: Obtener la semana actual
    const { data: league, error: leagueError } = await supabaseClient
      .from('leagues')
      .select('current_week')
      .eq('id', leagueId)
      .single()

    if (leagueError) throw leagueError

    const currentWeek = league.current_week || 1
    const nextWeek = currentWeek + 1

    console.log(`Current week: ${currentWeek}, Next week: ${nextWeek}`)

    // Paso 2: Encontrar el equipo con menos puntos de la semana actual
    const { data: teams, error: teamsError } = await supabaseClient
      .from('fantasy_teams')
      .select(`
        id,
        name,
        user_id,
        weekly_points,
        users!inner(email)
      `)
      .eq('league_id', leagueId)
      .eq('eliminated', false)
      .order('weekly_points', { ascending: true })
      .limit(1)

    if (teamsError) throw teamsError

    if (!teams || teams.length === 0) {
      throw new Error('No active teams found')
    }

    const eliminatedTeam = teams[0] as any
    console.log(`Eliminating team: ${eliminatedTeam.name} with ${eliminatedTeam.weekly_points} points`)

    // Paso 3: Eliminar al equipo con menos puntos
    const { error: eliminateError } = await supabaseClient
      .from('fantasy_teams')
      .update({
        eliminated: true,
        eliminated_week: currentWeek,
        updated_at: new Date().toISOString()
      })
      .eq('id', eliminatedTeam.id)

    if (eliminateError) throw eliminateError

    // Paso 4: Crear la nueva semana
    const { error: weekInsertError } = await supabaseClient
      .from('weeks')
      .insert({
        league_id: leagueId,
        number: nextWeek,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })

    if (weekInsertError && !weekInsertError.message?.includes('duplicate')) {
      throw weekInsertError
    }

    // Paso 5: Actualizar current_week en la liga
    const { error: updateLeagueError } = await supabaseClient
      .from('leagues')
      .update({
        current_week: nextWeek,
        last_transition_at: new Date().toISOString()
      })
      .eq('id', leagueId)

    if (updateLeagueError) throw updateLeagueError

    // Paso 6: Copiar rosters de la semana anterior a la nueva
    const { data: previousRosters, error: rostersError } = await supabaseClient
      .from('team_rosters')
      .select(`
        fantasy_team_id,
        player_id,
        is_active,
        acquired_type,
        acquired_week,
        slot,
        fantasy_teams!inner(eliminated, league_id)
      `)
      .eq('week', currentWeek)

    if (rostersError) throw rostersError

    // Filtrar solo rosters de equipos no eliminados de esta liga
    const rostersToInsert = previousRosters
      .filter((r: any) =>
        !r.fantasy_teams.eliminated &&
        r.fantasy_teams.league_id === leagueId
      )
      .map((r: any) => ({
        fantasy_team_id: r.fantasy_team_id,
        player_id: r.player_id,
        week: nextWeek,
        is_active: r.is_active,
        acquired_type: r.acquired_type,
        acquired_week: r.acquired_week,
        slot: r.slot
      }))

    if (rostersToInsert.length > 0) {
      const { error: insertRostersError } = await supabaseClient
        .from('team_rosters')
        .insert(rostersToInsert)

      if (insertRostersError && !insertRostersError.message?.includes('duplicate')) {
        throw insertRostersError
      }
    }

    // Paso 7: Resetear weekly_points de todos los equipos vivos
    const { error: resetPointsError } = await supabaseClient
      .from('fantasy_teams')
      .update({
        weekly_points: 0,
        last_week_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('league_id', leagueId)
      .eq('eliminated', false)

    if (resetPointsError) throw resetPointsError

    // Paso 8: Marcar la semana anterior como completed
    const { error: completeWeekError } = await supabaseClient
      .from('weeks')
      .update({ status: 'completed' })
      .eq('league_id', leagueId)
      .eq('number', currentWeek)

    if (completeWeekError) throw completeWeekError

    console.log(`Week transition completed successfully`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Week transition completed successfully',
        eliminatedTeam: {
          name: eliminatedTeam.name,
          points: eliminatedTeam.weekly_points
        },
        currentWeek: nextWeek,
        rosterscopied: rostersToInsert.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in advance-week function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
