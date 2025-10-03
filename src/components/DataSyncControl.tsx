/**
 * DataSyncControl Component
 * UI for syncing data from the active provider to the database
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useSyncPlayers, 
  useSyncWeeklyStats, 
  useSyncWeeklyProjections, 
  useSyncNFLTeams,
  useSyncStatus,
  useProviderStats,
  useNFLState,
  useSyncADP
} from '@/hooks/useNFLDataAPI';
import { providerManager } from '@/lib/providers/ProviderManager';
import { getProviderDisplayName } from '@/config/providers';
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Database,
  Users,
  BarChart,
  TrendingUp,
  Calendar,
  Loader2
} from 'lucide-react';

export function DataSyncControl() {
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessages, setSyncMessages] = useState<string[]>([]);
  
  // Hooks
  const { data: syncStatus, refetch: refetchStatus } = useSyncStatus();
  const { data: providerStats } = useProviderStats();
  const { data: nflState } = useNFLState();
  const syncPlayers = useSyncPlayers();
  const syncWeeklyStats = useSyncWeeklyStats();
  const syncWeeklyProjections = useSyncWeeklyProjections();
  const syncNFLTeams = useSyncNFLTeams();
  const syncADP = useSyncADP();

  const currentProvider = providerManager.getConfig().primaryProvider;
  
  // Add message to sync log
  const addSyncMessage = (message: string) => {
    setSyncMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Sync all data
  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessages([]);
    
    try {
      // Step 1: Sync NFL Teams (10%)
      addSyncMessage('Syncing NFL teams...');
      setSyncProgress(10);
      await syncNFLTeams.mutateAsync();
      addSyncMessage('✅ NFL teams synced successfully');
      
      // Step 2: Sync Players (30%)
      addSyncMessage('Syncing players from ' + getProviderDisplayName(currentProvider) + '...');
      setSyncProgress(30);
      await syncPlayers.mutateAsync();
      addSyncMessage('✅ Players synced successfully');
      
      // Step 3: Sync ADP data (50%)
      addSyncMessage('Syncing ADP data...');
      setSyncProgress(50);
      await syncADP.mutateAsync();
      addSyncMessage('✅ ADP data synced successfully');
      
      // Step 4: Sync Weekly Stats (70%)
      if (nflState) {
        addSyncMessage(`Syncing stats for ${nflState.season} Week ${nflState.week}...`);
        setSyncProgress(70);
        await syncWeeklyStats.mutateAsync({
          season: parseInt(nflState.season),
          week: nflState.week,
          seasonType: nflState.season_type
        });
        addSyncMessage('✅ Weekly stats synced successfully');
        
        // Step 5: Sync Projections (100%)
        // Use current week for projections
        addSyncMessage(`Syncing projections for ${nflState.season} Week ${nflState.week}...`);
        setSyncProgress(90);
        await syncWeeklyProjections.mutateAsync({
          season: parseInt(nflState.season),
          week: nflState.week, // Use current week, not next week
          seasonType: nflState.season_type
        });
        addSyncMessage('✅ Weekly projections synced successfully');
      }
      
      setSyncProgress(100);
      addSyncMessage('🎉 All data synced successfully!');
      
      // Refresh status
      await refetchStatus();
    } catch (error) {
      addSyncMessage(`❌ Error: ${error.message}`);
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync specific data type
  const handleSyncSpecific = async (type: 'players' | 'stats' | 'projections' | 'teams' | 'adp') => {
    setIsSyncing(true);
    setSyncMessages([]);
    
    try {
      switch (type) {
        case 'teams':
          addSyncMessage('Syncing NFL teams...');
          await syncNFLTeams.mutateAsync();
          addSyncMessage('✅ NFL teams synced');
          break;
          
        case 'players':
          addSyncMessage(`Syncing players from ${getProviderDisplayName(currentProvider)}...`);
          await syncPlayers.mutateAsync();
          addSyncMessage('✅ Players synced');
          break;
          
        case 'stats':
          if (nflState) {
            addSyncMessage(`Syncing stats for ${nflState.season} Week ${nflState.week}...`);
            await syncWeeklyStats.mutateAsync({
              season: parseInt(nflState.season),
              week: nflState.week,
              seasonType: nflState.season_type
            });
            addSyncMessage('✅ Stats synced');
          }
          break;
          
        case 'projections':
          if (nflState) {
            console.log('🎯 [DataSyncControl] Executing projections sync:', {
              season: parseInt(nflState.season),
              week: nflState.week,
              seasonType: nflState.season_type
            });
            addSyncMessage(`Syncing projections for ${nflState.season} Week ${nflState.week}...`);
            await syncWeeklyProjections.mutateAsync({
              season: parseInt(nflState.season),
              week: nflState.week,
              seasonType: nflState.season_type
            });
            addSyncMessage('✅ Projections synced');
          } else {
            console.error('❌ [DataSyncControl] No NFL state available for projections sync');
          }
          break;
          
        case 'adp':
          addSyncMessage('Syncing ADP data...');
          await syncADP.mutateAsync();
          addSyncMessage('✅ ADP data synced');
          break;
      }
      
      await refetchStatus();
    } catch (error) {
      addSyncMessage(`❌ Error: ${error.message}`);
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Sync Status
            </span>
            <Badge variant={currentProvider === 'sportsdata' ? 'default' : 'secondary'}>
              {getProviderDisplayName(currentProvider)}
            </Badge>
          </CardTitle>
          <CardDescription>
            Sync data from {getProviderDisplayName(currentProvider)} to your database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Week Info */}
          {nflState && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <strong>Current Week:</strong> {nflState.season} - Week {nflState.week} ({nflState.season_type})
              </AlertDescription>
            </Alert>
          )}

          {/* Database Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-secondary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Players</span>
              </div>
              <p className="text-2xl font-bold">{syncStatus?.playerCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Last sync: {formatDate(syncStatus?.lastSync)}
              </p>
            </div>
            
            <div className="bg-secondary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Stats</span>
              </div>
              <p className="text-2xl font-bold">{syncStatus?.statsCount || 0}</p>
            </div>
            
            <div className="bg-secondary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Projections</span>
              </div>
              <p className="text-2xl font-bold">{syncStatus?.projectionsCount || 0}</p>
            </div>
            
            <div className="bg-secondary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Provider</span>
              </div>
              <p className="text-lg font-bold">{getProviderDisplayName(currentProvider)}</p>
              {providerStats?.[currentProvider]?.healthy ? (
                <Badge variant="success" className="mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Healthy
                </Badge>
              ) : (
                <Badge variant="destructive" className="mt-1">
                  <XCircle className="h-3 w-3 mr-1" />
                  Issues
                </Badge>
              )}
            </div>
          </div>

          {/* Sync Progress */}
          {isSyncing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Syncing data...</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="h-2" />
            </div>
          )}

          {/* Sync Actions */}
          <div className="flex gap-3">
            <Button 
              onClick={handleSyncAll} 
              disabled={isSyncing}
              className="flex-1"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Sync All Data
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => refetchStatus()} 
              variant="outline"
              disabled={isSyncing}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Sync Options */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Sync Options</CardTitle>
          <CardDescription>
            Sync specific data types from {getProviderDisplayName(currentProvider)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button 
              onClick={() => handleSyncSpecific('teams')}
              variant="outline"
              disabled={isSyncing}
            >
              NFL Teams
            </Button>
            <Button 
              onClick={() => handleSyncSpecific('players')}
              variant="outline"
              disabled={isSyncing}
            >
              Players
            </Button>
            <Button 
              onClick={() => handleSyncSpecific('adp')}
              variant="outline"
              disabled={isSyncing}
            >
              ADP Data
            </Button>
            <Button 
              onClick={() => handleSyncSpecific('stats')}
              variant="outline"
              disabled={isSyncing || !nflState}
            >
              Week {nflState?.week} Stats
            </Button>
            <Button
              onClick={() => handleSyncSpecific('projections')}
              variant="outline"
              disabled={isSyncing || !nflState}
            >
              Week {nflState?.week || 0} Projections
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Log */}
      {syncMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-secondary/20 rounded-lg p-4 max-h-60 overflow-y-auto">
              {syncMessages.map((msg, idx) => (
                <div key={idx} className="text-sm font-mono mb-1">
                  {msg}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Current Provider:</strong> {getProviderDisplayName(currentProvider)}
          <br />
          <strong>Note:</strong> Data format may vary between providers. SportsData.io provides more detailed stats and DFS information.
        </AlertDescription>
      </Alert>
    </div>
  );
}