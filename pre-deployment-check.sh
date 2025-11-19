#!/bin/bash

echo "🚀 Gladfore Pre-Deployment Checklist"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

echo "📋 Running pre-deployment checks..."
echo ""

# Check 1: Node version
echo -n "1. Checking Node.js version... "
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✓${NC} Node.js $(node -v)"
else
    echo -e "${RED}✗ Node.js version should be 18 or higher${NC}"
    exit 1
fi

# Check 2: Dependencies installed
echo -n "2. Checking dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Dependencies not installed. Run 'npm install'"
    exit 1
fi

# Check 3: Environment files
echo -n "3. Checking environment configuration... "
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓${NC} .env.example exists"
else
    echo -e "${YELLOW}⚠${NC} .env.example not found"
fi

# Check 4: Build test
echo -n "4. Testing build... "
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Build successful"
else
    echo -e "${RED}✗ Build failed. Check errors above${NC}"
    exit 1
fi

# Check 5: Vercel configuration
echo -n "5. Checking Vercel configuration... "
if [ -f "vercel.json" ]; then
    echo -e "${GREEN}✓${NC} vercel.json exists"
else
    echo -e "${RED}✗ vercel.json not found${NC}"
    exit 1
fi

# Check 6: Output directory
echo -n "6. Checking build output... "
if [ -d "dist/public" ]; then
    echo -e "${GREEN}✓${NC} dist/public directory created"
else
    echo -e "${RED}✗ dist/public not found${NC}"
    exit 1
fi

# Check 7: Git status
echo -n "7. Checking git status... "
if git rev-parse --git-dir > /dev/null 2>&1; then
    UNCOMMITTED=$(git status --porcelain | wc -l)
    if [ "$UNCOMMITTED" -gt 0 ]; then
        echo -e "${YELLOW}⚠${NC} You have $UNCOMMITTED uncommitted changes"
    else
        echo -e "${GREEN}✓${NC} All changes committed"
    fi
else
    echo -e "${YELLOW}⚠${NC} Not a git repository"
fi

echo ""
echo "====================================="
echo -e "${GREEN}✅ All checks passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Commit and push your changes to Git"
echo "2. Go to https://vercel.com/new and import your repository"
echo "3. Configure environment variables in Vercel dashboard:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "4. Deploy!"
echo ""
echo "Or use Vercel CLI:"
echo "  npm install -g vercel"
echo "  vercel login"
echo "  vercel --prod"
echo ""
echo "📖 Read VERCEL_DEPLOYMENT.md for detailed instructions"
