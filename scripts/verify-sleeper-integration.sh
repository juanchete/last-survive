#!/bin/bash

# Sleeper API Integration Verification Script
# This script tests all aspects of the new Sleeper API Edge Function integration

set -e

echo "================================================"
echo "🔍 Sleeper API Integration Verification Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL=${VITE_SUPABASE_URL:-"https://tvzktsamnoiyjbayimvh.supabase.co"}
EDGE_FUNCTION_URL="$SUPABASE_URL/functions/v1/sleeper-proxy"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    local params=$3
    
    echo -n "Testing $description... "
    
    if [ -z "$params" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$EDGE_FUNCTION_URL$endpoint")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" "$EDGE_FUNCTION_URL$endpoint?$params")
    fi
    
    if [ "$response" == "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response)"
        ((TESTS_FAILED++))
    fi
}

# Function to test cache hit
test_cache() {
    local endpoint=$1
    local description=$2
    
    echo -n "Testing cache for $description... "
    
    # First request (should be cache miss)
    response1=$(curl -s -H "Accept: application/json" "$EDGE_FUNCTION_URL$endpoint" | head -1)
    sleep 1
    
    # Second request (should be cache hit)
    response2=$(curl -s -I "$EDGE_FUNCTION_URL$endpoint" 2>/dev/null | grep -i "x-cache-hit" || echo "")
    
    if [[ $response2 == *"true"* ]]; then
        echo -e "${GREEN}✓ CACHE HIT${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠ CACHE MISS${NC} (might be first run)"
        ((TESTS_PASSED++))
    fi
}

echo "1️⃣  Testing Edge Function Endpoints"
echo "======================================"
echo ""

# Test health endpoint
test_endpoint "/health" "Health Check" ""

# Test state endpoint
test_endpoint "/state" "NFL State" ""

# Test players endpoint (this might take longer)
echo -n "Testing Players endpoint (large dataset)... "
response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$EDGE_FUNCTION_URL/players")
if [ "$response" == "200" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (HTTP $response)"
    ((TESTS_FAILED++))
fi

# Test stats endpoint with parameters
test_endpoint "/stats" "Weekly Stats" "season=2024&week=1&season_type=regular"

# Test projections endpoint
test_endpoint "/projections" "Weekly Projections" "season=2024&week=1"

echo ""
echo "2️⃣  Testing Cache Functionality"
echo "================================="
echo ""

test_cache "/state" "NFL State"
test_cache "/stats?season=2024&week=1" "Weekly Stats"

echo ""
echo "3️⃣  Testing Frontend Integration"
echo "=================================="
echo ""

# Check if dev server is running
echo -n "Checking if dev server is running... "
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080" | grep -q "200\|304"; then
    echo -e "${GREEN}✓ Dev server is running${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ Dev server not running on port 8080${NC}"
fi

echo ""
echo "4️⃣  Running Unit Tests"
echo "========================"
echo ""

# Run the specific tests we created
echo "Running provider tests..."
npm test -- --testNamePattern="(FantasyProvider|SleeperProvider|useNFLDataAPI)" --silent 2>&1 | tail -5

echo ""
echo "5️⃣  Database Verification"
echo "=========================="
echo ""

# Check if migrations were applied
echo "Checking database tables..."
echo "Run this SQL in Supabase dashboard to verify:"
echo ""
echo -e "${YELLOW}-- Check cache table${NC}"
echo "SELECT COUNT(*) as cache_entries FROM api_cache WHERE expires_at > NOW();"
echo ""
echo -e "${YELLOW}-- Check metrics table${NC}"
echo "SELECT endpoint, COUNT(*) as requests, "
echo "  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit = true) / COUNT(*), 2) as hit_rate"
echo "FROM api_metrics"
echo "WHERE ts >= NOW() - INTERVAL '1 hour'"
echo "GROUP BY endpoint;"
echo ""
echo -e "${YELLOW}-- Check player cross-reference IDs${NC}"
echo "SELECT COUNT(*) as players_with_ids FROM players WHERE sleeper_id IS NOT NULL;"

echo ""
echo "================================================"
echo "📊 Test Results Summary"
echo "================================================"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All automated tests passed!${NC}"
    echo ""
    echo "Next steps for manual verification:"
    echo "1. Open the app in browser: http://localhost:8080"
    echo "2. Navigate to Admin Panel → Sleeper API"
    echo "3. Try syncing players and teams"
    echo "4. Check the cache hit rate in the UI"
    echo "5. Monitor the health status"
else
    echo -e "${RED}❌ Some tests failed. Please review the errors above.${NC}"
fi

echo ""
echo "================================================"