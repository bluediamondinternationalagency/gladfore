# Super Agent Feature Deployment Steps

## ✅ Completed
- Created 7 Edge Functions for Super Agent system
- Created SuperAgentManagement component
- Integrated into AdminDashboard
- Created database migration file

## 🔄 Manual Steps Required

### Step 1: Apply Database Migration

1. Go to: https://supabase.com/dashboard/project/nuexakcydimzdrntjshi/sql/new
2. Copy and paste the entire contents of: `/workspaces/gladfore/supabase/migrations/20251116000006_add_super_agent_features.sql`
3. Click "Run" to execute the migration
4. Verify tables created:
   - `super_agent_profiles`
   - `agent_assignments`
   - `payments`

### Step 2: Deploy Edge Functions

**Option A: Using Supabase Dashboard (Recommended)**

Deploy each function manually through the dashboard:
1. Go to: https://supabase.com/dashboard/project/nuexakcydimzdrntjshi/functions
2. Click "Deploy a new function"
3. Deploy these 7 new functions (copy code from each folder):

   - `super-agent-profile`
   - `super-agent-orders`
   - `super-agent-order-action`
   - `super-agent-record-payment`
   - `admin-approve-payment`
   - `admin-create-super-agent`
   - `admin-assign-agents`

4. Also **redeploy** this updated function:
   - `agent-create-order` (modified to notify super agents)

**Option B: Using Supabase CLI**

If you have access to login:
```bash
cd /workspaces/gladfore
supabase login
supabase functions deploy super-agent-profile
supabase functions deploy super-agent-orders
supabase functions deploy super-agent-order-action
supabase functions deploy super-agent-record-payment
supabase functions deploy admin-approve-payment
supabase functions deploy admin-create-super-agent
supabase functions deploy admin-assign-agents
supabase functions deploy agent-create-order
```

### Step 3: Update API Endpoints (if needed)

If your `client/src/lib/api.ts` uses a centralized API configuration, add these endpoints:
```typescript
superAgentProfile: `${SUPABASE_URL}/functions/v1/super-agent-profile`,
superAgentOrders: `${SUPABASE_URL}/functions/v1/super-agent-orders`,
superAgentOrderAction: `${SUPABASE_URL}/functions/v1/super-agent-order-action`,
superAgentRecordPayment: `${SUPABASE_URL}/functions/v1/super-agent-record-payment`,
adminApprovePayment: `${SUPABASE_URL}/functions/v1/admin-approve-payment`,
adminCreateSuperAgent: `${SUPABASE_URL}/functions/v1/admin-create-super-agent`,
adminAssignAgents: `${SUPABASE_URL}/functions/v1/admin-assign-agents`,
```

### Step 4: Update App Routing

Add Super Agent dashboard routing to `client/src/App.tsx`:

```typescript
// Import
import SuperAgentDashboard from "@/pages/SuperAgentDashboard";

// Add route
<Route path="/super-agent" component={SuperAgentDashboard} />
```

Update login redirect in `client/src/pages/LoginPage.tsx`:
```typescript
if (role === 'super_agent') {
  setLocation('/super-agent');
}
```

### Step 5: Test the System

1. **Create Super Agent**:
   - Login as admin
   - Go to Admin Dashboard → Super Agents tab
   - Click "Create Super Agent"
   - Fill in: name, phone, password, region
   - Verify account created

2. **Assign Agents**:
   - Select a super agent
   - Click "Assign Agents"
   - Select agents to assign
   - Verify assignment

3. **Test Order Flow**:
   - Login as agent
   - Create order (should go to super agent for review)
   - Login as super agent
   - Review and approve order
   - Login as admin
   - Final approval
   - Verify all parties notified

4. **Test Payment Flow**:
   - Login as super agent
   - Record payment with receipt
   - Login as admin
   - Approve payment
   - Verify balance updated, commission calculated

## 📋 Verification Checklist

- [ ] Database migration applied successfully
- [ ] All 7 super agent functions deployed
- [ ] agent-create-order function redeployed
- [ ] Super Agent tab visible in Admin Dashboard
- [ ] Can create super agent account
- [ ] Can assign agents to super agent
- [ ] Orders from agents go to super agent first
- [ ] Super agent can approve/reject orders
- [ ] Super agent can record payments
- [ ] Admin can approve payments
- [ ] Notifications sent to all parties
- [ ] Commission calculated correctly

## 🚀 Quick Links

- Supabase Dashboard: https://supabase.com/dashboard/project/nuexakcydimzdrntjshi
- SQL Editor: https://supabase.com/dashboard/project/nuexakcydimzdrntjshi/sql/new
- Edge Functions: https://supabase.com/dashboard/project/nuexakcydimzdrntjshi/functions
- Database Tables: https://supabase.com/dashboard/project/nuexakcydimzdrntjshi/editor

## 📝 Notes

- Super agents DO NOT earn commission (as per requirements)
- Order flow: Agent → Super Agent → Admin
- Payment flow: Super Agent records → Admin approves
- Each agent can only be assigned to ONE super agent
- Super agents manage multiple agents in their region
