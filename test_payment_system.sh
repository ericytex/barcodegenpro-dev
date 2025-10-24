#!/bin/bash

# Test script for payment system
echo "🧪 Testing Payment System"
echo "========================="

API_BASE="http://localhost:8034"
API_KEY="test_api_key_12345"

echo ""
echo "1️⃣  Testing Health Check..."
curl -X GET "$API_BASE/healthz" \
  -H "X-API-Key: $API_KEY" \
  | jq '.'

echo ""
echo "2️⃣  Testing Get Subscription Plans..."
curl -X GET "$API_BASE/api/payments/plans" \
  -H "X-API-Key: $API_KEY" \
  | jq '.'

echo ""
echo "3️⃣  Testing Get Subscription Status (Mock User)..."
curl -X GET "$API_BASE/api/payments/status" \
  -H "X-API-Key: $API_KEY" \
  | jq '.'

echo ""
echo "4️⃣  Testing Create Subscription..."
SUBSCRIPTION_RESPONSE=$(curl -X POST "$API_BASE/api/payments/subscribe" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "plan_id": 1,
    "phone": "+254700000000"
  }')

echo "$SUBSCRIPTION_RESPONSE" | jq '.'

# Extract transaction UID from response
TRANSACTION_UID=$(echo "$SUBSCRIPTION_RESPONSE" | jq -r '.transaction_uid')

if [ "$TRANSACTION_UID" != "null" ] && [ ! -z "$TRANSACTION_UID" ]; then
  echo ""
  echo "5️⃣  Testing Payment Completion (Test Endpoint)..."
  echo "Transaction UID: $TRANSACTION_UID"
  
  curl -X POST "$API_BASE/api/payments/test-payment?transaction_uid=$TRANSACTION_UID" \
    -H "X-API-Key: $API_KEY" \
    | jq '.'
  
  echo ""
  echo "6️⃣  Verifying Subscription Status After Payment..."
  sleep 1
  curl -X GET "$API_BASE/api/payments/status" \
    -H "X-API-Key: $API_KEY" \
    | jq '.'
else
  echo ""
  echo "❌ Failed to create subscription. Skipping payment completion test."
fi

echo ""
echo "7️⃣  Testing Get Transactions..."
curl -X GET "$API_BASE/api/payments/transactions" \
  -H "X-API-Key: $API_KEY" \
  | jq '.'

echo ""
echo "========================="
echo "✅ Payment System Test Complete"
