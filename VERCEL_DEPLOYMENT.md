# Vercel Deployment Guide for Gladfore

This guide will help you deploy your Gladfore web application to Vercel while keeping your serverless functions on Supabase.

## Prerequisites

- Vercel account (sign up at [vercel.com](https://vercel.com))
- GitHub/GitLab/Bitbucket account (for connecting your repository)
- Supabase project with edge functions deployed

## Deployment Steps

### 1. Prepare Your Repository

Your repository is already configured with:
- ✅ `vercel.json` - Vercel configuration
- ✅ `.vercelignore` - Files to exclude from deployment
- ✅ `.env.example` - Environment variables template
- ✅ Optimized build configuration

### 2. Push Your Code to Git

If you haven't already, push your code to a Git repository:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 3. Import Project to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Project"
3. Select your Git provider (GitHub, GitLab, or Bitbucket)
4. Select the `gladfore` repository
5. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist/public` (should auto-detect from vercel.json)
   - **Install Command**: `npm install` (should auto-detect)

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - What's your project's name? gladfore
# - In which directory is your code located? ./
```

### 4. Configure Environment Variables

In the Vercel dashboard:

1. Go to your project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://nuexakcydimzdrntjshi.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key` | Production, Preview, Development |

**Important**: 
- These are public keys and safe to expose to the frontend
- Never add `SUPABASE_SERVICE_ROLE_KEY` to Vercel (it stays only in Supabase Edge Functions)

### 5. Deploy

Click **Deploy** or run:

```bash
vercel --prod
```

Your app will be deployed to a URL like: `https://gladfore.vercel.app`

## Architecture Overview

```
┌─────────────────┐
│   Vercel        │
│  (Frontend)     │
│                 │
│  • React App    │
│  • Static Site  │
│  • Client Code  │
└────────┬────────┘
         │
         │ API Calls
         │
         ▼
┌─────────────────┐
│   Supabase      │
│  (Backend)      │
│                 │
│  • Database     │
│  • Auth         │
│  • Edge Funcs   │
└─────────────────┘
```

## Post-Deployment Checklist

- [ ] Test user authentication (login/logout)
- [ ] Verify all API endpoints are working
- [ ] Test farmer dashboard functionality
- [ ] Test agent dashboard functionality
- [ ] Test super agent dashboard functionality
- [ ] Test admin dashboard functionality
- [ ] Verify environment variables are correctly set
- [ ] Check browser console for errors
- [ ] Test on mobile devices

## Custom Domain (Optional)

To add a custom domain:

1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `gladfore.com`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate to be issued

## Automatic Deployments

Vercel automatically deploys:
- **Production**: When you push to `main` branch
- **Preview**: When you create a pull request
- **Branch**: When you push to any branch

## Troubleshooting

### Build Fails

1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify Node.js version compatibility (18+)

### Environment Variables Not Working

1. Ensure variables are prefixed with `VITE_` for frontend access
2. Redeploy after adding/changing environment variables
3. Clear Vercel cache: Settings → Advanced → Clear Cache

### API Calls Failing

1. Verify Supabase URL and keys are correct
2. Check CORS settings in Supabase dashboard
3. Ensure edge functions are deployed to Supabase
4. Check browser network tab for error details

### 404 Errors on Routes

The `vercel.json` configuration should handle SPA routing. If issues persist:
1. Verify `vercel.json` exists in project root
2. Check the `rewrites` configuration
3. Redeploy the project

## Performance Optimization

Your deployment includes:
- ✅ Automatic CDN distribution
- ✅ Asset optimization
- ✅ HTTP/2 support
- ✅ Automatic HTTPS
- ✅ Edge caching for static assets
- ✅ Gzip/Brotli compression

## Monitoring

Monitor your deployment:
- **Analytics**: Vercel Dashboard → Analytics
- **Logs**: Vercel Dashboard → Deployments → View Function Logs
- **Performance**: Use Vercel Web Vitals

## Rollback

To rollback to a previous deployment:
1. Go to Vercel Dashboard → Deployments
2. Find the previous successful deployment
3. Click "⋮" → "Promote to Production"

## Support

- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Supabase Documentation: [supabase.com/docs](https://supabase.com/docs)
- GitHub Issues: Create an issue in your repository

## Notes

- Supabase Edge Functions remain hosted on Supabase
- Database operations handled by Supabase
- Frontend served from Vercel's global CDN
- Zero-configuration deployments with Git integration
- Free SSL certificates included
- Unlimited bandwidth on Pro plan

## Estimated Costs

**Vercel**:
- Hobby (Free): Perfect for development/testing
  - 100GB bandwidth/month
  - 6,000 build minutes/month
  - Unlimited sites
  
- Pro ($20/month): Recommended for production
  - 1TB bandwidth/month
  - 24,000 build minutes/month
  - Team collaboration features
  - Enhanced performance

**Supabase**:
- Already configured and running
- Database and edge functions stay on Supabase
- Current pricing plan continues as-is

Total Cost: $0 (Free tier) or $20/month (Pro tier)
