-- Migración: Usar DISTINCT ON para evitar duplicados en player_stats
-- Fecha: Enero 2025
-- Descripción: Usa DISTINCT ON para seleccionar solo un registro por jugador/semana/temporada

-- Recrear la función con DISTINCT ON para evitar duplicados en player_stats
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
DECLARE
    current_season INTEGER;
BEGIN
    -- Obtener la temporada actual
    current_season := 2024;
    
    RETURN QUERY
    WITH unique_stats AS (
        SELECT DISTINCT ON (ps.player_id) 
            ps.player_id, 
            ps.fantasy_points
        FROM player_stats ps
        WHERE ps.week = week_num 
        AND ps.season = current_season
        ORDER BY ps.player_id, ps.fantasy_points DESC -- Tomar el puntaje más alto si hay duplicados
    )
    SELECT 
        tr.id,
        tr.player_id,
        p.name::TEXT,
        p.position::TEXT,
        COALESCE(tr.slot, 'BENCH')::TEXT,
        tr.is_active,
        tr.acquired_type::TEXT,
        tr.acquired_week,
        COALESCE(us.fantasy_points, 0),
        COALESCE(nt.abbreviation, '')::TEXT
    FROM team_rosters tr
    JOIN players p ON tr.player_id = p.id
    LEFT JOIN nfl_teams nt ON p.nfl_team_id = nt.id
    LEFT JOIN unique_stats us ON tr.player_id = us.player_id
    WHERE tr.fantasy_team_id = team_id AND tr.week = week_num
    ORDER BY 
        CASE COALESCE(tr.slot, 'BENCH')
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