-- ============================================
-- CONFIGURACIÓN DE PG_CRON PARA AUTODRAFT
-- ============================================
-- Esta migración configura pg_cron para ejecutar el autodraft automáticamente
-- NOTA: pg_cron debe estar habilitado en tu instancia de Supabase (Plan Pro+)

-- Verificar si pg_cron está disponible
DO $$
BEGIN
    -- Intentar crear la extensión si no existe
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    
    -- Si pg_cron está disponible, configurar el job
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        
        -- Eliminar job anterior si existe
        PERFORM cron.unschedule('auto-draft-checker');
        
        -- Crear nuevo job que se ejecuta cada 30 segundos
        -- Nota: pg_cron en Supabase puede tener limitaciones en la frecuencia mínima
        -- Si 30 segundos no funciona, usar '* * * * *' para cada minuto
        PERFORM cron.schedule(
            'auto-draft-checker',           -- nombre del job
            '*/30 * * * * *',               -- cada 30 segundos (o '* * * * *' para cada minuto)
            $$
            SELECT net.http_post(
                url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-draft-checker',
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
                    'Content-Type', 'application/json'
                ),
                body := '{}'::jsonb,
                timeout_milliseconds := 25000  -- timeout de 25 segundos
            );
            $$
        );
        
        RAISE NOTICE 'pg_cron job "auto-draft-checker" creado exitosamente';
        
        -- Crear job de limpieza de logs (ejecutar diariamente a las 3 AM)
        PERFORM cron.unschedule('autodraft-logs-cleanup');
        PERFORM cron.schedule(
            'autodraft-logs-cleanup',
            '0 3 * * *',  -- 3:00 AM todos los días
            'SELECT public.cleanup_autodraft_logs();'
        );
        
        RAISE NOTICE 'pg_cron job "autodraft-logs-cleanup" creado exitosamente';
        
    ELSE
        RAISE NOTICE 'pg_cron no está disponible. Usar GitHub Actions o servicio externo como alternativa.';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error configurando pg_cron: %. Usar método alternativo.', SQLERRM;
END;
$$;

-- Función helper para verificar estado de pg_cron
CREATE OR REPLACE FUNCTION public.check_autodraft_cron_status()
RETURNS JSON AS $$
DECLARE
    v_job_exists BOOLEAN := false;
    v_job_info RECORD;
    v_last_run TIMESTAMPTZ;
    v_next_run TIMESTAMPTZ;
    v_pg_cron_available BOOLEAN := false;
BEGIN
    -- Verificar si pg_cron está disponible
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) INTO v_pg_cron_available;
    
    IF NOT v_pg_cron_available THEN
        RETURN json_build_object(
            'pg_cron_available', false,
            'message', 'pg_cron no está instalado. Usar GitHub Actions o servicio externo.',
            'alternative_method', 'github_actions'
        );
    END IF;
    
    -- Buscar información del job
    SELECT 
        jobid,
        jobname,
        schedule,
        command,
        nodename,
        nodeport,
        database,
        username,
        active
    INTO v_job_info
    FROM cron.job
    WHERE jobname = 'auto-draft-checker';
    
    IF v_job_info IS NOT NULL THEN
        v_job_exists := true;
        
        -- Obtener última ejecución
        SELECT MAX(start_time) INTO v_last_run
        FROM cron.job_run_details
        WHERE jobid = v_job_info.jobid
        AND status = 'succeeded';
    END IF;
    
    RETURN json_build_object(
        'pg_cron_available', true,
        'job_exists', v_job_exists,
        'job_info', CASE 
            WHEN v_job_exists THEN json_build_object(
                'id', v_job_info.jobid,
                'name', v_job_info.jobname,
                'schedule', v_job_info.schedule,
                'active', v_job_info.active,
                'last_run', v_last_run,
                'time_since_last_run', 
                    CASE 
                        WHEN v_last_run IS NOT NULL THEN 
                            extract(epoch from (NOW() - v_last_run))::INTEGER 
                        ELSE NULL 
                    END
            )
            ELSE NULL
        END,
        'recommendation', CASE
            WHEN NOT v_job_exists THEN 'Ejecutar migración para crear el job'
            WHEN v_last_run IS NULL THEN 'Job creado pero nunca ejecutado'
            WHEN extract(epoch from (NOW() - v_last_run)) > 120 THEN 'Job puede estar detenido'
            ELSE 'Job funcionando correctamente'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para habilitar/deshabilitar el cron job manualmente
CREATE OR REPLACE FUNCTION public.toggle_autodraft_cron(p_enabled BOOLEAN)
RETURNS JSON AS $$
DECLARE
    v_job_id BIGINT;
BEGIN
    -- Verificar si pg_cron está disponible
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'pg_cron no está disponible'
        );
    END IF;
    
    -- Obtener ID del job
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'auto-draft-checker';
    
    IF v_job_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Job auto-draft-checker no existe'
        );
    END IF;
    
    -- Actualizar estado del job
    UPDATE cron.job
    SET active = p_enabled
    WHERE jobid = v_job_id;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Job auto-draft-checker %s', 
            CASE WHEN p_enabled THEN 'habilitado' ELSE 'deshabilitado' END),
        'job_id', v_job_id,
        'enabled', p_enabled
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION public.check_autodraft_cron_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_autodraft_cron(BOOLEAN) TO authenticated;

-- Comentarios
COMMENT ON FUNCTION public.check_autodraft_cron_status IS 
'Verifica el estado del cron job de autodraft y proporciona información de diagnóstico.';

COMMENT ON FUNCTION public.toggle_autodraft_cron IS 
'Habilita o deshabilita el cron job de autodraft. Útil para mantenimiento o debugging.';