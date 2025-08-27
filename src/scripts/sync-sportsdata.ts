/**
 * Script para sincronizar datos desde SportsData.io
 * Ejecuta este script para llenar tu base de datos con información de SportsData
 */

import { providerManager } from '../lib/providers/ProviderManager';
import { sleeperSync } from '../lib/sleeper-sync';

async function syncSportsDataToDatabase() {
  console.log('🚀 Iniciando sincronización con SportsData.io...\n');
  
  // Asegurarse de que SportsData es el proveedor activo
  providerManager.switchProvider('sportsdata');
  console.log('✅ Proveedor cambiado a SportsData.io');
  
  const results = {
    teams: { success: false, message: '' },
    players: { success: false, message: '' },
    stats: { success: false, message: '' },
    projections: { success: false, message: '' }
  };

  try {
    // 1. Obtener el estado actual de la NFL
    console.log('\n📅 Obteniendo estado actual de la NFL...');
    const nflStateResponse = await providerManager.getNFLState();
    
    if (nflStateResponse.error) {
      console.error('❌ Error obteniendo estado NFL:', nflStateResponse.error);
      return;
    }
    
    const nflState = nflStateResponse.data!;
    console.log(`✅ Estado actual: ${nflState.season} - Semana ${nflState.week} (${nflState.season_type})`);
    
    // 2. Sincronizar equipos NFL
    console.log('\n🏈 Sincronizando equipos NFL...');
    const teamsResult = await sleeperSync.syncNFLTeams();
    results.teams = teamsResult;
    console.log(teamsResult.success ? '✅' : '❌', teamsResult.message);
    
    // 3. Sincronizar jugadores
    console.log('\n👥 Sincronizando jugadores desde SportsData...');
    const playersResult = await sleeperSync.syncPlayers(false, true);
    results.players = playersResult;
    console.log(playersResult.success ? '✅' : '❌', playersResult.message);
    
    // 4. Sincronizar estadísticas de la semana actual
    const currentSeason = parseInt(nflState.season);
    const currentWeek = nflState.week;
    
    console.log(`\n📊 Sincronizando estadísticas de la Semana ${currentWeek}...`);
    const statsResult = await sleeperSync.syncWeeklyStats(
      currentSeason, 
      currentWeek, 
      nflState.season_type
    );
    results.stats = statsResult;
    console.log(statsResult.success ? '✅' : '❌', statsResult.message);
    
    // 5. Sincronizar proyecciones de la semana actual
    console.log(`\n📈 Sincronizando proyecciones de la Semana ${currentWeek}...`);
    const projectionsResult = await sleeperSync.syncWeeklyProjections(
      currentSeason,
      currentWeek,
      nflState.season_type
    );
    results.projections = projectionsResult;
    console.log(projectionsResult.success ? '✅' : '❌', projectionsResult.message);
    
    // 6. Obtener estado de sincronización
    console.log('\n📊 Estado de la base de datos después de la sincronización:');
    const syncStatus = await sleeperSync.getSyncStatus();
    console.log(`- Jugadores: ${syncStatus.playerCount}`);
    console.log(`- Estadísticas: ${syncStatus.statsCount}`);
    console.log(`- Proyecciones: ${syncStatus.projectionsCount}`);
    console.log(`- Proveedor activo: ${syncStatus.activeProvider}`);
    console.log(`- Última sincronización: ${syncStatus.lastSync || 'Nunca'}`);
    
  } catch (error) {
    console.error('\n❌ Error durante la sincronización:', error);
  }

  // Resumen final
  console.log('\n' + '='.repeat(50));
  console.log('📋 RESUMEN DE SINCRONIZACIÓN:');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([key, result]) => {
    console.log(`${result.success ? '✅' : '❌'} ${key.toUpperCase()}: ${result.message}`);
  });
  
  const successCount = Object.values(results).filter(r => r.success).length;
  console.log(`\n🎯 Resultado: ${successCount}/4 sincronizaciones exitosas`);
  
  if (successCount === 4) {
    console.log('🎉 ¡Sincronización completa exitosa!');
  } else {
    console.log('⚠️ Algunas sincronizaciones fallaron. Revisa los logs para más detalles.');
  }
}

// Hacer la función disponible globalmente para ejecutar desde la consola
if (typeof window !== 'undefined') {
  (window as any).syncSportsData = syncSportsDataToDatabase;
  console.log('💡 Ejecuta `syncSportsData()` en la consola para sincronizar datos desde SportsData.io');
}

export { syncSportsDataToDatabase };