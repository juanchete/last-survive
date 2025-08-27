import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tvzktsamnoiyjbayimvh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

async function applyWaiverFunction() {
  if (!supabaseServiceKey) {
    console.log("Service key not found. The function will be created via Supabase dashboard.");
    console.log("\n📋 Please run this SQL in your Supabase SQL Editor:");
    console.log("================================================");
    console.log(`
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
    v_is_waiver_period := false;
    v_is_free_agency := true;
    
    RETURN json_build_object(
        'is_waiver_period', v_is_waiver_period,
        'is_free_agency', v_is_free_agency,
        'waiver_day', 2,
        'waiver_hour', 3,
        'free_agency_day', 3,
        'free_agency_hour', 10,
        'current_day', v_current_day,
        'current_hour', v_current_hour
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_waiver_period_status TO authenticated;
    `);
    console.log("================================================");
    console.log("\n✅ After running this SQL, the waiver/free agency system will be active!");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Create the function
    const { error } = await supabase.rpc('query', {
      query: `
        CREATE OR REPLACE FUNCTION public.get_waiver_period_status(
            p_league_id UUID
        ) RETURNS JSON AS $$
        DECLARE
            v_current_day INTEGER;
            v_current_hour INTEGER;
            v_is_waiver_period BOOLEAN;
            v_is_free_agency BOOLEAN;
        BEGIN
            v_current_day := EXTRACT(DOW FROM NOW())::INTEGER;
            v_current_hour := EXTRACT(HOUR FROM NOW())::INTEGER;
            
            v_is_waiver_period := false;
            v_is_free_agency := true;
            
            RETURN json_build_object(
                'is_waiver_period', v_is_waiver_period,
                'is_free_agency', v_is_free_agency,
                'waiver_day', 2,
                'waiver_hour', 3,
                'free_agency_day', 3,
                'free_agency_hour', 10,
                'current_day', v_current_day,
                'current_hour', v_current_hour
            );
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.error('Error creating function:', error);
    } else {
      console.log('✅ Waiver function created successfully!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

applyWaiverFunction();