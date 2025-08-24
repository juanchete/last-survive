-- ============================================
-- ACTUALIZACIÓN DEL SISTEMA DE WAIVERS
-- Permite múltiples jugadores en una solicitud
-- ============================================

-- 1. Crear tabla para jugadores en solicitudes de waiver
CREATE TABLE IF NOT EXISTS public.waiver_request_players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    waiver_request_id INTEGER REFERENCES waiver_requests(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id),
    action VARCHAR(10) CHECK (action IN ('add', 'drop')),
    slot VARCHAR(10), -- Para los jugadores que se agregan
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX idx_waiver_request_players_request ON waiver_request_players(waiver_request_id);
CREATE INDEX idx_waiver_request_players_player ON waiver_request_players(player_id);

-- 2. Migrar datos existentes de waiver_requests a la nueva estructura
INSERT INTO waiver_request_players (waiver_request_id, player_id, action)
SELECT 
    id as waiver_request_id,
    player_id,
    'add' as action
FROM waiver_requests
WHERE player_id IS NOT NULL;

INSERT INTO waiver_request_players (waiver_request_id, player_id, action)
SELECT 
    id as waiver_request_id,
    drop_player_id as player_id,
    'drop' as action
FROM waiver_requests
WHERE drop_player_id IS NOT NULL;

-- 3. Función para crear solicitud de waiver con múltiples jugadores
CREATE OR REPLACE FUNCTION public.create_waiver_request_multi(
    p_league_id UUID,
    p_fantasy_team_id UUID,
    p_week INTEGER,
    p_add_players INTEGER[],
    p_drop_players INTEGER[]
) RETURNS JSON AS $$
DECLARE
    v_waiver_request_id INTEGER;
    v_player_id INTEGER;
    v_slot VARCHAR(10);
    v_result JSON;
BEGIN
    -- Validar que el equipo pertenece a la liga
    IF NOT EXISTS (
        SELECT 1 FROM fantasy_teams 
        WHERE id = p_fantasy_team_id 
        AND league_id = p_league_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'El equipo no pertenece a esta liga'
        );
    END IF;

    -- Validar que no exceda el límite de roster (10 jugadores)
    IF (
        SELECT COUNT(*) 
        FROM team_rosters 
        WHERE fantasy_team_id = p_fantasy_team_id 
        AND week = p_week
    ) - array_length(p_drop_players, 1) + array_length(p_add_players, 1) > 10 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La transacción excedería el límite de 10 jugadores del roster'
        );
    END IF;

    -- Crear la solicitud de waiver principal
    INSERT INTO waiver_requests (
        league_id, 
        fantasy_team_id, 
        week, 
        status,
        created_at
    ) VALUES (
        p_league_id,
        p_fantasy_team_id,
        p_week,
        'pending',
        NOW()
    ) RETURNING id INTO v_waiver_request_id;

    -- Agregar jugadores para "add"
    IF p_add_players IS NOT NULL AND array_length(p_add_players, 1) > 0 THEN
        FOREACH v_player_id IN ARRAY p_add_players
        LOOP
            -- Determinar el slot para el jugador
            SELECT 
                CASE 
                    WHEN p.position = 'QB' THEN 'QB'
                    WHEN p.position = 'RB' THEN 'RB'
                    WHEN p.position = 'WR' THEN 'WR'
                    WHEN p.position = 'TE' THEN 'TE'
                    WHEN p.position = 'K' THEN 'K'
                    WHEN p.position = 'DEF' THEN 'DEF'
                    WHEN p.position IN ('DP', 'LB', 'DB', 'DL') THEN 'DP'
                    ELSE p.position
                END INTO v_slot
            FROM players p
            WHERE p.id = v_player_id;

            INSERT INTO waiver_request_players (
                waiver_request_id,
                player_id,
                action,
                slot
            ) VALUES (
                v_waiver_request_id,
                v_player_id,
                'add',
                v_slot
            );
        END LOOP;
    END IF;

    -- Agregar jugadores para "drop"
    IF p_drop_players IS NOT NULL AND array_length(p_drop_players, 1) > 0 THEN
        FOREACH v_player_id IN ARRAY p_drop_players
        LOOP
            INSERT INTO waiver_request_players (
                waiver_request_id,
                player_id,
                action
            ) VALUES (
                v_waiver_request_id,
                v_player_id,
                'drop'
            );
        END LOOP;
    END IF;

    -- Retornar resultado exitoso
    v_result := json_build_object(
        'success', true,
        'waiver_request_id', v_waiver_request_id,
        'message', format('Solicitud de waiver creada: %s jugador(es) para agregar, %s para soltar',
            COALESCE(array_length(p_add_players, 1), 0),
            COALESCE(array_length(p_drop_players, 1), 0))
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función actualizada para procesar waivers con múltiples jugadores
CREATE OR REPLACE FUNCTION public.process_waivers_multi(
    p_league_id UUID,
    p_week INTEGER
) RETURNS JSON AS $$
DECLARE
    v_request RECORD;
    v_player RECORD;
    v_processed_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_results JSONB[] := '{}';
BEGIN
    -- Procesar solicitudes en orden de prioridad
    FOR v_request IN
        SELECT 
            wr.id,
            wr.fantasy_team_id,
            wp.priority
        FROM waiver_requests wr
        JOIN waiver_priority wp ON wp.fantasy_team_id = wr.fantasy_team_id
        WHERE wr.league_id = p_league_id
        AND wr.week = p_week
        AND wr.status = 'pending'
        AND wp.week = p_week
        ORDER BY wp.priority ASC
    LOOP
        BEGIN
            -- Iniciar transacción para esta solicitud
            -- Primero soltar jugadores
            FOR v_player IN
                SELECT player_id
                FROM waiver_request_players
                WHERE waiver_request_id = v_request.id
                AND action = 'drop'
            LOOP
                DELETE FROM team_rosters
                WHERE fantasy_team_id = v_request.fantasy_team_id
                AND player_id = v_player.player_id
                AND week = p_week;

                -- Registrar movimiento
                INSERT INTO roster_moves (
                    fantasy_team_id,
                    player_id,
                    week,
                    action,
                    acquired_type
                ) VALUES (
                    v_request.fantasy_team_id,
                    v_player.player_id,
                    p_week,
                    'waiver_drop',
                    'waiver'
                );
            END LOOP;

            -- Luego agregar jugadores
            FOR v_player IN
                SELECT player_id, slot
                FROM waiver_request_players
                WHERE waiver_request_id = v_request.id
                AND action = 'add'
            LOOP
                -- Verificar que el jugador está disponible
                IF NOT EXISTS (
                    SELECT 1 FROM team_rosters
                    WHERE player_id = v_player.player_id
                    AND week = p_week
                ) THEN
                    INSERT INTO team_rosters (
                        fantasy_team_id,
                        player_id,
                        week,
                        slot,
                        is_active,
                        acquired_type,
                        acquired_week
                    ) VALUES (
                        v_request.fantasy_team_id,
                        v_player.player_id,
                        p_week,
                        v_player.slot,
                        true,
                        'waiver',
                        p_week
                    );

                    -- Registrar movimiento
                    INSERT INTO roster_moves (
                        fantasy_team_id,
                        player_id,
                        week,
                        action,
                        acquired_type
                    ) VALUES (
                        v_request.fantasy_team_id,
                        v_player.player_id,
                        p_week,
                        'waiver_claim',
                        'waiver'
                    );
                END IF;
            END LOOP;

            -- Marcar solicitud como aprobada
            UPDATE waiver_requests
            SET status = 'approved',
                processed_at = NOW()
            WHERE id = v_request.id;

            v_processed_count := v_processed_count + 1;

            -- Agregar al resultado
            v_results := array_append(v_results, jsonb_build_object(
                'request_id', v_request.id,
                'team_id', v_request.fantasy_team_id,
                'status', 'approved'
            ));

        EXCEPTION
            WHEN OTHERS THEN
                -- Si falla, marcar como rechazada
                UPDATE waiver_requests
                SET status = 'rejected',
                    processed_at = NOW()
                WHERE id = v_request.id;

                v_failed_count := v_failed_count + 1;

                v_results := array_append(v_results, jsonb_build_object(
                    'request_id', v_request.id,
                    'team_id', v_request.fantasy_team_id,
                    'status', 'rejected',
                    'error', SQLERRM
                ));
        END;
    END LOOP;

    -- Resetear prioridades para la siguiente semana
    UPDATE waiver_priority
    SET priority = (
        SELECT row_number() OVER (ORDER BY total_points ASC)
        FROM (
            SELECT 
                wp.fantasy_team_id,
                COALESCE(SUM(ps.fantasy_points), 0) as total_points
            FROM waiver_priority wp
            LEFT JOIN team_rosters tr ON tr.fantasy_team_id = wp.fantasy_team_id
            LEFT JOIN player_stats ps ON ps.player_id = tr.player_id AND ps.week <= p_week
            WHERE wp.league_id = p_league_id
            AND wp.week = p_week
            GROUP BY wp.fantasy_team_id
        ) as team_points
        WHERE team_points.fantasy_team_id = waiver_priority.fantasy_team_id
    )
    WHERE league_id = p_league_id
    AND week = p_week + 1;

    RETURN json_build_object(
        'success', true,
        'processed', v_processed_count,
        'failed', v_failed_count,
        'details', array_to_json(v_results)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Vista actualizada para solicitudes de waiver con múltiples jugadores
CREATE OR REPLACE VIEW public.waiver_requests_detailed AS
SELECT 
    wr.id,
    wr.league_id,
    wr.fantasy_team_id,
    ft.name as team_name,
    wr.week,
    wr.status,
    wr.created_at,
    wr.processed_at,
    -- Jugadores para agregar
    (
        SELECT json_agg(json_build_object(
            'player_id', wrp.player_id,
            'player_name', p.name,
            'position', p.position,
            'team', nt.abbreviation,
            'slot', wrp.slot
        ))
        FROM waiver_request_players wrp
        JOIN players p ON p.id = wrp.player_id
        LEFT JOIN nfl_teams nt ON nt.id = p.nfl_team_id
        WHERE wrp.waiver_request_id = wr.id
        AND wrp.action = 'add'
    ) as players_to_add,
    -- Jugadores para soltar
    (
        SELECT json_agg(json_build_object(
            'player_id', wrp.player_id,
            'player_name', p.name,
            'position', p.position,
            'team', nt.abbreviation
        ))
        FROM waiver_request_players wrp
        JOIN players p ON p.id = wrp.player_id
        LEFT JOIN nfl_teams nt ON nt.id = p.nfl_team_id
        WHERE wrp.waiver_request_id = wr.id
        AND wrp.action = 'drop'
    ) as players_to_drop
FROM waiver_requests wr
JOIN fantasy_teams ft ON ft.id = wr.fantasy_team_id;

-- 6. Función helper para validar solicitud de waiver
CREATE OR REPLACE FUNCTION public.validate_waiver_request(
    p_fantasy_team_id UUID,
    p_week INTEGER,
    p_add_players INTEGER[],
    p_drop_players INTEGER[]
) RETURNS JSON AS $$
DECLARE
    v_current_roster_count INTEGER;
    v_final_count INTEGER;
    v_slot_counts JSONB;
    v_player RECORD;
    v_errors TEXT[] := '{}';
BEGIN
    -- Contar jugadores actuales
    SELECT COUNT(*) INTO v_current_roster_count
    FROM team_rosters
    WHERE fantasy_team_id = p_fantasy_team_id
    AND week = p_week;

    -- Calcular conteo final
    v_final_count := v_current_roster_count - 
        COALESCE(array_length(p_drop_players, 1), 0) + 
        COALESCE(array_length(p_add_players, 1), 0);

    -- Validar límite de roster
    IF v_final_count > 10 THEN
        v_errors := array_append(v_errors, 
            format('El roster tendría %s jugadores (máximo 10)', v_final_count));
    END IF;

    -- Validar que los jugadores a soltar están en el roster
    IF p_drop_players IS NOT NULL THEN
        FOR v_player IN
            SELECT p.id, p.name
            FROM unnest(p_drop_players) pid
            JOIN players p ON p.id = pid
            WHERE NOT EXISTS (
                SELECT 1 FROM team_rosters tr
                WHERE tr.fantasy_team_id = p_fantasy_team_id
                AND tr.player_id = pid
                AND tr.week = p_week
            )
        LOOP
            v_errors := array_append(v_errors, 
                format('No puedes soltar a %s - no está en tu roster', v_player.name));
        END LOOP;
    END IF;

    -- Validar que los jugadores a agregar están disponibles
    IF p_add_players IS NOT NULL THEN
        FOR v_player IN
            SELECT p.id, p.name
            FROM unnest(p_add_players) pid
            JOIN players p ON p.id = pid
            WHERE EXISTS (
                SELECT 1 FROM team_rosters tr
                WHERE tr.player_id = pid
                AND tr.week = p_week
            )
        LOOP
            v_errors := array_append(v_errors, 
                format('%s no está disponible', v_player.name));
        END LOOP;
    END IF;

    -- Retornar resultado
    IF array_length(v_errors, 1) > 0 THEN
        RETURN json_build_object(
            'valid', false,
            'errors', v_errors
        );
    ELSE
        RETURN json_build_object(
            'valid', true,
            'final_roster_count', v_final_count
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Permisos
GRANT EXECUTE ON FUNCTION public.create_waiver_request_multi TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_waivers_multi TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_waiver_request TO authenticated;
GRANT SELECT ON public.waiver_requests_detailed TO authenticated;

-- 8. Políticas RLS para la nueva tabla
ALTER TABLE public.waiver_request_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view waiver request players" ON public.waiver_request_players
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM waiver_requests wr
            JOIN fantasy_teams ft ON ft.id = wr.fantasy_team_id
            WHERE wr.id = waiver_request_players.waiver_request_id
            AND (ft.user_id = auth.uid() OR ft.league_id IN (
                SELECT league_id FROM fantasy_teams WHERE user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can insert waiver request players for their teams" ON public.waiver_request_players
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM waiver_requests wr
            JOIN fantasy_teams ft ON ft.id = wr.fantasy_team_id
            WHERE wr.id = waiver_request_players.waiver_request_id
            AND ft.user_id = auth.uid()
        )
    );

-- Comentarios de documentación
COMMENT ON TABLE public.waiver_request_players IS 
'Tabla que almacena los jugadores asociados a cada solicitud de waiver, permitiendo múltiples adds y drops por solicitud';

COMMENT ON FUNCTION public.create_waiver_request_multi IS 
'Crea una solicitud de waiver con múltiples jugadores para agregar y/o soltar';

COMMENT ON FUNCTION public.process_waivers_multi IS 
'Procesa todas las solicitudes de waiver pendientes para una semana, manejando múltiples jugadores por solicitud';