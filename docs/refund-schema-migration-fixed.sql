-- =====================================================
-- Refund System Database Schema Migration (FIXED)
-- =====================================================
-- Add support for refund tracking, payment anomalies, and audit logging
-- Run this migration to enable the refund management system
-- Works whether payments table exists or not
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- STEP 1: Create or Update Payments Table
-- =====================================================

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    payment_reference VARCHAR(100) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method_id UUID,
    payment_gateway VARCHAR(50),
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns for Razorpay integration (if they don't exist)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_gateway_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_gateway_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS refund_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_details JSONB;

-- Create unique index on payment_gateway_payment_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_payment_id
ON payments(payment_gateway_payment_id)
WHERE payment_gateway_payment_id IS NOT NULL;

-- Update payment status constraint to include refund statuses
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'processing', 'success', 'failed', 'refunded', 'partially_refunded'));

-- =====================================================
-- STEP 2: Update Bookings Table
-- =====================================================

-- Add razorpay order and payment IDs to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_razorpay_order_id ON bookings(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_bookings_razorpay_payment_id ON bookings(razorpay_payment_id);

-- =====================================================
-- STEP 3: Refund Transactions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS refund_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

    -- Razorpay refund details
    refund_gateway_id VARCHAR(255), -- Razorpay refund ID (rfnd_xxx)

    -- Amount breakdown
    refund_amount DECIMAL(10, 2) NOT NULL,
    cancellation_charge DECIMAL(10, 2) DEFAULT 0,
    total_paid DECIMAL(10, 2) NOT NULL,

    -- Refund metadata
    refund_reason TEXT,
    is_full_refund BOOLEAN DEFAULT TRUE,
    processed_by VARCHAR(50) CHECK (processed_by IN ('customer', 'admin', 'system')),

    -- Status tracking
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Audit trail
    processed_by_user_id UUID,
    notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refund_transactions_booking_id ON refund_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_payment_id ON refund_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_status ON refund_transactions(status);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_created_at ON refund_transactions(created_at DESC);

-- =====================================================
-- STEP 4: Payment Anomalies Table
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    payment_id VARCHAR(255), -- Razorpay payment ID

    -- Anomaly details
    anomaly_type VARCHAR(50) CHECK (anomaly_type IN (
        'amount_mismatch',
        'duplicate_payment',
        'refund_failed',
        'signature_mismatch',
        'suspicious_activity',
        'other'
    )),
    details JSONB, -- Store additional details
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- Status
    status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'investigating', 'resolved', 'false_positive')),
    resolution_notes TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_anomalies_status ON payment_anomalies(status);
CREATE INDEX IF NOT EXISTS idx_payment_anomalies_created_at ON payment_anomalies(created_at DESC);

-- =====================================================
-- STEP 5: Payment Audit Log
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

    -- Event details
    event_type VARCHAR(50) NOT NULL, -- 'payment_initiated', 'payment_verified', 'refund_processed', etc.
    event_source VARCHAR(50), -- 'client', 'webhook', 'admin', 'system'

    -- Data snapshot
    payload JSONB, -- Full event payload for debugging

    -- Context
    user_id UUID,
    ip_address INET,
    user_agent TEXT,

    -- Metadata
    success BOOLEAN,
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_booking_id ON payment_audit_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_event_type ON payment_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created_at ON payment_audit_log(created_at DESC);

-- =====================================================
-- STEP 6: Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE refund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own refund transactions" ON refund_transactions;
DROP POLICY IF EXISTS "Admins can view all refund transactions" ON refund_transactions;
DROP POLICY IF EXISTS "Only admins can access payment anomalies" ON payment_anomalies;
DROP POLICY IF EXISTS "Only admins can access payment audit log" ON payment_audit_log;

-- Refund Transactions: Users can view their own refunds
CREATE POLICY "Users can view own refund transactions" ON refund_transactions
    FOR SELECT
    USING (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

-- Refund Transactions: Admins can view all
CREATE POLICY "Admins can view all refund transactions" ON refund_transactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Payment Anomalies: Only admins can access
CREATE POLICY "Only admins can access payment anomalies" ON payment_anomalies
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Payment Audit Log: Only admins can access
CREATE POLICY "Only admins can access payment audit log" ON payment_audit_log
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- STEP 7: Functions for Automatic Audit Logging
-- =====================================================

-- Function to log payment events automatically
CREATE OR REPLACE FUNCTION log_payment_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO payment_audit_log (
        payment_id,
        booking_id,
        event_type,
        event_source,
        payload,
        success
    ) VALUES (
        NEW.id,
        NEW.booking_id,
        TG_OP,
        'database_trigger',
        row_to_json(NEW),
        CASE WHEN NEW.status = 'success' THEN TRUE ELSE FALSE END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-log payment changes
DROP TRIGGER IF EXISTS payment_audit_trigger ON payments;
CREATE TRIGGER payment_audit_trigger
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION log_payment_event();

-- =====================================================
-- STEP 8: Views for Admin Dashboard
-- =====================================================

-- Refund summary view
CREATE OR REPLACE VIEW refund_summary AS
SELECT
    DATE(r.created_at) as refund_date,
    COUNT(*) as total_refunds,
    SUM(r.refund_amount) as total_refund_amount,
    SUM(r.cancellation_charge) as total_cancellation_charges,
    COUNT(*) FILTER (WHERE r.is_full_refund) as full_refunds,
    COUNT(*) FILTER (WHERE NOT r.is_full_refund) as partial_refunds,
    COUNT(*) FILTER (WHERE r.status = 'completed') as completed_refunds,
    COUNT(*) FILTER (WHERE r.status = 'processing') as pending_refunds,
    COUNT(*) FILTER (WHERE r.status = 'failed') as failed_refunds
FROM refund_transactions r
GROUP BY DATE(r.created_at)
ORDER BY refund_date DESC;

-- Payment reconciliation view
CREATE OR REPLACE VIEW payment_reconciliation AS
SELECT
    b.booking_reference,
    b.total_amount as booking_amount,
    p.amount as payment_amount,
    p.status as payment_status,
    p.payment_gateway_payment_id,
    COALESCE(r.refund_amount, 0) as refund_amount,
    b.created_at as booking_date,
    p.created_at as payment_date,
    r.created_at as refund_date
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
LEFT JOIN refund_transactions r ON r.booking_id = b.id
WHERE p.id IS NOT NULL
ORDER BY b.created_at DESC;

-- =====================================================
-- STEP 9: Documentation Comments
-- =====================================================

COMMENT ON TABLE payments IS 'Payment transactions with Razorpay integration and refund tracking';
COMMENT ON TABLE refund_transactions IS 'Tracks all refund transactions with 48-hour cancellation policy enforcement';
COMMENT ON TABLE payment_anomalies IS 'Logs payment anomalies for admin review and fraud detection';
COMMENT ON TABLE payment_audit_log IS 'Complete audit trail of all payment-related events for compliance';
COMMENT ON COLUMN refund_transactions.processed_by IS 'Indicates who initiated the refund: customer, admin, or system';
COMMENT ON COLUMN refund_transactions.is_full_refund IS 'TRUE for full refund (>48hrs), FALSE for partial/no refund (<48hrs)';
COMMENT ON COLUMN payments.payment_gateway_payment_id IS 'Razorpay payment ID (pay_xxx) - used for idempotency checks';
COMMENT ON COLUMN payments.payment_gateway_order_id IS 'Razorpay order ID (order_xxx)';

-- =====================================================
-- STEP 10: Verification Queries
-- =====================================================

-- Verify tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('payments', 'refund_transactions', 'payment_anomalies', 'payment_audit_log');

    RAISE NOTICE 'Tables created: %/4', table_count;
END $$;

-- =====================================================
-- Success Message
-- =====================================================

SELECT
    '✅ Refund system schema migration completed successfully!' as message,
    'Next steps: Configure Razorpay webhooks and environment variables' as next_action;
