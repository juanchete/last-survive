-- ============================================
-- SISTEMA DE AUTODRAFT AUTOMÁTICO CON CRON
-- ============================================
-- Esta migración mejora el sistema de autodraft para funcionar sin usuarios conectados
-- Incluye logging, manejo de concurrencia y optimizaciones

-- 1. Tabla de logs para auditoría de autodrafts
CREATE TABLE IF NOT EXISTS public.autodraft_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    processed_leagues INTEGER DEFAULT 0,
    drafted_count INTEGER DEFAULT 0,
    duration_ms INTEGER,
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para consultas de logs
CREATE INDEX IF NOT EXISTS idx_autodraft_logs_executed_at 
ON public.autodraft_logs(executed_at DESC);

-- 2. Función mejorada de autodraft con logging y concurrencia
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
        v_round_number := (v_current_pick_number / v_total_teams) + 1;
        
        -- Manejo de draft serpiente (snake draft)
        IF v_round_number % 2 = 0 THEN
            -- Ronda par - orden inverso
            v_current_team_id := v_league.draft_order[v_total_teams - (v_current_pick_number % v_total_teams)];
        ELSE
            -- Ronda impar - orden normal
            v_current_team_id := v_league.draft_order[(v_current_pick_number % v_total_teams) + 1];
        END IF;
        
        RAISE NOTICE '[Auto-Draft] Liga %, Pick #%, Equipo: %', 
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
            
            -- Agregar resultado al array
            v_results := array_append(v_results, jsonb_build_object(
                'league_id', v_league.id,
                'league_name', v_league.name,
                'team_id', v_current_team_id,
                'player_id', v_player.player_id,
                'player_name', v_player.player_name,
                'position', v_player.position,
                'slot', v_player.slot,
                'pick_number', v_current_pick_number + 1,
                'round', v_round_number
            ));
            
            -- Notificar al equipo que se hizo autodraft
            INSERT INTO public.notifications (user_id, league_id, message, type)
            SELECT 
                ft.user_id,
                v_league.id,
                format('Auto-draft: %s (%s) fue seleccionado automáticamente en el slot %s', 
                    v_player.player_name, v_player.position, v_player.slot),
                'info'
            FROM public.fantasy_teams ft
            WHERE ft.id = v_current_team_id;
            
            RAISE NOTICE '[Auto-Draft] Liga % - Jugador % drafteado para equipo %', 
                v_league.name, v_player.player_name, v_current_team_id;
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

-- 3. Vista para monitorear autodrafts
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
    SELECT ft.*, row_number
    FROM fantasy_teams ft,
    LATERAL unnest(l.draft_order) WITH ORDINALITY AS x(team_id, row_number)
    WHERE ft.id = x.team_id
    AND row_number = (
        CASE 
            WHEN ((l.current_pick / array_length(l.draft_order, 1)) + 1) % 2 = 0 THEN
                array_length(l.draft_order, 1) - (l.current_pick % array_length(l.draft_order, 1))
            ELSE
                (l.current_pick % array_length(l.draft_order, 1)) + 1
        END
    )
    LIMIT 1
) ft ON true
LEFT JOIN auth.users u ON u.id = ft.user_id
WHERE l.draft_status IN ('pending', 'in_progress');

-- 4. Función para testing - simular timer expirado
CREATE OR REPLACE FUNCTION public.simulate_expired_draft_timer(
    p_league_id UUID,
    p_seconds_ago INTEGER DEFAULT 10
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verificar que la liga existe y está en draft
    IF NOT EXISTS (
        SELECT 1 FROM leagues 
        WHERE id = p_league_id 
        AND draft_status = 'in_progress'
    ) THEN
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
        'autodraft_result', v_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para limpiar logs antiguos (mantener últimos 30 días)
CREATE OR REPLACE FUNCTION public.cleanup_autodraft_logs()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.autodraft_logs
    WHERE executed_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Índices de optimización
CREATE INDEX IF NOT EXISTS idx_leagues_draft_deadline 
ON public.leagues(turn_deadline) 
WHERE draft_status = 'in_progress' AND auto_draft_enabled = true;

CREATE INDEX IF NOT EXISTS idx_leagues_draft_status_active
ON public.leagues(draft_status)
WHERE draft_status IN ('pending', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_draft_picks_league_pick 
ON public.draft_picks(league_id, pick_number);

CREATE INDEX IF NOT EXISTS idx_team_rosters_draft
ON public.team_rosters(fantasy_team_id, week)
WHERE acquired_type = 'draft';

-- 7. Permisos de seguridad
REVOKE EXECUTE ON FUNCTION public.execute_auto_draft() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_auto_draft() TO service_role;

GRANT SELECT ON public.autodraft_monitor TO authenticated;
GRANT SELECT ON public.autodraft_logs TO authenticated;

GRANT EXECUTE ON FUNCTION public.simulate_expired_draft_timer(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_autodraft_logs() TO service_role;

-- 8. Políticas RLS para autodraft_logs
ALTER TABLE public.autodraft_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver logs de autodraft" ON public.autodraft_logs
    FOR SELECT
    USING (true); -- Todos pueden ver los logs

CREATE POLICY "Solo service role puede insertar logs" ON public.autodraft_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NULL); -- Solo service role (sin auth.uid())

-- 9. Comentarios de documentación
COMMENT ON FUNCTION public.execute_auto_draft IS 
'Función principal de autodraft que procesa todas las ligas con timers expirados. 
Maneja concurrencia con FOR UPDATE SKIP LOCKED y registra todos los eventos en autodraft_logs.';

COMMENT ON TABLE public.autodraft_logs IS 
'Registro de auditoría de todas las ejecuciones de autodraft, incluyendo resultados y errores.';

COMMENT ON VIEW public.autodraft_monitor IS 
'Vista de monitoreo en tiempo real del estado de autodraft en todas las ligas activas.';

COMMENT ON FUNCTION public.simulate_expired_draft_timer IS 
'Función de testing para simular un timer expirado y probar el sistema de autodraft.';

COMMENT ON FUNCTION public.cleanup_autodraft_logs IS 
'Función de mantenimiento para limpiar logs antiguos de autodraft (mantiene últimos 30 días).';