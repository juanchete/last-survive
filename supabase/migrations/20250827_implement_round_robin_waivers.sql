-- ============================================
-- IMPLEMENTACIÓN DE SISTEMA DE WAIVERS ROUND-ROBIN
-- Con período de Free Agency después de waivers
-- ============================================

-- 1. Agregar campos para tracking de estado de waiver/free agency
ALTER TABLE public.leagues 
ADD COLUMN IF NOT EXISTS waiver_process_day INTEGER DEFAULT 2, -- 0=Sunday, 1=Monday, 2=Tuesday, etc.
ADD COLUMN IF NOT EXISTS waiver_process_hour INTEGER DEFAULT 3, -- Hour in 24h format (3 = 3 AM)
ADD COLUMN IF NOT EXISTS free_agency_start_day INTEGER DEFAULT 2, -- Tuesday (after processing)
ADD COLUMN IF NOT EXISTS free_agency_start_hour INTEGER DEFAULT 3; -- 3 AM (after processing)

-- 2. Crear tabla para tracking de prioridad dinámica durante el proceso
CREATE TABLE IF NOT EXISTS public.waiver_priority_temp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    fantasy_team_id UUID REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    current_priority INTEGER NOT NULL,
    original_priority INTEGER NOT NULL,
    claims_won INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, fantasy_team_id, week)
);

-- 3. Función para determinar si estamos en período de waivers o free agency
CREATE OR REPLACE FUNCTION public.get_waiver_period_status(
    p_league_id UUID
) RETURNS JSON AS $$
DECLARE
    v_league RECORD;
    v_current_day INTEGER;
    v_current_hour INTEGER;
    v_is_waiver_period BOOLEAN;
    v_is_free_agency BOOLEAN;
BEGIN
    -- Obtener configuración de la liga
    SELECT * INTO v_league
    FROM leagues
    WHERE id = p_league_id;
    
    -- Obtener día y hora actuales
    v_current_day := EXTRACT(DOW FROM NOW())::INTEGER;
    v_current_hour := EXTRACT(HOUR FROM NOW())::INTEGER;
    
    -- Nuevo horario de waivers y free agency:
    -- DOMINGO (0), LUNES (1), MARTES hasta 3 AM (2) = Waivers
    -- MARTES desde 3 AM hasta DOMINGO = Free Agency
    
    -- Determinar si estamos en período de waivers
    IF v_current_day = 0 THEN -- Domingo - todo el día waivers (juegos NFL)
        v_is_waiver_period := true;
    ELSIF v_current_day = 1 THEN -- Lunes - todo el día waivers
        v_is_waiver_period := true;
    ELSIF v_current_day = 2 AND v_current_hour < 3 THEN -- Martes antes de 3 AM - waivers
        v_is_waiver_period := true;
    ELSE
        v_is_waiver_period := false;
    END IF;
    
    -- Determinar si estamos en free agency
    -- Free Agency: Martes desde 3 AM hasta Domingo
    IF v_current_day = 2 AND v_current_hour >= 3 THEN -- Martes desde 3 AM
        v_is_free_agency := true;
    ELSIF v_current_day >= 3 AND v_current_day <= 6 THEN -- Miércoles a Sábado
        v_is_free_agency := true;
    ELSE
        v_is_free_agency := false;
    END IF;
    
    RETURN json_build_object(
        'is_waiver_period', v_is_waiver_period,
        'is_free_agency', v_is_free_agency,
        'waiver_day', v_league.waiver_process_day,
        'waiver_hour', v_league.waiver_process_hour,
        'free_agency_day', v_league.free_agency_start_day,
        'free_agency_hour', v_league.free_agency_start_hour,
        'current_day', v_current_day,
        'current_hour', v_current_hour
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Función principal de procesamiento Round-Robin de Waivers
CREATE OR REPLACE FUNCTION public.process_waivers_round_robin(
    p_league_id UUID,
    p_week INTEGER
) RETURNS JSON AS $$
DECLARE
    v_round INTEGER := 1;
    v_requests_processed INTEGER := 0;
    v_total_processed INTEGER := 0;
    v_successful_claims INTEGER := 0;
    v_failed_claims INTEGER := 0;
    v_request RECORD;
    v_team RECORD;
    v_player RECORD;
    v_can_claim BOOLEAN;
    v_results JSONB[] := '{}';
    v_max_rounds INTEGER := 20; -- Límite de seguridad
BEGIN
    -- Inicializar tabla temporal de prioridades
    DELETE FROM waiver_priority_temp WHERE league_id = p_league_id AND week = p_week;
    
    INSERT INTO waiver_priority_temp (league_id, fantasy_team_id, week, current_priority, original_priority)
    SELECT 
        league_id, 
        fantasy_team_id, 
        week, 
        priority,
        priority
    FROM waiver_priority
    WHERE league_id = p_league_id AND week = p_week;
    
    -- Procesar por rondas
    WHILE v_round <= v_max_rounds LOOP
        v_requests_processed := 0;
        
        -- Procesar cada equipo en orden de prioridad actual
        FOR v_team IN
            SELECT DISTINCT
                wpt.fantasy_team_id,
                wpt.current_priority,
                ft.name as team_name
            FROM waiver_priority_temp wpt
            JOIN fantasy_teams ft ON ft.id = wpt.fantasy_team_id
            WHERE wpt.league_id = p_league_id
            AND wpt.week = p_week
            AND EXISTS (
                -- Solo equipos con requests pendientes
                SELECT 1 FROM waiver_requests wr
                WHERE wr.fantasy_team_id = wpt.fantasy_team_id
                AND wr.league_id = p_league_id
                AND wr.week = p_week
                AND wr.status = 'pending'
            )
            ORDER BY wpt.current_priority ASC
        LOOP
            -- Obtener la primera request pendiente del equipo
            SELECT * INTO v_request
            FROM waiver_requests
            WHERE fantasy_team_id = v_team.fantasy_team_id
            AND league_id = p_league_id
            AND week = p_week
            AND status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1;
            
            IF v_request.id IS NOT NULL THEN
                -- Verificar si el jugador sigue disponible
                SELECT NOT EXISTS (
                    SELECT 1 FROM team_rosters
                    WHERE player_id = v_request.player_id
                    AND week = p_week
                ) INTO v_can_claim;
                
                IF v_can_claim THEN
                    -- Procesar drop si es necesario
                    IF v_request.drop_player_id IS NOT NULL THEN
                        DELETE FROM team_rosters
                        WHERE fantasy_team_id = v_request.fantasy_team_id
                        AND player_id = v_request.drop_player_id
                        AND week = p_week;
                        
                        -- Registrar movimiento de drop
                        INSERT INTO roster_moves (
                            fantasy_team_id,
                            player_id,
                            week,
                            action,
                            acquired_type
                        ) VALUES (
                            v_request.fantasy_team_id,
                            v_request.drop_player_id,
                            p_week,
                            'waiver_drop',
                            'waiver'
                        );
                    END IF;
                    
                    -- Agregar el jugador al roster
                    INSERT INTO team_rosters (
                        fantasy_team_id,
                        player_id,
                        week,
                        slot,
                        is_active,
                        acquired_type,
                        acquired_week
                    ) 
                    SELECT
                        v_request.fantasy_team_id,
                        v_request.player_id,
                        p_week,
                        CASE 
                            WHEN p.position = 'QB' THEN 'QB'
                            WHEN p.position = 'RB' THEN 'RB'
                            WHEN p.position = 'WR' THEN 'WR'
                            WHEN p.position = 'TE' THEN 'TE'
                            WHEN p.position = 'K' THEN 'K'
                            WHEN p.position = 'DEF' THEN 'DEF'
                            WHEN p.position IN ('DP', 'LB', 'DB', 'DL') THEN 'DP'
                            ELSE 'BENCH'
                        END,
                        true,
                        'waiver',
                        p_week
                    FROM players p
                    WHERE p.id = v_request.player_id;
                    
                    -- Registrar movimiento de add
                    INSERT INTO roster_moves (
                        fantasy_team_id,
                        player_id,
                        week,
                        action,
                        acquired_type
                    ) VALUES (
                        v_request.fantasy_team_id,
                        v_request.player_id,
                        p_week,
                        'waiver_claim',
                        'waiver'
                    );
                    
                    -- Marcar request como aprobada
                    UPDATE waiver_requests
                    SET status = 'approved',
                        processed_at = NOW()
                    WHERE id = v_request.id;
                    
                    -- Mover equipo al final de la prioridad
                    UPDATE waiver_priority_temp
                    SET current_priority = (
                        SELECT MAX(current_priority) + 1
                        FROM waiver_priority_temp
                        WHERE league_id = p_league_id AND week = p_week
                    ),
                    claims_won = claims_won + 1
                    WHERE fantasy_team_id = v_request.fantasy_team_id
                    AND league_id = p_league_id
                    AND week = p_week;
                    
                    v_successful_claims := v_successful_claims + 1;
                    v_requests_processed := v_requests_processed + 1;
                    
                    -- Agregar al resultado
                    v_results := array_append(v_results, jsonb_build_object(
                        'round', v_round,
                        'team_id', v_request.fantasy_team_id,
                        'team_name', v_team.team_name,
                        'player_id', v_request.player_id,
                        'status', 'approved',
                        'priority', v_team.current_priority
                    ));
                    
                ELSE
                    -- Jugador ya no disponible, marcar como rechazada
                    UPDATE waiver_requests
                    SET status = 'rejected',
                        processed_at = NOW()
                    WHERE id = v_request.id;
                    
                    v_failed_claims := v_failed_claims + 1;
                    
                    -- Agregar al resultado
                    v_results := array_append(v_results, jsonb_build_object(
                        'round', v_round,
                        'team_id', v_request.fantasy_team_id,
                        'team_name', v_team.team_name,
                        'player_id', v_request.player_id,
                        'status', 'rejected',
                        'reason', 'Player no longer available',
                        'priority', v_team.current_priority
                    ));
                END IF;
                
                v_total_processed := v_total_processed + 1;
            END IF;
        END LOOP;
        
        -- Si no se procesaron requests en esta ronda, terminar
        EXIT WHEN v_requests_processed = 0;
        
        v_round := v_round + 1;
    END LOOP;
    
    -- Actualizar prioridades para la siguiente semana basado en puntos totales
    UPDATE waiver_priority wp
    SET priority = subquery.new_priority
    FROM (
        SELECT 
            ft.id as fantasy_team_id,
            ROW_NUMBER() OVER (ORDER BY ft.points ASC) as new_priority
        FROM fantasy_teams ft
        WHERE ft.league_id = p_league_id
        AND NOT ft.eliminated
    ) subquery
    WHERE wp.fantasy_team_id = subquery.fantasy_team_id
    AND wp.league_id = p_league_id
    AND wp.week = p_week + 1;
    
    -- Crear notificaciones
    INSERT INTO notifications (user_id, league_id, type, message)
    SELECT 
        ft.user_id,
        p_league_id,
        CASE 
            WHEN wr.status = 'approved' THEN 'success'
            ELSE 'info'
        END,
        CASE 
            WHEN wr.status = 'approved' THEN 
                format('✅ Waiver Aprobada: Obtuviste a %s', p.name)
            ELSE 
                format('❌ Waiver Rechazada: No pudiste obtener a %s', p.name)
        END
    FROM waiver_requests wr
    JOIN fantasy_teams ft ON wr.fantasy_team_id = ft.id
    JOIN players p ON p.id = wr.player_id
    WHERE wr.league_id = p_league_id
    AND wr.processed_at >= NOW() - INTERVAL '1 minute';
    
    RETURN json_build_object(
        'success', true,
        'total_rounds', v_round - 1,
        'total_processed', v_total_processed,
        'successful_claims', v_successful_claims,
        'failed_claims', v_failed_claims,
        'details', array_to_json(v_results)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para Free Agency (primer llegado, primer servido)
CREATE OR REPLACE FUNCTION public.claim_free_agent(
    p_league_id UUID,
    p_fantasy_team_id UUID,
    p_player_id INTEGER,
    p_drop_player_id INTEGER DEFAULT NULL,
    p_week INTEGER DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_week INTEGER;
    v_period_status JSON;
    v_roster_count INTEGER;
    v_player_available BOOLEAN;
BEGIN
    -- Usar semana actual si no se especifica
    v_week := COALESCE(p_week, (
        SELECT number FROM weeks 
        WHERE league_id = p_league_id 
        AND status = 'active' 
        LIMIT 1
    ));
    
    -- Verificar período
    SELECT get_waiver_period_status(p_league_id) INTO v_period_status;
    
    IF NOT (v_period_status->>'is_free_agency')::boolean THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No estamos en período de Free Agency. Usa el sistema de waivers.'
        );
    END IF;
    
    -- Verificar que el jugador está disponible
    SELECT NOT EXISTS (
        SELECT 1 FROM team_rosters
        WHERE player_id = p_player_id
        AND week = v_week
    ) INTO v_player_available;
    
    IF NOT v_player_available THEN
        RETURN json_build_object(
            'success', false,
            'error', 'El jugador ya está en otro roster'
        );
    END IF;
    
    -- Verificar límite de roster
    SELECT COUNT(*) INTO v_roster_count
    FROM team_rosters
    WHERE fantasy_team_id = p_fantasy_team_id
    AND week = v_week;
    
    IF v_roster_count >= 10 AND p_drop_player_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Roster completo. Debes soltar un jugador.'
        );
    END IF;
    
    -- Procesar drop si es necesario
    IF p_drop_player_id IS NOT NULL THEN
        DELETE FROM team_rosters
        WHERE fantasy_team_id = p_fantasy_team_id
        AND player_id = p_drop_player_id
        AND week = v_week;
        
        INSERT INTO roster_moves (
            fantasy_team_id,
            player_id,
            week,
            action,
            acquired_type
        ) VALUES (
            p_fantasy_team_id,
            p_drop_player_id,
            v_week,
            'drop',
            'free_agency'
        );
    END IF;
    
    -- Agregar jugador
    INSERT INTO team_rosters (
        fantasy_team_id,
        player_id,
        week,
        slot,
        is_active,
        acquired_type,
        acquired_week
    )
    SELECT
        p_fantasy_team_id,
        p_player_id,
        v_week,
        CASE 
            WHEN p.position = 'QB' THEN 'QB'
            WHEN p.position = 'RB' THEN 'RB'
            WHEN p.position = 'WR' THEN 'WR'
            WHEN p.position = 'TE' THEN 'TE'
            WHEN p.position = 'K' THEN 'K'
            WHEN p.position = 'DEF' THEN 'DEF'
            WHEN p.position IN ('DP', 'LB', 'DB', 'DL') THEN 'DP'
            ELSE 'BENCH'
        END,
        false, -- Inicialmente en bench
        'free_agency',
        v_week
    FROM players p
    WHERE p.id = p_player_id;
    
    -- Registrar movimiento
    INSERT INTO roster_moves (
        fantasy_team_id,
        player_id,
        week,
        action,
        acquired_type
    ) VALUES (
        p_fantasy_team_id,
        p_player_id,
        v_week,
        'add',
        'free_agency'
    );
    
    -- Notificar
    INSERT INTO notifications (user_id, league_id, type, message)
    SELECT 
        ft.user_id,
        p_league_id,
        'success',
        format('✅ Free Agent agregado: %s', p.name)
    FROM fantasy_teams ft
    JOIN players p ON p.id = p_player_id
    WHERE ft.id = p_fantasy_team_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Jugador agregado exitosamente',
        'player_id', p_player_id,
        'fantasy_team_id', p_fantasy_team_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función para procesar waivers automáticamente (para cron job)
CREATE OR REPLACE FUNCTION public.auto_process_waivers() RETURNS void AS $$
DECLARE
    v_league RECORD;
    v_current_week INTEGER;
    v_result JSON;
BEGIN
    -- Para cada liga activa
    FOR v_league IN
        SELECT l.* 
        FROM leagues l
        WHERE EXISTS (
            SELECT 1 FROM weeks w 
            WHERE w.league_id = l.id 
            AND w.status = 'active'
        )
    LOOP
        -- Verificar si es momento de procesar waivers
        IF EXTRACT(DOW FROM NOW()) = v_league.waiver_process_day 
           AND EXTRACT(HOUR FROM NOW()) = v_league.waiver_process_hour THEN
            
            -- Obtener semana actual
            SELECT number INTO v_current_week
            FROM weeks
            WHERE league_id = v_league.id
            AND status = 'active'
            LIMIT 1;
            
            -- Procesar waivers
            SELECT process_waivers_round_robin(v_league.id, v_current_week) INTO v_result;
            
            -- Log del resultado
            INSERT INTO admin_actions (
                league_id,
                action_type,
                details,
                performed_at
            ) VALUES (
                v_league.id,
                'auto_process_waivers',
                v_result,
                NOW()
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Vista para ver estado actual de waivers/free agency
CREATE OR REPLACE VIEW public.waiver_status_view AS
SELECT 
    l.id as league_id,
    l.name as league_name,
    get_waiver_period_status(l.id) as period_status,
    (
        SELECT COUNT(*) 
        FROM waiver_requests wr 
        WHERE wr.league_id = l.id 
        AND wr.status = 'pending'
    ) as pending_requests,
    (
        SELECT COUNT(*) 
        FROM fantasy_teams ft 
        WHERE ft.league_id = l.id 
        AND NOT ft.eliminated
    ) as active_teams
FROM leagues l;

-- 8. Permisos
GRANT EXECUTE ON FUNCTION public.process_waivers_round_robin TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_free_agent TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_waiver_period_status TO authenticated;
GRANT SELECT ON public.waiver_status_view TO authenticated;
GRANT ALL ON public.waiver_priority_temp TO authenticated;

-- 9. Políticas RLS para la nueva tabla
ALTER TABLE public.waiver_priority_temp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view waiver priority temp" ON public.waiver_priority_temp
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM fantasy_teams ft
            WHERE ft.league_id = waiver_priority_temp.league_id
            AND ft.user_id = auth.uid()
        )
    );

-- 10. Cron job para procesar waivers automáticamente
-- Ejecutar cada hora para verificar si alguna liga necesita procesar waivers
SELECT cron.schedule(
    'process-waivers-hourly',
    '0 * * * *', -- Cada hora en punto
    'SELECT auto_process_waivers();'
);

-- Comentarios
COMMENT ON FUNCTION public.process_waivers_round_robin IS 
'Procesa waivers en formato round-robin: cada equipo obtiene un jugador por ronda, al obtenerlo pasa al final de la cola';

COMMENT ON FUNCTION public.claim_free_agent IS 
'Permite reclamar un jugador en período de Free Agency (primer llegado, primer servido)';

COMMENT ON FUNCTION public.get_waiver_period_status IS 
'Determina si la liga está en período de waivers o free agency basado en día y hora';