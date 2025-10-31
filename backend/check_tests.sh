#!/bin/bash

# Quick status check script for backend tests
# Usage: ./check_tests.sh [status|run|all]

ACTION="${1:-status}"
BASE_URL="${2:-http://localhost:8034}"

case "$ACTION" in
    status)
        echo "Checking backend test status..."
        echo ""
        
        # Check if backend is running
        if ! curl -s "$BASE_URL/" > /dev/null 2>&1; then
            echo "❌ Backend is not running on $BASE_URL"
            exit 1
        fi
        
        # Get the directory where this script is located
        SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
        
        # Run tests and capture exit code
        python3 "$SCRIPT_DIR/test_all_endpoints.py" --url "$BASE_URL" > /tmp/test_output.txt 2>&1
        EXIT_CODE=$?
        
        # Extract final status
        if grep -q "✅ ALL TESTS PASSED" /tmp/test_output.txt; then
            echo "✅ ALL TESTS PASSED - System ready"
            cat /tmp/test_output.txt | grep -A 30 "CRITICAL FUNCTIONALITY" | cat
            echo ""
            cat /tmp/test_output.txt | grep -A 10 "SUMMARY" | cat
            exit 0
        elif grep -q "CRITICAL TESTS FAILED" /tmp/test_output.txt; then
            echo "❌ CRITICAL TESTS FAILED - System not ready"
            cat /tmp/test_output.txt | grep -A 30 "CRITICAL FUNCTIONALITY" | cat
            exit 1
        else
            echo "⚠️  Partial failure or incomplete tests"
            cat /tmp/test_output.txt | tail -30
            exit 1
        fi
        ;;
        
    run)
        echo "Running comprehensive backend tests..."
        echo ""
        
        # Get the directory where this script is located
        SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
        
        python3 "$SCRIPT_DIR/test_all_endpoints.py" --url "$BASE_URL"
        exit $?
        ;;
        
    simple)
        echo "Running simple connectivity test..."
        
        # Test 1: Root endpoint
        if curl -sf "$BASE_URL/" > /dev/null; then
            echo "✓ Root endpoint accessible"
        else
            echo "✗ Root endpoint not accessible"
            exit 1
        fi
        
        # Test 2: Health endpoint  
        STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
        if [ "$STATUS" == "200" ] || [ "$STATUS" == "401" ]; then
            echo "✓ Health endpoint responds"
        else
            echo "✗ Health endpoint failed (status: $STATUS)"
            exit 1
        fi
        
        # Test 3: Features (requires DB)
        STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "$BASE_URL/api/features")
        if [ "$STATUS" == "200" ]; then
            echo "✓ Features endpoint working"
        else
            echo "✗ Features endpoint failed (status: $STATUS)"
            exit 1
        fi
        
        echo ""
        echo "✅ Quick test passed - Basic connectivity OK"
        exit 0
        ;;
        
    *)
        echo "Usage: ./check_tests.sh [status|run|simple] [url]"
        echo ""
        echo "Commands:"
        echo "  status - Quick status check (default)"
        echo "  run    - Run full test suite"
        echo "  simple - Run quick connectivity tests"
        echo ""
        echo "Examples:"
        echo "  ./check_tests.sh status"
        echo "  ./check_tests.sh run"
        echo "  ./check_tests.sh simple"
        exit 1
        ;;
esac

