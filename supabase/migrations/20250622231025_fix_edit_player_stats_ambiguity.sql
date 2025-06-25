-- Migración: Corregir ambigüedad en función edit_player_stats
-- Fecha: Enero 2025
-- Descripción: Corrige la ambigüedad de column reference "player_id" en edit_player_stats

-- Recrear la función edit_player_stats con referencias clarificadas
CREATE OR REPLACE FUNCTION edit_player_stats(
    admin_id UUID,
    player_id INTEGER,
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

    -- Obtener puntaje anterior (clarificar que ps.player_id se refiere a la tabla)
    SELECT fantasy_points INTO old_points
    FROM player_stats ps
    WHERE ps.player_id = edit_player_stats.player_id 
    AND ps.week = week_num 
    AND ps.season = season_year;

    -- Insertar o actualizar estadísticas (clarificar parámetro de función)
    INSERT INTO player_stats (player_id, week, season, fantasy_points)
    VALUES (edit_player_stats.player_id, week_num, season_year, new_fantasy_points)
    ON CONFLICT (player_id, week, season)
    DO UPDATE SET fantasy_points = new_fantasy_points;

    -- Registrar acción administrativa
    INSERT INTO admin_actions (
        admin_user_id,
        target_player_id,
        action_type,
        action_details,
        reason
    )
    VALUES (
        admin_id,
        edit_player_stats.player_id,
        'edit_player_stats',
        json_build_object(
            'week', week_num,
            'season', season_year,
            'old_points', old_points,
            'new_points', new_fantasy_points
        ),
        reason
    );

    RETURN json_build_object(
        'success', true, 
        'message', 'Puntajes actualizados exitosamente',
        'old_points', old_points,
        'new_points', new_fantasy_points
    );
END;
$$; 