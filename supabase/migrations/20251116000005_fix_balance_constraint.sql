-- Remove invalid balance constraint that prevents payment processing
-- The constraint "valid_balance" CHECK (balance = total_cost - down_payment) 
-- is too restrictive and prevents balance updates when payments are made.
-- Balance should be allowed to decrease as payments are received.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_balance;

-- Add a more reasonable constraint: balance must be non-negative and not exceed total_cost
ALTER TABLE orders ADD CONSTRAINT valid_balance_range 
  CHECK (balance >= 0 AND balance <= total_cost);

COMMENT ON CONSTRAINT valid_balance_range ON orders IS 'Ensures balance is between 0 and total_cost';
