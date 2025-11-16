-- Add columns for admin order management actions
-- Run this in Supabase SQL Editor

-- Add approval tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- Add rejection tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add cancellation tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add delivery tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_confirmed_by UUID REFERENCES auth.users(id);

-- Add admin notes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes_updated_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes_updated_by UUID REFERENCES auth.users(id);

-- Update order_status enum to include cancelled
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Create function to increment farmer credit (used when rejecting/cancelling orders)
CREATE OR REPLACE FUNCTION increment_farmer_credit(
  farmer_id UUID,
  credit_amount DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE farmer_profiles
  SET available_credit = available_credit + credit_amount
  WHERE id = farmer_id;
END;
$$;

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on notifications for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN orders.approved_at IS 'Timestamp when order was approved by admin';
COMMENT ON COLUMN orders.approved_by IS 'Admin user who approved the order';
COMMENT ON COLUMN orders.rejected_at IS 'Timestamp when order was rejected';
COMMENT ON COLUMN orders.rejected_by IS 'Admin user who rejected the order';
COMMENT ON COLUMN orders.rejection_reason IS 'Reason for order rejection';
COMMENT ON COLUMN orders.cancelled_at IS 'Timestamp when order was cancelled';
COMMENT ON COLUMN orders.cancelled_by IS 'Admin user who cancelled the order';
COMMENT ON COLUMN orders.cancellation_reason IS 'Reason for order cancellation';
COMMENT ON COLUMN orders.delivered_at IS 'Timestamp when delivery was confirmed';
COMMENT ON COLUMN orders.delivery_confirmed_by IS 'Admin who confirmed delivery';
COMMENT ON COLUMN orders.admin_notes IS 'Internal admin notes for this order';
COMMENT ON COLUMN orders.notes_updated_at IS 'Last time admin notes were updated';
COMMENT ON COLUMN orders.notes_updated_by IS 'Admin who last updated the notes';
