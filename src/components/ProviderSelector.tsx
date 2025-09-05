/**
 * ProviderSelector Component
 * UI for selecting and managing fantasy data providers
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useActiveProvider, useProviderHealth, useProviderStats } from '@/hooks/useNFLDataAPI';
import { providerManager } from '@/lib/providers/ProviderManager';
import { getProviderDisplayName, getProviderStatusColor, PROVIDER_SETTINGS } from '@/config/providers';
import type { ProviderName } from '@/lib/providers/ProviderManager';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Activity } from 'lucide-react';

export function ProviderSelector() {
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>(
    providerManager.getConfig().primaryProvider
  );
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any> | null>(null);
  
  const { mutate: switchProvider, isPending: isSwitching } = useActiveProvider();
  const { data: health, isLoading: isLoadingHealth, refetch: refetchHealth } = useProviderHealth();
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useProviderStats();

  const handleProviderSwitch = () => {
    switchProvider(selectedProvider);
  };

  const handleTestProviders = async () => {
    setTesting(true);
    try {
      const results = await providerManager.testAllProviders();
      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshStatus = () => {
    refetchHealth();
    refetchStats();
  };

  const providers: ProviderName[] = ['sportsdata'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Fantasy Data Provider</span>
            <Button
              onClick={handleRefreshStatus}
              variant="ghost"
              size="sm"
              disabled={isLoadingHealth || isLoadingStats}
            >
              <RefreshCw className={`h-4 w-4 ${(isLoadingHealth || isLoadingStats) ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>
            Select which data provider to use for player stats and projections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-4">
            <RadioGroup value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as ProviderName)}>
              {providers.map(provider => (
                <div key={provider} className="flex items-start space-x-3 rounded-lg border p-4">
                  <RadioGroupItem value={provider} id={provider} className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={provider} className="flex items-center space-x-2 cursor-pointer">
                      <span className="font-medium">{getProviderDisplayName(provider)}</span>
                      {stats?.[provider] && (
                        <Badge 
                          variant={stats[provider].healthy ? 'success' : 'destructive'}
                          className="ml-2"
                        >
                          {stats[provider].healthy ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {stats[provider].healthy ? 'Healthy' : 'Unhealthy'}
                        </Badge>
                      )}
                      {stats?.[provider]?.isPrimary && (
                        <Badge variant="default" className="ml-1">Active</Badge>
                      )}
                    </Label>
                    
                    {/* Provider Features */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(PROVIDER_SETTINGS[provider].features).map(([feature, supported]) => (
                        supported && (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature.replace('has', '').replace(/([A-Z])/g, ' $1').trim()}
                          </Badge>
                        )
                      ))}
                    </div>
                    
                    {/* Rate Limits */}
                    <div className="text-sm text-muted-foreground mt-2">
                      Rate Limit: {PROVIDER_SETTINGS[provider].rateLimit.requestsPerMinute} req/min,{' '}
                      {PROVIDER_SETTINGS[provider].rateLimit.requestsPerHour} req/hr
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-between items-center">
              <Button 
                onClick={handleProviderSwitch} 
                disabled={isSwitching || selectedProvider === providerManager.getConfig().primaryProvider}
                className="min-w-[120px]"
              >
                {isSwitching ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Switching...
                  </>
                ) : (
                  'Switch Provider'
                )}
              </Button>
              
              <Button 
                onClick={handleTestProviders} 
                variant="outline"
                disabled={testing}
              >
                {testing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Test All Providers
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Health Status */}
          {health && (
            <div className="space-y-3">
              <h3 className="font-medium">Provider Health Status</h3>
              {health.details?.providers && Object.entries(health.details.providers).map(([provider, status]: [string, any]) => (
                <Alert key={provider} variant={status.healthy ? 'default' : 'destructive'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{getProviderDisplayName(provider as ProviderName)}</span>
                      <span className={status.healthy ? 'text-green-600' : 'text-red-600'}>
                        {status.healthy ? 'Operational' : 'Issues Detected'}
                      </span>
                    </div>
                    {status.details && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {typeof status.details === 'string' 
                          ? status.details 
                          : JSON.stringify(status.details, null, 2)}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Test Results */}
          {testResults && (
            <div className="space-y-3">
              <h3 className="font-medium">Test Results</h3>
              {Object.entries(testResults).map(([provider, result]: [string, any]) => (
                <Alert key={provider} variant={result.success ? 'default' : 'destructive'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{getProviderDisplayName(provider as ProviderName)}</span>
                      <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                        {result.success ? 'Test Passed' : 'Test Failed'}
                      </span>
                    </div>
                    {result.error && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Error: {result.error}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}