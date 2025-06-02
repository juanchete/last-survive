-- ============================================
-- DATOS DE PRUEBA PARA SISTEMA DE ELIMINACIÓN
-- ============================================
-- Este archivo contiene datos de prueba para testing del sistema de eliminación automática

-- ⚠️ SOLO PARA TESTING - NO EJECUTAR EN PRODUCCIÓN ⚠️

-- 1. Insertar estadísticas de jugadores para semana 1
INSERT INTO player_stats (player_id, week, season, fantasy_points)
VALUES 
  -- QBs
  (1, 1, 2024, 24.5),  -- Patrick Mahomes
  
  -- RBs
  (2, 1, 2024, 19.7),  -- Christian McCaffrey
  (10, 1, 2024, 16.2), -- Christian McCaffrey (duplicate)
  (11, 1, 2024, 16.9), -- Austin Ekeler
  (12, 1, 2024, 11.8), -- Derrick Henry
  (13, 1, 2024, 13.6), -- Isiah Pacheco
  (14, 1, 2024, 9.4),  -- Miles Sanders
  
  -- WRs
  (3, 1, 2024, 22.4),  -- Justin Jefferson
  (20, 1, 2024, 18.7), -- Tyreek Hill
  (21, 1, 2024, 11.2), -- Stefon Diggs
  (22, 1, 2024, 16.1), -- A.J. Brown
  (24, 1, 2024, 14.5), -- Deebo Samuel
  
  -- TEs
  (4, 1, 2024, 14.7),  -- Travis Kelce
  (23, 1, 2024, 12.1), -- Travis Kelce (duplicate)
  (30, 1, 2024, 9.1),  -- Mark Andrews
  (31, 1, 2024, 7.3),  -- Dallas Goedert
  (32, 1, 2024, 6.8),  -- George Kittle

  -- Kickers
  (5, 1, 2024, 8.0),   -- Justin Tucker
  (40, 1, 2024, 6.5),  -- Harrison Butker
  (41, 1, 2024, 7.2),  -- Tyler Bass
  (42, 1, 2024, 5.8),  -- Jake Elliott
  
  -- DEF
  (6, 1, 2024, 12.0),  -- San Francisco 49ers DEF
  (50, 1, 2024, 8.5),  -- Chiefs Defense
  (51, 1, 2024, 10.2), -- Bills Defense
  (52, 1, 2024, 7.8);  -- Eagles Defense

-- 2. Insertar estadísticas para semana 2 (con variaciones)
INSERT INTO player_stats (player_id, week, season, fantasy_points)
VALUES 
  -- QBs - Semana 2
  (1, 2, 2024, 28.1),  -- Patrick Mahomes (mejor semana)
  
  -- RBs - Semana 2
  (2, 2, 2024, 23.2),  -- Christian McCaffrey
  (10, 2, 2024, 8.4),  -- Christian McCaffrey (duplicate, peor semana)
  (11, 2, 2024, 11.7), -- Austin Ekeler
  (12, 2, 2024, 16.4), -- Derrick Henry
  (13, 2, 2024, 17.8), -- Isiah Pacheco
  (14, 2, 2024, 5.7),  -- Miles Sanders
  
  -- WRs - Semana 2
  (3, 2, 2024, 15.8),  -- Justin Jefferson
  (20, 2, 2024, 19.5), -- Tyreek Hill
  (21, 2, 2024, 8.4),  -- Stefon Diggs
  (22, 2, 2024, 11.7), -- A.J. Brown
  (24, 2, 2024, 18.3), -- Deebo Samuel
  
  -- TEs - Semana 2
  (4, 2, 2024, 18.9),  -- Travis Kelce
  (23, 2, 2024, 6.2),  -- Travis Kelce (duplicate)
  (30, 2, 2024, 7.2),  -- Mark Andrews
  (31, 2, 2024, 12.5), -- Dallas Goedert
  (32, 2, 2024, 13.6), -- George Kittle

  -- Kickers - Semana 2
  (5, 2, 2024, 12.0),  -- Justin Tucker
  (40, 2, 2024, 4.5),  -- Harrison Butker
  (41, 2, 2024, 9.8),  -- Tyler Bass
  (42, 2, 2024, 8.1),  -- Jake Elliott
  
  -- DEF - Semana 2
  (6, 2, 2024, 6.0),   -- San Francisco 49ers DEF
  (50, 2, 2024, 14.5), -- Chiefs Defense
  (51, 2, 2024, 11.3), -- Bills Defense
  (52, 2, 2024, 9.8);  -- Eagles Defense

-- ============================================
-- FUNCIONES DE UTILIDAD PARA TESTING
-- ============================================

-- Función para simular rosters realistas para testing
CREATE OR REPLACE FUNCTION setup_realistic_test_rosters(target_league_id UUID) 
RETURNS JSON AS $$
DECLARE
  team_record RECORD;
  week_num INTEGER DEFAULT 1;
  team_index INTEGER DEFAULT 0;
  qb_ids INTEGER[] DEFAULT ARRAY[1];
  rb_ids INTEGER[] DEFAULT ARRAY[2, 10, 11, 12, 13, 14];
  wr_ids INTEGER[] DEFAULT ARRAY[3, 20, 21, 22, 24];
  te_ids INTEGER[] DEFAULT ARRAY[4, 23, 30, 31, 32];
  k_ids INTEGER[] DEFAULT ARRAY[5, 40, 41, 42];
  def_ids INTEGER[] DEFAULT ARRAY[6, 50, 51, 52];
BEGIN
  -- Para cada equipo en la liga
  FOR team_record IN 
    SELECT id, name FROM fantasy_teams WHERE league_id = target_league_id ORDER BY name
  LOOP
    -- Limpiar roster existente
    DELETE FROM team_rosters WHERE fantasy_team_id = team_record.id;
    
    -- Agregar lineup típico con jugadores reales distribuidos
    
    -- Starter lineup para semana 1
    INSERT INTO team_rosters (fantasy_team_id, player_id, week, is_active, slot, acquired_type, acquired_week)
    VALUES 
      -- QB starter (siempre Mahomes para simplicidad)
      (team_record.id, qb_ids[1], week_num, true, 'QB', 'draft', 1),
      
      -- RB starters (distribuir entre equipos)
      (team_record.id, rb_ids[(team_index % array_length(rb_ids, 1)) + 1], week_num, true, 'RB1', 'draft', 1),
      (team_record.id, rb_ids[((team_index + 1) % array_length(rb_ids, 1)) + 1], week_num, true, 'RB2', 'draft', 1),
      
      -- WR starters
      (team_record.id, wr_ids[(team_index % array_length(wr_ids, 1)) + 1], week_num, true, 'WR1', 'draft', 1),
      (team_record.id, wr_ids[((team_index + 1) % array_length(wr_ids, 1)) + 1], week_num, true, 'WR2', 'draft', 1),
      
      -- TE starter
      (team_record.id, te_ids[(team_index % array_length(te_ids, 1)) + 1], week_num, true, 'TE', 'draft', 1),
      
      -- K starter
      (team_record.id, k_ids[(team_index % array_length(k_ids, 1)) + 1], week_num, true, 'K', 'draft', 1),
      
      -- DEF starter
      (team_record.id, def_ids[(team_index % array_length(def_ids, 1)) + 1], week_num, true, 'DEF', 'draft', 1),
      
      -- Bench players (no activos)
      (team_record.id, rb_ids[((team_index + 2) % array_length(rb_ids, 1)) + 1], week_num, false, 'BENCH', 'draft', 1),
      (team_record.id, wr_ids[((team_index + 2) % array_length(wr_ids, 1)) + 1], week_num, false, 'BENCH', 'draft', 1),
      (team_record.id, te_ids[((team_index + 1) % array_length(te_ids, 1)) + 1], week_num, false, 'BENCH', 'draft', 1);
    
    -- Copiar roster para semana 2
    INSERT INTO team_rosters (fantasy_team_id, player_id, week, is_active, slot, acquired_type, acquired_week)
    SELECT fantasy_team_id, player_id, 2, is_active, slot, acquired_type, acquired_week
    FROM team_rosters 
    WHERE fantasy_team_id = team_record.id AND week = 1;
    
    team_index := team_index + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', format('Rosters configurados para %s equipos con jugadores reales', team_index),
    'players_used', json_build_object(
      'qbs', qb_ids,
      'rbs', rb_ids,
      'wrs', wr_ids,
      'tes', te_ids,
      'ks', k_ids,
      'defs', def_ids
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Función para verificar puntajes calculados
CREATE OR REPLACE FUNCTION verify_team_scores(target_league_id UUID, week_num INTEGER DEFAULT 1)
RETURNS JSON AS $$
DECLARE
  team_record RECORD;
  calculated_score NUMERIC;
  results JSON[] DEFAULT '{}';
BEGIN
  FOR team_record IN 
    SELECT id, name FROM fantasy_teams WHERE league_id = target_league_id ORDER BY name
  LOOP
    SELECT calculate_team_weekly_score(team_record.id, week_num, 2024) INTO calculated_score;
    
    results := array_append(results, json_build_object(
      'team_id', team_record.id,
      'team_name', team_record.name,
      'week', week_num,
      'calculated_score', calculated_score
    ));
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'week', week_num,
    'league_id', target_league_id,
    'team_scores', array_to_json(results)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SCRIPTS DE CONFIGURACIÓN RÁPIDA
-- ============================================

-- Script para configurar una liga completa para testing
CREATE OR REPLACE FUNCTION setup_elimination_test_league(target_league_id UUID)
RETURNS JSON AS $$
DECLARE
  setup_result JSON;
  scores_result JSON;
BEGIN
  -- 1. Configurar rosters realistas
  SELECT setup_realistic_test_rosters(target_league_id) INTO setup_result;
  
  -- 2. Verificar puntajes
  SELECT verify_team_scores(target_league_id, 1) INTO scores_result;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Liga configurada para testing de eliminaciones con jugadores reales',
    'league_id', target_league_id,
    'setup_result', setup_result,
    'week_1_scores', scores_result
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

-- Para usar estas funciones en tu aplicación:

-- 1. Configurar una liga para testing:
-- SELECT setup_elimination_test_league('tu-league-id-aqui');

-- 2. Verificar puntajes antes de eliminación:
-- SELECT verify_team_scores('tu-league-id-aqui', 1);

-- 3. Procesar eliminación de prueba:
-- SELECT simulate_elimination_for_testing('tu-league-id-aqui', 1, 2024);

-- 4. Resetear liga después de testing:
-- SELECT reset_league_eliminations('tu-league-id-aqui');

-- ============================================
-- VERIFICACIÓN DE JUGADORES
-- ============================================

-- Query para verificar qué jugadores tenemos disponibles:
-- SELECT id, name, position FROM players ORDER BY position, id;

-- Query para verificar estadísticas insertadas:
-- SELECT ps.player_id, p.name, p.position, ps.week, ps.fantasy_points 
-- FROM player_stats ps 
-- JOIN players p ON ps.player_id = p.id 
-- WHERE ps.season = 2024 
-- ORDER BY ps.week, p.position, ps.fantasy_points DESC;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
FLUJO DE TESTING RECOMENDADO:

1. Crear liga de prueba en la aplicación
2. Ejecutar: SELECT setup_elimination_test_league('league-id');
3. Verificar puntajes: SELECT verify_team_scores('league-id', 1);
4. Probar eliminación: SELECT simulate_elimination_for_testing('league-id', 1);
5. Verificar resultado en la UI
6. Resetear si es necesario: SELECT reset_league_eliminations('league-id');

JUGADORES UTILIZADOS:
- QBs: Patrick Mahomes (ID: 1)
- RBs: Christian McCaffrey (2, 10), Austin Ekeler (11), Derrick Henry (12), Isiah Pacheco (13), Miles Sanders (14)
- WRs: Justin Jefferson (3), Tyreek Hill (20), Stefon Diggs (21), A.J. Brown (22), Deebo Samuel (24)
- TEs: Travis Kelce (4, 23), Mark Andrews (30), Dallas Goedert (31), George Kittle (32)
- Ks: Justin Tucker (5), Harrison Butker (40), Tyler Bass (41), Jake Elliott (42)
- DEFs: 49ers (6), Chiefs (50), Bills (51), Eagles (52)

DISTRIBUCIÓN DE PUNTAJES:
- Los datos están distribuidos para crear diferencias claras entre equipos
- Algunos jugadores tienen semanas mejores/peores para testing realista
- El equipo con menor puntaje total debería ser eliminado automáticamente
*/ 