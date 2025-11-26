-- ============================================
-- FIX: Corregir error "operator does not exist: json ? unknown"
-- Cambiar tipo JSON a JSONB para soportar operador ?
-- ============================================

-- Primero, eliminar las funciones existentes para cambiar tipo de retorno
DROP FUNCTION IF EXISTS advance_league_week(UUID);
DROP FUNCTION IF EXISTS process_weekly_elimination(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS process_weekly_elimination_and_advance(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS process_all_leagues_tuesday_3am(INTEGER);
DROP FUNCTION IF EXISTS simulate_tuesday_3am_process(UUID, INTEGER);

-- 1. Función para avanzar semana de una liga específica (JSON → JSONB)
CREATE OR REPLACE FUNCTION advance_league_week(
  league_id UUID
) RETURNS JSONB AS $$
DECLARE
  current_week_record RECORD;
  next_week_number INTEGER;
  result JSONB;
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
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No hay semana activa en la liga'
    );
  END IF;

  -- Calcular siguiente semana
  next_week_number := current_week_record.number + 1;

  -- Verificar si es la última semana (18)
  IF current_week_record.number >= 18 THEN
    RETURN jsonb_build_object(
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

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Liga avanzada de semana %s a %s', current_week_record.number, next_week_number),
    'previous_week', current_week_record.number,
    'current_week', next_week_number,
    'points_reset', true
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Error avanzando semana: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Función process_weekly_elimination (JSON → JSONB)
CREATE OR REPLACE FUNCTION process_weekly_elimination(
  league_id UUID,
  week_num INTEGER,
  season_year INTEGER DEFAULT 2024
) RETURNS JSONB AS $$
DECLARE
  lowest_team RECORD;
  active_teams_count INTEGER;
  result JSONB;
BEGIN
  -- Verificar si ya se procesó esta semana
  SELECT COUNT(*) INTO active_teams_count
  FROM fantasy_teams
  WHERE fantasy_teams.league_id = process_weekly_elimination.league_id
    AND eliminated = true
    AND eliminated_week = week_num;

  IF active_teams_count > 0 THEN
    RETURN jsonb_build_object(
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
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No hay suficientes equipos activos para eliminar'
    );
  END IF;

  -- Obtener equipo con menor puntaje
  SELECT * INTO lowest_team
  FROM get_lowest_scoring_team(league_id, week_num, season_year);

  IF lowest_team IS NULL THEN
    RETURN jsonb_build_object(
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
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Equipo %s eliminado con %s puntos', lowest_team.team_name, lowest_team.total_points),
    'eliminated_team', jsonb_build_object(
      'id', lowest_team.team_id,
      'name', lowest_team.team_name,
      'points', lowest_team.total_points,
      'user_id', lowest_team.user_id
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Error en eliminación: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Función integrada: Eliminación + Avance de semana (JSON → JSONB)
CREATE OR REPLACE FUNCTION process_weekly_elimination_and_advance(
  league_id UUID,
  week_num INTEGER,
  season_year INTEGER DEFAULT 2024
) RETURNS JSONB AS $$
DECLARE
  elimination_result JSONB;
  advancement_result JSONB;
  final_result JSONB;
BEGIN
  -- Paso 1: Procesar eliminación
  SELECT process_weekly_elimination(league_id, week_num, season_year)
  INTO elimination_result;

  -- Si la eliminación falló, no avanzar semana
  IF NOT (elimination_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', elimination_result->>'message',
      'elimination_result', elimination_result
    );
  END IF;

  -- Paso 2: Avanzar semana solo si la eliminación fue exitosa
  SELECT advance_league_week(league_id)
  INTO advancement_result;

  -- Construir resultado final
  final_result := jsonb_build_object(
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
    final_result := jsonb_build_object(
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
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Error en procesamiento semanal: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Función principal para todas las ligas (Martes 3 AM) - JSON → JSONB
CREATE OR REPLACE FUNCTION process_all_leagues_tuesday_3am(
  season_year INTEGER DEFAULT 2024
) RETURNS JSONB AS $$
DECLARE
  league_record RECORD;
  week_result JSONB;
  total_processed INTEGER DEFAULT 0;
  successful_eliminations INTEGER DEFAULT 0;
  successful_advancements INTEGER DEFAULT 0;
  results JSONB[] DEFAULT '{}';
  current_week INTEGER;
BEGIN
  -- Log del inicio
  INSERT INTO admin_actions (admin_user_id, target_league_id, action_type, action_details)
  VALUES (
    '00000000-0000-0000-0000-000000000000', -- Sistema
    NULL,
    'tuesday_3am_process',
    jsonb_build_object('message', format('Iniciando procesamiento automático martes 3 AM - temporada %s', season_year))
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
    results := array_append(results, jsonb_build_object(
      'league_id', league_record.id,
      'league_name', league_record.name,
      'week_processed', current_week,
      'result', week_result
    ));

    -- Contar éxitos (ahora usando operador ? con JSONB)
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
  INSERT INTO admin_actions (admin_user_id, target_league_id, action_type, action_details)
  VALUES (
    '00000000-0000-0000-0000-000000000000', -- Sistema
    NULL,
    'tuesday_3am_complete',
    jsonb_build_object('message', format('Procesadas %s ligas: %s eliminaciones, %s avances de semana',
           total_processed, successful_eliminations, successful_advancements))
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Procesamiento martes 3 AM completado: %s ligas, %s eliminaciones, %s avances',
                      total_processed, successful_eliminations, successful_advancements),
    'timestamp', NOW(),
    'total_processed', total_processed,
    'successful_eliminations', successful_eliminations,
    'successful_advancements', successful_advancements,
    'season', season_year,
    'results', array_to_json(results)::jsonb
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log del error
    INSERT INTO admin_actions (admin_user_id, target_league_id, action_type, action_details)
    VALUES (
      '00000000-0000-0000-0000-000000000000', -- Sistema
      NULL,
      'tuesday_3am_error',
      jsonb_build_object('message', format('Error en procesamiento martes 3 AM: %s', SQLERRM))
    );

    RETURN jsonb_build_object(
      'success', false,
      'message', format('Error crítico en procesamiento martes 3 AM: %s', SQLERRM)
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Función de utilidad para testing (JSON → JSONB)
CREATE OR REPLACE FUNCTION simulate_tuesday_3am_process(
  league_id UUID DEFAULT NULL,
  season_year INTEGER DEFAULT 2024
) RETURNS JSONB AS $$
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
-- PERMISOS
-- ============================================

-- Permisos para funciones (mantener existentes)
GRANT EXECUTE ON FUNCTION advance_league_week(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_weekly_elimination(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_weekly_elimination_and_advance(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_all_leagues_tuesday_3am(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION simulate_tuesday_3am_process(UUID, INTEGER) TO authenticated, service_role;

-- Comentarios actualizados
COMMENT ON FUNCTION advance_league_week IS 'Avanza una liga a la siguiente semana reseteando puntos y creando rosters (JSONB)';
COMMENT ON FUNCTION process_weekly_elimination IS 'Procesa eliminación del equipo con menor puntaje semanal (JSONB)';
COMMENT ON FUNCTION process_weekly_elimination_and_advance IS 'Procesa eliminación semanal y avanza automáticamente la semana (JSONB)';
COMMENT ON FUNCTION process_all_leagues_tuesday_3am IS 'Función principal para ejecutar martes 3 AM: eliminaciones + avances para todas las ligas (JSONB)';
COMMENT ON FUNCTION simulate_tuesday_3am_process IS 'Función de testing para simular el procesamiento de martes 3 AM (JSONB)';
