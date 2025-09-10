-- ============================================
-- SISTEMA DE AVANCE AUTOMÁTICO DE SEMANAS
-- Martes 3 AM: Eliminación + Avance + Reset
-- ============================================

-- 1. Función para avanzar semana de una liga específica
CREATE OR REPLACE FUNCTION advance_league_week(
  league_id UUID
) RETURNS JSON AS $$
DECLARE
  current_week_record RECORD;
  next_week_number INTEGER;
  result JSON;
BEGIN
  -- Obtener semana actual de la liga
  SELECT number, status INTO current_week_record
  FROM weeks
  WHERE weeks.league_id = advance_league_week.league_id
    AND status = 'active'
  ORDER BY number DESC
  LIMIT 1;
  
  -- Verificar si existe semana activa
  IF current_week_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No hay semana activa en la liga'
    );
  END IF;
  
  -- Calcular siguiente semana
  next_week_number := current_week_record.number + 1;
  
  -- Verificar si es la última semana (18)
  IF current_week_record.number >= 18 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Liga completada - Semana 18 es la final'
    );
  END IF;
  
  -- Desactivar semana actual
  UPDATE weeks
  SET status = 'completed'
  WHERE weeks.league_id = advance_league_week.league_id
    AND number = current_week_record.number;
  
  -- Activar siguiente semana
  UPDATE weeks
  SET status = 'active'
  WHERE weeks.league_id = advance_league_week.league_id
    AND number = next_week_number;
  
  -- Verificar si la siguiente semana existe, si no crearla
  IF NOT FOUND THEN
    INSERT INTO weeks (league_id, number, status, start_date, end_date)
    VALUES (
      advance_league_week.league_id,
      next_week_number,
      'active',
      CURRENT_DATE + INTERVAL '1 day',
      CURRENT_DATE + INTERVAL '8 days'
    );
  END IF;
  
  -- Resetear puntos semanales de todos los equipos activos
  UPDATE fantasy_teams
  SET points = 0
  WHERE fantasy_teams.league_id = advance_league_week.league_id
    AND eliminated = false;
  
  -- Crear rosters para la nueva semana (copiar de semana anterior)
  INSERT INTO team_rosters (fantasy_team_id, player_id, week, slot, is_active)
  SELECT 
    tr.fantasy_team_id,
    tr.player_id,
    next_week_number as week,
    tr.slot,
    tr.is_active
  FROM team_rosters tr
  JOIN fantasy_teams ft ON tr.fantasy_team_id = ft.id
  WHERE tr.week = current_week_record.number
    AND ft.league_id = advance_league_week.league_id
    AND ft.eliminated = false;
  
  -- Resetear priority de waivers para la nueva semana
  UPDATE waiver_priority
  SET priority = NULL
  WHERE waiver_priority.league_id = advance_league_week.league_id
    AND week = next_week_number;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Liga avanzada de semana %s a %s', current_week_record.number, next_week_number),
    'previous_week', current_week_record.number,
    'current_week', next_week_number,
    'points_reset', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Error avanzando semana: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Función integrada: Eliminación + Avance de semana
CREATE OR REPLACE FUNCTION process_weekly_elimination_and_advance(
  league_id UUID,
  week_num INTEGER,
  season_year INTEGER DEFAULT 2024
) RETURNS JSON AS $$
DECLARE
  elimination_result JSON;
  advancement_result JSON;
  final_result JSON;
BEGIN
  -- Paso 1: Procesar eliminación
  SELECT process_weekly_elimination(league_id, week_num, season_year)
  INTO elimination_result;
  
  -- Si la eliminación falló, no avanzar semana
  IF NOT (elimination_result->>'success')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'message', elimination_result->>'message',
      'elimination_result', elimination_result
    );
  END IF;
  
  -- Paso 2: Avanzar semana solo si la eliminación fue exitosa
  SELECT advance_league_week(league_id)
  INTO advancement_result;
  
  -- Construir resultado final
  final_result := json_build_object(
    'success', true,
    'message', format('Procesamiento semanal completo - %s - %s', 
                      elimination_result->>'message', 
                      advancement_result->>'message'),
    'elimination', elimination_result,
    'advancement', advancement_result,
    'current_week', advancement_result->'current_week',
    'eliminated_team', elimination_result->'eliminated_team'
  );
  
  -- Si el avance falló, agregar advertencia pero mantener éxito
  IF NOT (advancement_result->>'success')::boolean THEN
    final_result := json_build_object(
      'success', true,
      'message', format('Eliminación exitosa pero %s', advancement_result->>'message'),
      'elimination', elimination_result,
      'advancement', advancement_result,
      'warning', 'Semana no avanzada automáticamente'
    );
  END IF;
  
  RETURN final_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Error en procesamiento semanal: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Función principal para todas las ligas (Martes 3 AM)
CREATE OR REPLACE FUNCTION process_all_leagues_tuesday_3am(
  season_year INTEGER DEFAULT 2024
) RETURNS JSON AS $$
DECLARE
  league_record RECORD;
  week_result JSON;
  total_processed INTEGER DEFAULT 0;
  successful_eliminations INTEGER DEFAULT 0;
  successful_advancements INTEGER DEFAULT 0;
  results JSON[] DEFAULT '{}';
  current_week INTEGER;
BEGIN
  -- Log del inicio
  INSERT INTO admin_actions (user_id, league_id, action, details)
  VALUES (
    '00000000-0000-0000-0000-000000000000', -- Sistema
    NULL,
    'tuesday_3am_process',
    format('Iniciando procesamiento automático martes 3 AM - temporada %s', season_year)
  );
  
  -- Procesar cada liga activa
  FOR league_record IN 
    SELECT id, name FROM leagues WHERE status = 'active'
  LOOP
    total_processed := total_processed + 1;
    
    -- Obtener semana actual de esta liga
    SELECT number INTO current_week
    FROM weeks
    WHERE league_id = league_record.id
      AND status = 'active'
    ORDER BY number DESC
    LIMIT 1;
    
    -- Si no hay semana activa, usar semana 1
    IF current_week IS NULL THEN
      current_week := 1;
    END IF;
    
    -- Procesar eliminación + avance para esta liga
    SELECT process_weekly_elimination_and_advance(league_record.id, current_week, season_year)
    INTO week_result;
    
    -- Agregar resultado al array
    results := array_append(results, json_build_object(
      'league_id', league_record.id,
      'league_name', league_record.name,
      'week_processed', current_week,
      'result', week_result
    ));
    
    -- Contar éxitos
    IF (week_result->>'success')::boolean THEN
      IF week_result->'elimination' ? 'eliminated_team' THEN
        successful_eliminations := successful_eliminations + 1;
      END IF;
      
      IF (week_result->'advancement'->>'success')::boolean THEN
        successful_advancements := successful_advancements + 1;
      END IF;
    END IF;
  END LOOP;

  -- Log del resultado
  INSERT INTO admin_actions (user_id, league_id, action, details)
  VALUES (
    '00000000-0000-0000-0000-000000000000', -- Sistema
    NULL,
    'tuesday_3am_complete',
    format('Procesadas %s ligas: %s eliminaciones, %s avances de semana', 
           total_processed, successful_eliminations, successful_advancements)
  );

  RETURN json_build_object(
    'success', true,
    'message', format('Procesamiento martes 3 AM completado: %s ligas, %s eliminaciones, %s avances',
                      total_processed, successful_eliminations, successful_advancements),
    'timestamp', NOW(),
    'total_processed', total_processed,
    'successful_eliminations', successful_eliminations,
    'successful_advancements', successful_advancements,
    'season', season_year,
    'results', array_to_json(results)
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log del error
    INSERT INTO admin_actions (user_id, league_id, action, details)
    VALUES (
      '00000000-0000-0000-0000-000000000000', -- Sistema
      NULL,
      'tuesday_3am_error',
      format('Error en procesamiento martes 3 AM: %s', SQLERRM)
    );
    
    RETURN json_build_object(
      'success', false,
      'message', format('Error crítico en procesamiento martes 3 AM: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Función de utilidad para testing
CREATE OR REPLACE FUNCTION simulate_tuesday_3am_process(
  league_id UUID DEFAULT NULL,
  season_year INTEGER DEFAULT 2024
) RETURNS JSON AS $$
BEGIN
  -- Si se especifica una liga, procesar solo esa liga
  IF league_id IS NOT NULL THEN
    RETURN process_weekly_elimination_and_advance(
      league_id,
      COALESCE(
        (SELECT number FROM weeks WHERE weeks.league_id = simulate_tuesday_3am_process.league_id AND status = 'active' ORDER BY number DESC LIMIT 1),
        1
      ),
      season_year
    );
  ELSE
    -- Procesar todas las ligas
    RETURN process_all_leagues_tuesday_3am(season_year);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índice para consultas de semanas activas
CREATE INDEX IF NOT EXISTS idx_weeks_league_status_number 
ON weeks(league_id, status, number);

-- Índice para team_rosters por semana
CREATE INDEX IF NOT EXISTS idx_team_rosters_week_team 
ON team_rosters(week, fantasy_team_id);

-- ============================================
-- PERMISOS Y COMENTARIOS
-- ============================================

-- Permisos para funciones
GRANT EXECUTE ON FUNCTION advance_league_week(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_weekly_elimination_and_advance(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_all_leagues_tuesday_3am(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION simulate_tuesday_3am_process(UUID, INTEGER) TO authenticated;

-- Comentarios
COMMENT ON FUNCTION advance_league_week IS 'Avanza una liga a la siguiente semana reseteando puntos y creando rosters';
COMMENT ON FUNCTION process_weekly_elimination_and_advance IS 'Procesa eliminación semanal y avanza automáticamente la semana';
COMMENT ON FUNCTION process_all_leagues_tuesday_3am IS 'Función principal para ejecutar martes 3 AM: eliminaciones + avances para todas las ligas';
COMMENT ON FUNCTION simulate_tuesday_3am_process IS 'Función de testing para simular el procesamiento de martes 3 AM';