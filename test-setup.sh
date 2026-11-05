#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Error Monitoring System - Setup Test"
echo "========================================"
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
else
    echo -e "${YELLOW}⚠${NC} .env file not found. Creating from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠${NC} Please edit .env with your credentials"
fi

# Check required environment variables
echo ""
echo "Checking required environment variables..."

source .env 2>/dev/null

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}✗${NC} GITHUB_TOKEN not set"
    HAS_ERROR=1
else
    echo -e "${GREEN}✓${NC} GITHUB_TOKEN is set"
fi

if [ -z "$GITHUB_OWNER" ]; then
    echo -e "${RED}✗${NC} GITHUB_OWNER not set"
    HAS_ERROR=1
else
    echo -e "${GREEN}✓${NC} GITHUB_OWNER is set"
fi

if [ -z "$GITHUB_REPO" ]; then
    echo -e "${RED}✗${NC} GITHUB_REPO not set"
    HAS_ERROR=1
else
    echo -e "${GREEN}✓${NC} GITHUB_REPO is set"
fi

# Check optional variables
echo ""
echo "Checking optional integrations..."

if [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo -e "${YELLOW}⚠${NC} AWS credentials not configured (CloudWatch disabled)"
else
    echo -e "${GREEN}✓${NC} AWS credentials configured"
fi

if [ -z "$SENTRY_DSN" ]; then
    echo -e "${YELLOW}⚠${NC} Sentry not configured"
else
    echo -e "${GREEN}✓${NC} Sentry configured"
fi

if [ -z "$SLACK_WEBHOOK_URL" ] && [ -z "$SLACK_BOT_TOKEN" ]; then
    echo -e "${YELLOW}⚠${NC} Slack not configured"
else
    echo -e "${GREEN}✓${NC} Slack configured"
fi

# Check dependencies
echo ""
echo "Checking dependencies..."

if command -v bun &> /dev/null; then
    echo -e "${GREEN}✓${NC} Bun is installed ($(bun --version))"
elif command -v node &> /dev/null; then
    echo -e "${GREEN}✓${NC} Node.js is installed ($(node --version))"
else
    echo -e "${RED}✗${NC} Neither Bun nor Node.js is installed"
    HAS_ERROR=1
fi

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Dependencies not installed. Run: bun install"
fi

# Check source files
echo ""
echo "Checking source files..."

required_files=(
    "src/index.ts"
    "src/server.ts"
    "src/config.ts"
    "src/services/cloudwatch.ts"
    "src/services/sentry.ts"
    "src/services/github.ts"
    "src/services/analyzer.ts"
    "src/handlers/webhook.ts"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file missing"
        HAS_ERROR=1
    fi
done

# Summary
echo ""
echo "========================================"
if [ "$HAS_ERROR" = "1" ]; then
    echo -e "${RED}❌ Setup incomplete. Please fix the errors above.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Setup complete! You can now run:${NC}"
    echo ""
    echo "  • bun start          - Scan CloudWatch logs"
    echo "  • bun run server     - Start webhook server"
    echo "  • docker-compose up  - Run in Docker"
    echo ""
fi
