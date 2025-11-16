-- Insert initial Gladfore products
INSERT INTO products (name, description, category, unit_price, unit_measure, is_available) VALUES
('Gladfore Fertilizer NPK 15:15:15', 'Balanced NPK fertilizer with 15% Nitrogen, 15% Phosphorus, 15% Potassium', 'Fertilizer', 30000.00, '50kg bag', true),
('Gladfore Fertilizer NPK 20:10:10', 'High nitrogen NPK fertilizer with 20% Nitrogen, 10% Phosphorus, 10% Potassium', 'Fertilizer', 32000.00, '50kg bag', true)
ON CONFLICT DO NOTHING;

-- Make product_id nullable to allow manual product entry for backward compatibility
ALTER TABLE order_items 
ALTER COLUMN product_id DROP NOT NULL;

COMMENT ON COLUMN order_items.product_id IS 'Reference to products table. Can be null when product is entered manually without selecting from catalog.';
