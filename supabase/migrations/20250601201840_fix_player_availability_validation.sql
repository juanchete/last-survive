-- Corregir función validate_waiver_request para validar disponibilidad del jugador
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
  player_already_claimed BOOLEAN DEFAULT false;
  validation_result JSON;
BEGIN
  -- Obtener posición del jugador a agregar
  SELECT position INTO player_to_add_position
  FROM players WHERE id = player_to_add_id;
  
  -- NUEVA VALIDACIÓN: Verificar si el jugador ya está en algún roster activo
  SELECT EXISTS(
    SELECT 1 FROM team_rosters 
    WHERE player_id = player_to_add_id 
      AND week = week_num 
      AND is_active = true
  ) INTO player_already_claimed;
  
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
  
  -- Validar lógica (orden importante: verificar disponibilidad primero)
  IF player_already_claimed THEN
    validation_result := json_build_object(
      'valid', false,
      'error', 'Este jugador ya fue reclamado por otro equipo con mayor prioridad'
    );
  ELSIF (roster_limits->>'needs_drop')::boolean AND player_to_drop_id IS NULL THEN
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
    'player_to_drop_exists', player_to_drop_exists,
    'player_already_claimed', player_already_claimed
  );
END;
$$ LANGUAGE plpgsql; 