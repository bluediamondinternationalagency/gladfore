-- Add super_agent role to the role enum
ALTER TYPE role ADD VALUE IF NOT EXISTS 'super_agent';

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

-- Create agent_assignments table (which agents are assigned to which super agents)
CREATE TABLE IF NOT EXISTS agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_agent_id UUID NOT NULL REFERENCES super_agent_profiles(user_id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id) -- Each agent can only be assigned to one super agent
);

-- Add super agent approval fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS super_agent_id UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS super_agent_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS super_agent_rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS super_agent_rejection_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_rejection_reason TEXT;

-- Create payments table for tracking payment recordings and admin approvals
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  receipt_number TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id), -- Super agent who recorded
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id), -- Admin who approved
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES auth.users(id), -- Admin who rejected
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_assignments_super_agent ON agent_assignments(super_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent ON agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_super_agent ON orders(super_agent_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON payments(recorded_by);

-- Add RLS policies for super_agent_profiles
ALTER TABLE super_agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super agents can view their own profile"
  ON super_agent_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all super agent profiles"
  ON super_agent_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can insert super agent profiles"
  ON super_agent_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

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

CREATE POLICY "Super agents can view their assigned agents"
  ON agent_assignments FOR SELECT
  USING (auth.uid() = super_agent_id);

CREATE POLICY "Admins can view all agent assignments"
  ON agent_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can manage agent assignments"
  ON agent_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add RLS policies for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super agents can view payments they recorded"
  ON payments FOR SELECT
  USING (auth.uid() = recorded_by);

CREATE POLICY "Agents can view payments for their orders"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.agent_id = auth.uid()
    )
  );

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

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

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
  -- Find the super agent assigned to this order's agent
  SELECT super_agent_id INTO NEW.super_agent_id
  FROM agent_assignments
  WHERE agent_id = NEW.agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign super agent when order is created
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

-- Trigger to update count when assignments change
DROP TRIGGER IF EXISTS trigger_update_super_agent_count ON agent_assignments;
CREATE TRIGGER trigger_update_super_agent_count
  AFTER INSERT OR DELETE ON agent_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_super_agent_count();

COMMENT ON TABLE super_agent_profiles IS 'Profiles for super agents who manage and review agent orders';
COMMENT ON TABLE agent_assignments IS 'Maps agents to their assigned super agents';
COMMENT ON TABLE payments IS 'Tracks payment recordings by super agents and admin approvals';
COMMENT ON COLUMN orders.super_agent_id IS 'Super agent assigned to review this order';
COMMENT ON COLUMN orders.super_agent_approved_at IS 'When super agent approved the order';
COMMENT ON COLUMN orders.admin_approved_at IS 'When admin gave final approval';
