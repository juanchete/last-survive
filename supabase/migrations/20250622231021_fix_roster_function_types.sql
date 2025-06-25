-- Migración: Corregir tipos de función get_team_roster_admin
-- Fecha: Enero 2025
-- Descripción: Corrige el conflicto de tipos VARCHAR vs TEXT en get_team_roster_admin

-- Recrear la función con casting explícito para resolver el conflicto de tipos
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
        p.name::TEXT,  -- Casting explícito a TEXT
        p.position::TEXT,  -- Casting explícito a TEXT
        COALESCE(wr.slot, 'BENCH')::TEXT,  -- Casting explícito a TEXT
        wr.is_active,
        wr.acquired_type::TEXT,  -- Casting explícito a TEXT
        wr.acquired_week,
        COALESCE(ws.fantasy_points, 0),
        COALESCE(nt.abbreviation, '')::TEXT  -- Casting explícito a TEXT
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