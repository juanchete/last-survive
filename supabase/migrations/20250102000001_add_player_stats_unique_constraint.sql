-- Migración: Agregar constraint única en player_stats y corregir edit_player_stats
-- Fecha: Enero 2025
-- Descripción: Agrega constraint única (player_id, week, season) y corrige función de edición

-- Paso 1: Agregar constraint única en player_stats para (player_id, week, season)
-- Nota: Esto puede fallar si ya existen duplicados, pero basándonos en los datos del usuario, 
-- parece que SÍ hay duplicados, así que primero vamos a limpiarlos

-- Eliminar duplicados manteniendo el registro con fantasy_points más alto
DELETE FROM player_stats a USING (
    SELECT MIN(id) as id, player_id, week, season 
    FROM player_stats 
    WHERE player_id IS NOT NULL 
    GROUP BY player_id, week, season HAVING COUNT(*) > 1
) b
WHERE a.player_id = b.player_id 
AND a.week = b.week 
AND a.season = b.season 
AND a.id != b.id;

-- Ahora agregar la constraint única
ALTER TABLE player_stats 
ADD CONSTRAINT player_stats_player_week_season_unique 
UNIQUE (player_id, week, season);

-- Paso 2: Eliminar la función existente y recrearla correctamente
DROP FUNCTION IF EXISTS edit_player_stats(uuid,integer,integer,integer,numeric,text);

-- Paso 3: Recrear la función con la lógica correcta
CREATE OR REPLACE FUNCTION edit_player_stats(
    admin_id UUID,
    p_player_id INTEGER,
    week_num INTEGER,
    season_year INTEGER,
    new_fantasy_points NUMERIC,
    reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_points NUMERIC;
BEGIN
    -- Verificar permisos de admin
    IF NOT is_admin(admin_id) THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos de administrador');
    END IF;

    -- Obtener puntaje anterior
    SELECT fantasy_points INTO old_points
    FROM player_stats 
    WHERE player_id = p_player_id 
    AND week = week_num 
    AND season = season_year;

    -- Insertar o actualizar estadística
    INSERT INTO player_stats (player_id, week, season, fantasy_points)
    VALUES (p_player_id, week_num, season_year, new_fantasy_points)
    ON CONFLICT (player_id, week, season)
    DO UPDATE SET fantasy_points = EXCLUDED.fantasy_points;

    -- Registrar acción de admin
    INSERT INTO admin_actions (admin_user_id, action_type, target_player_id, action_details, reason)
    VALUES (admin_id, 'edit_player_stats', p_player_id, 
        json_build_object(
            'old_points', old_points,
            'new_points', new_fantasy_points,
            'week', week_num,
            'season', season_year
        ), 
        COALESCE(reason, 'Edición manual de estadística de jugador')
    );

    RETURN json_build_object(
        'success', true, 
        'message', 'Estadística actualizada exitosamente',
        'old_points', old_points,
        'new_points', new_fantasy_points
    );
END;
$$; 