/**
 * Central export point for all hooks
 * Provides a migration path from old to new APIs
 */

// Export new NFL Data API hooks (preferred)
export * from './useNFLDataAPI';

// Export other existing hooks
export * from './useAuthSync';
export * from './useDraftRealtimeSync';
export * from './useDraftUpdates';
export * from './useFantasyTeamManagement';
export * from './useLeagueManagement';
export * from './useLeagueSettings';
export * from './useLeagueUpdates';
export * from './useNFLTeams';
export * from './useNotifications';
export * from './usePlayerData';
export * from './usePlayerSelection';
export * from './useRosterManagement';
export * from './useRealtimeSync';
export * from './useRealtimeUpdates';
export * from './useRosterValidation';
export * from './useScoresAndStandings';
export * from './useTeamNames';
export * from './useTradeManagement';
export * from './useUserLeagues';
export * from './useWaiverManagement';
export * from './useWeeklyEliminationManagement';
export * from './useWeeks';

// Backward compatibility: Export old Sleeper API hooks
// These are now wrappers around the new provider-based hooks
import {
  useSleeperNFLState,
  useSleeperPlayers,
  useSleeperWeeklyStats,
  useSleeperPlayerStats,
  useSyncPlayers,
  useSyncWeeklyStats,
  useSyncNFLTeams,
  useSyncStatus,
  useSleeperAPIStats
} from './useNFLDataAPI';

// Re-export with original names for backward compatibility
export {
  useSleeperNFLState,
  useSleeperPlayers,
  useSleeperWeeklyStats,
  useSleeperPlayerStats,
  useSyncPlayers,
  useSyncWeeklyStats,
  useSyncNFLTeams,
  useSyncStatus,
  useSleeperAPIStats
};

// Migration helper - logs deprecation warnings in development
if (process.env.NODE_ENV === 'development') {
  const logDeprecation = (oldName: string, newName: string) => {
    console.warn(`[Deprecation] ${oldName} is deprecated. Please use ${newName} instead.`);
  };

  // Add deprecation warnings to backward compatibility exports
  const originalUseSleeperNFLState = useSleeperNFLState;
  (useSleeperNFLState as any)._deprecated = true;
  
  const originalUseSleeperPlayers = useSleeperPlayers;
  (useSleeperPlayers as any)._deprecated = true;
}