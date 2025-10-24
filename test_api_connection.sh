#!/bin/bash
# Test script to verify API connection

echo "🧪 Testing API Connection..."
echo "================================"

API_URL="http://localhost:8034"
API_KEY="dev-api-key-12345"

echo "Testing API at: $API_URL"
echo "Using API Key: $API_KEY"
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "X-API-Key: $API_KEY" \
  "$API_URL/health")

HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""

# Test database files endpoint
echo "2. Testing database files endpoint..."
DB_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "X-API-Key: $API_KEY" \
  "$API_URL/database/files")

HTTP_CODE=$(echo "$DB_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DB_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Database files endpoint accessible"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Database files endpoint failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""

# Test archive statistics endpoint
echo "3. Testing archive statistics endpoint..."
STATS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "X-API-Key: $API_KEY" \
  "$API_URL/archive/statistics")

HTTP_CODE=$(echo "$STATS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$STATS_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Archive statistics endpoint accessible"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Archive statistics endpoint failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "================================"
echo "Test completed!"

# Check if API server is running
if ! curl -s "$API_URL/health" > /dev/null; then
    echo ""
    echo "⚠️  WARNING: API server doesn't seem to be running on $API_URL"
    echo "   Please start the API server first:"
    echo "   cd api && python app.py"
    echo "   or"
    echo "   cd api && ./start_api.sh"
fi
