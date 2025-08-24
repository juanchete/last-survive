-- ============================================
-- FIX: CORRECCIÓN DEL CÁLCULO DEL DRAFT SERPIENTE EN AUTOPICK
-- ============================================
-- Esta migración corrige el error en el cálculo del equipo actual
-- durante el draft serpiente (snake draft) en la función de autopick

-- Actualizar la función execute_auto_draft con el cálculo correcto
CREATE OR REPLACE FUNCTION public.execute_auto_draft()
RETURNS JSON AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_league RECORD;
    v_current_team_id UUID;
    v_player RECORD;
    v_drafted_count INTEGER := 0;
    v_processed_leagues INTEGER := 0;
    v_results JSONB[] := '{}';
    v_current_pick_number INTEGER;
    v_round_number INTEGER;
    v_total_teams INTEGER;
    v_position_in_round INTEGER; -- Nueva variable para el cálculo correcto
    v_result JSON;
    v_duration_ms INTEGER;
BEGIN
    -- Buscar ligas con timers expirados (con lock para evitar concurrencia)
    FOR v_league IN
        SELECT 
            l.id,
            l.name,
            l.draft_order,
            l.current_pick,
            l.auto_draft_enabled,
            l.timer_duration,
            l.turn_deadline
        FROM public.leagues l
        WHERE l.draft_status = 'in_progress'
        AND l.auto_draft_enabled = true
        AND l.turn_deadline IS NOT NULL
        AND l.turn_deadline < NOW()
        FOR UPDATE SKIP LOCKED -- Evitar condiciones de carrera
    LOOP
        v_processed_leagues := v_processed_leagues + 1;
        
        -- Log de inicio de procesamiento
        RAISE NOTICE '[Auto-Draft] Procesando liga: % (ID: %)', v_league.name, v_league.id;
        
        -- Calcular equipo actual
        v_total_teams := array_length(v_league.draft_order, 1);
        IF v_total_teams IS NULL OR v_total_teams = 0 THEN
            RAISE NOTICE '[Auto-Draft] Liga % sin equipos, saltando', v_league.id;
            CONTINUE;
        END IF;
        
        v_current_pick_number := COALESCE(v_league.current_pick, 0);
        
        -- Calcular el número de ronda (1-based)
        v_round_number := (v_current_pick_number / v_total_teams) + 1;
        
        -- CORRECCIÓN: Calcular la posición dentro de la ronda actual (1 a total_teams)
        v_position_in_round := (v_current_pick_number % v_total_teams);
        IF v_position_in_round = 0 THEN
            v_position_in_round := v_total_teams;
        END IF;
        
        -- Log detallado para debugging
        RAISE NOTICE '[Auto-Draft] Liga %, Pick #%, Ronda %, Posición en ronda: %', 
            v_league.name, v_current_pick_number + 1, v_round_number, v_position_in_round;
        
        -- CORRECCIÓN: Manejo correcto del draft serpiente
        IF v_round_number % 2 = 0 THEN
            -- Ronda par - orden inverso
            v_current_team_id := v_league.draft_order[v_total_teams - v_position_in_round + 1];
            RAISE NOTICE '[Auto-Draft] Ronda PAR - Orden inverso. Índice del array: %', 
                v_total_teams - v_position_in_round + 1;
        ELSE
            -- Ronda impar - orden normal
            v_current_team_id := v_league.draft_order[v_position_in_round];
            RAISE NOTICE '[Auto-Draft] Ronda IMPAR - Orden normal. Índice del array: %', 
                v_position_in_round;
        END IF;
        
        RAISE NOTICE '[Auto-Draft] Liga %, Pick #%, Equipo seleccionado: %', 
            v_league.name, v_current_pick_number + 1, v_current_team_id;
        
        -- Obtener mejor jugador disponible
        SELECT * INTO v_player
        FROM public.get_best_available_player(v_league.id, v_current_team_id, 1);
        
        IF v_player.player_id IS NOT NULL THEN
            -- Insertar en roster del equipo
            INSERT INTO public.team_rosters (
                fantasy_team_id, 
                player_id, 
                week, 
                slot, 
                is_active, 
                acquired_type, 
                acquired_week
            ) VALUES (
                v_current_team_id, 
                v_player.player_id, 
                1, 
                v_player.slot, 
                true, 
                'draft', 
                1
            ) ON CONFLICT (fantasy_team_id, player_id, week) DO NOTHING;
            
            -- Registrar en draft_picks
            INSERT INTO public.draft_picks (
                league_id, 
                fantasy_team_id, 
                player_id,
                pick_number, 
                round_number, 
                slot, 
                auto_drafted
            ) VALUES (
                v_league.id, 
                v_current_team_id, 
                v_player.player_id,
                v_current_pick_number + 1, 
                v_round_number, 
                v_player.slot, 
                true
            ) ON CONFLICT (league_id, pick_number) DO NOTHING;
            
            -- Registrar movimiento de roster
            INSERT INTO public.roster_moves (
                fantasy_team_id,
                player_id,
                week,
                action,
                acquired_type
            ) VALUES (
                v_current_team_id,
                v_player.player_id,
                1,
                'auto_draft_pick',
                'draft'
            );
            
            -- Verificar si el draft está completo
            IF v_current_pick_number + 1 >= v_total_teams * 10 THEN
                -- Draft completado
                UPDATE public.leagues
                SET 
                    current_pick = v_current_pick_number + 1,
                    draft_status = 'completed',
                    turn_started_at = NULL,
                    turn_deadline = NULL
                WHERE id = v_league.id;
                
                RAISE NOTICE '[Auto-Draft] Liga % - Draft COMPLETADO', v_league.name;
                
                -- Notificar a todos los equipos
                INSERT INTO public.notifications (user_id, league_id, message, type)
                SELECT 
                    ft.user_id,
                    v_league.id,
                    'El draft ha sido completado. ¡Revisa tu roster final!',
                    'success'
                FROM public.fantasy_teams ft
                WHERE ft.league_id = v_league.id;
                
            ELSE
                -- Mover al siguiente pick con nuevo timer
                UPDATE public.leagues
                SET 
                    current_pick = v_current_pick_number + 1,
                    turn_started_at = NOW(),
                    turn_deadline = NOW() + (COALESCE(v_league.timer_duration, 60) || ' seconds')::INTERVAL
                WHERE id = v_league.id;
            END IF;
            
            v_drafted_count := v_drafted_count + 1;
            
            -- Agregar resultado al array con información de debugging
            v_results := array_append(v_results, jsonb_build_object(
                'league_id', v_league.id,
                'league_name', v_league.name,
                'team_id', v_current_team_id,
                'player_id', v_player.player_id,
                'player_name', v_player.player_name,
                'position', v_player.position,
                'slot', v_player.slot,
                'pick_number', v_current_pick_number + 1,
                'round', v_round_number,
                'position_in_round', v_position_in_round,
                'is_snake_reverse', (v_round_number % 2 = 0)
            ));
            
            -- Notificar al equipo que se hizo autodraft
            INSERT INTO public.notifications (user_id, league_id, message, type)
            SELECT 
                ft.user_id,
                v_league.id,
                format('Auto-draft: %s (%s) fue seleccionado automáticamente en el slot %s (Pick #%s, Ronda %s)', 
                    v_player.player_name, v_player.position, v_player.slot, 
                    v_current_pick_number + 1, v_round_number),
                'info'
            FROM public.fantasy_teams ft
            WHERE ft.id = v_current_team_id;
            
            RAISE NOTICE '[Auto-Draft] Liga % - Jugador % drafteado para equipo % (Pick #%, Ronda %)', 
                v_league.name, v_player.player_name, v_current_team_id, 
                v_current_pick_number + 1, v_round_number;
        ELSE
            RAISE WARNING '[Auto-Draft] No se encontró jugador disponible para liga % equipo %', 
                v_league.id, v_current_team_id;
        END IF;
    END LOOP;
    
    -- Calcular duración
    v_duration_ms := extract(milliseconds from clock_timestamp() - v_start_time)::INTEGER;
    
    -- Construir resultado
    v_result := json_build_object(
        'success', true,
        'processed_leagues', v_processed_leagues,
        'drafted_count', v_drafted_count,
        'duration_ms', v_duration_ms,
        'timestamp', NOW(),
        'details', array_to_json(v_results)
    );
    
    -- Guardar en log
    INSERT INTO public.autodraft_logs (
        processed_leagues, 
        drafted_count, 
        duration_ms, 
        result
    ) VALUES (
        v_processed_leagues, 
        v_drafted_count, 
        v_duration_ms, 
        v_result
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error
        INSERT INTO public.autodraft_logs (
            processed_leagues, 
            drafted_count, 
            duration_ms, 
            error,
            result
        ) VALUES (
            v_processed_leagues, 
            v_drafted_count, 
            extract(milliseconds from clock_timestamp() - v_start_time)::INTEGER,
            SQLERRM,
            json_build_object(
                'success', false,
                'error', SQLERRM,
                'timestamp', NOW()
            )
        );
        
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', NOW()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar también la vista de monitoreo para mostrar el cálculo correcto
CREATE OR REPLACE VIEW public.autodraft_monitor AS
SELECT 
    l.id as league_id,
    l.name as league_name,
    l.draft_status,
    l.turn_started_at,
    l.turn_deadline,
    l.turn_deadline < NOW() as is_expired,
    CASE 
        WHEN l.turn_deadline IS NOT NULL THEN
            extract(epoch from (NOW() - l.turn_deadline))
        ELSE NULL
    END as seconds_expired,
    l.current_pick,
    l.timer_duration,
    array_length(l.draft_order, 1) as total_teams,
    -- Calcular ronda actual
    (l.current_pick / array_length(l.draft_order, 1)) + 1 as current_round,
    -- Calcular posición en la ronda
    CASE 
        WHEN (l.current_pick % array_length(l.draft_order, 1)) = 0 THEN 
            array_length(l.draft_order, 1)
        ELSE 
            (l.current_pick % array_length(l.draft_order, 1))
    END as position_in_round,
    -- Es ronda serpiente inversa?
    ((l.current_pick / array_length(l.draft_order, 1)) + 1) % 2 = 0 as is_snake_reverse,
    ft.name as current_team_name,
    ft.id as current_team_id,
    u.email as current_team_owner,
    (
        SELECT COUNT(*) 
        FROM draft_picks dp 
        WHERE dp.league_id = l.id 
        AND dp.auto_drafted = true
    ) as total_auto_picks,
    (
        SELECT COUNT(*) 
        FROM draft_picks dp 
        WHERE dp.league_id = l.id
    ) as total_picks
FROM leagues l
LEFT JOIN LATERAL (
    SELECT ft.*, pos_in_round
    FROM fantasy_teams ft,
    LATERAL (
        SELECT 
            CASE 
                WHEN (l.current_pick % array_length(l.draft_order, 1)) = 0 THEN 
                    array_length(l.draft_order, 1)
                ELSE 
                    (l.current_pick % array_length(l.draft_order, 1))
            END as pos_in_round
    ) calc,
    LATERAL unnest(l.draft_order) WITH ORDINALITY AS x(team_id, row_number)
    WHERE ft.id = x.team_id
    AND row_number = (
        CASE 
            -- Ronda par (serpiente inverso)
            WHEN ((l.current_pick / array_length(l.draft_order, 1)) + 1) % 2 = 0 THEN
                array_length(l.draft_order, 1) - pos_in_round + 1
            -- Ronda impar (orden normal)
            ELSE
                pos_in_round
        END
    )
    LIMIT 1
) ft ON true
LEFT JOIN auth.users u ON u.id = ft.user_id
WHERE l.draft_status IN ('pending', 'in_progress');

-- Función de testing mejorada con más información de debugging
CREATE OR REPLACE FUNCTION public.simulate_expired_draft_timer(
    p_league_id UUID,
    p_seconds_ago INTEGER DEFAULT 10
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_league_info RECORD;
BEGIN
    -- Obtener información de la liga antes de simular
    SELECT 
        l.name,
        l.current_pick,
        array_length(l.draft_order, 1) as total_teams,
        (l.current_pick / array_length(l.draft_order, 1)) + 1 as current_round,
        CASE 
            WHEN (l.current_pick % array_length(l.draft_order, 1)) = 0 THEN 
                array_length(l.draft_order, 1)
            ELSE 
                (l.current_pick % array_length(l.draft_order, 1))
        END as position_in_round,
        ((l.current_pick / array_length(l.draft_order, 1)) + 1) % 2 = 0 as is_snake_reverse
    INTO v_league_info
    FROM leagues l
    WHERE l.id = p_league_id
    AND l.draft_status = 'in_progress';
    
    -- Verificar que la liga existe y está en draft
    IF v_league_info IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Liga no encontrada o no está en draft activo'
        );
    END IF;
    
    -- Actualizar el timer para que esté expirado
    UPDATE leagues
    SET 
        turn_started_at = NOW() - (p_seconds_ago + 60 || ' seconds')::INTERVAL,
        turn_deadline = NOW() - (p_seconds_ago || ' seconds')::INTERVAL
    WHERE id = p_league_id
    AND draft_status = 'in_progress';
    
    -- Ejecutar autodraft
    SELECT execute_auto_draft() INTO v_result;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Timer simulado y autodraft ejecutado',
        'league_info', json_build_object(
            'name', v_league_info.name,
            'pick_number', v_league_info.current_pick + 1,
            'round', v_league_info.current_round,
            'position_in_round', v_league_info.position_in_round,
            'is_snake_reverse', v_league_info.is_snake_reverse,
            'total_teams', v_league_info.total_teams
        ),
        'autodraft_result', v_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar comentarios de documentación
COMMENT ON FUNCTION public.execute_auto_draft IS 
'[ACTUALIZADO 2025-01-25] Función principal de autodraft con corrección del cálculo del draft serpiente.
Ahora maneja correctamente las rondas pares e impares, asegurando que el último equipo de una ronda
sea el primero en la siguiente ronda (snake draft pattern).';

COMMENT ON VIEW public.autodraft_monitor IS 
'[ACTUALIZADO 2025-01-25] Vista de monitoreo con cálculo correcto del equipo actual en draft serpiente.
Incluye información detallada de ronda, posición y dirección del draft.';