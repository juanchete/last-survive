-- Add timer tracking columns to leagues table
ALTER TABLE public.leagues 
ADD COLUMN IF NOT EXISTS turn_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS turn_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_draft_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS timer_duration INTEGER DEFAULT 60;

-- Create draft_picks table for history tracking
CREATE TABLE IF NOT EXISTS public.draft_picks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    fantasy_team_id UUID NOT NULL REFERENCES public.fantasy_teams(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES public.players(id),
    pick_number INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    slot VARCHAR(10) NOT NULL,
    auto_drafted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, pick_number)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_draft_picks_league_id ON public.draft_picks(league_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_team_id ON public.draft_picks(fantasy_team_id);

-- Function to start/reset draft turn timer
CREATE OR REPLACE FUNCTION public.start_draft_turn(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    v_timer_duration INTEGER;
BEGIN
    -- Get timer duration from league settings
    SELECT timer_duration INTO v_timer_duration
    FROM public.leagues
    WHERE id = p_league_id;
    
    -- If no timer duration set, use default of 60 seconds
    IF v_timer_duration IS NULL THEN
        v_timer_duration := 60;
    END IF;
    
    -- Update the league with new timer values
    UPDATE public.leagues
    SET 
        turn_started_at = NOW(),
        turn_deadline = NOW() + (v_timer_duration || ' seconds')::INTERVAL
    WHERE id = p_league_id
    AND draft_status = 'in_progress';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get best available player based on team needs
CREATE OR REPLACE FUNCTION public.get_best_available_player(
    p_league_id UUID,
    p_fantasy_team_id UUID,
    p_week INTEGER
)
RETURNS TABLE(
    player_id INTEGER,
    player_name TEXT,
    position VARCHAR(10),
    slot VARCHAR(10)
) AS $$
DECLARE
    v_needed_positions TEXT[];
    v_player RECORD;
BEGIN
    -- Determine what positions the team needs
    v_needed_positions := ARRAY[]::TEXT[];
    
    -- Check each position against roster limits
    -- QB (1 max)
    IF (SELECT COUNT(*) FROM team_rosters tr 
        JOIN players p ON tr.player_id = p.id 
        WHERE tr.fantasy_team_id = p_fantasy_team_id 
        AND tr.week = p_week 
        AND p.position = 'QB') < 1 THEN
        v_needed_positions := array_append(v_needed_positions, 'QB');
    END IF;
    
    -- RB (2 max)
    IF (SELECT COUNT(*) FROM team_rosters tr 
        JOIN players p ON tr.player_id = p.id 
        WHERE tr.fantasy_team_id = p_fantasy_team_id 
        AND tr.week = p_week 
        AND p.position = 'RB') < 2 THEN
        v_needed_positions := array_append(v_needed_positions, 'RB');
    END IF;
    
    -- WR (2 max)
    IF (SELECT COUNT(*) FROM team_rosters tr 
        JOIN players p ON tr.player_id = p.id 
        WHERE tr.fantasy_team_id = p_fantasy_team_id 
        AND tr.week = p_week 
        AND p.position = 'WR') < 2 THEN
        v_needed_positions := array_append(v_needed_positions, 'WR');
    END IF;
    
    -- TE (1 max)
    IF (SELECT COUNT(*) FROM team_rosters tr 
        JOIN players p ON tr.player_id = p.id 
        WHERE tr.fantasy_team_id = p_fantasy_team_id 
        AND tr.week = p_week 
        AND p.position = 'TE') < 1 THEN
        v_needed_positions := array_append(v_needed_positions, 'TE');
    END IF;
    
    -- K (1 max)
    IF (SELECT COUNT(*) FROM team_rosters tr 
        JOIN players p ON tr.player_id = p.id 
        WHERE tr.fantasy_team_id = p_fantasy_team_id 
        AND tr.week = p_week 
        AND p.position = 'K') < 1 THEN
        v_needed_positions := array_append(v_needed_positions, 'K');
    END IF;
    
    -- DEF (1 max)
    IF (SELECT COUNT(*) FROM team_rosters tr 
        JOIN players p ON tr.player_id = p.id 
        WHERE tr.fantasy_team_id = p_fantasy_team_id 
        AND tr.week = p_week 
        AND p.position = 'DEF') < 1 THEN
        v_needed_positions := array_append(v_needed_positions, 'DEF');
    END IF;
    
    -- Find best available player for needed positions
    FOR v_player IN
        SELECT 
            p.id,
            p.name,
            p.position,
            CASE 
                WHEN p.position = 'QB' THEN 'QB'
                WHEN p.position = 'RB' THEN 'RB'
                WHEN p.position = 'WR' THEN 'WR'
                WHEN p.position = 'TE' THEN 'TE'
                WHEN p.position = 'K' THEN 'K'
                WHEN p.position = 'DEF' THEN 'DEF'
                WHEN p.position IN ('DP', 'LB', 'DB', 'DL') THEN 'DP'
                ELSE 'FLEX'
            END as slot
        FROM players p
        WHERE p.position = ANY(v_needed_positions)
        AND NOT EXISTS (
            SELECT 1 FROM team_rosters tr
            WHERE tr.player_id = p.id
            AND tr.week = p_week
        )
        ORDER BY 
            -- Prioritize by position scarcity and typical draft value
            CASE p.position
                WHEN 'QB' THEN 1
                WHEN 'RB' THEN 2
                WHEN 'WR' THEN 3
                WHEN 'TE' THEN 4
                WHEN 'DEF' THEN 5
                WHEN 'K' THEN 6
                ELSE 7
            END,
            p.id  -- Secondary sort by player ID for consistency
        LIMIT 1
    LOOP
        RETURN QUERY SELECT v_player.id, v_player.name, v_player.position, v_player.slot;
        RETURN;
    END LOOP;
    
    -- If no position-specific needs, get best available flex player
    FOR v_player IN
        SELECT 
            p.id,
            p.name,
            p.position,
            'FLEX' as slot
        FROM players p
        WHERE p.position IN ('RB', 'WR')
        AND NOT EXISTS (
            SELECT 1 FROM team_rosters tr
            WHERE tr.player_id = p.id
            AND tr.week = p_week
        )
        ORDER BY p.id
        LIMIT 1
    LOOP
        RETURN QUERY SELECT v_player.id, v_player.name, v_player.position, v_player.slot;
        RETURN;
    END LOOP;
    
    -- Last resort: any available player
    FOR v_player IN
        SELECT 
            p.id,
            p.name,
            p.position,
            CASE 
                WHEN p.position IN ('RB', 'WR') THEN 'FLEX'
                WHEN p.position IN ('DP', 'LB', 'DB', 'DL') THEN 'DP'
                ELSE p.position
            END as slot
        FROM players p
        WHERE NOT EXISTS (
            SELECT 1 FROM team_rosters tr
            WHERE tr.player_id = p.id
            AND tr.week = p_week
        )
        ORDER BY p.id
        LIMIT 1
    LOOP
        RETURN QUERY SELECT v_player.id, v_player.name, v_player.position, v_player.slot;
        RETURN;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute auto-draft for expired timers
CREATE OR REPLACE FUNCTION public.execute_auto_draft()
RETURNS INTEGER AS $$
DECLARE
    v_league RECORD;
    v_current_team_id UUID;
    v_player RECORD;
    v_drafted_count INTEGER := 0;
    v_current_pick_number INTEGER;
    v_round_number INTEGER;
    v_total_teams INTEGER;
BEGIN
    -- Find leagues with expired timers
    FOR v_league IN
        SELECT 
            l.id,
            l.draft_order,
            l.current_pick,
            l.auto_draft_enabled
        FROM public.leagues l
        WHERE l.draft_status = 'in_progress'
        AND l.auto_draft_enabled = true
        AND l.turn_deadline IS NOT NULL
        AND l.turn_deadline < NOW()
    LOOP
        -- Calculate current team
        v_total_teams := array_length(v_league.draft_order, 1);
        IF v_total_teams IS NULL OR v_total_teams = 0 THEN
            CONTINUE;
        END IF;
        
        v_current_pick_number := COALESCE(v_league.current_pick, 0);
        v_round_number := (v_current_pick_number / v_total_teams) + 1;
        
        -- Handle snake draft (reverse order on even rounds)
        IF v_round_number % 2 = 0 THEN
            -- Even round - reverse order
            v_current_team_id := v_league.draft_order[v_total_teams - (v_current_pick_number % v_total_teams)];
        ELSE
            -- Odd round - normal order
            v_current_team_id := v_league.draft_order[(v_current_pick_number % v_total_teams) + 1];
        END IF;
        
        -- Get best available player for this team
        SELECT * INTO v_player
        FROM public.get_best_available_player(v_league.id, v_current_team_id, 1);
        
        IF v_player.player_id IS NOT NULL THEN
            -- Insert into team roster
            INSERT INTO public.team_rosters (
                fantasy_team_id,
                player_id,
                week,
                is_active,
                acquired_type,
                acquired_week,
                slot
            ) VALUES (
                v_current_team_id,
                v_player.player_id,
                1,
                true,
                'draft',
                1,
                v_player.slot
            ) ON CONFLICT DO NOTHING;
            
            -- Record in draft_picks table
            INSERT INTO public.draft_picks (
                league_id,
                fantasy_team_id,
                player_id,
                pick_number,
                round_number,
                slot,
                auto_drafted
            ) VALUES (
                v_league.id,
                v_current_team_id,
                v_player.player_id,
                v_current_pick_number + 1,
                v_round_number,
                v_player.slot,
                true
            ) ON CONFLICT DO NOTHING;
            
            -- Record roster move
            INSERT INTO public.roster_moves (
                fantasy_team_id,
                player_id,
                week,
                action,
                acquired_type
            ) VALUES (
                v_current_team_id,
                v_player.player_id,
                1,
                'draft_pick',
                'draft'
            );
            
            -- Update league current_pick and check if draft is complete
            IF v_current_pick_number + 1 >= v_total_teams * 10 THEN
                -- Draft is complete
                UPDATE public.leagues
                SET 
                    current_pick = v_current_pick_number + 1,
                    draft_status = 'completed',
                    turn_started_at = NULL,
                    turn_deadline = NULL
                WHERE id = v_league.id;
            ELSE
                -- Move to next pick and start new timer
                UPDATE public.leagues
                SET 
                    current_pick = v_current_pick_number + 1,
                    turn_started_at = NOW(),
                    turn_deadline = NOW() + (timer_duration || ' seconds')::INTERVAL
                WHERE id = v_league.id;
            END IF;
            
            v_drafted_count := v_drafted_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_drafted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.start_draft_turn(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_best_available_player(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_auto_draft() TO authenticated, service_role;

-- Enable Row Level Security on draft_picks table
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for draft_picks
CREATE POLICY "Users can view draft picks in their leagues" ON public.draft_picks
    FOR SELECT
    USING (
        league_id IN (
            SELECT lm.league_id 
            FROM league_members lm 
            WHERE lm.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert draft picks" ON public.draft_picks
    FOR INSERT
    WITH CHECK (true);