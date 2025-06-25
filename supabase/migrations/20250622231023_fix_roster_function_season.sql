-- Migración: Agregar filtro de temporada en función get_team_roster_admin
-- Fecha: Enero 2025
-- Descripción: Agrega filtro de temporada para evitar duplicados entre temporadas

-- Recrear la función con filtro de temporada para evitar duplicados
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
    -- Obtener la temporada actual (podríamos hacer esto más dinámico)
    current_season := 2024;
    
    RETURN QUERY
    SELECT 
        tr.id,
        tr.player_id,
        p.name::TEXT,
        p.position::TEXT,
        COALESCE(tr.slot, 'BENCH')::TEXT,
        tr.is_active,
        tr.acquired_type::TEXT,
        tr.acquired_week,
        COALESCE(ps.fantasy_points, 0),
        COALESCE(nt.abbreviation, '')::TEXT
    FROM team_rosters tr
    JOIN players p ON tr.player_id = p.id
    LEFT JOIN nfl_teams nt ON p.nfl_team_id = nt.id
    LEFT JOIN player_stats ps ON tr.player_id = ps.player_id 
        AND ps.week = week_num 
        AND ps.season = current_season
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