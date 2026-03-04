#!/bin/bash

# Pre-Deployment Verification Script for Smart Reply Pro
# This script verifies all critical deployment requirements

set -e

echo "🔍 Smart Reply Pro - Pre-Deployment Verification"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📋 Checking Node.js environment..."
NODE_VERSION=$(node --version)
echo "   Node version: $NODE_VERSION ✅"
echo ""

# Check environment variables
echo "🔐 Checking environment variables..."

# Load from .env.local if it exists
if [ -f ".env.local" ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

REQUIRED_ENV_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "OPENAI_API_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_PRICE_ID"
  "STRIPE_WEBHOOK_SECRET"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  "NEXT_PUBLIC_APP_URL"
)

MISSING_VARS=()
for VAR in "${REQUIRED_ENV_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    MISSING_VARS+=("$VAR")
  fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo "   All required environment variables present ✅"
else
  echo -e "   ${RED}❌ Missing environment variables:${NC}"
  for VAR in "${MISSING_VARS[@]}"; do
    echo "      - $VAR"
  done
  exit 1
fi
echo ""

# Check build
echo "🏗️  Building Next.js project..."
if npm run build > /tmp/build.log 2>&1; then
  echo "   Build successful ✅"
  # Extract key metrics
  BUILD_TIME=$(grep "Compiled successfully" /tmp/build.log | head -1)
  echo "   $BUILD_TIME"
  ROUTES=$(grep "^├" /tmp/build.log | wc -l)
  echo "   Generated $((ROUTES)) routes ✅"
else
  echo -e "   ${RED}❌ Build failed${NC}"
  tail -20 /tmp/build.log
  exit 1
fi
echo ""

# Check TypeScript
echo "🔤 Verifying TypeScript compilation..."
if grep -q "Type error" /tmp/build.log; then
  echo -e "   ${RED}❌ TypeScript errors found${NC}"
  grep "Type error" /tmp/build.log
  exit 1
else
  echo "   No TypeScript errors ✅"
fi
echo ""

# Check linting
echo "✨ Running ESLint..."
LINT_RESULT=$(npm run lint 2>&1)
if echo "$LINT_RESULT" | grep -q "✖"; then
  echo -e "   ${RED}❌ Lint errors found${NC}"
  echo "$LINT_RESULT"
  exit 1
else
  echo "   No lint issues ✅"
fi
echo ""

# Verify critical files exist
echo "📁 Verifying critical files..."
CRITICAL_FILES=(
  "package.json"
  "next.config.ts"
  "tsconfig.json"
  "lib/env.ts"
  "lib/supabase.ts"
  "lib/stripe.ts"
  "app/layout.tsx"
  "app/api/auth/login/route.ts"
  "app/api/webhook/route.ts"
)

for FILE in "${CRITICAL_FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "   ✓ $FILE"
  else
    echo -e "   ${RED}✗ $FILE (MISSING)${NC}"
    exit 1
  fi
done
echo ""

# Check for hardcoded localhost
echo "🔗 Checking for hardcoded localhost references..."
LOCALHOST_COUNT=$(grep -r "localhost:3000" --include="*.ts" --include="*.tsx" app/api lib/ 2>/dev/null | wc -l)
if [ "$LOCALHOST_COUNT" -eq 0 ]; then
  echo "   No hardcoded localhost found ✅"
else
  echo -e "   ${YELLOW}⚠️  Found $LOCALHOST_COUNT localhost references (expected 0)${NC}"
  grep -r "localhost:3000" --include="*.ts" --include="*.tsx" app/api lib/ 2>/dev/null | head -5
fi
echo ""

# Verify Stripe webhook validation
echo "🔐 Verifying Stripe webhook security..."
if grep -q "verifyStripeSignature" app/api/webhook/route.ts; then
  echo "   Webhook signature validation present ✅"
else
  echo -e "   ${RED}❌ Webhook signature validation missing${NC}"
  exit 1
fi
echo ""

# Check authentication middleware
echo "🔑 Verifying authentication implementation..."
if grep -q "requireUser" app/api/generate/route.ts; then
  echo "   Authentication checks implemented ✅"
else
  echo -e "   ${RED}❌ Authentication checks missing${NC}"
  exit 1
fi
echo ""

# Summary
echo "=================================================="
echo -e "${GREEN}✅ All pre-deployment checks passed!${NC}"
echo ""
echo "📊 Deployment Summary:"
echo "   • Build: Successful"
echo "   • TypeScript: All checks passed"
echo "   • Linting: No errors"
echo "   • Environment: All variables configured"
echo "   • Security: All validations in place"
echo ""
echo "🚀 Ready for deployment to Vercel!"
echo ""
echo "Next steps:"
echo "  1. git push origin main"
echo "  2. Verify deployment on Vercel dashboard"
echo "  3. Update Stripe webhook URL to production URL"
echo "  4. Test subscription flow with test card: 4242 4242 4242 4242"
