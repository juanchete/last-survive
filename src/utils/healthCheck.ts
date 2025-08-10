import { supabase } from '@/integrations/supabase/client';
import { config } from '@/config';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    auth: ServiceStatus;
    storage?: ServiceStatus;
  };
  metrics?: {
    responseTime: number;
    uptime: number;
    memoryUsage: number;
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
}

class HealthChecker {
  private startTime: number;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  async checkHealth(): Promise<HealthCheckResult> {
    const startCheck = Date.now();
    
    const [dbStatus, authStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkAuth(),
    ]);
    
    const allServicesHealthy = 
      dbStatus.status === 'up' && 
      authStatus.status === 'up';
    
    const anyServiceDown = 
      dbStatus.status === 'down' || 
      authStatus.status === 'down';
    
    return {
      status: anyServiceDown ? 'unhealthy' : allServicesHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: config.app.version,
      environment: config.environment,
      services: {
        database: dbStatus,
        auth: authStatus,
      },
      metrics: {
        responseTime: Date.now() - startCheck,
        uptime: Date.now() - this.startTime,
        memoryUsage: this.getMemoryUsage(),
      },
    };
  }
  
  private async checkDatabase(): Promise<ServiceStatus> {
    try {
      const start = Date.now();
      
      // Simple query to check database connectivity
      const { error } = await supabase
        .from('leagues')
        .select('id')
        .limit(1);
      
      if (error) {
        return {
          status: 'down',
          error: error.message,
        };
      }
      
      const responseTime = Date.now() - start;
      
      // Consider degraded if response time is high
      if (responseTime > 1000) {
        return {
          status: 'degraded',
          responseTime,
        };
      }
      
      return {
        status: 'up',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async checkAuth(): Promise<ServiceStatus> {
    try {
      const start = Date.now();
      
      // Check if auth service is responsive
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          status: 'down',
          error: error.message,
        };
      }
      
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      // @ts-ignore - memory is not in the TypeScript definitions yet
      const memory = performance.memory;
      return Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
    }
    return 0;
  }
  
  // Endpoint for external monitoring services
  async getHealthEndpoint(): Promise<Response> {
    const health = await this.checkHealth();
    
    const statusCode = 
      health.status === 'healthy' ? 200 :
      health.status === 'degraded' ? 503 : 500;
    
    return new Response(JSON.stringify(health), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

// Singleton instance
export const healthChecker = new HealthChecker();

// React hook for health monitoring
import { useQuery } from '@tanstack/react-query';

export function useHealthCheck(enabled = false) {
  return useQuery({
    queryKey: ['health-check'],
    queryFn: () => healthChecker.checkHealth(),
    enabled,
    refetchInterval: 60000, // Check every minute
    staleTime: 30000, // Consider stale after 30 seconds
  });
}