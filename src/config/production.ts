// Production configuration with security and performance optimizations

export const productionConfig = {
  // Environment
  environment: "production",
  isDevelopment: false,
  isProduction: true,

  // App Info
  app: {
    name: import.meta.env.VITE_APP_NAME || "Last Survive",
    url: import.meta.env.VITE_APP_URL || "https://lastsurvive.com",
    version: import.meta.env.VITE_APP_VERSION || "1.0.0",
  },

  // Supabase
  supabase: {
    url: "https://tvzktsamnoiyjbayimvh.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2emt0c2Ftbm9peWpiYXlpbXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTc2MzYsImV4cCI6MjA2MjMzMzYzNn0.Gcf1g2hLfUIFwO80mSxi34gbmCyZpu5L6qpH9ZCmqq0",
    // Add connection pooling for production
    options: {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          "x-app-version": import.meta.env.VITE_APP_VERSION || "1.0.0",
        },
      },
    },
  },

  // Security
  security: {
    // Content Security Policy
    csp: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
      ],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "https:", "blob:"],
      "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
    },
    // Rate limiting
    rateLimit: {
      enabled: import.meta.env.VITE_RATE_LIMIT_ENABLED === "true",
      maxRequests: parseInt(
        import.meta.env.VITE_RATE_LIMIT_MAX_REQUESTS || "100"
      ),
      windowMs: parseInt(import.meta.env.VITE_RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    },
    // Admin emails
    adminEmails: ["juanlopezlmg@gmail.com"],
  },

  // Performance
  performance: {
    // Image optimization
    images: {
      formats: ["webp", "avif"],
      sizes: [320, 640, 768, 1024, 1280, 1920],
      quality: 85,
      lazy: true,
    },
    // Code splitting
    chunks: {
      vendor: ["react", "react-dom", "react-router-dom"],
      supabase: ["@supabase/supabase-js"],
      ui: ["@radix-ui", "framer-motion"],
    },
    // Caching
    caching: {
      staticAssets: 31536000, // 1 year
      apiCalls: 300, // 5 minutes
      userSession: 3600, // 1 hour
    },
  },

  // Monitoring
  monitoring: {
    // Error tracking
    sentry: {
      enabled: import.meta.env.VITE_ENABLE_ERROR_TRACKING === "true",
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: "production",
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    },
    // Analytics
    analytics: {
      enabled: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
      trackingId: import.meta.env.VITE_GA_TRACKING_ID,
    },
    // Performance monitoring
    performance: {
      enabled: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === "true",
      reportWebVitals: true,
      thresholds: {
        lcp: 2500, // Largest Contentful Paint
        fid: 100, // First Input Delay
        cls: 0.1, // Cumulative Layout Shift
        fcp: 1800, // First Contentful Paint
        ttfb: 800, // Time to First Byte
      },
    },
  },

  // API Configuration
  api: {
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || "30000"),
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || "3"),
    retryDelay: 1000,
    // API endpoints that should be cached
    cachedEndpoints: ["/api/players", "/api/nfl-teams", "/api/scoring-rules"],
  },

  // Feature Flags
  features: {
    // Season simulation for testing
    seasonSimulation: false,
    // AI players for demo mode
    aiPlayers: false,
    // Advanced stats
    advancedStats: true,
    // Live scoring updates
    liveScoring: true,
    // Trade proposals
    tradeProposals: true,
    // Waiver wire
    waiverWire: true,
    // Chat functionality
    leagueChat: false,
    // Push notifications
    pushNotifications: false,
  },

  // Season Configuration
  season: {
    current: parseInt(import.meta.env.VITE_CURRENT_SEASON || "2024"),
    startDate: import.meta.env.VITE_SEASON_START_DATE || "2024-09-05",
    weeks: 18,
    playoffWeeks: [15, 16, 17, 18],
  },

  // League Defaults
  leagueDefaults: {
    maxTeams: 12,
    minTeams: 4,
    defaultSize: 8,
    entryFeeOptions: [0, 10, 25, 50, 100],
    scoringTypes: ["standard", "ppr", "half-ppr"],
    draftTypes: ["snake", "auction"],
    waiverTypes: ["priority", "faab"],
  },

  // Validation Rules
  validation: {
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
    username: {
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_-]+$/,
    },
    leagueName: {
      minLength: 4,
      maxLength: 50,
    },
    teamName: {
      minLength: 3,
      maxLength: 30,
    },
  },

  // Logging
  logging: {
    level: "error", // 'debug' | 'info' | 'warn' | 'error'
    logToConsole: false,
    logToServer: true,
    excludePaths: ["/api/health", "/api/status"],
  },
};
