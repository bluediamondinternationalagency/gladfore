-- Make product_id nullable in order_items table
-- This allows agents to create orders with custom product names without requiring a product catalog
ALTER TABLE order_items 
ALTER COLUMN product_id DROP NOT NULL;

-- Add comment to explain why product_id can be null
COMMENT ON COLUMN order_items.product_id IS 'Optional reference to products table. Can be null when product_name is manually entered.';
