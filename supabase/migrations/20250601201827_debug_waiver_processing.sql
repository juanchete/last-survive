-- Función de debugging para waivers
CREATE OR REPLACE FUNCTION debug_waiver_processing(
  league_id UUID,
  week_num INTEGER DEFAULT 1
) RETURNS JSON AS $$
DECLARE
  waiver_requests_count INTEGER;
  waiver_priority_count INTEGER;
  pending_requests_count INTEGER;
  joined_count INTEGER;
BEGIN
  -- Contar waiver_requests totales en la liga
  SELECT COUNT(*) INTO waiver_requests_count
  FROM waiver_requests wr
  WHERE wr.league_id = debug_waiver_processing.league_id;
  
  -- Contar waiver_requests pendientes
  SELECT COUNT(*) INTO pending_requests_count
  FROM waiver_requests wr
  WHERE wr.league_id = debug_waiver_processing.league_id
    AND wr.status = 'pending';
  
  -- Contar waiver_priority para esta liga y semana
  SELECT COUNT(*) INTO waiver_priority_count
  FROM waiver_priority wp
  WHERE wp.league_id = debug_waiver_processing.league_id
    AND wp.week = week_num;
  
  -- Contar requests que cumplen todos los criterios del JOIN
  SELECT COUNT(*) INTO joined_count
  FROM waiver_requests wr
  JOIN waiver_priority wp ON wr.fantasy_team_id = wp.fantasy_team_id
  WHERE wr.league_id = debug_waiver_processing.league_id
    AND wr.week = week_num
    AND wr.status = 'pending'
    AND wp.league_id = debug_waiver_processing.league_id
    AND wp.week = week_num;
  
  RETURN json_build_object(
    'league_id', league_id,
    'week_num', week_num,
    'total_waiver_requests', waiver_requests_count,
    'pending_waiver_requests', pending_requests_count,
    'waiver_priority_records', waiver_priority_count,
    'joined_records_matching_criteria', joined_count,
    'debug_info', json_build_object(
      'message', 'Si joined_records_matching_criteria es 0, el problema está en los filtros',
      'common_issues', ARRAY[
        'waiver_requests.week no coincide con week_num',
        'no hay registros en waiver_priority para esta semana',
        'waiver_priority.week no coincide',
        'fantasy_team_id no coincide entre las tablas'
      ]
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Función simplificada de procesamiento sin filtro de week en waiver_requests
CREATE OR REPLACE FUNCTION process_league_waivers_simple(
  league_id UUID
) RETURNS JSON AS $$
DECLARE
  request_record RECORD;
  claim_result JSON;
  total_processed INTEGER DEFAULT 0;
  successful_claims INTEGER DEFAULT 0;
  failed_claims INTEGER DEFAULT 0;
  results JSON[] DEFAULT '{}';
BEGIN
  -- Procesar requests SIN filtro de week en waiver_requests
  FOR request_record IN
    SELECT wr.*, COALESCE(wp.priority, 999) as priority
    FROM waiver_requests wr
    LEFT JOIN waiver_priority wp ON wr.fantasy_team_id = wp.fantasy_team_id
      AND wp.league_id = process_league_waivers_simple.league_id
    WHERE wr.league_id = process_league_waivers_simple.league_id
      AND wr.status = 'pending'
    ORDER BY COALESCE(wp.priority, 999) ASC, wr.created_at ASC
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
  
  RETURN json_build_object(
    'success', true,
    'message', format('Procesadas %s waiver claims para la liga (versión simple)', total_processed),
    'league_id', league_id,
    'total_processed', total_processed,
    'successful_claims', successful_claims,
    'failed_claims', failed_claims,
    'results', array_to_json(results)
  );
END;
$$ LANGUAGE plpgsql; 