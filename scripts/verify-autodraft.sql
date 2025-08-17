-- ============================================
-- SCRIPT DE VERIFICACIÓN DEL SISTEMA AUTODRAFT
-- ============================================
-- Ejecuta estas queries en el SQL Editor de Supabase para verificar

-- 1. Verificar que las funciones existen
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'execute_auto_draft',
    'get_best_available_player',
    'simulate_expired_draft_timer',
    'check_autodraft_cron_status',
    'cleanup_autodraft_logs'
)
ORDER BY p.proname;

-- 2. Verificar que la tabla de logs existe
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'autodraft_logs'
ORDER BY ordinal_position;

-- 3. Verificar el estado de pg_cron (si está disponible)
SELECT check_autodraft_cron_status();

-- 4. Ver los últimos logs de autodraft
SELECT 
    executed_at,
    processed_leagues,
    drafted_count,
    duration_ms,
    error
FROM autodraft_logs
ORDER BY executed_at DESC
LIMIT 10;

-- 5. Ver drafts activos que podrían necesitar autodraft
SELECT * FROM autodraft_monitor;

-- 6. TEST: Simular un timer expirado (reemplaza 'your-league-id')
-- CUIDADO: Esto ejecutará un autodraft real si hay un draft activo
-- SELECT simulate_expired_draft_timer('your-league-id'::uuid, 10);

-- 7. Verificar que la Edge Function está desplegada
-- (Esto no se puede verificar desde SQL, hazlo desde el dashboard o CLI)