import { productionConfig } from './production';

// Development configuration (simplified for local development)
const developmentConfig = {
  environment: 'development',
  isDevelopment: true,
  isProduction: false,

  app: {
    name: import.meta.env.VITE_APP_NAME || 'Last Survive Dev',
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    version: '0.0.1-dev',
  },

  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    options: {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  },

  security: {
    csp: null, // Disabled in development
    rateLimit: {
      enabled: false,
      maxRequests: 1000,
      windowMs: 60000,
    },
    adminEmails: import.meta.env.VITE_ADMIN_EMAILS?.split(',') || ['admin@test.com'],
  },

  performance: {
    images: {
      formats: ['jpeg', 'png'],
      sizes: [640, 1280],
      quality: 90,
      lazy: true,
    },
    chunks: null, // Let Vite handle in dev
    caching: {
      staticAssets: 0,
      apiCalls: 0,
      userSession: 3600,
    },
  },

  monitoring: {
    sentry: {
      enabled: false,
      dsn: null,
    },
    analytics: {
      enabled: false,
      trackingId: null,
    },
    performance: {
      enabled: true,
      reportWebVitals: true,
      thresholds: {
        lcp: 4000,
        fid: 200,
        cls: 0.25,
        fcp: 3000,
        ttfb: 1500,
      },
    },
  },

  api: {
    timeout: 60000, // Longer timeout for dev
    retryAttempts: 1,
    retryDelay: 1000,
    cachedEndpoints: [],
  },

  features: {
    seasonSimulation: true, // Enable for testing
    aiPlayers: true, // Enable for testing
    advancedStats: true,
    liveScoring: true,
    tradeProposals: true,
    waiverWire: true,
    leagueChat: true,
    pushNotifications: false,
  },

  season: {
    current: new Date().getFullYear(),
    startDate: '2024-09-05',
    weeks: 18,
    playoffWeeks: [15, 16, 17, 18],
  },

  leagueDefaults: productionConfig.leagueDefaults,
  validation: productionConfig.validation,

  logging: {
    level: 'debug',
    logToConsole: true,
    logToServer: false,
    excludePaths: [],
  },
};

// Configuration loader
export const config = import.meta.env.MODE === 'production' 
  ? productionConfig 
  : developmentConfig;

// Export specific configurations
export const { app, supabase, security, features, season } = config;

// Helper functions
export const isProduction = () => config.isProduction;
export const isDevelopment = () => config.isDevelopment;
export const isFeatureEnabled = (feature: keyof typeof config.features) => {
  return config.features[feature] === true;
};

// Security helpers
export const isAdmin = (email?: string) => {
  if (!email) return false;
  return config.security.adminEmails.includes(email.toLowerCase());
};

// API helpers
export const getApiConfig = () => ({
  timeout: config.api.timeout,
  retryAttempts: config.api.retryAttempts,
  retryDelay: config.api.retryDelay,
  headers: {
    'X-App-Version': config.app.version,
    'X-Environment': config.environment,
  },
});

// Performance helpers
export const shouldOptimizeImages = () => config.performance.images.lazy;
export const getImageFormats = () => config.performance.images.formats;

// Season helpers
export const getCurrentSeason = () => config.season.current;
export const getSeasonStartDate = () => new Date(config.season.startDate);
export const isSeasonActive = () => {
  const now = new Date();
  const seasonStart = getSeasonStartDate();
  const seasonEnd = new Date(seasonStart.getFullYear() + 1, 1, 15); // Feb 15 next year
  return now >= seasonStart && now <= seasonEnd;
};

// Validation helpers
export const getPasswordRules = () => config.validation.password;
export const getUsernameRules = () => config.validation.username;

// Default export
export default config;