#!/bin/bash

# Pre-commit gitignore check script
# Run this before pushing to ensure no sensitive files are committed

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Checking for sensitive files that might be tracked..."

ERRORS=0
WARNINGS=0

# Check for tracked .env files (should not be tracked)
TRACKED_ENV=$(git ls-files | grep -E "\.env$|\.env\." | grep -v ".example" || true)
if [ -n "$TRACKED_ENV" ]; then
    echo -e "${RED}❌ ERROR: The following .env files are tracked:${NC}"
    echo "$TRACKED_ENV"
    echo -e "${YELLOW}⚠️  These should be in .gitignore!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No .env files are tracked${NC}"
fi

# Check for database files
TRACKED_DB=$(git ls-files | grep -E "\.db$|\.sqlite$|\.sqlite3$" || true)
if [ -n "$TRACKED_DB" ]; then
    echo -e "${RED}❌ ERROR: The following database files are tracked:${NC}"
    echo "$TRACKED_DB"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No database files are tracked${NC}"
fi

# Check for log files
TRACKED_LOGS=$(git ls-files | grep -E "\.log$" | grep -v ".gitignore" || true)
if [ -n "$TRACKED_LOGS" ]; then
    echo -e "${YELLOW}⚠️  WARNING: The following log files are tracked:${NC}"
    echo "$TRACKED_LOGS"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓ No log files are tracked${NC}"
fi

# Check for secret files
TRACKED_SECRETS=$(git ls-files | grep -iE "(secret|key|password|token|credential).*\.(key|pem|crt|env|json|yml|yaml)" || true)
if [ -n "$TRACKED_SECRETS" ]; then
    echo -e "${RED}❌ ERROR: Potentially sensitive files are tracked:${NC}"
    echo "$TRACKED_SECRETS"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No obvious secret files are tracked${NC}"
fi

# Check for node_modules
TRACKED_NODE=$(git ls-files | grep "node_modules/" || true)
if [ -n "$TRACKED_NODE" ]; then
    echo -e "${RED}❌ ERROR: node_modules files are tracked:${NC}"
    echo "$TRACKED_NODE" | head -5
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ node_modules is not tracked${NC}"
fi

# Check for dist/build folders
TRACKED_BUILD=$(git ls-files | grep -E "(dist/|build/|\.next/|\.nuxt/)" || true)
if [ -n "$TRACKED_BUILD" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Build artifacts are tracked:${NC}"
    echo "$TRACKED_BUILD" | head -5
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓ Build artifacts are not tracked${NC}"
fi

# Check for __pycache__
TRACKED_PYCACHE=$(git ls-files | grep "__pycache__/" || true)
if [ -n "$TRACKED_PYCACHE" ]; then
    echo -e "${RED}❌ ERROR: __pycache__ files are tracked:${NC}"
    echo "$TRACKED_PYCACHE" | head -5
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ __pycache__ is not tracked${NC}"
fi

# Check staged files
echo ""
echo "📋 Checking staged files..."
STAGED_SENSITIVE=$(git diff --cached --name-only | grep -iE "\.(env|log|db|key|pem|crt|secret)" || true)
if [ -n "$STAGED_SENSITIVE" ]; then
    echo -e "${RED}❌ ERROR: Sensitive files are staged for commit:${NC}"
    echo "$STAGED_SENSITIVE"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No sensitive files are staged${NC}"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Found $ERRORS error(s)${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $WARNINGS warning(s)${NC}"
    fi
    echo ""
    echo "Please fix these issues before pushing:"
    echo "  1. Remove files from git tracking: git rm --cached <file>"
    echo "  2. Ensure they're in .gitignore"
    echo "  3. Commit the removal"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $WARNINGS warning(s) (non-blocking)${NC}"
    echo -e "${GREEN}✓ Safe to push${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All checks passed! Safe to push.${NC}"
    exit 0
fi

