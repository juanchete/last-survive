-- ============================================
-- FIX: Sincronizar leagues.current_week al avanzar semana
-- La función advance_league_week ahora actualiza tanto weeks como leagues.current_week
-- ============================================

-- Eliminar la función existente
DROP FUNCTION IF EXISTS advance_league_week(UUID);

-- Recrear la función con la actualización de leagues.current_week
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

  -- ✨ NUEVO: Actualizar current_week en la tabla leagues
  UPDATE leagues
  SET
    current_week = next_week_number,
    last_transition_at = NOW()
  WHERE id = advance_league_week.league_id;

  -- Resetear puntos semanales de todos los equipos activos
  UPDATE fantasy_teams
  SET points = 0
  WHERE fantasy_teams.league_id = advance_league_week.league_id
    AND eliminated = false;

  -- Crear rosters para la nueva semana - SOLO COPIAR JUGADORES ACTIVOS
  INSERT INTO team_rosters (fantasy_team_id, player_id, week, slot, is_active, acquired_type, acquired_week)
  SELECT
    tr.fantasy_team_id,
    tr.player_id,
    next_week_number as week,
    tr.slot,
    tr.is_active,
    tr.acquired_type,
    tr.acquired_week  -- Mantener la semana original de adquisición
  FROM team_rosters tr
  JOIN fantasy_teams ft ON tr.fantasy_team_id = ft.id
  WHERE tr.week = current_week_record.number
    AND ft.league_id = advance_league_week.league_id
    AND ft.eliminated = false
    AND tr.is_active = true;  -- SOLO copiar jugadores activos (no bench)

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

-- Permisos
GRANT EXECUTE ON FUNCTION advance_league_week(UUID) TO authenticated, service_role;

-- Comentario
COMMENT ON FUNCTION advance_league_week IS 'Avanza una liga a la siguiente semana actualizando weeks.status Y leagues.current_week';
