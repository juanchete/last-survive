-- ============================================
-- AGREGAR CAMPO OWNER_PLAYS A LEAGUES
-- ============================================
-- Esta migración permite que el owner elija si quiere jugar o solo administrar

-- 1. Agregar campo owner_plays (idempotente)
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS owner_plays BOOLEAN DEFAULT true;

-- 2. Agregar comentario explicativo
COMMENT ON COLUMN leagues.owner_plays IS 'Indica si el propietario de la liga también juega como participante. Si es false, solo administra.';

-- 3. Crear índice para optimizar consultas (idempotente)
CREATE INDEX IF NOT EXISTS idx_leagues_owner_plays 
ON leagues(owner_plays);

-- 4. Función para obtener jugadores activos de una liga (excluyendo owner si no juega)
CREATE OR REPLACE FUNCTION get_active_players_in_league(league_id UUID)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  team_id UUID,
  team_name TEXT,
  eliminated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.full_name,
    u.email,
    lm.role,
    ft.id as team_id,
    ft.name as team_name,
    COALESCE(ft.eliminated, false) as eliminated
  FROM league_members lm
  JOIN users u ON lm.user_id = u.id
  JOIN leagues l ON lm.league_id = l.id
  LEFT JOIN fantasy_teams ft ON (lm.user_id = ft.user_id AND ft.league_id = lm.league_id)
  WHERE lm.league_id = get_active_players_in_league.league_id
    AND (
      lm.role = 'member' OR  -- Todos los miembros siempre juegan
      (lm.role = 'owner' AND l.owner_plays = true)  -- Owner solo si eligió jugar
    )
  ORDER BY lm.role DESC, u.full_name;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para verificar si un usuario debería tener equipo en una liga
CREATE OR REPLACE FUNCTION should_user_have_team(user_id UUID, league_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  league_owner_plays BOOLEAN;
BEGIN
  -- Obtener rol del usuario y configuración de la liga
  SELECT lm.role, l.owner_plays
  INTO user_role, league_owner_plays
  FROM league_members lm
  JOIN leagues l ON lm.league_id = l.id
  WHERE lm.user_id = should_user_have_team.user_id 
    AND lm.league_id = should_user_have_team.league_id;
  
  -- Si no está en la liga, no debería tener equipo
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Los miembros siempre deberían tener equipo
  IF user_role = 'member' THEN
    RETURN true;
  END IF;
  
  -- Los owners solo si eligieron jugar
  IF user_role = 'owner' THEN
    RETURN league_owner_plays;
  END IF;
  
  -- Por defecto, no
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para crear equipos para todos los jugadores que deberían tenerlos
CREATE OR REPLACE FUNCTION create_missing_fantasy_teams(league_id UUID)
RETURNS JSON AS $$
DECLARE
  player_record RECORD;
  created_teams INTEGER DEFAULT 0;
  existing_teams INTEGER DEFAULT 0;
BEGIN
  -- Para cada jugador que debería tener equipo
  FOR player_record IN 
    SELECT 
      u.id as user_id,
      u.full_name,
      lm.role
    FROM league_members lm
    JOIN users u ON lm.user_id = u.id
    JOIN leagues l ON lm.league_id = l.id
    WHERE lm.league_id = create_missing_fantasy_teams.league_id
      AND (
        lm.role = 'member' OR 
        (lm.role = 'owner' AND l.owner_plays = true)
      )
  LOOP
    -- Verificar si ya tiene equipo
    IF NOT EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE user_id = player_record.user_id 
        AND league_id = create_missing_fantasy_teams.league_id
    ) THEN
      -- Crear equipo
      INSERT INTO fantasy_teams (league_id, user_id, name, points, rank, eliminated)
      VALUES (
        create_missing_fantasy_teams.league_id,
        player_record.user_id,
        player_record.full_name || '''s Team',
        0,
        1,  -- Se actualizará después
        false
      );
      
      created_teams := created_teams + 1;
    ELSE
      existing_teams := existing_teams + 1;
    END IF;
  END LOOP;
  
  -- Actualizar rankings
  PERFORM update_team_rankings(create_missing_fantasy_teams.league_id);
  
  RETURN json_build_object(
    'success', true,
    'message', format('Equipos creados: %s, ya existían: %s', created_teams, existing_teams),
    'created_teams', created_teams,
    'existing_teams', existing_teams
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Función para actualizar rankings de equipos
CREATE OR REPLACE FUNCTION update_team_rankings(league_id UUID)
RETURNS VOID AS $$
BEGIN
  WITH ranked_teams AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY points DESC, name ASC) as new_rank
    FROM fantasy_teams
    WHERE league_id = update_team_rankings.league_id
      AND eliminated = false
  )
  UPDATE fantasy_teams
  SET rank = ranked_teams.new_rank
  FROM ranked_teams
  WHERE fantasy_teams.id = ranked_teams.id;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para crear equipo automáticamente cuando se agrega miembro (si aplica)
CREATE OR REPLACE FUNCTION auto_create_fantasy_team()
RETURNS TRIGGER AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Solo crear si el usuario debería tener equipo
  IF should_user_have_team(NEW.user_id, NEW.league_id) THEN
    -- Verificar que no exista ya
    IF NOT EXISTS (
      SELECT 1 FROM fantasy_teams 
      WHERE user_id = NEW.user_id AND league_id = NEW.league_id
    ) THEN
      -- Crear equipo y obtener el ID
      INSERT INTO fantasy_teams (league_id, user_id, name, points, rank, eliminated)
      SELECT 
        NEW.league_id,
        NEW.user_id,
        u.full_name || '''s Team',
        0,
        COALESCE(MAX(ft.rank), 0) + 1,
        false
      FROM users u
      LEFT JOIN fantasy_teams ft ON ft.league_id = NEW.league_id
      WHERE u.id = NEW.user_id
      GROUP BY u.full_name
      RETURNING id INTO new_team_id;

      -- Actualizar league_members con el team_id
      UPDATE league_members 
      SET team_id = new_team_id
      WHERE user_id = NEW.user_id 
        AND league_id = NEW.league_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_auto_create_fantasy_team ON league_members;
CREATE TRIGGER trigger_auto_create_fantasy_team
  AFTER INSERT ON league_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_fantasy_team();

-- 9. Actualizar ligas existentes para que tengan valor por defecto
UPDATE leagues 
SET owner_plays = true 
WHERE owner_plays IS NULL;

-- 10. Comentarios de documentación
COMMENT ON FUNCTION get_active_players_in_league IS 'Obtiene todos los jugadores activos de una liga, respetando la configuración owner_plays';
COMMENT ON FUNCTION should_user_have_team IS 'Determina si un usuario debería tener un fantasy_team en una liga específica';
COMMENT ON FUNCTION create_missing_fantasy_teams IS 'Crea equipos de fantasy para todos los usuarios que deberían tenerlos pero no los tienen';
COMMENT ON FUNCTION auto_create_fantasy_team IS 'Función de trigger para crear equipos automáticamente al agregar miembros';

-- ============================================
-- VERIFICACIONES Y EJEMPLOS
-- ============================================

-- Función para limpiar equipos duplicados (bug fix)
CREATE OR REPLACE FUNCTION cleanup_duplicate_fantasy_teams()
RETURNS JSON AS $$
DECLARE
  duplicate_record RECORD;
  total_cleaned INTEGER DEFAULT 0;
BEGIN
  -- Buscar usuarios con equipos duplicados en la misma liga
  FOR duplicate_record IN 
    SELECT 
      user_id, 
      league_id, 
      COUNT(*) as team_count,
      ARRAY_AGG(id ORDER BY created_at) as team_ids
    FROM fantasy_teams
    GROUP BY user_id, league_id
    HAVING COUNT(*) > 1
  LOOP
    -- PRIMERO: Actualizar TODAS las referencias en league_members para que apunten al equipo más antiguo
    UPDATE league_members 
    SET team_id = duplicate_record.team_ids[1]
    WHERE team_id = ANY(duplicate_record.team_ids)
      AND user_id = duplicate_record.user_id 
      AND league_id = duplicate_record.league_id;
    
    -- SEGUNDO: Ahora sí eliminar los duplicados (todos excepto el primero)
    DELETE FROM fantasy_teams 
    WHERE id = ANY(duplicate_record.team_ids[2:]);
    
    total_cleaned := total_cleaned + (duplicate_record.team_count - 1);
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Equipos duplicados eliminados: %s', total_cleaned),
    'teams_cleaned', total_cleaned
  );
END;
$$ LANGUAGE plpgsql;

-- Query para verificar configuración de ligas:
-- SELECT id, name, owner_plays, status FROM leagues;

-- Query para ver jugadores activos en una liga:
-- SELECT * FROM get_active_players_in_league('LEAGUE_ID');

-- Query para crear equipos faltantes en una liga:
-- SELECT create_missing_fantasy_teams('LEAGUE_ID');

-- Query para limpiar equipos duplicados:
-- SELECT cleanup_duplicate_fantasy_teams(); 

-- ============================================
-- SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA DE PUNTAJES  
-- ============================================

-- Función para actualizar puntajes de equipos automáticamente
CREATE OR REPLACE FUNCTION update_fantasy_team_points()
RETURNS TRIGGER AS $$
DECLARE
  affected_team_ids UUID[];
  team_id UUID;
  current_week INTEGER;
BEGIN
  -- Determinar la semana actual (puedes ajustar esta lógica)
  current_week := 1; -- Por ahora fijo en 1, pero puede ser dinámico
  
  -- Obtener equipos afectados según el tipo de operación
  IF TG_TABLE_NAME = 'player_stats' THEN
    -- Si se actualiza player_stats, buscar todos los equipos que tienen ese jugador
    SELECT ARRAY_AGG(DISTINCT tr.fantasy_team_id)
    INTO affected_team_ids
    FROM team_rosters tr
    WHERE tr.player_id = COALESCE(NEW.player_id, OLD.player_id)
      AND tr.week = COALESCE(NEW.week, OLD.week)
      AND tr.is_active = true;
      
  ELSIF TG_TABLE_NAME = 'team_rosters' THEN
    -- Si se actualiza team_rosters, afectar solo ese equipo
    affected_team_ids := ARRAY[COALESCE(NEW.fantasy_team_id, OLD.fantasy_team_id)];
  END IF;
  
  -- Actualizar puntajes para cada equipo afectado
  IF affected_team_ids IS NOT NULL THEN
    FOREACH team_id IN ARRAY affected_team_ids
    LOOP
      UPDATE fantasy_teams 
      SET points = calculate_team_weekly_score(team_id, current_week, 2024)
      WHERE id = team_id;
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para player_stats (cuando se insertan/actualizan estadísticas)
DROP TRIGGER IF EXISTS trigger_update_team_points_on_stats ON player_stats;
CREATE TRIGGER trigger_update_team_points_on_stats
  AFTER INSERT OR UPDATE OR DELETE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_fantasy_team_points();

-- Trigger para team_rosters (cuando se modifica una alineación)
DROP TRIGGER IF EXISTS trigger_update_team_points_on_roster ON team_rosters;
CREATE TRIGGER trigger_update_team_points_on_roster
  AFTER INSERT OR UPDATE OR DELETE ON team_rosters
  FOR EACH ROW
  EXECUTE FUNCTION update_fantasy_team_points();

-- Función para recalcular todos los puntajes de una liga
CREATE OR REPLACE FUNCTION refresh_league_points(
  target_league_id UUID,
  target_week INTEGER DEFAULT 1
) RETURNS JSON AS $$
DECLARE
  updated_teams INTEGER DEFAULT 0;
BEGIN
  UPDATE fantasy_teams 
  SET points = calculate_team_weekly_score(id, target_week, 2024)
  WHERE league_id = target_league_id;
  
  GET DIAGNOSTICS updated_teams = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Puntajes actualizados para %s equipos', updated_teams),
    'league_id', target_league_id,
    'week', target_week,
    'updated_teams', updated_teams
  );
END;
$$ LANGUAGE plpgsql;

-- Query para limpiar equipos duplicados:
-- SELECT cleanup_duplicate_fantasy_teams();

-- Query para refrescar puntajes de una liga:
-- SELECT refresh_league_points('LEAGUE_ID', 1); 

-- ============================================
-- SISTEMA DE WAIVER PROCESSING AUTOMÁTICO CON DROP PLAYERS
-- ============================================

-- 1. Agregar campo drop_player_id a waiver_requests
ALTER TABLE waiver_requests 
ADD COLUMN IF NOT EXISTS drop_player_id INTEGER REFERENCES players(id);

-- 2. Agregar deadlines configurables
ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS waiver_deadline_day INTEGER DEFAULT 3; -- Martes (1=Lunes, 2=Martes, etc.)

ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS waiver_deadline_hour INTEGER DEFAULT 23; -- 11 PM

-- 3. Función para verificar límites de roster
CREATE OR REPLACE FUNCTION check_roster_limits(
  team_id UUID,
  week_num INTEGER,
  position_to_add VARCHAR
) RETURNS JSON AS $$
DECLARE
  current_roster_count INTEGER;
  position_count INTEGER;
  max_roster_size INTEGER DEFAULT 16; -- Ajustar según reglas
  max_position_limits JSONB DEFAULT '{
    "QB": 3,
    "RB": 6, 
    "WR": 6,
    "TE": 3,
    "K": 2,
    "DEF": 2
  }'::jsonb;
  position_limit INTEGER;
BEGIN
  -- Contar jugadores totales activos
  SELECT COUNT(*) INTO current_roster_count
  FROM team_rosters
  WHERE fantasy_team_id = team_id 
    AND week = week_num 
    AND is_active = true;
    
  -- Contar jugadores de la posición específica
  SELECT COUNT(*) INTO position_count
  FROM team_rosters tr
  JOIN players p ON tr.player_id = p.id
  WHERE tr.fantasy_team_id = team_id 
    AND tr.week = week_num 
    AND tr.is_active = true
    AND p.position = position_to_add;
    
  -- Obtener límite de posición
  position_limit := (max_position_limits ->> position_to_add)::integer;
  
  RETURN json_build_object(
    'roster_full', current_roster_count >= max_roster_size,
    'position_full', position_count >= position_limit,
    'current_roster_count', current_roster_count,
    'max_roster_size', max_roster_size,
    'current_position_count', position_count,
    'max_position_count', position_limit,
    'needs_drop', current_roster_count >= max_roster_size
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Función para validar waiver request con drop
CREATE OR REPLACE FUNCTION validate_waiver_request(
  team_id UUID,
  player_to_add_id INTEGER,
  player_to_drop_id INTEGER,
  week_num INTEGER
) RETURNS JSON AS $$
DECLARE
  roster_limits JSON;
  player_to_add_position VARCHAR;
  player_to_drop_exists BOOLEAN DEFAULT false;
  validation_result JSON;
BEGIN
  -- Obtener posición del jugador a agregar
  SELECT position INTO player_to_add_position
  FROM players WHERE id = player_to_add_id;
  
  -- Verificar límites de roster
  SELECT check_roster_limits(team_id, week_num, player_to_add_position) INTO roster_limits;
  
  -- Si se especifica jugador a soltar, verificar que existe en el roster
  IF player_to_drop_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM team_rosters 
      WHERE fantasy_team_id = team_id 
        AND player_id = player_to_drop_id 
        AND week = week_num 
        AND is_active = true
    ) INTO player_to_drop_exists;
  END IF;
  
  -- Validar lógica
  IF (roster_limits->>'needs_drop')::boolean AND player_to_drop_id IS NULL THEN
    validation_result := json_build_object(
      'valid', false,
      'error', 'Roster lleno. Debes especificar un jugador para soltar.'
    );
  ELSIF player_to_drop_id IS NOT NULL AND NOT player_to_drop_exists THEN
    validation_result := json_build_object(
      'valid', false,
      'error', 'El jugador especificado para soltar no está en tu roster.'
    );
  ELSIF (roster_limits->>'position_full')::boolean AND player_to_drop_id IS NULL THEN
    validation_result := json_build_object(
      'valid', false,
      'error', format('Ya tienes el máximo de jugadores en posición %s', player_to_add_position)
    );
  ELSE
    validation_result := json_build_object(
      'valid', true,
      'message', 'Waiver request válida'
    );
  END IF;
  
  RETURN json_build_object(
    'validation', validation_result,
    'roster_limits', roster_limits,
    'player_to_add_position', player_to_add_position,
    'player_to_drop_exists', player_to_drop_exists
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Función para procesar una waiver claim individual
CREATE OR REPLACE FUNCTION process_waiver_claim(
  request_id INTEGER
) RETURNS JSON AS $$
DECLARE
  request_record RECORD;
  validation_result JSON;
  roster_transaction_success BOOLEAN DEFAULT false;
BEGIN
  -- Obtener información de la request
  SELECT * INTO request_record
  FROM waiver_requests
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Waiver request no encontrada o ya procesada'
    );
  END IF;
  
  -- Validar la request
  SELECT validate_waiver_request(
    request_record.fantasy_team_id,
    request_record.player_id,
    request_record.drop_player_id,
    request_record.week
  ) INTO validation_result;
  
  IF NOT (validation_result->'validation'->>'valid')::boolean THEN
    -- Marcar como rechazada
    UPDATE waiver_requests 
    SET status = 'rejected', processed_at = NOW()
    WHERE id = request_id;
    
    RETURN json_build_object(
      'success', false,
      'message', validation_result->'validation'->>'error',
      'status', 'rejected'
    );
  END IF;
  
  -- Procesar transacción de roster
  BEGIN
    -- 1. Si hay jugador para soltar, marcarlo como inactivo
    IF request_record.drop_player_id IS NOT NULL THEN
      UPDATE team_rosters
      SET is_active = false
      WHERE fantasy_team_id = request_record.fantasy_team_id
        AND player_id = request_record.drop_player_id
        AND week = request_record.week;
        
      -- Registrar movimiento de drop
      INSERT INTO roster_moves (fantasy_team_id, player_id, week, action, acquired_type)
      VALUES (
        request_record.fantasy_team_id,
        request_record.drop_player_id,
        request_record.week,
        'waiver_drop',
        'waivers'
      );
    END IF;
    
    -- 2. Agregar nuevo jugador
    INSERT INTO team_rosters (
      fantasy_team_id, 
      player_id, 
      week, 
      is_active, 
      acquired_type, 
      acquired_week
    ) VALUES (
      request_record.fantasy_team_id,
      request_record.player_id,
      request_record.week,
      true,
      'waivers',
      request_record.week
    );
    
    -- Registrar movimiento de add
    INSERT INTO roster_moves (fantasy_team_id, player_id, week, action, acquired_type)
    VALUES (
      request_record.fantasy_team_id,
      request_record.player_id,
      request_record.week,
      'waiver_add',
      'waivers'
    );
    
    roster_transaction_success := true;
    
  EXCEPTION
    WHEN OTHERS THEN
      roster_transaction_success := false;
      RAISE NOTICE 'Error en transacción de roster: %', SQLERRM;
  END;
  
  -- Actualizar status de la request
  IF roster_transaction_success THEN
    UPDATE waiver_requests 
    SET status = 'approved', processed_at = NOW()
    WHERE id = request_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Waiver claim procesada exitosamente',
      'status', 'approved'
    );
  ELSE
    UPDATE waiver_requests 
    SET status = 'rejected', processed_at = NOW()
    WHERE id = request_id;
    
    RETURN json_build_object(
      'success', false,
      'message', 'Error procesando transacción de roster',
      'status', 'rejected'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para procesar todas las waivers de una liga en orden de prioridad
CREATE OR REPLACE FUNCTION process_league_waivers(
  league_id UUID,
  week_num INTEGER,
  season_year INTEGER DEFAULT 2024
) RETURNS JSON AS $$
DECLARE
  request_record RECORD;
  claim_result JSON;
  total_processed INTEGER DEFAULT 0;
  successful_claims INTEGER DEFAULT 0;
  failed_claims INTEGER DEFAULT 0;
  results JSON[] DEFAULT '{}';
BEGIN
  -- Procesar requests en orden de prioridad (menor número = mayor prioridad)
  FOR request_record IN
    SELECT wr.*, wp.priority
    FROM waiver_requests wr
    JOIN waiver_priority wp ON wr.fantasy_team_id = wp.fantasy_team_id
    WHERE wr.league_id = process_league_waivers.league_id
      AND wr.week = week_num
      AND wr.status = 'pending'
      AND wp.league_id = process_league_waivers.league_id
      AND wp.week = week_num
    ORDER BY wp.priority ASC, wr.created_at ASC
  LOOP
    -- Procesar cada claim
    SELECT process_waiver_claim(request_record.id) INTO claim_result;
    
    total_processed := total_processed + 1;
    
    IF (claim_result->>'success')::boolean THEN
      successful_claims := successful_claims + 1;
    ELSE
      failed_claims := failed_claims + 1;
    END IF;
    
    -- Agregar resultado al array
    results := array_append(results, json_build_object(
      'request_id', request_record.id,
      'fantasy_team_id', request_record.fantasy_team_id,
      'player_id', request_record.player_id,
      'drop_player_id', request_record.drop_player_id,
      'priority', request_record.priority,
      'result', claim_result
    ));
  END LOOP;
  
  -- Crear notificaciones para todos los equipos con resultados
  INSERT INTO notifications (user_id, league_id, type, title, message)
  SELECT 
    ft.user_id,
    process_league_waivers.league_id,
    CASE 
      WHEN wr.status = 'approved' THEN 'success'
      ELSE 'info'
    END,
    CASE 
      WHEN wr.status = 'approved' THEN 'Waiver Aprobada'
      ELSE 'Waiver Rechazada'
    END,
    CASE 
      WHEN wr.status = 'approved' THEN 
        format('Tu solicitud para %s fue aprobada', (SELECT name FROM players WHERE id = wr.player_id))
      ELSE 
        format('Tu solicitud para %s fue rechazada', (SELECT name FROM players WHERE id = wr.player_id))
    END
  FROM waiver_requests wr
  JOIN fantasy_teams ft ON wr.fantasy_team_id = ft.id
  WHERE wr.league_id = process_league_waivers.league_id
    AND wr.week = week_num
    AND wr.processed_at IS NOT NULL;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Procesadas %s waiver claims para la liga', total_processed),
    'league_id', league_id,
    'week', week_num,
    'total_processed', total_processed,
    'successful_claims', successful_claims,
    'failed_claims', failed_claims,
    'results', array_to_json(results)
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Función para obtener deadlines de waiver
CREATE OR REPLACE FUNCTION get_waiver_deadline(
  league_id UUID
) RETURNS JSON AS $$
DECLARE
  league_settings RECORD;
  next_deadline TIMESTAMP;
BEGIN
  SELECT waiver_deadline_day, waiver_deadline_hour INTO league_settings
  FROM leagues WHERE id = league_id;
  
  -- Calcular próximo deadline (simplificado - ajustar según necesidades)
  next_deadline := date_trunc('week', NOW()) + 
                  (league_settings.waiver_deadline_day - 1) * INTERVAL '1 day' +
                  league_settings.waiver_deadline_hour * INTERVAL '1 hour';
  
  -- Si ya pasó esta semana, mover a la próxima
  IF next_deadline <= NOW() THEN
    next_deadline := next_deadline + INTERVAL '1 week';
  END IF;
  
  RETURN json_build_object(
    'deadline', next_deadline,
    'deadline_day', league_settings.waiver_deadline_day,
    'deadline_hour', league_settings.waiver_deadline_hour,
    'time_remaining', EXTRACT(EPOCH FROM (next_deadline - NOW())),
    'deadline_passed', next_deadline <= NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Función para procesar automáticamente waivers expiradas
CREATE OR REPLACE FUNCTION process_expired_waivers()
RETURNS JSON AS $$
DECLARE
  league_record RECORD;
  processing_result JSON;
  total_leagues INTEGER DEFAULT 0;
  successful_leagues INTEGER DEFAULT 0;
  results JSON[] DEFAULT '{}';
BEGIN
  -- Procesar cada liga que tiene deadline pasado
  FOR league_record IN
    SELECT DISTINCT l.id as league_id, 
           (get_waiver_deadline(l.id)->>'deadline_passed')::boolean as deadline_passed
    FROM leagues l
    WHERE EXISTS (
      SELECT 1 FROM waiver_requests wr 
      WHERE wr.league_id = l.id AND wr.status = 'pending'
    )
  LOOP
    IF league_record.deadline_passed THEN
      total_leagues := total_leagues + 1;
      
      -- Procesar waivers de esta liga (semana actual)
      SELECT process_league_waivers(
        league_record.league_id, 
        1, -- Ajustar según semana actual
        2024
      ) INTO processing_result;
      
      IF (processing_result->>'success')::boolean THEN
        successful_leagues := successful_leagues + 1;
      END IF;
      
      results := array_append(results, json_build_object(
        'league_id', league_record.league_id,
        'result', processing_result
      ));
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Procesadas waivers para %s ligas', total_leagues),
    'total_leagues', total_leagues,
    'successful_leagues', successful_leagues,
    'results', array_to_json(results)
  );
END;
$$ LANGUAGE plpgsql; 