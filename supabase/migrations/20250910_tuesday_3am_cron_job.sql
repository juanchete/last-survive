-- ============================================
-- CRON JOB PARA MARTES 3 AM
-- Eliminación automática + Avance de semana
-- ============================================

DO $$ 
BEGIN
  -- Intentar crear la extensión pg_cron si no existe
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron no está disponible. Se usará Edge Function como alternativa.';
  END;
  
  -- Configurar cron job si pg_cron está disponible
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      -- Eliminar job previo si existe
      PERFORM cron.unschedule('tuesday-3am-elimination-advance');
      
      -- Crear nuevo cron job para martes 3 AM
      -- Cron format: minuto hora dia mes dia_semana
      -- 0 3 * * 2 = 3:00 AM todos los martes (día 2 de la semana)
      PERFORM cron.schedule(
        'tuesday-3am-elimination-advance',
        '0 3 * * 2',
        'SELECT process_all_leagues_tuesday_3am(EXTRACT(YEAR FROM NOW())::INTEGER);'
      );
      
      RAISE NOTICE 'Cron job "tuesday-3am-elimination-advance" configurado exitosamente para martes 3:00 AM';
      
      -- También crear cron job de respaldo para Edge Function (si falla el SQL)
      PERFORM cron.schedule(
        'tuesday-3am-edge-function-backup',
        '5 3 * * 2',
        $sql$
        SELECT net.http_post(
          url := (SELECT value FROM app_config WHERE key = 'weekly_elimination_webhook_url'),
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 
                     (SELECT value FROM app_config WHERE key = 'cron_secret') || '"}',
          body := '{"action": "tuesday_3am_process", "season": ' || 
                  EXTRACT(YEAR FROM NOW())::TEXT || '}'
        );
        $sql$
      );
      
      RAISE NOTICE 'Cron job de respaldo "tuesday-3am-edge-function-backup" configurado para martes 3:05 AM';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error configurando cron jobs: %. Usar Edge Function como alternativa.', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron no disponible. Configurar Edge Function con webhook externo para martes 3 AM.';
  END IF;
END $$;

-- ============================================
-- CONFIGURACIÓN PARA PROYECTOS SIN PG_CRON
-- ============================================

-- Tabla de configuración para webhooks y secrets
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuraciones por defecto
INSERT INTO app_config (key, value, description) 
VALUES 
  ('cron_secret', 'your-cron-secret-here', 'Secret para autenticar cron jobs externos'),
  ('weekly_elimination_webhook_url', 'https://your-project.supabase.co/functions/v1/weekly-elimination', 'URL del Edge Function para eliminaciones'),
  ('tuesday_3am_enabled', 'true', 'Habilitar procesamiento automático martes 3 AM'),
  ('timezone', 'America/New_York', 'Zona horaria para cron jobs (Eastern Time)')
ON CONFLICT (key) DO NOTHING;

-- Función para verificar el estado de automatización
CREATE OR REPLACE FUNCTION check_tuesday_3am_automation() 
RETURNS JSON AS $$
DECLARE
  pg_cron_available BOOLEAN := false;
  cron_jobs_count INTEGER := 0;
  config_status JSON;
BEGIN
  -- Verificar si pg_cron está disponible
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO pg_cron_available;
  
  -- Si pg_cron está disponible, contar jobs activos
  IF pg_cron_available THEN
    SELECT COUNT(*) INTO cron_jobs_count
    FROM cron.job 
    WHERE jobname IN ('tuesday-3am-elimination-advance', 'tuesday-3am-edge-function-backup');
  END IF;
  
  -- Obtener configuración
  SELECT json_object_agg(key, value) INTO config_status
  FROM app_config
  WHERE key IN ('tuesday_3am_enabled', 'timezone', 'cron_secret', 'weekly_elimination_webhook_url');
  
  RETURN json_build_object(
    'pg_cron_available', pg_cron_available,
    'active_cron_jobs', cron_jobs_count,
    'automation_enabled', (config_status->>'tuesday_3am_enabled')::boolean,
    'timezone', config_status->>'timezone',
    'webhook_configured', config_status ? 'weekly_elimination_webhook_url',
    'secret_configured', config_status ? 'cron_secret',
    'next_execution', CASE 
      WHEN pg_cron_available THEN 
        (SELECT next_run FROM cron.job WHERE jobname = 'tuesday-3am-elimination-advance' LIMIT 1)
      ELSE 
        'Configurar webhook externo para martes 3 AM ET'
    END,
    'config', config_status,
    'recommendations', CASE
      WHEN NOT pg_cron_available THEN 
        json_build_array(
          'Configurar webhook externo con GitHub Actions o servicio similar',
          'Actualizar weekly_elimination_webhook_url en app_config',
          'Configurar cron_secret para seguridad'
        )
      WHEN cron_jobs_count = 0 THEN
        json_build_array('Ejecutar migración para crear cron jobs')
      ELSE 
        json_build_array('Sistema configurado correctamente')
    END
  );
END;
$$ LANGUAGE plpgsql;

-- Función para habilitar/deshabilitar automatización
CREATE OR REPLACE FUNCTION toggle_tuesday_3am_automation(p_enabled BOOLEAN)
RETURNS JSON AS $$
DECLARE
  pg_cron_available BOOLEAN := false;
BEGIN
  -- Verificar disponibilidad de pg_cron
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO pg_cron_available;
  
  -- Actualizar configuración
  UPDATE app_config 
  SET value = p_enabled::TEXT, updated_at = NOW()
  WHERE key = 'tuesday_3am_enabled';
  
  -- Si pg_cron está disponible, habilitar/deshabilitar jobs
  IF pg_cron_available THEN
    -- Habilitar o deshabilitar cron jobs existentes
    UPDATE cron.job 
    SET active = p_enabled
    WHERE jobname IN ('tuesday-3am-elimination-advance', 'tuesday-3am-edge-function-backup');
    
    GET DIAGNOSTICS pg_cron_available = ROW_COUNT;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'enabled', p_enabled,
    'pg_cron_jobs_updated', CASE WHEN pg_cron_available THEN 'yes' ELSE 'not_available' END,
    'message', CASE 
      WHEN p_enabled THEN 'Automatización martes 3 AM habilitada'
      ELSE 'Automatización martes 3 AM deshabilitada'
    END
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INSTRUCCIONES PARA CONFIGURACIÓN MANUAL
-- ============================================

-- Para proyectos SIN pg_cron (mayoría de proyectos Supabase):
-- 1. Configurar GitHub Actions o servicio externo para ejecutar martes 3 AM
-- 2. Hacer POST request a: https://tu-proyecto.supabase.co/functions/v1/weekly-elimination
-- 3. Headers: Authorization: Bearer your-cron-secret
-- 4. Body: {"action": "tuesday_3am_process", "season": 2024}

-- Para proyectos CON pg_cron (Plan Pro+):
-- Los cron jobs se configuran automáticamente al ejecutar esta migración

-- ============================================
-- PERMISOS Y COMENTARIOS
-- ============================================

GRANT SELECT, UPDATE ON app_config TO authenticated;
GRANT EXECUTE ON FUNCTION check_tuesday_3am_automation() TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_tuesday_3am_automation(BOOLEAN) TO authenticated;

COMMENT ON TABLE app_config IS 'Configuración de la aplicación incluyendo webhooks y secrets';
COMMENT ON FUNCTION check_tuesday_3am_automation IS 'Verifica el estado de la automatización martes 3 AM';
COMMENT ON FUNCTION toggle_tuesday_3am_automation IS 'Habilita o deshabilita la automatización martes 3 AM';

-- Log de instalación
INSERT INTO admin_actions (user_id, league_id, action, details)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  NULL,
  'cron_system_installed',
  'Sistema de automatización martes 3 AM instalado - ' || 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN 'pg_cron disponible'
    ELSE 'Edge Function mode'
  END
);