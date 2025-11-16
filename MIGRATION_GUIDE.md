# Migration from Netlify Functions to Supabase Edge Functions

## ✅ Completed Steps

### 1. Edge Functions Created
All 7 Netlify Functions have been migrated to Supabase Edge Functions:

- `supabase/functions/admin-agents/` - List and manage agents
- `supabase/functions/admin-create-user/` - Create farmers/agents with Supabase Auth
- `supabase/functions/admin-farmers/` - List and manage farmers
- `supabase/functions/admin-kyc-pending/` - Get pending KYC applications
- `supabase/functions/admin-orders/` - List orders with related data
- `supabase/functions/admin-payments/` - List payment records
- `supabase/functions/admin-stats/` - Dashboard statistics

### 2. Frontend Updated
All API calls in the frontend have been updated to use Supabase Edge Functions:

- `client/src/lib/api.ts` - API base URL configuration
- `client/src/components/admin/AddUsers.tsx` - User creation endpoint
- `client/src/components/admin/AgentsManagement.tsx` - Agent endpoints
- `client/src/components/admin/FarmersManagement.tsx` - Farmer endpoints
- `client/src/components/admin/KycManagement.tsx` - KYC endpoints
- `client/src/components/admin/OrdersManagement.tsx` - Orders endpoints
- `client/src/components/admin/PaymentsManagement.tsx` - Payments endpoints
- `client/src/components/admin/DashboardOverview.tsx` - Stats endpoint

### 3. Key Features Preserved
- ✅ Phone number E.164 normalization (+234 format)
- ✅ Supabase Auth integration for user creation
- ✅ Auto-generated passwords with credentials display
- ✅ KYC approval workflows
- ✅ Credit limit management
- ✅ Notification and audit log creation

## 🚀 Deployment Steps

### Step 1: Login to Supabase
```bash
# Option 1: Interactive login (opens browser)
supabase login

# Option 2: Use access token
export SUPABASE_ACCESS_TOKEN="your-access-token-here"
```

### Step 2: Link to Your Project
```bash
cd /workspaces/gladfore
supabase link --project-ref nuexakcydimzdrntjshi
```

### Step 3: Set Environment Secrets
```bash
# Set your Supabase service role key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Verify secrets
supabase secrets list
```

### Step 4: Deploy All Functions
```bash
# Use the deployment script
./deploy-functions.sh

# Or deploy individually
supabase functions deploy admin-create-user --no-verify-jwt
supabase functions deploy admin-agents --no-verify-jwt
supabase functions deploy admin-farmers --no-verify-jwt
supabase functions deploy admin-kyc-pending --no-verify-jwt
supabase functions deploy admin-orders --no-verify-jwt
supabase functions deploy admin-payments --no-verify-jwt
supabase functions deploy admin-stats --no-verify-jwt
```

### Step 5: Update Environment Variables
Update your `.env` file to use Supabase Edge Functions:

```env
VITE_SUPABASE_URL=https://nuexakcydimzdrntjshi.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 6: Test the Deployment

1. **Test User Creation:**
   ```bash
   curl -X POST https://nuexakcydimzdrntjshi.supabase.co/functions/v1/admin-create-user \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "userType": "farmer",
       "fullName": "Test Farmer",
       "phone": "08031234567",
       "farmLocation": "Lagos",
       "farmSize": "5",
       "creditLimit": "50000",
       "autoApproveKyc": true
     }'
   ```

2. **Test Stats Endpoint:**
   ```bash
   curl https://nuexakcydimzdrntjshi.supabase.co/functions/v1/admin-stats \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

### Step 7: Verify in Frontend

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Login as admin and test:
   - Navigate to Admin Dashboard
   - Try creating a new farmer/agent
   - Verify credentials are displayed
   - Test login with generated credentials
   - Check all admin pages load data correctly

## 📊 Function Endpoints

All functions are now accessible at:
```
https://nuexakcydimzdrntjshi.supabase.co/functions/v1/{function-name}
```

| Function | Endpoint | Method |
|----------|----------|--------|
| Admin Stats | `/admin-stats` | GET |
| List Agents | `/admin-agents` | GET |
| List Farmers | `/admin-farmers` | GET |
| Pending KYC | `/admin-kyc-pending` | GET |
| List Orders | `/admin-orders` | GET |
| List Payments | `/admin-payments` | GET |
| Create User | `/admin-create-user` | POST |

## 🔐 Security Configuration

### CORS Settings
Edge Functions automatically handle CORS. The `_shared/cors.ts` utility provides consistent CORS headers across all functions.

### Authentication
Functions use the Supabase service role key for admin operations:
- Key is stored as environment secret
- Never exposed to client
- Full database and auth access

### JWT Verification
All functions are deployed with `--no-verify-jwt` to allow anon key access. To restrict to authenticated users only:

1. Remove `--no-verify-jwt` flag
2. Pass user JWT token in Authorization header
3. Functions will verify user session automatically

## 🧪 Local Development

### Serve Functions Locally
```bash
# Start Supabase services locally
supabase start

# Serve all functions
supabase functions serve

# Serve specific function
supabase functions serve admin-create-user --no-verify-jwt
```

### Test Locally
```bash
# Local endpoint
curl -X POST http://localhost:54321/functions/v1/admin-create-user \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## 📝 What Changed

### Runtime
- **Before:** Node.js on Netlify
- **After:** Deno on Supabase Edge Runtime

### Import Syntax
- **Before:** `import { Handler } from "@netlify/functions"`
- **After:** `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"`

### Request/Response
- **Before:** Netlify `HandlerEvent` and return object with `statusCode`, `headers`, `body`
- **After:** Web standard `Request` object and `Response` constructor

### Environment Variables
- **Before:** `process.env.VARIABLE_NAME`
- **After:** `Deno.env.get("VARIABLE_NAME")`

### Package Management
- **Before:** npm/yarn with `node_modules`
- **After:** Deno with URL imports from esm.sh or deno.land

## ⚠️ Important Notes

1. **Phone Number Format:** All phone inputs are automatically normalized to E.164 format (+234...)
   
2. **Temp Emails:** Users without email get auto-generated: `{phone}@gladfore-temp.com`

3. **Password Generation:** 8-character alphanumeric passwords are generated and displayed once

4. **Database Schema:** Ensure your Supabase database has all required tables:
   - `users` (auth users)
   - `farmer_profiles`
   - `agent_profiles`
   - `orders`
   - `payments`
   - `notifications`
   - `audit_logs`

5. **RLS Policies:** Review Row Level Security policies in Supabase to ensure proper access control

## 🔄 Rollback Plan

If you need to rollback to Netlify Functions:

1. The original Netlify functions are still in `netlify/functions/`
2. Update frontend API URLs back to `/.netlify/functions/`
3. Redeploy to Netlify

## 📚 Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## ✅ Migration Checklist

- [x] Create Edge Functions directory structure
- [x] Migrate all 7 functions to Deno format
- [x] Update frontend API calls
- [x] Add CORS handling
- [x] Preserve phone normalization logic
- [x] Maintain Supabase Auth integration
- [ ] Login to Supabase CLI
- [ ] Deploy all functions
- [ ] Set environment secrets
- [ ] Test user creation flow
- [ ] Verify login works with created users
- [ ] Test all admin dashboard pages
- [ ] Monitor function logs
- [ ] Remove Netlify configuration (optional)

## 🎉 Benefits of Migration

1. **No Function Limits:** Supabase Edge Functions have generous limits
2. **Better Integration:** Native Supabase Auth and Database access
3. **Faster Cold Starts:** Edge runtime is optimized for speed
4. **Global Distribution:** Functions run on Cloudflare's edge network
5. **Better DX:** TypeScript support out of the box with Deno
6. **Lower Costs:** Included in Supabase free tier

---

**Need Help?** Check function logs with:
```bash
supabase functions logs admin-create-user --follow
```
