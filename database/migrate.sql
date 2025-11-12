-- Migration Script
-- Run this to set up the database from scratch

-- Create database if it doesn't exist (for local development)
-- Note: This might need to be run separately depending on your PostgreSQL setup

\echo 'Setting up AuctionFlow database...'

-- Drop existing tables for clean rebuild (development only)
-- WARNING: This will delete all existing data!
-- Uncomment for fresh development environment
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS invoice_items CASCADE;
-- DROP TABLE IF EXISTS invoices CASCADE;
-- DROP TABLE IF EXISTS auction_results CASCADE;
-- DROP TABLE IF EXISTS auction_items CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS system_settings CASCADE;

-- Run the main schema
\i schema.sql

\echo 'Database setup complete!'

-- Sample data for testing
\echo 'Inserting sample data...'

-- Sample auction items
INSERT INTO auction_items (lot_id, title, description, category, auction_date) VALUES
('LOT001', 'Vintage Rolex Submariner', '1960s Rolex Submariner in excellent condition', 'Watches', CURRENT_DATE - INTERVAL '7 days'),
('LOT002', 'Abstract Oil Painting', 'Modern abstract oil painting on canvas, 24x36 inches', 'Art', CURRENT_DATE - INTERVAL '7 days'),
('LOT003', 'Antique Chinese Vase', 'Ming dynasty ceramic vase with blue glaze', 'Antiques', CURRENT_DATE - INTERVAL '7 days'),
('LOT004', 'First Edition Book', 'Signed first edition of classic novel', 'Books', CURRENT_DATE - INTERVAL '7 days'),
('LOT005', 'Diamond Necklace', '18k gold necklace with 2ct diamonds', 'Jewelry', CURRENT_DATE - INTERVAL '7 days');

-- Sample users (buyers)
INSERT INTO users (email, name, role) VALUES
('john.doe@email.com', 'John Doe', 'buyer'),
('jane.smith@email.com', 'Jane Smith', 'buyer'),
('robert.wilson@email.com', 'Robert Wilson', 'buyer');

-- Sample auction results
INSERT INTO auction_results (item_id, buyer_id, winning_bid, buyer_premium_rate, auction_date, status)
SELECT
    ai.id,
    u.id,
    CASE ai.lot_id
        WHEN 'LOT001' THEN 15000.00
        WHEN 'LOT002' THEN 3500.00
        WHEN 'LOT003' THEN 8000.00
        WHEN 'LOT004' THEN 1200.00
        WHEN 'LOT005' THEN 22000.00
    END,
    0.1000,
    ai.auction_date,
    'pending'
FROM auction_items ai, users u
WHERE ai.lot_id IN ('LOT001', 'LOT002', 'LOT003', 'LOT004', 'LOT005')
AND u.email = 'john.doe@email.com'
LIMIT 5;

-- Sample invoices based on auction results
INSERT INTO invoices (invoice_number, buyer_id, subtotal, buyers_premium_rate, buyers_premium_amount, tax_rate, tax_amount, grand_total, due_date, status)
SELECT
    'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(DAY FROM NOW())::text, 3, '0') || '-' || ar.id::text,
    ar.buyer_id,
    ar.winning_bid,
    ar.buyer_premium_rate,
    ar.winning_bid * ar.buyer_premium_rate,
    0.0850,
    (ar.winning_bid + (ar.winning_bid * ar.buyer_premium_rate)) * 0.0850,
    ar.winning_bid + (ar.winning_bid * ar.buyer_premium_rate) + ((ar.winning_bid + (ar.winning_bid * ar.buyer_premium_rate)) * 0.0850),
    CURRENT_DATE + INTERVAL '30 days',
    'pending'
FROM auction_results ar
WHERE ar.status = 'pending'
LIMIT 3;

-- Sample invoice items
INSERT INTO invoice_items (invoice_id, item_id, lot_id, title, quantity, unit_price, total_price)
SELECT
    i.id,
    ar.item_id,
    ai.lot_id,
    ai.title,
    1,
    ar.winning_bid,
    ar.winning_bid
FROM invoices i
JOIN auction_results ar ON i.buyer_id = ar.buyer_id
JOIN auction_items ai ON ar.item_id = ai.id
WHERE i.status = 'pending'
LIMIT 3;

\echo 'Sample data inserted successfully!'
\echo 'Database is ready for testing!'