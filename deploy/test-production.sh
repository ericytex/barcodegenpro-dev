#!/bin/bash

# Test production API endpoints
# Run from local machine

DOMAIN="aistoryshorts.com"
API_BASE="https://$DOMAIN/api"

echo "=== Testing Production API: $DOMAIN ==="
echo ""

echo "1. Testing health check endpoint:"
echo "   GET $API_BASE/healthz"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/healthz")
if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Health check passed ($HTTP_CODE)"
    curl -s "$API_BASE/healthz" | head -3
else
    echo "   ❌ Health check failed ($HTTP_CODE)"
fi

echo ""
echo "2. Testing login endpoint (should fail without valid credentials):"
echo "   POST $API_BASE/auth/login"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}')
if [ "$HTTP_CODE" == "401" ]; then
    echo "   ✅ Login endpoint responds correctly (401 Unauthorized - expected)"
elif [ "$HTTP_CODE" == "200" ]; then
    echo "   ⚠️  Login succeeded (unexpected with test credentials)"
else
    echo "   ❌ Login endpoint returned: $HTTP_CODE"
fi

echo ""
echo "3. Testing frontend (root):"
echo "   GET https://$DOMAIN/"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/")
if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ Frontend is accessible ($HTTP_CODE)"
else
    echo "   ❌ Frontend not accessible ($HTTP_CODE)"
fi

echo ""
echo "4. Testing API endpoint structure:"
echo "   GET $API_BASE/auth/verify"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/auth/verify" \
    -H "Authorization: Bearer invalid")
if [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "403" ]; then
    echo "   ✅ Auth endpoint structure correct ($HTTP_CODE)"
else
    echo "   ⚠️  Unexpected response ($HTTP_CODE)"
fi

echo ""
echo "5. Checking CORS headers:"
CORS_HEADERS=$(curl -s -I -X OPTIONS "$API_BASE/auth/login" 2>&1 | grep -i "access-control")
if [ -n "$CORS_HEADERS" ]; then
    echo "   ✅ CORS headers present:"
    echo "$CORS_HEADERS" | sed 's/^/      /'
else
    echo "   ⚠️  CORS headers not found"
fi

echo ""
echo "✅ Test complete!"
echo ""
echo "If login returns 401, verify:"
echo "  1. Database has users: ssh deployer@194.163.134.129 'docker exec barcode-v2-backend sqlite3 /app/data/barcode_generator.db \"SELECT COUNT(*) FROM users;\"'"
echo "  2. Container is using correct database"
echo "  3. Users table exists in database"



