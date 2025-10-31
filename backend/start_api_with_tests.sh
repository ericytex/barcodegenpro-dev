#!/bin/bash

# Start API with comprehensive endpoint tests
# Run tests before starting the API server

echo "=========================================="
echo "  Backend API Startup Script"
echo "=========================================="
echo ""

# Wait for port to be available
echo "Waiting for backend to be ready..."
BACKEND_URL="http://localhost:8034"
MAX_WAIT=60
WAIT_COUNT=0

while ! curl -sf "$BACKEND_URL/" > /dev/null 2>&1; do
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo "❌ Backend failed to start after $MAX_WAIT seconds"
        exit 1
    fi
    sleep 2
done

echo "✅ Backend is ready!"
echo ""

# Run comprehensive endpoint tests
echo "Running comprehensive endpoint tests..."
echo ""

python3 /app/test_all_endpoints.py --url "$BACKEND_URL"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
else
    echo ""
    echo "⚠️  Some tests failed, but continuing..."
    echo ""
fi

# Keep the script running to prevent container exit
tail -f /dev/null

