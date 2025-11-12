-- AuctionFlow Database Schema
-- PostgreSQL Schema for Invoice Management System

-- =============================================================================
-- Users & Authentication
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'buyer' CHECK (role IN ('buyer', 'admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Auction Items & Lots
-- =============================================================================

CREATE TABLE auction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_id VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    condition_note TEXT,
    auction_date DATE,
    seller_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE auction_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES auction_items(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id),
    winning_bid DECIMAL(12,2) NOT NULL,
    buyer_premium_rate DECIMAL(5,4) DEFAULT 0.1000, -- 10% = 0.1000
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    auction_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Invoices
-- =============================================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    buyer_id UUID REFERENCES users(id) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    buyers_premium_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1000,
    buyers_premium_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES auction_items(id),
    lot_id VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Payments
-- =============================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')),
    payment_method VARCHAR(50),
    failure_reason TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Audit Logs
-- =============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'invoice', 'payment', 'user', etc.
    entity_id UUID,
    user_id UUID REFERENCES users(id),
    correlation_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- System Configuration
-- =============================================================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Auction Items
CREATE INDEX idx_auction_items_lot_id ON auction_items(lot_id);
CREATE INDEX idx_auction_items_auction_date ON auction_items(auction_date);

-- Auction Results
CREATE INDEX idx_auction_results_buyer_id ON auction_results(buyer_id);
CREATE INDEX idx_auction_results_item_id ON auction_results(item_id);
CREATE INDEX idx_auction_results_status ON auction_results(status);
CREATE INDEX idx_auction_results_auction_date ON auction_results(auction_date);

-- Invoices
CREATE INDEX idx_invoices_buyer_id ON invoices(buyer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

-- Invoice Items
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_lot_id ON invoice_items(lot_id);

-- Payments
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Audit Logs
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_correlation_id ON audit_logs(correlation_id);

-- =============================================================================
-- Triggers for Updated At
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with updated_at columns
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON auction_items
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON auction_results
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON system_settings
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- =============================================================================
-- Initial Data
-- =============================================================================

-- Default system settings
INSERT INTO system_settings (key, value, description) VALUES
('default_buyers_premium_rate', '0.1000', 'Default buyer''s premium rate (10%)'),
('default_tax_rate', '0.0850', 'Default tax rate (8.5%)'),
('invoice_due_days', '30', 'Number of days until invoice is due'),
('currency', 'USD', 'Default currency');

-- =============================================================================
-- Calculation Rates
-- =============================================================================

CREATE TABLE calculation_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyers_premium_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1000,
    tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0850,
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE premium_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    min_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_amount DECIMAL(12,2),
    rate DECIMAL(5,4) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- Initial Data
-- =============================================================================

-- Default system settings
INSERT INTO system_settings (key, value, description) VALUES
('default_buyers_premium_rate', '0.1000', 'Default buyer''s premium rate (10%)'),
('default_tax_rate', '0.0850', 'Default tax rate (8.5%)'),
('invoice_due_days', '30', 'Number of days until invoice is due'),
('currency', 'USD', 'Default currency');

-- Default calculation rates
INSERT INTO calculation_rates (buyers_premium_rate, tax_rate, currency, is_active) VALUES
(0.1000, 0.0850, 'USD', true);

-- Default premium tiers
INSERT INTO premium_tiers (name, min_amount, max_amount, rate, is_active) VALUES
('Standard Rate', 0, NULL, 0.1000, true);

-- Create a default admin user (password should be hashed in real implementation)
INSERT INTO users (email, name, role) VALUES
('admin@auctionflow.com', 'System Administrator', 'admin');

-- =============================================================================
-- Additional Triggers
-- =============================================================================

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON calculation_rates
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON premium_tiers
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();