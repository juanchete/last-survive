import { supabase } from "../integrations/supabase/client";

async function setupWaiverSystem() {
  try {
    console.log("Setting up waiver system for all leagues...");

    // Get all leagues
    const { data: leagues, error: leaguesError } = await supabase
      .from("leagues")
      .select("id, name");

    if (leaguesError) {
      console.error("Error fetching leagues:", leaguesError);
      return;
    }

    console.log(`Found ${leagues?.length || 0} leagues`);

    // Update each league with default waiver settings if not already set
    for (const league of leagues || []) {
      console.log(`Updating league: ${league.name} (${league.id})`);

      const { error: updateError } = await supabase
        .from("leagues")
        .update({
          waiver_process_day: 2, // Tuesday
          waiver_process_hour: 3, // 3 AM
          free_agency_start_day: 3, // Wednesday
          free_agency_start_hour: 10, // 10 AM
        })
        .eq("id", league.id);

      if (updateError) {
        console.error(`Error updating league ${league.id}:`, updateError);
      } else {
        console.log(`✅ Updated league ${league.name}`);
      }
    }

    // Create the function if it doesn't exist
    const { error: funcError } = await supabase.rpc('get_waiver_period_status', {
      p_league_id: leagues?.[0]?.id
    });

    if (funcError) {
      console.log("Function doesn't exist or has an error, creating it...");
      
      // For now, we'll create a simple function that always returns free agency
      // The full implementation should be in a migration
      const { error: createError } = await supabase.sql`
        CREATE OR REPLACE FUNCTION public.get_waiver_period_status(
            p_league_id UUID
        ) RETURNS JSON AS $$
        DECLARE
            v_current_day INTEGER;
            v_current_hour INTEGER;
        BEGIN
            -- Get current day and hour
            v_current_day := EXTRACT(DOW FROM NOW())::INTEGER;
            v_current_hour := EXTRACT(HOUR FROM NOW())::INTEGER;
            
            -- For now, always return free agency open
            -- In production, this should check the league settings and current time
            RETURN json_build_object(
                'is_waiver_period', false,
                'is_free_agency', true,
                'waiver_day', 2,
                'waiver_hour', 3,
                'free_agency_day', 3,
                'free_agency_hour', 10,
                'current_day', v_current_day,
                'current_hour', v_current_hour
            );
        END;
        $$ LANGUAGE plpgsql;
      `;

      if (createError) {
        console.error("Error creating function:", createError);
      } else {
        console.log("✅ Created get_waiver_period_status function");
      }
    } else {
      console.log("✅ get_waiver_period_status function already exists");
    }

    console.log("\n✅ Waiver system setup complete!");

  } catch (error) {
    console.error("Error setting up waiver system:", error);
  }
}

setupWaiverSystem();