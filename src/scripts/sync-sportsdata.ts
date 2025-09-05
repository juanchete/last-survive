/**
 * Script para sincronizar datos desde SportsData.io
 * Ejecuta este script para llenar tu base de datos con información de SportsData
 */

import { providerManager } from '../lib/providers/ProviderManager';

async function syncSportsDataToDatabase() {
  console.log('🚀 Iniciando sincronización con SportsData.io...\n');
  
  // Asegurarse de que SportsData es el proveedor activo
  providerManager.switchProvider('sportsdata');
  console.log('✅ Proveedor cambiado a SportsData.io');
  
  try {
    // 1. Verificar el estado actual de la NFL
    console.log('\n📅 Verificando estado actual de la NFL...');
    const nflStateResponse = await providerManager.getNFLState();
    
    if (nflStateResponse.error) {
      console.error('❌ Error obteniendo estado NFL:', nflStateResponse.error);
      return;
    }
    
    const nflState = nflStateResponse.data!;
    console.log(`✅ Estado actual: ${nflState.season} - Semana ${nflState.week} (${nflState.season_type})`);
    
    // 2. Verificar conexión con SportsData.io
    console.log('\n🔌 Verificando conexión con SportsData.io...');
    const healthResponse = await providerManager.healthCheck();
    if (healthResponse.healthy) {
      console.log('✅ Conexión con SportsData.io exitosa');
    } else {
      console.error('❌ Error de conexión:', healthResponse.details);
      return;
    }
    
    // 3. Obtener muestra de jugadores
    console.log('\n👥 Obteniendo muestra de jugadores...');
    const playersResponse = await providerManager.getAllPlayers();
    
    if (playersResponse.error) {
      console.error('❌ Error obteniendo jugadores:', playersResponse.error);
      return;
    }
    
    const players = playersResponse.data || {};
    const playerCount = Object.keys(players).length;
    console.log(`✅ ${playerCount} jugadores disponibles desde SportsData.io`);
    
    // 4. Obtener muestra de estadísticas
    console.log(`\n📊 Obteniendo estadísticas de la Semana ${nflState.week}...`);
    const statsResponse = await providerManager.getWeeklyStats(
      parseInt(nflState.season),
      nflState.week,
      nflState.season_type
    );
    
    if (statsResponse.error) {
      console.warn('⚠️ Error obteniendo estadísticas:', statsResponse.error);
    } else {
      const stats = statsResponse.data || {};
      const statsCount = Object.keys(stats).length;
      console.log(`✅ ${statsCount} jugadores con estadísticas disponibles`);
    }
    
    // 5. Obtener muestra de proyecciones
    console.log(`\n📈 Obteniendo proyecciones de la Semana ${nflState.week}...`);
    const projectionsResponse = await providerManager.getWeeklyProjections(
      parseInt(nflState.season),
      nflState.week,
      nflState.season_type
    );
    
    if (projectionsResponse.error) {
      console.warn('⚠️ Error obteniendo proyecciones:', projectionsResponse.error);
    } else {
      const projections = projectionsResponse.data || {};
      const projCount = Object.keys(projections).length;
      console.log(`✅ ${projCount} jugadores con proyecciones disponibles`);
    }
    
    console.log('\n🎉 ¡Verificación de SportsData.io completa!');
    console.log('💡 Para sincronizar datos a la base de datos, usa el script sync-all-sportsdata.ts');
    
  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error);
  }
}

// Hacer la función disponible globalmente para ejecutar desde la consola
if (typeof window !== 'undefined') {
  (window as any).syncSportsData = syncSportsDataToDatabase;
  console.log('💡 Ejecuta `syncSportsData()` en la consola para verificar SportsData.io');
}

export { syncSportsDataToDatabase };