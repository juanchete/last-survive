-- Migration to update waiver and free agency schedule
-- New schedule: Sunday-Monday-Tuesday(until 3AM) = Waivers, Tuesday(3AM+)-Saturday = Free Agency

-- Update existing leagues to use new schedule
UPDATE public.leagues
SET 
    free_agency_start_day = 2,  -- Tuesday (after waiver processing)
    free_agency_start_hour = 3  -- 3 AM (after waiver processing)
WHERE free_agency_start_day = 3 OR free_agency_start_hour = 10;

-- Add comment to document the new schedule
COMMENT ON COLUMN public.leagues.waiver_process_day IS 
'Day of week for waiver processing (0=Sunday, 1=Monday, 2=Tuesday). Processing happens on Tuesday at 3 AM.';

COMMENT ON COLUMN public.leagues.free_agency_start_day IS 
'Day of week when free agency starts (2=Tuesday). Free agency starts after waiver processing.';

-- Update the waiver period status function with the new schedule
CREATE OR REPLACE FUNCTION public.get_waiver_period_status(
    p_league_id UUID
) RETURNS JSON AS $$
DECLARE
    v_league RECORD;
    v_current_day INTEGER;
    v_current_hour INTEGER;
    v_is_waiver_period BOOLEAN;
    v_is_free_agency BOOLEAN;
BEGIN
    -- Obtener configuración de la liga
    SELECT * INTO v_league
    FROM leagues
    WHERE id = p_league_id;
    
    -- Obtener día y hora actuales
    v_current_day := EXTRACT(DOW FROM NOW())::INTEGER;
    v_current_hour := EXTRACT(HOUR FROM NOW())::INTEGER;
    
    -- Nuevo horario de waivers y free agency:
    -- DOMINGO (0), LUNES (1), MARTES hasta 3 AM (2) = Waivers
    -- MARTES desde 3 AM hasta DOMINGO = Free Agency
    
    -- Determinar si estamos en período de waivers
    IF v_current_day = 0 THEN -- Domingo - todo el día waivers (juegos NFL)
        v_is_waiver_period := true;
    ELSIF v_current_day = 1 THEN -- Lunes - todo el día waivers
        v_is_waiver_period := true;
    ELSIF v_current_day = 2 AND v_current_hour < 3 THEN -- Martes antes de 3 AM - waivers
        v_is_waiver_period := true;
    ELSE
        v_is_waiver_period := false;
    END IF;
    
    -- Determinar si estamos en free agency
    -- Free Agency: Martes desde 3 AM hasta Domingo
    IF v_current_day = 2 AND v_current_hour >= 3 THEN -- Martes desde 3 AM
        v_is_free_agency := true;
    ELSIF v_current_day >= 3 AND v_current_day <= 6 THEN -- Miércoles a Sábado
        v_is_free_agency := true;
    ELSE
        v_is_free_agency := false;
    END IF;
    
    RETURN json_build_object(
        'is_waiver_period', v_is_waiver_period,
        'is_free_agency', v_is_free_agency,
        'waiver_day', v_league.waiver_process_day,
        'waiver_hour', v_league.waiver_process_hour,
        'free_agency_day', v_league.free_agency_start_day,
        'free_agency_hour', v_league.free_agency_start_hour,
        'current_day', v_current_day,
        'current_hour', v_current_hour
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_waiver_period_status TO authenticated;