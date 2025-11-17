# Super Agent Feature Implementation - Complete

## Overview
The Super Agent feature introduces a hierarchical approval system where Super Agents review orders from their assigned agents before submitting to admin for final approval. Super Agents also record payments which require admin verification.

## Database Schema Changes

### Migration: `20251116000006_add_super_agent_features.sql`

**New Tables:**
1. `super_agent_profiles` - Super agent profile data
   - user_id, full_name, phone, region
   - assigned_agents_count (auto-updated)
   
2. `agent_assignments` - Maps agents to super agents
   - super_agent_id, agent_id
   - Unique constraint on agent_id (each agent assigned to one super agent)
   
3. `payments` - Payment recording and approval tracking
   - order_id, amount, payment_method, receipt_number
   - recorded_by (super agent), recorded_at
   - approved_by/rejected_by (admin), status

**Orders Table Updates:**
- super_agent_id
- super_agent_approved_at / super_agent_rejected_at
- super_agent_rejection_reason
- admin_approved_at / admin_rejected_at
- admin_rejection_reason

**Triggers:**
- Auto-assign super agent to new orders based on agent assignment
- Auto-update assigned_agents_count when assignments change

**RLS Policies:**
- Super agents can view their profile and assigned agents
- Super agents can view orders assigned to them
- Super agents can view/record payments for their orders
- Admins have full access for management

## Edge Functions

### 1. `super-agent-profile`
- GET super agent profile with assigned agents list
- Requires super_agent role

### 2. `super-agent-orders`
- GET orders assigned to super agent
- Filter by status: pending_super_agent, approved_by_super_agent, pending_admin, approved, rejected
- Includes farmer, agent, product, and payment details

### 3. `super-agent-order-action`
- POST approve/reject orders
- Approve: Sets super_agent_approved_at, notifies agent and admin
- Reject: Sets super_agent_rejected_at + reason, notifies agent
- Requires super_agent role

### 4. `super-agent-record-payment`
- POST record payment for approved orders
- Creates payment record with status=pending
- Validates amount doesn't exceed order balance
- Notifies admin for approval
- Requires super_agent role

### 5. `admin-approve-payment`
- POST approve/reject payments recorded by super agents
- Approve: Updates order balance, triggers commission, notifies all parties
- Reject: Notifies super agent with reason
- Requires admin role

### 6. `agent-create-order` (Updated)
- Now queries agent_assignments to find super agent
- Sends notification to super agent instead of admin directly

## Frontend Components

### 1. `SuperAgentDashboard.tsx`
**Features:**
- Stats cards: Assigned agents, pending review, approved, rejected
- Tabs:
  - Pending Review: Orders awaiting super agent approval
  - Approved: Orders approved by super agent (can record payments)
  - Rejected: Orders rejected by super agent
  - My Agents: List of assigned agents
- Order action dialogs (approve/reject)
- Payment recording dialog with amount, method, receipt #

### 2. `PaymentApprovals.tsx` (Admin Component)
**Features:**
- Table of pending payments awaiting admin approval
- Shows payment details, order info, recorded by, receipt info
- Approve/reject actions with reason for rejection
- Updates order balance and triggers notifications

### 3. `AdminDashboard.tsx` (Updated)
- Added "Payment Approvals" tab
- Shows pending payments that need admin verification

### 4. `App.tsx` (Updated)
- Added `/super-agent` route for SuperAgentDashboard

### 5. `LoginPage.tsx` (Updated)
- Handles super_agent role routing to `/super-agent`

## Workflow

### Order Creation Flow
1. Agent creates order
2. System auto-assigns super agent (via trigger)
3. Super agent receives notification
4. Super agent reviews and approves/rejects
5. If approved: Admin receives notification
6. Admin reviews and gives final approval/rejection
7. All parties notified of final decision

### Payment Recording Flow
1. Super agent records payment for approved order
2. Payment status = pending
3. Admin receives notification
4. Admin verifies receipt and approves/rejects
5. If approved:
   - Order balance updated
   - Commission calculated for agent
   - All parties notified
6. If rejected:
   - Super agent notified with reason

## Notification Chain

### Order Notifications
- **Agent creates order** → Super agent notified
- **Super agent approves** → Agent + Admin notified
- **Super agent rejects** → Agent notified
- **Admin approves** → Agent + Farmer notified
- **Admin rejects** → Agent + Super agent notified

### Payment Notifications
- **Super agent records payment** → Admin + Agent notified
- **Admin approves payment** → Super agent + Agent + Farmer notified
- **Admin rejects payment** → Super agent notified

## TypeScript Types (shared/schema.ts)

**Added:**
- `superAgentProfiles` table schema
- `agentAssignments` table schema
- `payments` table schema
- Updated `orders` with super agent fields
- Insert schemas and types for all new tables

**Enums:**
- Added "super_agent" to roleEnum
- Added paymentStatusEnum

## Key Features

1. **Hierarchical Approval**: Super Agent → Admin (2-level approval)
2. **Payment Verification**: Super agents record, admins approve
3. **No Commission**: Super agents don't earn commission (only agents do)
4. **Agent Assignment**: Each agent assigned to one super agent
5. **Auto-Assignment**: Orders automatically assigned to super agent via trigger
6. **Comprehensive Notifications**: All parties notified at each stage
7. **RLS Security**: Row-level security ensures proper data access
8. **Audit Trail**: Timestamps and reasons tracked for all approvals/rejections

## Testing Checklist

- [ ] Apply database migration
- [ ] Deploy all Edge Functions
- [ ] Create super agent user account
- [ ] Assign agents to super agent
- [ ] Test order creation → super agent notification
- [ ] Test super agent order approval → admin notification
- [ ] Test super agent order rejection → agent notification
- [ ] Test admin final approval → all party notifications
- [ ] Test payment recording → admin notification
- [ ] Test payment approval → balance update + commission
- [ ] Test payment rejection → super agent notification
- [ ] Verify SuperAgentDashboard loads and displays correctly
- [ ] Verify PaymentApprovals tab in AdminDashboard works
- [ ] Test login redirect for super_agent role

## Deployment Steps

1. Apply database migration:
   ```bash
   supabase db push
   # or apply migration file manually
   ```

2. Deploy Edge Functions:
   ```bash
   supabase functions deploy super-agent-profile
   supabase functions deploy super-agent-orders
   supabase functions deploy super-agent-order-action
   supabase functions deploy super-agent-record-payment
   supabase functions deploy admin-approve-payment
   ```

3. Create first super agent account (via Supabase dashboard or admin interface)

4. Assign agents to super agent (via agent_assignments table)

5. Test complete workflow end-to-end

## Notes

- Super agents cannot create orders themselves (only review)
- Agents cannot record payments anymore (only super agents)
- Orders require both super agent AND admin approval
- Payments require admin approval before balance updates
- Commission only calculated when payment is admin-approved
- All rejection reasons are required and stored for audit

## Future Enhancements

- Super agent management UI for admins
- Bulk order approval for super agents
- Payment history and reports for super agents
- Agent performance metrics in super agent dashboard
- Mobile app support for super agents
- Export/import agent assignments
