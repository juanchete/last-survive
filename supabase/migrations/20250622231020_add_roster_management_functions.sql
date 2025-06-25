-- Migración: Funciones para gestión de rosters y puntajes
-- Fecha: Enero 2025
-- Descripción: Funciones administrativas para editar rosters y puntajes de equipos

-- 1. Función para obtener roster completo de un equipo (versión corregida)
-- Esta función replica la lógica del hook useRosterWithPlayerDetails para asegurar consistencia.
CREATE OR REPLACE FUNCTION get_team_roster_admin(
    team_id UUID,
    week_num INTEGER DEFAULT 1
)
RETURNS TABLE (
    roster_id INTEGER,
    player_id INTEGER,
    player_name TEXT,
    player_position TEXT,
    slot TEXT,
    is_active BOOLEAN,
    acquired_type TEXT,
    acquired_week INTEGER,
    fantasy_points NUMERIC,
    nfl_team_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH weekly_roster AS (
        SELECT *
        FROM team_rosters
        WHERE fantasy_team_id = team_id AND week = week_num
    ),
    weekly_stats AS (
        SELECT 
            ps.player_id, 
            ps.fantasy_points
        FROM player_stats ps
        WHERE ps.week = week_num AND ps.player_id IN (SELECT wr.player_id FROM weekly_roster wr)
    )
    SELECT 
        wr.id,
        wr.player_id,
        p.name,
        p.position,
        COALESCE(wr.slot, 'BENCH'),
        wr.is_active,
        wr.acquired_type,
        wr.acquired_week,
        COALESCE(ws.fantasy_points, 0),
        nt.abbreviation
    FROM weekly_roster wr
    JOIN players p ON wr.player_id = p.id
    LEFT JOIN nfl_teams nt ON p.nfl_team_id = nt.id
    LEFT JOIN weekly_stats ws ON wr.player_id = ws.player_id
    ORDER BY 
        CASE COALESCE(wr.slot, 'BENCH')
            WHEN 'QB' THEN 1
            WHEN 'RB' THEN 2
            WHEN 'WR' THEN 3
            WHEN 'TE' THEN 4
            WHEN 'FLEX' THEN 5
            WHEN 'K' THEN 6
            WHEN 'DEF' THEN 7
            WHEN 'BENCH' THEN 8
            ELSE 9
        END,
        p.name;
END;
$$;

-- 2. Función para editar jugador en roster
CREATE OR REPLACE FUNCTION edit_roster_player(
    admin_id UUID,
    roster_id INTEGER,
    new_player_id INTEGER,
    new_slot TEXT DEFAULT NULL,
    reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_player_id INTEGER;
    team_id UUID;
    current_week INTEGER;
BEGIN
    -- Verificar permisos de admin
    IF NOT is_admin(admin_id) THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos de administrador');
    END IF;

    -- Obtener información actual del roster
    SELECT tr.player_id, tr.fantasy_team_id, tr.week
    INTO old_player_id, team_id, current_week
    FROM team_rosters tr
    WHERE tr.id = roster_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Registro de roster no encontrado');
    END IF;

    -- Actualizar el roster
    UPDATE team_rosters 
    SET 
        player_id = new_player_id,
        slot = COALESCE(new_slot, slot)
    WHERE id = roster_id;

    -- Registrar acción administrativa
    INSERT INTO admin_actions (
        admin_user_id, 
        target_user_id, 
        action_type, 
        action_details,
        reason
    )
    SELECT 
        admin_id,
        ft.user_id,
        'edit_roster',
        json_build_object(
            'roster_id', roster_id,
            'old_player_id', old_player_id,
            'new_player_id', new_player_id,
            'new_slot', new_slot,
            'week', current_week
        ),
        reason
    FROM fantasy_teams ft
    WHERE ft.id = team_id;

    RETURN json_build_object('success', true, 'message', 'Roster actualizado exitosamente');
END;
$$;

-- 3. Función para editar puntajes de jugador
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

    -- Obtener puntaje anterior
    SELECT fantasy_points INTO old_points
    FROM player_stats
    WHERE player_id = edit_player_stats.player_id 
    AND week = week_num 
    AND season = season_year;

    -- Insertar o actualizar estadísticas
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

-- 4. Función para agregar jugador al roster
CREATE OR REPLACE FUNCTION add_player_to_roster(
    admin_id UUID,
    team_id UUID,
    player_id INTEGER,
    slot TEXT,
    week_num INTEGER,
    acquired_type TEXT DEFAULT 'admin_add',
    reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar permisos de admin
    IF NOT is_admin(admin_id) THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos de administrador');
    END IF;

    -- Insertar en el roster
    INSERT INTO team_rosters (
        fantasy_team_id,
        player_id,
        slot,
        week,
        acquired_type,
        acquired_week,
        is_active
    )
    VALUES (
        team_id,
        player_id,
        slot,
        week_num,
        acquired_type,
        week_num,
        true
    );

    -- Registrar acción administrativa
    INSERT INTO admin_actions (
        admin_user_id,
        target_user_id,
        action_type,
        action_details,
        reason
    )
    SELECT 
        admin_id,
        ft.user_id,
        'add_player_to_roster',
        json_build_object(
            'team_id', team_id,
            'player_id', player_id,
            'slot', slot,
            'week', week_num
        ),
        reason
    FROM fantasy_teams ft
    WHERE ft.id = team_id;

    RETURN json_build_object('success', true, 'message', 'Jugador agregado al roster exitosamente');
END;
$$;

-- 5. Función para remover jugador del roster
CREATE OR REPLACE FUNCTION remove_player_from_roster(
    admin_id UUID,
    roster_id INTEGER,
    reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    removed_player_id INTEGER;
    team_id UUID;
BEGIN
    -- Verificar permisos de admin
    IF NOT is_admin(admin_id) THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos de administrador');
    END IF;

    -- Obtener información del jugador a remover
    SELECT tr.player_id, tr.fantasy_team_id
    INTO removed_player_id, team_id
    FROM team_rosters tr
    WHERE tr.id = roster_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Registro de roster no encontrado');
    END IF;

    -- Eliminar del roster
    DELETE FROM team_rosters WHERE id = roster_id;

    -- Registrar acción administrativa
    INSERT INTO admin_actions (
        admin_user_id,
        target_user_id,
        action_type,
        action_details,
        reason
    )
    SELECT 
        admin_id,
        ft.user_id,
        'remove_player_from_roster',
        json_build_object(
            'roster_id', roster_id,
            'player_id', removed_player_id,
            'team_id', team_id
        ),
        reason
    FROM fantasy_teams ft
    WHERE ft.id = team_id;

    RETURN json_build_object('success', true, 'message', 'Jugador removido del roster exitosamente');
END;
$$;

-- 6. Función para recalcular puntajes de equipo
CREATE OR REPLACE FUNCTION recalculate_team_scores(
    admin_id UUID,
    team_id UUID,
    week_num INTEGER,
    season_year INTEGER DEFAULT 2024
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_total NUMERIC;
    old_total NUMERIC;
BEGIN
    -- Verificar permisos de admin
    IF NOT is_admin(admin_id) THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos de administrador');
    END IF;

    -- Obtener puntaje anterior del equipo
    SELECT points INTO old_total
    FROM fantasy_teams
    WHERE id = team_id;

    -- Calcular nuevo puntaje usando función existente
    SELECT calculate_team_weekly_score(team_id, week_num, season_year) INTO new_total;

    -- Actualizar puntaje del equipo
    UPDATE fantasy_teams 
    SET points = COALESCE(points, 0) + new_total
    WHERE id = team_id;

    -- Registrar acción administrativa
    INSERT INTO admin_actions (
        admin_user_id,
        target_user_id,
        action_type,
        action_details
    )
    SELECT 
        admin_id,
        ft.user_id,
        'recalculate_team_scores',
        json_build_object(
            'team_id', team_id,
            'week', week_num,
            'season', season_year,
            'old_total', old_total,
            'weekly_score', new_total
        )
    FROM fantasy_teams ft
    WHERE ft.id = team_id;

    RETURN json_build_object(
        'success', true, 
        'message', 'Puntajes recalculados exitosamente',
        'weekly_score', new_total,
        'old_total', old_total
    );
END;
$$;

-- Comentarios de documentación
COMMENT ON FUNCTION get_team_roster_admin IS 'Obtiene roster completo de un equipo para administración';
COMMENT ON FUNCTION edit_roster_player IS 'Edita un jugador en el roster de un equipo';
COMMENT ON FUNCTION edit_player_stats IS 'Edita los puntajes de fantasy de un jugador';
COMMENT ON FUNCTION add_player_to_roster IS 'Agrega un jugador al roster de un equipo';
COMMENT ON FUNCTION remove_player_from_roster IS 'Remueve un jugador del roster de un equipo';
COMMENT ON FUNCTION recalculate_team_scores IS 'Recalcula los puntajes totales de un equipo'; 