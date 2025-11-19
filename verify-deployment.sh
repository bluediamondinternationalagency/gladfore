#!/bin/bash

# Post-deployment verification script
echo "🔍 Vercel Deployment Verification"
echo "=================================="
echo ""

# Check if URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./verify-deployment.sh <your-vercel-url>"
    echo "Example: ./verify-deployment.sh https://gladfore.vercel.app"
    exit 1
fi

DEPLOY_URL=$1
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Testing deployment at: $DEPLOY_URL"
echo ""

# Test 1: Check if site is accessible
echo -n "1. Checking site accessibility... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Site is accessible (HTTP $HTTP_CODE)"
else
    echo -e "${RED}✗${NC} Site returned HTTP $HTTP_CODE"
fi

# Test 2: Check if it's the right app
echo -n "2. Checking if it's Gladfore app... "
CONTENT=$(curl -s "$DEPLOY_URL" | grep -i "gladfore\|farmer\|agent" | wc -l)
if [ "$CONTENT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Gladfore content detected"
else
    echo -e "${YELLOW}⚠${NC} Could not detect Gladfore content"
fi

# Test 3: Check HTTPS
echo -n "3. Checking HTTPS... "
if [[ $DEPLOY_URL == https://* ]]; then
    echo -e "${GREEN}✓${NC} Using HTTPS"
else
    echo -e "${YELLOW}⚠${NC} Not using HTTPS"
fi

# Test 4: Check assets loading
echo -n "4. Checking static assets... "
ASSETS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL/assets/")
if [ "$ASSETS_CODE" = "200" ] || [ "$ASSETS_CODE" = "301" ] || [ "$ASSETS_CODE" = "403" ]; then
    echo -e "${GREEN}✓${NC} Assets directory exists"
else
    echo -e "${YELLOW}⚠${NC} Assets might not be properly configured"
fi

echo ""
echo "=================================="
echo "Manual Testing Checklist:"
echo "=================================="
echo ""
echo "Please manually test these features:"
echo ""
echo "Authentication:"
echo "  [ ] Login page loads"
echo "  [ ] Can login as farmer"
echo "  [ ] Can login as agent"
echo "  [ ] Can login as super agent"
echo "  [ ] Can login as admin"
echo "  [ ] Logout works"
echo ""
echo "Dashboards:"
echo "  [ ] Farmer dashboard displays"
echo "  [ ] Agent dashboard displays"
echo "  [ ] Super agent dashboard displays"
echo "  [ ] Admin dashboard displays"
echo ""
echo "Functionality:"
echo "  [ ] Can view orders"
echo "  [ ] Can create order (agent)"
echo "  [ ] Can record payment (agent)"
echo "  [ ] Can approve order (super agent/admin)"
echo "  [ ] Profile information loads"
echo ""
echo "Mobile/Responsive:"
echo "  [ ] Works on mobile devices"
echo "  [ ] Navigation menu works"
echo "  [ ] Tables are readable"
echo ""
echo "Performance:"
echo "  [ ] Pages load quickly"
echo "  [ ] No console errors"
echo "  [ ] Images load properly"
echo ""
echo "=================================="
echo "🎉 Deployment verification complete!"
echo ""
echo "Next steps:"
echo "1. Test all features manually using the checklist above"
echo "2. Check browser console for any errors (F12)"
echo "3. Test on different browsers (Chrome, Safari, Firefox)"
echo "4. Test on mobile devices"
echo ""
echo "If you find issues:"
echo "- Check Vercel logs in dashboard"
echo "- Verify environment variables are set correctly"
echo "- Check Supabase connection"
echo "- Review browser console errors"
