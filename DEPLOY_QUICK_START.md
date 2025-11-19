# Quick Start: Deploy to Vercel

## Prerequisites
- Git repository (GitHub, GitLab, or Bitbucket)
- Vercel account (free at [vercel.com](https://vercel.com))
- Supabase project already set up

## Method 1: Vercel Dashboard (Easiest)

### Step 1: Push to Git
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Import to Vercel
1. Visit [vercel.com/new](https://vercel.com/new)
2. Click "Import Project"
3. Select your repository
4. Vercel will auto-detect settings from `vercel.json`

### Step 3: Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

- `VITE_SUPABASE_URL`: `https://nuexakcydimzdrntjshi.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: (your anon key from Supabase)

### Step 4: Deploy
Click "Deploy" and wait 1-2 minutes

✅ Your app will be live at `https://your-project.vercel.app`

---

## Method 2: Vercel CLI (Advanced)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Deploy
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

---

## Environment Variables

Add these in Vercel Dashboard (not in code):

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | Your Supabase URL | Frontend-safe |
| `VITE_SUPABASE_ANON_KEY` | Your anon key | Frontend-safe |

⚠️ **Never add** `SUPABASE_SERVICE_ROLE_KEY` to Vercel - it stays only in Supabase!

---

## Pre-Deployment Checklist

Run this script to verify everything is ready:

```bash
./pre-deployment-check.sh
```

Or manually check:
- [ ] All changes committed to Git
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables prepared
- [ ] Supabase Edge Functions deployed
- [ ] vercel.json exists in project root

---

## Test Your Deployment

After deployment, test:
1. Login/Logout
2. All dashboards (Farmer, Agent, Super Agent, Admin)
3. Create/view orders
4. Payment recording
5. Mobile responsiveness

---

## Troubleshooting

**Build fails:**
```bash
# Check locally first
npm run build

# Check logs in Vercel dashboard
```

**API calls fail:**
- Verify Supabase URL and keys in Vercel dashboard
- Check CORS settings in Supabase
- Ensure Edge Functions are deployed

**404 on routes:**
- `vercel.json` should handle this automatically
- Redeploy if needed

---

## Custom Domain

To add your own domain:
1. Vercel Dashboard → Settings → Domains
2. Add domain (e.g., `gladfore.com`)
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

---

## Automatic Deployments

After setup, Vercel automatically deploys:
- **Production**: Push to `main` branch
- **Preview**: Create pull request
- **Any branch**: Push to any branch

---

## Cost

**Free Tier:**
- Perfect for testing
- 100GB bandwidth/month
- Unlimited sites

**Pro ($20/month):**
- Production-ready
- 1TB bandwidth/month
- Team features
- Priority support

---

## Support

- 📖 Full guide: `VERCEL_DEPLOYMENT.md`
- 🆘 Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- 💬 Issues: Create GitHub issue

---

## What Happens on Vercel?

```
┌──────────────────┐
│   Your Code      │
│   (GitHub)       │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐      ┌──────────────────┐
│   Vercel         │      │   Supabase       │
│   (Frontend)     │─────→│   (Backend)      │
│                  │ API  │                  │
│ • Static Assets  │      │ • Database       │
│ • React App      │      │ • Auth           │
│ • CDN            │      │ • Edge Functions │
└──────────────────┘      └──────────────────┘
```

**Frontend (Vercel):**
- Hosts your React application
- Serves static files via CDN
- Handles client-side routing
- Free SSL/HTTPS

**Backend (Supabase):**
- Manages database
- Handles authentication
- Runs Edge Functions
- Stores files

---

## Need Help?

1. Run pre-deployment check: `./pre-deployment-check.sh`
2. Read full guide: `VERCEL_DEPLOYMENT.md`
3. Check Vercel logs in dashboard
4. Test build locally: `npm run build && npm run preview`

---

**Ready?** Push to Git and visit [vercel.com/new](https://vercel.com/new)! 🚀
