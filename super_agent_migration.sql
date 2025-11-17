-- Create role enum type if it doesn't exist, then add super_agent
DO $$ 
BEGIN
  -- Create role type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
    CREATE TYPE role AS ENUM ('admin', 'agent', 'farmer', 'super_agent');
  ELSE
    -- Add super_agent value if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'role' AND e.enumlabel = 'super_agent') THEN
      ALTER TYPE role ADD VALUE 'super_agent';
    END IF;
  END IF;
END $$;

-- Create super_agent_profiles table
CREATE TABLE IF NOT EXISTS super_agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  region TEXT,
  assigned_agents_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create agent_assignments table
CREATE TABLE IF NOT EXISTS agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_agent_id UUID NOT NULL REFERENCES super_agent_profiles(user_id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id)
);

-- Add super agent approval fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS super_agent_id UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS super_agent_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS super_agent_rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS super_agent_rejection_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;

-- Add new columns to existing payments table for super agent workflow
DO $$ 
BEGIN
  -- Add recorded_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'recorded_by') THEN
    ALTER TABLE payments ADD COLUMN recorded_by UUID REFERENCES auth.users(id);
  END IF;
  
  -- Add recorded_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'recorded_at') THEN
    ALTER TABLE payments ADD COLUMN recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Add approved_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'approved_by') THEN
    ALTER TABLE payments ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;
  
  -- Add approved_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'approved_at') THEN
    ALTER TABLE payments ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add rejected_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'rejected_by') THEN
    ALTER TABLE payments ADD COLUMN rejected_by UUID REFERENCES auth.users(id);
  END IF;
  
  -- Add rejected_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'rejected_at') THEN
    ALTER TABLE payments ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add rejection_reason column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'rejection_reason') THEN
    ALTER TABLE payments ADD COLUMN rejection_reason TEXT;
  END IF;
  
  -- Add receipt_url column if it doesn't exist (for super agent payment receipts)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'receipt_url') THEN
    ALTER TABLE payments ADD COLUMN receipt_url TEXT;
  END IF;
  
  -- Add approval_status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'approval_status') THEN
    ALTER TABLE payments ADD COLUMN approval_status TEXT DEFAULT 'pending_admin_approval' CHECK (approval_status IN ('pending_admin_approval', 'approved', 'rejected'));
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_assignments_super_agent ON agent_assignments(super_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent ON agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_super_agent ON orders(super_agent_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON payments(recorded_by);

-- Add RLS policies for super_agent_profiles
ALTER TABLE super_agent_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super agents can view their own profile" ON super_agent_profiles;
CREATE POLICY "Super agents can view their own profile"
  ON super_agent_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all super agent profiles" ON super_agent_profiles;
CREATE POLICY "Admins can view all super agent profiles"
  ON super_agent_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert super agent profiles" ON super_agent_profiles;
CREATE POLICY "Admins can insert super agent profiles"
  ON super_agent_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update super agent profiles" ON super_agent_profiles;
CREATE POLICY "Admins can update super agent profiles"
  ON super_agent_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add RLS policies for agent_assignments
ALTER TABLE agent_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super agents can view their assigned agents" ON agent_assignments;
CREATE POLICY "Super agents can view their assigned agents"
  ON agent_assignments FOR SELECT
  USING (auth.uid() = super_agent_id);

DROP POLICY IF EXISTS "Admins can view all agent assignments" ON agent_assignments;
CREATE POLICY "Admins can view all agent assignments"
  ON agent_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage agent assignments" ON agent_assignments;
CREATE POLICY "Admins can manage agent assignments"
  ON agent_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add RLS policies for payments (skip if already enabled)
DO $$ 
BEGIN
  ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DROP POLICY IF EXISTS "Super agents can view payments they recorded" ON payments;
CREATE POLICY "Super agents can view payments they recorded"
  ON payments FOR SELECT
  USING (auth.uid() = recorded_by OR auth.uid() IN (
    SELECT agent_id FROM orders WHERE orders.id = payments.order_id
  ));

DROP POLICY IF EXISTS "Agents can view payments for their orders" ON payments;
CREATE POLICY "Agents can view payments for their orders"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.agent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Farmers can view payments for their orders" ON payments;
CREATE POLICY "Farmers can view payments for their orders"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN farmer_profiles ON orders.farmer_id = farmer_profiles.id
      WHERE orders.id = payments.order_id
      AND farmer_profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "Super agents can record payments" ON payments;
CREATE POLICY "Super agents can record payments"
  ON payments FOR INSERT
  WITH CHECK (
    auth.uid() = recorded_by
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_agent'
    )
  );

DROP POLICY IF EXISTS "Admins can approve/reject payments" ON payments;
CREATE POLICY "Admins can approve/reject payments"
  ON payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Function to automatically assign super agent to new orders
CREATE OR REPLACE FUNCTION assign_super_agent_to_order()
RETURNS TRIGGER AS $$
BEGIN
  SELECT super_agent_id INTO NEW.super_agent_id
  FROM agent_assignments
  WHERE agent_id = NEW.agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_super_agent ON orders;
CREATE TRIGGER trigger_assign_super_agent
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_super_agent_to_order();

-- Function to update assigned_agents_count
CREATE OR REPLACE FUNCTION update_super_agent_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE super_agent_profiles
    SET assigned_agents_count = assigned_agents_count + 1
    WHERE user_id = NEW.super_agent_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE super_agent_profiles
    SET assigned_agents_count = assigned_agents_count - 1
    WHERE user_id = OLD.super_agent_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_super_agent_count ON agent_assignments;
CREATE TRIGGER trigger_update_super_agent_count
  AFTER INSERT OR DELETE ON agent_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_super_agent_count();
