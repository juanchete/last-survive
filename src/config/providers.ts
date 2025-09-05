/**
 * Provider Configuration
 * Centralized configuration for fantasy data providers
 */

import { ProviderName, ProviderManagerConfig } from '@/lib/providers/ProviderManager';

// Provider API keys - These should ideally come from environment variables
export const PROVIDER_API_KEYS = {
  sportsdata: import.meta.env.VITE_SPORTSDATA_API_KEY || 'f1826e4060774e56a6f56bae1d9eb76e',
} as const;

// Provider endpoints configuration
export const PROVIDER_ENDPOINTS = {
  sportsdata: {
    base: 'https://api.sportsdata.io/v3/nfl',
    edge: '/sportsdata-proxy', // Our Edge Function proxy
  },
} as const;

// Default provider configuration
export const DEFAULT_PROVIDER_CONFIG: ProviderManagerConfig = {
  primaryProvider: 'sportsdata' as ProviderName, // Default to SportsData.io
  fallbackProvider: undefined,
  enableFallback: false,
  cacheResults: true,
  logErrors: true,
};

// Provider-specific settings
export const PROVIDER_SETTINGS = {
  sportsdata: {
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 500,
    },
    cache: {
      players: 86400, // 24 hours
      stats: 300, // 5 minutes
      projections: 300, // 5 minutes
      state: 60, // 1 minute
    },
    features: {
      hasProjections: true,
      hasLiveStats: true,
      hasDFS: true,
      hasOdds: true,
      hasNews: true,
    },
  },
} as const;

// Provider preference storage keys
export const PROVIDER_STORAGE_KEYS = {
  ACTIVE_PROVIDER: 'nfl_fantasy_active_provider',
  PROVIDER_SETTINGS: 'nfl_fantasy_provider_settings',
  PROVIDER_CACHE_PREFIX: 'nfl_fantasy_cache_',
} as const;

// Helper functions for provider management

/**
 * Get the currently active provider from localStorage
 */
export function getActiveProvider(): ProviderName {
  if (typeof window === 'undefined') {
    return DEFAULT_PROVIDER_CONFIG.primaryProvider;
  }
  
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEYS.ACTIVE_PROVIDER);
  return (stored as ProviderName) || DEFAULT_PROVIDER_CONFIG.primaryProvider;
}

/**
 * Set the active provider in localStorage
 */
export function setActiveProvider(provider: ProviderName): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROVIDER_STORAGE_KEYS.ACTIVE_PROVIDER, provider);
  }
}

/**
 * Get provider settings from localStorage
 */
export function getProviderSettings(): Partial<ProviderManagerConfig> {
  if (typeof window === 'undefined') {
    return {};
  }
  
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEYS.PROVIDER_SETTINGS);
  if (!stored) {
    return {};
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

/**
 * Save provider settings to localStorage
 */
export function saveProviderSettings(settings: Partial<ProviderManagerConfig>): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      PROVIDER_STORAGE_KEYS.PROVIDER_SETTINGS,
      JSON.stringify(settings)
    );
  }
}

/**
 * Get provider-specific cache key
 */
export function getProviderCacheKey(provider: ProviderName, key: string): string {
  return `${PROVIDER_STORAGE_KEYS.PROVIDER_CACHE_PREFIX}${provider}_${key}`;
}

/**
 * Clear provider cache
 */
export function clearProviderCache(provider?: ProviderName): void {
  if (typeof window === 'undefined') return;
  
  const prefix = provider 
    ? getProviderCacheKey(provider, '')
    : PROVIDER_STORAGE_KEYS.PROVIDER_CACHE_PREFIX;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: ProviderName): string {
  const names: Record<ProviderName, string> = {
    sportsdata: 'SportsData.io',
  };
  return names[provider] || provider;
}

/**
 * Get provider status color
 */
export function getProviderStatusColor(healthy: boolean): string {
  return healthy ? 'text-green-500' : 'text-red-500';
}

/**
 * Check if provider supports a feature
 */
export function providerSupportsFeature(
  provider: ProviderName,
  feature: keyof typeof PROVIDER_SETTINGS.sportsdata.features
): boolean {
  return PROVIDER_SETTINGS[provider]?.features[feature] ?? false;
}