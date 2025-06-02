-- ============================================
-- SISTEMA DE ELIMINACIÓN AUTOMÁTICA SEMANAL
-- ============================================
-- Esta migración establece el sistema automático de eliminación de equipos cada semana

-- 1. Función para calcular puntajes de un equipo
CREATE OR REPLACE FUNCTION calculate_team_weekly_score(
  team_id UUID,
  week_num INTEGER,
  season_year INTEGER DEFAULT 2024
) RETURNS NUMERIC AS $$
DECLARE
  total_points NUMERIC DEFAULT 0;
BEGIN
  SELECT COALESCE(SUM(ps.fantasy_points), 0)
  INTO total_points
  FROM team_rosters tr
  JOIN player_stats ps ON tr.player_id = ps.player_id
  WHERE tr.fantasy_team_id = team_id
    AND tr.week = week_num
    AND tr.is_active = true
    AND ps.week = week_num
    AND ps.season = season_year;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para obtener equipo con menor puntaje de una liga
CREATE OR REPLACE FUNCTION get_lowest_scoring_team(
  league_id UUID,
  week_num INTEGER,
  season_year INTEGER DEFAULT 2024
) RETURNS TABLE(team_id UUID, team_name TEXT, user_id UUID, total_points NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.id,
    ft.name,
    ft.user_id,
    calculate_team_weekly_score(ft.id, week_num, season_year) as points
  FROM fantasy_teams ft
  WHERE ft.league_id = get_lowest_scoring_team.league_id
    AND ft.eliminated = false
  ORDER BY points ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Función principal para procesar eliminación semanal
CREATE OR REPLACE FUNCTION process_weekly_elimination(
  league_id UUID,
  week_num INTEGER,
  season_year INTEGER DEFAULT 2024
) RETURNS JSON AS $$
DECLARE
  lowest_team RECORD;
  active_teams_count INTEGER;
  result JSON;
BEGIN
  -- Verificar si ya se procesó esta semana
  SELECT COUNT(*) INTO active_teams_count
  FROM fantasy_teams
  WHERE fantasy_teams.league_id = process_weekly_elimination.league_id
    AND eliminated = true
    AND eliminated_week = week_num;
  
  IF active_teams_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Ya se procesó eliminación para esta semana'
    );
  END IF;

  -- Contar equipos activos
  SELECT COUNT(*) INTO active_teams_count
  FROM fantasy_teams
  WHERE fantasy_teams.league_id = process_weekly_elimination.league_id
    AND eliminated = false;

  -- Verificar si hay suficientes equipos
  IF active_teams_count <= 1 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No hay suficientes equipos activos para eliminar'
    );
  END IF;

  -- Obtener equipo con menor puntaje
  SELECT * INTO lowest_team
  FROM get_lowest_scoring_team(league_id, week_num, season_year);

  IF lowest_team IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No se pudo determinar el equipo a eliminar'
    );
  END IF;

  -- Marcar equipo como eliminado
  UPDATE fantasy_teams
  SET eliminated = true,
      eliminated_week = week_num
  WHERE id = lowest_team.team_id;

  -- Liberar jugadores al waiver pool
  UPDATE team_rosters
  SET is_active = false
  WHERE fantasy_team_id = lowest_team.team_id
    AND week = week_num;

  -- Registrar movimientos
  INSERT INTO roster_moves (fantasy_team_id, player_id, week, action, acquired_type)
  SELECT 
    tr.fantasy_team_id,
    tr.player_id,
    week_num,
    'eliminated_release',
    'elimination'
  FROM team_rosters tr
  WHERE tr.fantasy_team_id = lowest_team.team_id
    AND tr.week = week_num;

  -- Crear notificación
  INSERT INTO notifications (user_id, league_id, message, type)
  VALUES (
    lowest_team.user_id,
    league_id,
    format('Tu equipo "%s" ha sido eliminado en la semana %s con %s puntos. Tus jugadores han sido liberados al waiver pool.',
           lowest_team.team_name, week_num, lowest_team.total_points),
    'warning'
  );

  -- Retornar resultado exitoso
  RETURN json_build_object(
    'success', true,
    'message', format('Equipo %s eliminado con %s puntos', lowest_team.team_name, lowest_team.total_points),
    'eliminated_team', json_build_object(
      'id', lowest_team.team_id,
      'name', lowest_team.team_name,
      'points', lowest_team.total_points,
      'user_id', lowest_team.user_id
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Error procesando eliminación: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Función para procesar todas las ligas activas
CREATE OR REPLACE FUNCTION process_all_weekly_eliminations(
  week_num INTEGER,
  season_year INTEGER DEFAULT 2024
) RETURNS JSON AS $$
DECLARE
  league_record RECORD;
  elimination_result JSON;
  total_processed INTEGER DEFAULT 0;
  successful_eliminations INTEGER DEFAULT 0;
  results JSON[] DEFAULT '{}';
BEGIN
  -- Procesar cada liga activa
  FOR league_record IN 
    SELECT id, name FROM leagues WHERE status = 'active'
  LOOP
    total_processed := total_processed + 1;
    
    -- Procesar eliminación para esta liga
    SELECT process_weekly_elimination(league_record.id, week_num, season_year)
    INTO elimination_result;
    
    -- Agregar resultado al array
    results := array_append(results, json_build_object(
      'league_id', league_record.id,
      'league_name', league_record.name,
      'result', elimination_result
    ));
    
    -- Contar eliminaciones exitosas
    IF (elimination_result->>'success')::boolean AND elimination_result ? 'eliminated_team' THEN
      successful_eliminations := successful_eliminations + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'message', format('Procesadas %s ligas, %s eliminaciones exitosas', total_processed, successful_eliminations),
    'total_processed', total_processed,
    'successful_eliminations', successful_eliminations,
    'week', week_num,
    'season', season_year,
    'results', array_to_json(results)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Error en procesamiento masivo: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Función para obtener la semana actual de la NFL
CREATE OR REPLACE FUNCTION get_current_nfl_week() RETURNS INTEGER AS $$
DECLARE
  current_date DATE DEFAULT CURRENT_DATE;
  season_start DATE;
  days_diff INTEGER;
  week_num INTEGER;
BEGIN
  -- Calcular inicio de temporada (primer martes de septiembre)
  season_start := date_trunc('year', current_date) + interval '8 months' + interval '1 day';
  
  -- Si estamos antes del inicio de temporada
  IF current_date < season_start THEN
    RETURN 1;
  END IF;
  
  -- Calcular semana basada en días transcurridos
  days_diff := current_date - season_start;
  week_num := (days_diff / 7) + 1;
  
  -- Limitar a semanas válidas (1-18)
  RETURN GREATEST(1, LEAST(week_num, 18));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CONFIGURACIÓN DE AUTOMATIZACIÓN
-- ============================================
-- NOTA: La configuración de cron jobs depende de la extensión pg_cron
-- que debe estar habilitada en tu instancia de Supabase

-- Si tienes pg_cron habilitado, puedes usar:
-- SELECT cron.schedule('weekly-eliminations', '0 10 * * 1', 'SELECT process_all_weekly_eliminations(get_current_nfl_week());');

-- Alternativamente, puedes llamar manualmente desde tu aplicación:
-- SELECT process_all_weekly_eliminations(get_current_nfl_week());

-- ============================================
-- FUNCIONES DE UTILIDAD PARA TESTING
-- ============================================

-- Función para simular eliminación para testing
CREATE OR REPLACE FUNCTION simulate_elimination_for_testing(
  league_id UUID,
  week_num INTEGER DEFAULT 1,
  season_year INTEGER DEFAULT 2024
) RETURNS JSON AS $$
BEGIN
  RETURN process_weekly_elimination(league_id, week_num, season_year);
END;
$$ LANGUAGE plpgsql;

-- Función para resetear eliminaciones de una liga (solo para testing)
CREATE OR REPLACE FUNCTION reset_league_eliminations(league_id UUID) RETURNS JSON AS $$
BEGIN
  -- Reactivar equipos eliminados
  UPDATE fantasy_teams
  SET eliminated = false,
      eliminated_week = NULL
  WHERE fantasy_teams.league_id = reset_league_eliminations.league_id
    AND eliminated = true;
  
  -- Reactivar jugadores
  UPDATE team_rosters
  SET is_active = true
  WHERE fantasy_team_id IN (
    SELECT id FROM fantasy_teams 
    WHERE fantasy_teams.league_id = reset_league_eliminations.league_id
  );
  
  -- Eliminar notificaciones de eliminación
  DELETE FROM notifications
  WHERE notifications.league_id = reset_league_eliminations.league_id
    AND type = 'warning'
    AND message LIKE '%eliminado%';
  
  RETURN json_build_object(
    'success', true,
    'message', 'Liga reseteada exitosamente'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índice para mejorar consultas de eliminación
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_league_eliminated 
ON fantasy_teams(league_id, eliminated);

-- Índice para consultas de roster semanal
CREATE INDEX IF NOT EXISTS idx_team_rosters_team_week_active 
ON team_rosters(fantasy_team_id, week, is_active);

-- Índice para estadísticas semanales
CREATE INDEX IF NOT EXISTS idx_player_stats_week_season 
ON player_stats(week, season, player_id);

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON FUNCTION calculate_team_weekly_score IS 'Calcula el puntaje total de un equipo para una semana específica';
COMMENT ON FUNCTION get_lowest_scoring_team IS 'Obtiene el equipo con menor puntaje de una liga en una semana';
COMMENT ON FUNCTION process_weekly_elimination IS 'Procesa la eliminación semanal de una liga específica';
COMMENT ON FUNCTION process_all_weekly_eliminations IS 'Procesa eliminaciones semanales para todas las ligas activas';
COMMENT ON FUNCTION get_current_nfl_week IS 'Calcula la semana actual de la NFL basada en la fecha';
COMMENT ON FUNCTION simulate_elimination_for_testing IS 'Función de utilidad para testing de eliminaciones';
COMMENT ON FUNCTION reset_league_eliminations IS 'Resetea eliminaciones de una liga (solo para testing)'; 