import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAndresRoster() {
  console.log('🔧 Iniciando corrección del roster de Andres Justus...\n');

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

  console.log(`👤 Usuario: ${user.full_name}`);

  // Find fantasy team
  const { data: team, error: teamError } = await supabase
    .from('fantasy_teams')
    .select('id, name')
    .eq('user_id', user.id)
    .single();

  if (teamError || !team) {
    console.log('❌ Equipo no encontrado');
    return;
  }

  console.log(`🏈 Equipo: ${team.name}\n`);

  // Los 4 jugadores que deben ir a banca:
  // - Bengals Defense (una de las dos defensas)
  // - Jack Campbell (DP)
  // - Roquan Smith (DP)
  // - Pat Freiermuth (uno de los dos TE)

  // Buscar estos jugadores específicos
  const playersToDeactivate = [
    'Jack Campbell',
    'Roquan Smith',
    'Pat Freiermuth'  // Uno de los dos TE
  ];

  console.log('🔍 Buscando jugadores para mover a banca...\n');

  for (const week of [7, 8]) {
    console.log(`📅 Procesando Semana ${week}:`);
    console.log('─'.repeat(60));

    // Get current active roster for this week
    const { data: activeRoster, error: rosterError } = await supabase
      .from('team_rosters')
      .select(`
        id,
        week,
        is_active,
        player:players (
          id,
          name,
          position
        )
      `)
      .eq('fantasy_team_id', team.id)
      .eq('week', week)
      .eq('is_active', true);

    if (rosterError || !activeRoster) {
      console.log(`❌ Error obteniendo roster semana ${week}`);
      continue;
    }

    console.log(`   Total jugadores activos antes: ${activeRoster.length}`);

    // Encontrar las IDs de los rosters a desactivar
    const rostersToUpdate: string[] = [];

    for (const playerName of playersToDeactivate) {
      const found = activeRoster.find((r: any) =>
        r.player.name.toLowerCase().includes(playerName.toLowerCase())
      );

      if (found) {
        rostersToUpdate.push(found.id);
        console.log(`   ✓ Encontrado: ${found.player.name} (${found.player.position})`);
      }
    }

    // Encontrar una de las dos defensas para desactivar (mantenemos solo Chiefs)
    const defenses = activeRoster.filter((r: any) => r.player.position === 'DEF');
    if (defenses.length > 1) {
      // Desactivar Bengals, mantener Chiefs
      const bengals = defenses.find((d: any) => d.player.name.toLowerCase().includes('bengals'));
      if (bengals && !rostersToUpdate.includes(bengals.id)) {
        rostersToUpdate.push(bengals.id);
        console.log(`   ✓ Encontrado: ${bengals.player.name} (${bengals.player.position})`);
      }
    }

    if (rostersToUpdate.length === 0) {
      console.log(`   ⚠️  No hay jugadores para desactivar en semana ${week}`);
      continue;
    }

    // Actualizar los jugadores a inactivos (banca)
    const { error: updateError } = await supabase
      .from('team_rosters')
      .update({ is_active: false })
      .in('id', rostersToUpdate);

    if (updateError) {
      console.log(`   ❌ Error actualizando roster semana ${week}:`, updateError.message);
    } else {
      console.log(`   ✅ ${rostersToUpdate.length} jugadores movidos a banca`);
    }

    // Verificar resultado
    const { data: updatedRoster } = await supabase
      .from('team_rosters')
      .select('id, is_active')
      .eq('fantasy_team_id', team.id)
      .eq('week', week);

    if (updatedRoster) {
      const active = updatedRoster.filter((r: any) => r.is_active).length;
      const inactive = updatedRoster.filter((r: any) => !r.is_active).length;
      console.log(`   📊 Resultado: ${active} activos, ${inactive} en banca\n`);
    }
  }

  console.log('✅ Corrección completada!');
}

fixAndresRoster().catch(console.error);
