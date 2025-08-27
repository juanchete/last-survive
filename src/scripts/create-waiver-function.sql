-- Simple waiver period status function
-- Returns free agency as active for now

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
    
    -- For now, always set free agency as active
    -- This allows immediate player adds/drops
    v_is_waiver_period := false;
    v_is_free_agency := true;
    
    RETURN json_build_object(
        'is_waiver_period', v_is_waiver_period,
        'is_free_agency', v_is_free_agency,
        'waiver_day', 2,  -- Tuesday
        'waiver_hour', 3,  -- 3 AM
        'free_agency_day', 3,  -- Wednesday
        'free_agency_hour', 10,  -- 10 AM
        'current_day', v_current_day,
        'current_hour', v_current_hour
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_waiver_period_status TO authenticated;