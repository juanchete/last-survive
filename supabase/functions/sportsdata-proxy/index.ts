import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SPORTSDATA_API_BASE = "https://api.sportsdata.io/v3/nfl";
const CACHE_DURATION = 300; // 5 minutes in seconds

// Cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();

function getCacheKey(endpoint: string, params?: URLSearchParams): string {
  return params ? `${endpoint}?${params.toString()}` : endpoint;
}

function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  const age = (now - cached.timestamp) / 1000;
  
  if (age > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
  
  // Limit cache size
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

async function fetchFromSportsData(
  endpoint: string,
  apiKey: string,
  params?: URLSearchParams
): Promise<any> {
  let url = "";
  
  // Map internal endpoints to SportsData API endpoints
  switch (endpoint) {
    case "/currentweek":
      url = `${SPORTSDATA_API_BASE}/scores/json/CurrentWeek?key=${apiKey}`;
      break;
    case "/players":
      // Use Players endpoint for complete player data
      url = `${SPORTSDATA_API_BASE}/scores/json/Players?key=${apiKey}`;
      break;
    case "/fantasy-players":
      // Use FantasyPlayers endpoint specifically for ADP data
      url = `${SPORTSDATA_API_BASE}/stats/json/FantasyPlayers?key=${apiKey}`;
      break;
    case "/stats":
      const statsSeason = params?.get("season") || "2024";
      const statsWeek = params?.get("week") || "1";
      const statsSeasonType = params?.get("season_type") || "regular";
      
      // Map season_type to SportsData format (REG, PRE, POST)
      const typeMap: Record<string, string> = {
        'regular': 'REG',
        'pre': 'PRE',
        'post': 'POST'
      };
      const sdType = typeMap[statsSeasonType] || 'REG';
      
      // Use FantasyGameStatsByWeek with combined season+type format
      url = `${SPORTSDATA_API_BASE}/stats/json/FantasyGameStatsByWeek/${statsSeason}${sdType}/${statsWeek}?key=${apiKey}`;
      break;
    case "/projections":
      const projSeason = params?.get("season") || "2024";
      const projWeek = params?.get("week") || "1";
      const projSeasonType = params?.get("season_type") || "regular";
      
      // Map season_type to SportsData format (REG, PRE, POST)
      const projTypeMap: Record<string, string> = {
        'regular': 'REG',
        'pre': 'PRE',
        'post': 'POST'
      };
      const projSdType = projTypeMap[projSeasonType] || 'REG';
      
      // Use the correct projection endpoint with season+type format
      url = `${SPORTSDATA_API_BASE}/projections/json/PlayerGameProjectionStatsByWeek/${projSeason}${projSdType}/${projWeek}?key=${apiKey}`;
      break;
    case "/teams":
      url = `${SPORTSDATA_API_BASE}/scores/json/Teams?key=${apiKey}`;
      break;
    case "/defense-stats":
      const defSeason = params?.get("season") || "2024";
      const defWeek = params?.get("week") || "1";
      const defTeam = params?.get("team");
      
      if (defTeam) {
        // Get defense stats for specific team by game
        url = `${SPORTSDATA_API_BASE}/stats/json/FantasyDefenseByGameByTeam/${defSeason}/${defWeek}/${defTeam}?key=${apiKey}`;
      } else {
        // Get all team defense stats for the week
        url = `${SPORTSDATA_API_BASE}/stats/json/FantasyDefenseByWeek/${defSeason}REG/${defWeek}?key=${apiKey}`;
      }
      break;
    case "/health":
      // Health check endpoint - just test the current week endpoint
      url = `${SPORTSDATA_API_BASE}/scores/json/CurrentWeek?key=${apiKey}`;
      break;
    default:
      throw new Error(`Unknown endpoint: ${endpoint}`);
  }
  
  // For FantasyPlayers endpoint, use minimal headers
  const headers: Record<string, string> = {};
  if (endpoint !== "/fantasy-players") {
    headers["Accept"] = "application/json";
  }
  
  const response = await fetch(url, {
    headers,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("SportsData API error:", response.status, errorText);
    throw new Error(`SportsData API error: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  
  // Filter active players if it's the players endpoint
  if (endpoint === "/players" && Array.isArray(data)) {
    return data.filter((player: any) => player.Status === "Active");
  }
  
  // Filter players with teams if it's the fantasy-players endpoint
  if (endpoint === "/fantasy-players" && Array.isArray(data)) {
    return data.filter((player: any) => player.Team && player.Team !== null && player.Team !== "");
  }
  
  return data;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace("/sportsdata-proxy", "");
    const searchParams = url.searchParams;
    
    // Get API key from header or environment
    const apiKey = req.headers.get("X-API-Key") || 
                   Deno.env.get("SPORTSDATA_API_KEY") || 
                   "f1826e4060774e56a6f56bae1d9eb76e";
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Check cache first
    const cacheKey = getCacheKey(pathname, searchParams);
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log("Cache hit for:", cacheKey);
      return new Response(JSON.stringify(cachedData), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Cache-Hit": "true",
        },
      });
    }
    
    // Fetch from API if not cached
    console.log("Cache miss, fetching from SportsData API:", pathname);
    const data = await fetchFromSportsData(pathname, apiKey, searchParams);
    
    // Store in cache
    setCachedData(cacheKey, data);
    
    // Handle health check endpoint
    if (pathname === "/health") {
      return new Response(
        JSON.stringify({ 
          status: "healthy", 
          provider: "sportsdata",
          timestamp: new Date().toISOString(),
          cacheSize: cache.size,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Cache-Hit": "false",
          },
        }
      );
    }
    
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Cache-Hit": "false",
      },
    });
  } catch (error) {
    console.error("Error in sportsdata-proxy:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});