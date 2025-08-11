import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

// Types
interface CacheEntry {
  key: string
  value: any
  expires_at: string
  created_at: string
}

interface ApiMetric {
  endpoint: string
  status: number
  cache_hit: boolean
  latency_ms: number
  error?: string
  metadata?: Record<string, any>
}

interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  state: 'closed' | 'open' | 'half-open'
  successCount: number
}

// Configuration
const SLEEPER_BASE_URL = Deno.env.get('SLEEPER_BASE_URL') || 'https://api.sleeper.app'
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:8080').split(',')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const REQUEST_TIMEOUT_MS = 15000
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024 // 10MB
const CIRCUIT_BREAKER_THRESHOLD = 5
const CIRCUIT_BREAKER_TIMEOUT = 60000 // 60 seconds
const CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 3

// Circuit breakers per endpoint
const circuitBreakers = new Map<string, CircuitBreakerState>()

// TTL Configuration (in seconds)
const TTL_CONFIG: Record<string, number> = {
  '/state': 300,        // 5 minutes
  '/players': 86400,    // 24 hours
  '/stats': 1800,       // 30 minutes
  '/projections': 1800, // 30 minutes
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// Utility Functions
async function generateCacheKey(method: string, path: string, params: URLSearchParams): Promise<string> {
  const sortedParams = Array.from(params.entries()).sort().map(([k, v]) => `${k}=${v}`).join('&')
  const keyString = `${method}:${path}:${sortedParams}`
  const encoder = new TextEncoder()
  const data = encoder.encode(keyString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

function getExpiryTime(path: string): Date {
  const ttlSeconds = TTL_CONFIG[path] || 300 // Default 5 minutes
  return new Date(Date.now() + ttlSeconds * 1000)
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function exponentialBackoff(attempt: number): number {
  const baseDelay = 1000 // 1 second
  const maxDelay = 30000 // 30 seconds
  const jitter = Math.random() * 1000 // 0-1 second jitter
  const delay = Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay)
  return delay
}

// Circuit Breaker Functions
function getCircuitBreaker(endpoint: string): CircuitBreakerState {
  if (!circuitBreakers.has(endpoint)) {
    circuitBreakers.set(endpoint, {
      failures: 0,
      lastFailureTime: 0,
      state: 'closed',
      successCount: 0
    })
  }
  return circuitBreakers.get(endpoint)!
}

function checkCircuitBreaker(endpoint: string): boolean {
  const breaker = getCircuitBreaker(endpoint)
  
  if (breaker.state === 'open') {
    const timeSinceLastFailure = Date.now() - breaker.lastFailureTime
    if (timeSinceLastFailure > CIRCUIT_BREAKER_TIMEOUT) {
      breaker.state = 'half-open'
      breaker.successCount = 0
    } else {
      return false
    }
  }
  
  return true
}

function recordSuccess(endpoint: string): void {
  const breaker = getCircuitBreaker(endpoint)
  
  if (breaker.state === 'half-open') {
    breaker.successCount++
    if (breaker.successCount >= CIRCUIT_BREAKER_SUCCESS_THRESHOLD) {
      breaker.state = 'closed'
      breaker.failures = 0
      breaker.successCount = 0
    }
  } else if (breaker.state === 'closed') {
    breaker.failures = 0
  }
}

function recordFailure(endpoint: string): void {
  const breaker = getCircuitBreaker(endpoint)
  
  breaker.failures++
  breaker.lastFailureTime = Date.now()
  
  if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    breaker.state = 'open'
  }
}

// Cache Functions
async function getCachedResponse(key: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('value, expires_at')
      .eq('key', key)
      .single()
    
    if (error || !data) return null
    
    const expiryTime = new Date(data.expires_at)
    if (expiryTime > new Date()) {
      return data.value
    }
    
    // Clean up expired entry
    await supabase.from('api_cache').delete().eq('key', key)
    return null
  } catch (error) {
    console.error('Cache read error:', error)
    return null
  }
}

async function setCachedResponse(key: string, value: any, ttlPath: string): Promise<void> {
  try {
    const expiresAt = getExpiryTime(ttlPath)
    
    await supabase
      .from('api_cache')
      .upsert({
        key,
        value,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Cache write error:', error)
  }
}

// Metrics Functions
async function recordMetric(metric: ApiMetric): Promise<void> {
  try {
    await supabase
      .from('api_metrics')
      .insert({
        endpoint: metric.endpoint,
        status: metric.status,
        cache_hit: metric.cache_hit,
        latency_ms: metric.latency_ms,
        error: metric.error,
        metadata: metric.metadata
      })
  } catch (error) {
    console.error('Metrics recording error:', error)
  }
}

// Proxy Functions
async function fetchFromSleeper(path: string, params: URLSearchParams, attempt = 0): Promise<Response> {
  const url = `${SLEEPER_BASE_URL}${path}?${params.toString()}`
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NFL-Fantasy-Proxy/1.0'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeout)
    
    // Check response size
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      throw new Error('Response too large')
    }
    
    // Handle rate limiting and server errors with retry
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 3) {
        const delay = exponentialBackoff(attempt)
        await sleep(delay)
        return fetchFromSleeper(path, params, attempt + 1)
      }
      throw new Error(`Sleeper API error: ${response.status}`)
    }
    
    return response
  } catch (error) {
    if (attempt < 3 && (error.name === 'AbortError' || error.message.includes('network'))) {
      const delay = exponentialBackoff(attempt)
      await sleep(delay)
      return fetchFromSleeper(path, params, attempt + 1)
    }
    throw error
  }
}

// Route Handlers
async function handleState(params: URLSearchParams): Promise<Response> {
  const startTime = Date.now()
  const endpoint = '/state'
  const cacheKey = generateCacheKey('GET', endpoint, params)
  
  // Check circuit breaker
  if (!checkCircuitBreaker(endpoint)) {
    await recordMetric({
      endpoint,
      status: 503,
      cache_hit: false,
      latency_ms: Date.now() - startTime,
      error: 'Circuit breaker open'
    })
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Check cache
  const cached = await getCachedResponse(cacheKey)
  if (cached) {
    await recordMetric({
      endpoint,
      status: 200,
      cache_hit: true,
      latency_ms: Date.now() - startTime
    })
    return new Response(JSON.stringify(cached), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'true'
      }
    })
  }
  
  // Fetch from Sleeper
  try {
    const response = await fetchFromSleeper('/v1/state/nfl', params)
    const data = await response.json()
    
    // Cache the response
    await setCachedResponse(cacheKey, data, endpoint)
    
    recordSuccess(endpoint)
    await recordMetric({
      endpoint,
      status: response.status,
      cache_hit: false,
      latency_ms: Date.now() - startTime
    })
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'false'
      }
    })
  } catch (error) {
    recordFailure(endpoint)
    await recordMetric({
      endpoint,
      status: 500,
      cache_hit: false,
      latency_ms: Date.now() - startTime,
      error: error.message
    })
    
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handlePlayers(params: URLSearchParams): Promise<Response> {
  const startTime = Date.now()
  const endpoint = '/players'
  const cacheKey = await generateCacheKey('GET', endpoint, params)
  
  if (!checkCircuitBreaker(endpoint)) {
    await recordMetric({
      endpoint,
      status: 503,
      cache_hit: false,
      latency_ms: Date.now() - startTime,
      error: 'Circuit breaker open'
    })
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const cached = await getCachedResponse(cacheKey)
  if (cached) {
    await recordMetric({
      endpoint,
      status: 200,
      cache_hit: true,
      latency_ms: Date.now() - startTime
    })
    return new Response(JSON.stringify(cached), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'true'
      }
    })
  }
  
  try {
    const response = await fetchFromSleeper('/v1/players/nfl', params)
    const data = await response.json()
    
    await setCachedResponse(cacheKey, data, endpoint)
    
    recordSuccess(endpoint)
    await recordMetric({
      endpoint,
      status: response.status,
      cache_hit: false,
      latency_ms: Date.now() - startTime
    })
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'false'
      }
    })
  } catch (error) {
    recordFailure(endpoint)
    await recordMetric({
      endpoint,
      status: 500,
      cache_hit: false,
      latency_ms: Date.now() - startTime,
      error: error.message
    })
    
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleStats(params: URLSearchParams): Promise<Response> {
  const startTime = Date.now()
  const endpoint = '/stats'
  
  // Validate required params
  const season = params.get('season')
  const week = params.get('week')
  const seasonType = params.get('season_type') || 'regular'
  
  if (!season || !week) {
    return new Response(JSON.stringify({ error: 'Missing required parameters: season, week' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Validate season_type
  if (!['regular', 'pre', 'post'].includes(seasonType)) {
    return new Response(JSON.stringify({ error: 'Invalid season_type. Must be: regular, pre, or post' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const cacheKey = await generateCacheKey('GET', endpoint, params)
  
  if (!checkCircuitBreaker(endpoint)) {
    await recordMetric({
      endpoint,
      status: 503,
      cache_hit: false,
      latency_ms: Date.now() - startTime,
      error: 'Circuit breaker open'
    })
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const cached = await getCachedResponse(cacheKey)
  if (cached) {
    await recordMetric({
      endpoint,
      status: 200,
      cache_hit: true,
      latency_ms: Date.now() - startTime
    })
    return new Response(JSON.stringify(cached), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'true'
      }
    })
  }
  
  try {
    const sleeperParams = new URLSearchParams({ season_type: seasonType })
    const response = await fetchFromSleeper(`/stats/nfl/${season}/${week}`, sleeperParams)
    const data = await response.json()
    
    await setCachedResponse(cacheKey, data, endpoint)
    
    recordSuccess(endpoint)
    await recordMetric({
      endpoint,
      status: response.status,
      cache_hit: false,
      latency_ms: Date.now() - startTime
    })
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'false'
      }
    })
  } catch (error) {
    recordFailure(endpoint)
    await recordMetric({
      endpoint,
      status: 500,
      cache_hit: false,
      latency_ms: Date.now() - startTime,
      error: error.message
    })
    
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleProjections(params: URLSearchParams): Promise<Response> {
  const startTime = Date.now()
  const endpoint = '/projections'
  
  const season = params.get('season')
  const week = params.get('week')
  const seasonType = params.get('season_type') || 'regular'
  
  if (!season || !week) {
    return new Response(JSON.stringify({ error: 'Missing required parameters: season, week' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  if (!['regular', 'pre', 'post'].includes(seasonType)) {
    return new Response(JSON.stringify({ error: 'Invalid season_type. Must be: regular, pre, or post' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const cacheKey = await generateCacheKey('GET', endpoint, params)
  
  if (!checkCircuitBreaker(endpoint)) {
    await recordMetric({
      endpoint,
      status: 503,
      cache_hit: false,
      latency_ms: Date.now() - startTime,
      error: 'Circuit breaker open'
    })
    return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const cached = await getCachedResponse(cacheKey)
  if (cached) {
    await recordMetric({
      endpoint,
      status: 200,
      cache_hit: true,
      latency_ms: Date.now() - startTime
    })
    return new Response(JSON.stringify(cached), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'true'
      }
    })
  }
  
  try {
    const sleeperParams = new URLSearchParams({ season_type: seasonType })
    const response = await fetchFromSleeper(`/projections/nfl/${season}/${week}`, sleeperParams)
    const data = await response.json()
    
    await setCachedResponse(cacheKey, data, endpoint)
    
    recordSuccess(endpoint)
    await recordMetric({
      endpoint,
      status: response.status,
      cache_hit: false,
      latency_ms: Date.now() - startTime
    })
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache-Hit': 'false'
      }
    })
  } catch (error) {
    recordFailure(endpoint)
    await recordMetric({
      endpoint,
      status: 500,
      cache_hit: false,
      latency_ms: Date.now() - startTime,
      error: error.message
    })
    
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleHealth(): Promise<Response> {
  try {
    // Check database connection
    const { error: dbError } = await supabase
      .from('api_cache')
      .select('key')
      .limit(1)
    
    if (dbError) {
      return new Response(JSON.stringify({ 
        status: 'unhealthy', 
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Get recent metrics
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: metrics, error: metricsError } = await supabase
      .from('api_metrics')
      .select('endpoint, status, cache_hit, latency_ms')
      .gte('ts', fiveMinutesAgo)
      .limit(100)
    
    // Calculate health metrics
    const totalRequests = metrics?.length || 0
    const cacheHits = metrics?.filter(m => m.cache_hit).length || 0
    const errors = metrics?.filter(m => m.status >= 400).length || 0
    const avgLatency = metrics?.length 
      ? metrics.reduce((sum, m) => sum + (m.latency_ms || 0), 0) / metrics.length
      : 0
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        requests_last_5m: totalRequests,
        cache_hit_rate: totalRequests > 0 ? (cacheHits / totalRequests * 100).toFixed(2) + '%' : '0%',
        error_rate: totalRequests > 0 ? (errors / totalRequests * 100).toFixed(2) + '%' : '0%',
        avg_latency_ms: Math.round(avgLatency)
      },
      circuit_breakers: Object.fromEntries(
        Array.from(circuitBreakers.entries()).map(([endpoint, state]) => [
          endpoint,
          {
            state: state.state,
            failures: state.failures
          }
        ])
      )
    }
    
    return new Response(JSON.stringify(health), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Main handler
serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Will be restricted based on request origin
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  }
  
  // Check origin
  const origin = req.headers.get('origin')
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin
  } else if (!origin) {
    // Allow requests without origin (e.g., server-side)
    corsHeaders['Access-Control-Allow-Origin'] = '*'
  } else {
    // Reject unknown origins
    return new Response('Forbidden', { 
      status: 403,
      headers: corsHeaders 
    })
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Parse URL
  const url = new URL(req.url)
  const path = url.pathname.replace('/sleeper-proxy', '')
  const params = url.searchParams
  
  try {
    let response: Response
    
    switch (path) {
      case '/state':
        response = await handleState(params)
        break
      case '/players':
        response = await handlePlayers(params)
        break
      case '/stats':
        response = await handleStats(params)
        break
      case '/projections':
        response = await handleProjections(params)
        break
      case '/health':
        response = await handleHealth()
        break
      default:
        response = new Response(JSON.stringify({ 
          error: 'Not found',
          available_endpoints: ['/state', '/players', '/stats', '/projections', '/health']
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
    }
    
    // Add CORS headers to response
    const headers = new Headers(response.headers)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value)
    })
    
    return new Response(response.body, {
      status: response.status,
      headers
    })
  } catch (error) {
    console.error('Request error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})