-- Corregir función process_league_waivers para usar solo 'message' en notifications
-- La tabla notifications no tiene columna 'title'

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
  -- CORREGIDO: Usar solo message (sin title)
  INSERT INTO notifications (user_id, league_id, type, message)
  SELECT 
    ft.user_id,
    process_league_waivers.league_id,
    CASE 
      WHEN wr.status = 'approved' THEN 'success'
      ELSE 'info'
    END,
    CASE 
      WHEN wr.status = 'approved' THEN 
        format('✅ Waiver Aprobada: Tu solicitud para %s fue aprobada', (SELECT name FROM players WHERE id = wr.player_id))
      ELSE 
        format('❌ Waiver Rechazada: Tu solicitud para %s fue rechazada', (SELECT name FROM players WHERE id = wr.player_id))
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