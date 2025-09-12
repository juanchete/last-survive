-- Waiver period status function with new schedule
-- Implements the updated waiver/free agency schedule

CREATE OR REPLACE FUNCTION public.get_waiver_period_status(
    p_league_id UUID
) RETURNS JSON AS $$
DECLARE
    v_current_day INTEGER;
    v_current_hour INTEGER;
    v_is_waiver_period BOOLEAN;
    v_is_free_agency BOOLEAN;
BEGIN
    -- Get current day and hour
    v_current_day := EXTRACT(DOW FROM NOW())::INTEGER;
    v_current_hour := EXTRACT(HOUR FROM NOW())::INTEGER;
    
    -- New waiver and free agency schedule:
    -- SUNDAY (0), MONDAY (1), TUESDAY until 3 AM (2) = Waivers
    -- TUESDAY from 3 AM until SUNDAY = Free Agency
    
    -- Determine if we are in waiver period
    IF v_current_day = 0 THEN -- Sunday - all day waivers (NFL games)
        v_is_waiver_period := true;
    ELSIF v_current_day = 1 THEN -- Monday - all day waivers
        v_is_waiver_period := true;
    ELSIF v_current_day = 2 AND v_current_hour < 3 THEN -- Tuesday before 3 AM - waivers
        v_is_waiver_period := true;
    ELSE
        v_is_waiver_period := false;
    END IF;
    
    -- Determine if we are in free agency
    -- Free Agency: Tuesday from 3 AM until Sunday
    IF v_current_day = 2 AND v_current_hour >= 3 THEN -- Tuesday from 3 AM
        v_is_free_agency := true;
    ELSIF v_current_day >= 3 AND v_current_day <= 6 THEN -- Wednesday to Saturday
        v_is_free_agency := true;
    ELSE
        v_is_free_agency := false;
    END IF;
    
    RETURN json_build_object(
        'is_waiver_period', v_is_waiver_period,
        'is_free_agency', v_is_free_agency,
        'waiver_day', 2,  -- Tuesday (processing day)
        'waiver_hour', 3,  -- 3 AM (processing time)
        'free_agency_day', 2,  -- Tuesday (starts after processing)
        'free_agency_hour', 3,  -- 3 AM (starts after processing)
        'current_day', v_current_day,
        'current_hour', v_current_hour
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_waiver_period_status TO authenticated;