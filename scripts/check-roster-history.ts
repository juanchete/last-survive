import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRosterHistory() {
  // Find Andres Justus user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, full_name')
    .ilike('full_name', '%andres%justus%')
    .single();

  if (userError || !user) {
    console.log('❌ Usuario no encontrado');
    return;
  }

  console.log(`\n👤 Usuario encontrado: ${user.full_name} (ID: ${user.id})`);

  // Find fantasy team
  const { data: team, error: teamError } = await supabase
    .from('fantasy_teams')
    .select('id, name, league_id')
    .eq('user_id', user.id)
    .single();

  if (teamError || !team) {
    console.log('❌ Equipo no encontrado');
    return;
  }

  console.log(`🏈 Equipo: ${team.name} (ID: ${team.id})`);

  // First, check all weeks to see what's available
  const { data: allRosters, error: allError } = await supabase
    .from('team_rosters')
    .select('week, is_active')
    .eq('fantasy_team_id', team.id);

  if (allRosters) {
    const activeByWeek = allRosters.reduce((acc: any, r: any) => {
      if (!acc[r.week]) acc[r.week] = { active: 0, inactive: 0 };
      if (r.is_active) acc[r.week].active++;
      else acc[r.week].inactive++;
      return acc;
    }, {});

    console.log('\n📊 Resumen de Rosters por Semana:');
    console.log('─'.repeat(80));
    Object.keys(activeByWeek).sort((a, b) => Number(a) - Number(b)).forEach(week => {
      const stats = activeByWeek[week];
      console.log(`Semana ${week}: ${stats.active} activos, ${stats.inactive} inactivos`);
    });
  }

  // Get roster for week 7
  const { data: week7Roster, error: week7Error } = await supabase
    .from('team_rosters')
    .select(`
      id,
      week,
      is_active,
      player:players (
        id,
        name,
        position,
        nfl_team:nfl_teams (abbreviation)
      )
    `)
    .eq('fantasy_team_id', team.id)
    .eq('week', 7)
    .eq('is_active', true);

  console.log('\n📋 SEMANA 7:');
  console.log('─'.repeat(80));
  if (week7Error) {
    console.log('❌ Error:', week7Error.message);
  }
  if (week7Roster && week7Roster.length > 0) {
    // Sort by position for better display
    const sorted = [...week7Roster].sort((a: any, b: any) => {
      const posOrder: any = { QB: 1, RB: 2, WR: 3, TE: 4, K: 5, DEF: 6 };
      return (posOrder[a.player.position] || 7) - (posOrder[b.player.position] || 7);
    });

    sorted.forEach((r: any, index: number) => {
      const player = r.player;
      console.log(`${index + 1}. ${player.name} (${player.position}) - ${player.nfl_team?.abbreviation || 'N/A'}`);
    });
    console.log(`\n✅ Total jugadores semana 7: ${week7Roster.length}`);
  } else {
    console.log('❌ No hay roster para semana 7');
  }

  // Get roster for week 8
  const { data: week8Roster, error: week8Error } = await supabase
    .from('team_rosters')
    .select(`
      id,
      week,
      is_active,
      player:players (
        id,
        name,
        position,
        nfl_team:nfl_teams (abbreviation)
      )
    `)
    .eq('fantasy_team_id', team.id)
    .eq('week', 8)
    .eq('is_active', true);

  console.log('\n📋 SEMANA 8:');
  console.log('─'.repeat(80));
  if (week8Roster && week8Roster.length > 0) {
    // Sort by position for better display
    const sorted = [...week8Roster].sort((a: any, b: any) => {
      const posOrder: any = { QB: 1, RB: 2, WR: 3, TE: 4, K: 5, DEF: 6 };
      return (posOrder[a.player.position] || 7) - (posOrder[b.player.position] || 7);
    });

    sorted.forEach((r: any, index: number) => {
      const player = r.player;
      console.log(`${index + 1}. ${player.name} (${player.position}) - ${player.nfl_team?.abbreviation || 'N/A'}`);
    });
    console.log(`\n✅ Total jugadores semana 8: ${week8Roster.length}`);
  } else {
    console.log('❌ No hay roster para semana 8');
  }

  // Compare rosters
  if (week7Roster && week8Roster) {
    const week7PlayerIds = new Set(week7Roster.map((r: any) => r.player.id));
    const week8PlayerIds = new Set(week8Roster.map((r: any) => r.player.id));

    const added = week8Roster.filter((r: any) => !week7PlayerIds.has(r.player.id));
    const removed = week7Roster.filter((r: any) => !week8PlayerIds.has(r.player.id));

    if (added.length > 0 || removed.length > 0) {
      console.log('\n🔄 CAMBIOS ENTRE SEMANA 7 Y 8:');
      console.log('─'.repeat(80));

      if (removed.length > 0) {
        console.log('\n❌ Jugadores eliminados:');
        removed.forEach((r: any) => {
          console.log(`   - ${r.player.name} (${r.player.position})`);
        });
      }

      if (added.length > 0) {
        console.log('\n✅ Jugadores agregados:');
        added.forEach((r: any) => {
          console.log(`   - ${r.player.name} (${r.player.position})`);
        });
      }
    } else {
      console.log('\n✅ No hay cambios entre semana 7 y 8');
    }
  }

  // Check if exceeds limit
  if (week8Roster && week8Roster.length > 10) {
    console.log(`\n⚠️  ALERTA: El equipo tiene ${week8Roster.length} jugadores, excede el límite de 10`);
  }
}

checkRosterHistory().catch(console.error);
