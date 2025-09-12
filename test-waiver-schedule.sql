-- Test script to validate the new waiver/free agency schedule
-- This script simulates different days and hours to test the logic

-- Create a temporary function to test different times
CREATE OR REPLACE FUNCTION public.test_waiver_period_status(
    p_league_id UUID,
    p_test_day INTEGER,
    p_test_hour INTEGER
) RETURNS JSON AS $$
DECLARE
    v_league RECORD;
    v_is_waiver_period BOOLEAN;
    v_is_free_agency BOOLEAN;
BEGIN
    -- Get league configuration
    SELECT * INTO v_league
    FROM leagues
    WHERE id = p_league_id;
    
    -- Test the new schedule logic with provided day/hour
    -- SUNDAY (0), MONDAY (1), TUESDAY until 3 AM (2) = Waivers
    -- TUESDAY from 3 AM until SUNDAY = Free Agency
    
    -- Determine if we are in waiver period
    IF p_test_day = 0 THEN -- Sunday - all day waivers (NFL games)
        v_is_waiver_period := true;
    ELSIF p_test_day = 1 THEN -- Monday - all day waivers
        v_is_waiver_period := true;
    ELSIF p_test_day = 2 AND p_test_hour < 3 THEN -- Tuesday before 3 AM - waivers
        v_is_waiver_period := true;
    ELSE
        v_is_waiver_period := false;
    END IF;
    
    -- Determine if we are in free agency
    -- Free Agency: Tuesday from 3 AM until Sunday
    IF p_test_day = 2 AND p_test_hour >= 3 THEN -- Tuesday from 3 AM
        v_is_free_agency := true;
    ELSIF p_test_day >= 3 AND p_test_day <= 6 THEN -- Wednesday to Saturday
        v_is_free_agency := true;
    ELSE
        v_is_free_agency := false;
    END IF;
    
    RETURN json_build_object(
        'is_waiver_period', v_is_waiver_period,
        'is_free_agency', v_is_free_agency,
        'test_day', p_test_day,
        'test_hour', p_test_hour,
        'day_name', CASE p_test_day
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
        END
    );
END;
$$ LANGUAGE plpgsql;

-- Test cases for the new schedule
SELECT 'Testing Sunday 10 AM (should be WAIVER period)' as test_case,
       test_waiver_period_status('7930465b-1669-4beb-ac00-1e59c9872fe5'::uuid, 0, 10) as result
UNION ALL
SELECT 'Testing Monday 2 PM (should be WAIVER period)' as test_case,
       test_waiver_period_status('7930465b-1669-4beb-ac00-1e59c9872fe5'::uuid, 1, 14) as result
UNION ALL
SELECT 'Testing Tuesday 1 AM (should be WAIVER period)' as test_case,
       test_waiver_period_status('7930465b-1669-4beb-ac00-1e59c9872fe5'::uuid, 2, 1) as result
UNION ALL
SELECT 'Testing Tuesday 3 AM (should be FREE AGENCY)' as test_case,
       test_waiver_period_status('7930465b-1669-4beb-ac00-1e59c9872fe5'::uuid, 2, 3) as result
UNION ALL
SELECT 'Testing Tuesday 11 PM (should be FREE AGENCY)' as test_case,
       test_waiver_period_status('7930465b-1669-4beb-ac00-1e59c9872fe5'::uuid, 2, 23) as result
UNION ALL
SELECT 'Testing Wednesday 10 AM (should be FREE AGENCY)' as test_case,
       test_waiver_period_status('7930465b-1669-4beb-ac00-1e59c9872fe5'::uuid, 3, 10) as result
UNION ALL
SELECT 'Testing Thursday 5 PM (should be FREE AGENCY)' as test_case,
       test_waiver_period_status('7930465b-1669-4beb-ac00-1e59c9872fe5'::uuid, 4, 17) as result
UNION ALL
SELECT 'Testing Friday 8 AM (should be FREE AGENCY)' as test_case,
       test_waiver_period_status('7930465b-1669-4beb-ac00-1e59c9872fe5'::uuid, 5, 8) as result
UNION ALL
SELECT 'Testing Saturday 6 PM (should be FREE AGENCY)' as test_case,
       test_waiver_period_status('7930465b-1669-4beb-ac00-1e59c9872fe5'::uuid, 6, 18) as result;

-- Clean up the test function
DROP FUNCTION public.test_waiver_period_status;