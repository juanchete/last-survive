-- Migration: Prevent roster duplicates
-- Date: October 12, 2025
-- Description: Add unique constraint to prevent the same player from appearing
--              multiple times in the same team's roster for the same week

-- First, let's check if there are any existing duplicates
-- (This should return 0 rows if duplicates have been cleaned up)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO duplicate_count
    FROM (
        SELECT fantasy_team_id, player_id, week, COUNT(*) as cnt
        FROM team_rosters
        WHERE is_active = true
        GROUP BY fantasy_team_id, player_id, week
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE WARNING 'Found % duplicate roster entries. These should be cleaned up before applying the constraint.', duplicate_count;
    ELSE
        RAISE NOTICE 'No duplicate roster entries found. Safe to add constraint.';
    END IF;
END $$;

-- Add unique constraint to prevent duplicates
-- A player can only appear once per team per week
ALTER TABLE team_rosters
DROP CONSTRAINT IF EXISTS unique_player_per_team_per_week;

ALTER TABLE team_rosters
ADD CONSTRAINT unique_player_per_team_per_week
UNIQUE (fantasy_team_id, player_id, week);

-- Update the add_player_to_roster function to handle duplicates gracefully
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
DECLARE
    existing_roster_id INTEGER;
BEGIN
    -- Verify admin permissions
    IF NOT is_admin(admin_id) THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos de administrador');
    END IF;

    -- Check if player already exists in roster for this team and week
    SELECT id INTO existing_roster_id
    FROM team_rosters
    WHERE fantasy_team_id = team_id
      AND player_id = add_player_to_roster.player_id
      AND week = week_num
    LIMIT 1;

    IF existing_roster_id IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Player already exists in roster for this week',
            'roster_id', existing_roster_id
        );
    END IF;

    -- Insert into roster (constraint will also prevent duplicates)
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
        add_player_to_roster.player_id,
        slot,
        week_num,
        acquired_type,
        week_num,
        true
    );

    -- Register admin action
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
            'player_id', add_player_to_roster.player_id,
            'slot', slot,
            'week', week_num
        ),
        reason
    FROM fantasy_teams ft
    WHERE ft.id = team_id;

    RETURN json_build_object('success', true, 'message', 'Jugador agregado al roster exitosamente');
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Player already exists in roster for this week'
        );
END;
$$;

-- Add index to improve query performance for duplicate checks
CREATE INDEX IF NOT EXISTS idx_team_rosters_unique_check
ON team_rosters(fantasy_team_id, player_id, week)
WHERE is_active = true;

-- Add comments
COMMENT ON CONSTRAINT unique_player_per_team_per_week ON team_rosters IS
'Ensures a player can only appear once per team per week, preventing roster duplicates';

COMMENT ON INDEX idx_team_rosters_unique_check IS
'Improves performance of duplicate checks for active roster entries';
