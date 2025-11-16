#!/bin/bash

# Test Supabase Edge Functions locally
# Make sure to run: supabase start

echo "🧪 Testing Supabase Edge Functions..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get Supabase URL and keys
SUPABASE_URL="${VITE_SUPABASE_URL:-http://localhost:54321}"
ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

if [ -z "$ANON_KEY" ]; then
  echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY not set${NC}"
  echo "Please set it in your .env file"
  exit 1
fi

echo "Using Supabase URL: $SUPABASE_URL"
echo ""

# Test admin-stats
echo "1️⃣  Testing admin-stats..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$SUPABASE_URL/functions/v1/admin-stats" \
  -H "Authorization: Bearer $ANON_KEY")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ admin-stats: OK${NC}"
else
  echo -e "${RED}❌ admin-stats: Failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test admin-agents
echo "2️⃣  Testing admin-agents..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$SUPABASE_URL/functions/v1/admin-agents" \
  -H "Authorization: Bearer $ANON_KEY")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ admin-agents: OK${NC}"
else
  echo -e "${RED}❌ admin-agents: Failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test admin-farmers
echo "3️⃣  Testing admin-farmers..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$SUPABASE_URL/functions/v1/admin-farmers" \
  -H "Authorization: Bearer $ANON_KEY")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ admin-farmers: OK${NC}"
else
  echo -e "${RED}❌ admin-farmers: Failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test admin-kyc-pending
echo "4️⃣  Testing admin-kyc-pending..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$SUPABASE_URL/functions/v1/admin-kyc-pending" \
  -H "Authorization: Bearer $ANON_KEY")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ admin-kyc-pending: OK${NC}"
else
  echo -e "${RED}❌ admin-kyc-pending: Failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test admin-orders
echo "5️⃣  Testing admin-orders..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$SUPABASE_URL/functions/v1/admin-orders" \
  -H "Authorization: Bearer $ANON_KEY")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ admin-orders: OK${NC}"
else
  echo -e "${RED}❌ admin-orders: Failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test admin-payments
echo "6️⃣  Testing admin-payments..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$SUPABASE_URL/functions/v1/admin-payments" \
  -H "Authorization: Bearer $ANON_KEY")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ admin-payments: OK${NC}"
else
  echo -e "${RED}❌ admin-payments: Failed (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Test admin-create-user
echo "7️⃣  Testing admin-create-user..."
TEST_PHONE="08$(date +%s | tail -c 9)" # Generate unique phone
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SUPABASE_URL/functions/v1/admin-create-user" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"userType\": \"farmer\",
    \"fullName\": \"Test Farmer $(date +%H%M%S)\",
    \"phone\": \"$TEST_PHONE\",
    \"farmLocation\": \"Lagos\",
    \"farmSize\": \"5\",
    \"creditLimit\": \"50000\",
    \"autoApproveKyc\": true
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ admin-create-user: OK${NC}"
  echo "Created user with phone: $TEST_PHONE"
  PASSWORD=$(echo "$BODY" | jq -r '.user.password' 2>/dev/null)
  if [ ! -z "$PASSWORD" ] && [ "$PASSWORD" != "null" ]; then
    echo -e "${YELLOW}🔑 Password: $PASSWORD${NC}"
  fi
else
  echo -e "${RED}❌ admin-create-user: Failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

echo "🏁 Testing complete!"
