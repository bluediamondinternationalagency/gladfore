-- Create function to increment agent commission
CREATE OR REPLACE FUNCTION increment_agent_commission(
  agent_uuid UUID,
  commission_amount DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE agent_profiles
  SET 
    total_commission_earned = total_commission_earned + commission_amount,
    pending_commission = pending_commission + commission_amount,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = agent_uuid;
END;
$$;
