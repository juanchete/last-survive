-- 1. Verificar si Realtime está habilitado en las tablas necesarias
SELECT 
    schemaname,
    tablename,
    rowsecurity 
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND tablename IN ('leagues', 'team_rosters', 'roster_moves', 'fantasy_teams');

-- 2. Verificar la publicación de Realtime
SELECT 
    * 
FROM 
    pg_publication_tables 
WHERE 
    pubname = 'supabase_realtime';

-- 3. Si las tablas NO están en la publicación, ejecutar esto:
-- IMPORTANTE: Solo ejecuta estos comandos si las tablas NO aparecen en el resultado anterior

-- Habilitar Realtime para la tabla leagues
ALTER PUBLICATION supabase_realtime ADD TABLE public.leagues;

-- Habilitar Realtime para la tabla team_rosters
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_rosters;

-- Habilitar Realtime para la tabla roster_moves
ALTER PUBLICATION supabase_realtime ADD TABLE public.roster_moves;

-- Habilitar Realtime para la tabla fantasy_teams
ALTER PUBLICATION supabase_realtime ADD TABLE public.fantasy_teams;

-- 4. Verificar nuevamente que las tablas estén en la publicación
SELECT 
    * 
FROM 
    pg_publication_tables 
WHERE 
    pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('leagues', 'team_rosters', 'roster_moves', 'fantasy_teams');

-- 5. Verificar si hay triggers en las tablas
SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation,
    action_statement
FROM 
    information_schema.triggers
WHERE 
    event_object_schema = 'public'
    AND event_object_table IN ('leagues', 'team_rosters')
ORDER BY 
    event_object_table, 
    event_manipulation;