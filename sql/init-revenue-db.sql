-- NOCKCHAIN Revenue Engine Database Initialization
-- Production-ready schema for $2M+ monthly revenue processing

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create revenue tracking schema
CREATE SCHEMA IF NOT EXISTS revenue;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA revenue TO revenue_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA revenue TO revenue_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA revenue TO revenue_user;

-- Revenue streams table
CREATE TABLE IF NOT EXISTS revenue.revenue_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    transaction_id VARCHAR(255),
    user_id UUID,
    subscription_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS revenue.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    tier VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    trial_end_date TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bridge transactions table
CREATE TABLE IF NOT EXISTS revenue.bridge_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_chain VARCHAR(50) NOT NULL,
    destination_chain VARCHAR(50) NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    fee_amount DECIMAL(20,8) NOT NULL,
    transaction_hash VARCHAR(128),
    user_address VARCHAR(128),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Analytics usage table
CREATE TABLE IF NOT EXISTS revenue.analytics_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    subscription_id UUID,
    api_calls INTEGER DEFAULT 0,
    data_requests INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0,
    bandwidth_used BIGINT DEFAULT 0,
    usage_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enterprise contracts table
CREATE TABLE IF NOT EXISTS revenue.enterprise_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name VARCHAR(255) NOT NULL,
    contract_tier VARCHAR(50) NOT NULL,
    monthly_value DECIMAL(12,2) NOT NULL,
    service_types TEXT[],
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue targets table
CREATE TABLE IF NOT EXISTS revenue.revenue_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_type VARCHAR(50) NOT NULL,
    monthly_target DECIMAL(12,2) NOT NULL,
    current_month_total DECIMAL(12,2) DEFAULT 0,
    target_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
    achievement_percentage DECIMAL(5,2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial revenue targets
INSERT INTO revenue.revenue_targets (stream_type, monthly_target) VALUES
('analytics_platform', 195000.00),
('bridge_operations', 645000.00),
('enterprise_services', 300000.00),
('api_licensing', 150000.00),
('performance_services', 120000.00),
('mining_pool_enhanced', 75000.00),
('nock_optimization', 200000.00),
('defi_trading_operations', 1295000.00)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_revenue_streams_type_date ON revenue.revenue_streams(stream_type, created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_streams_status ON revenue.revenue_streams(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON revenue.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bridge_transactions_date ON revenue.bridge_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_usage_user_date ON revenue.analytics_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_status ON revenue.enterprise_contracts(status);

-- Create revenue summary view
CREATE OR REPLACE VIEW revenue.revenue_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    stream_type,
    SUM(amount) as daily_revenue,
    COUNT(*) as transaction_count,
    AVG(amount) as avg_transaction_value
FROM revenue.revenue_streams 
WHERE status = 'completed'
GROUP BY DATE_TRUNC('day', created_at), stream_type
ORDER BY date DESC, stream_type;

-- Create monthly revenue view
CREATE OR REPLACE VIEW revenue.monthly_revenue AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    stream_type,
    SUM(amount) as monthly_revenue,
    COUNT(*) as transaction_count
FROM revenue.revenue_streams 
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', created_at), stream_type
ORDER BY month DESC, stream_type;

-- Create revenue health view
CREATE OR REPLACE VIEW revenue.revenue_health AS
SELECT 
    rt.stream_type,
    rt.monthly_target,
    COALESCE(SUM(rs.amount), 0) as current_month_actual,
    ROUND((COALESCE(SUM(rs.amount), 0) / rt.monthly_target) * 100, 2) as achievement_percentage,
    CASE 
        WHEN COALESCE(SUM(rs.amount), 0) >= rt.monthly_target THEN 'TARGET_MET'
        WHEN COALESCE(SUM(rs.amount), 0) >= rt.monthly_target * 0.8 THEN 'ON_TRACK'
        WHEN COALESCE(SUM(rs.amount), 0) >= rt.monthly_target * 0.5 THEN 'AT_RISK'
        ELSE 'CRITICAL'
    END as health_status
FROM revenue.revenue_targets rt
LEFT JOIN revenue.revenue_streams rs ON rt.stream_type = rs.stream_type 
    AND DATE_TRUNC('month', rs.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    AND rs.status = 'completed'
GROUP BY rt.stream_type, rt.monthly_target;

-- Create demo/testing data
INSERT INTO revenue.revenue_streams (stream_type, amount, status, created_at) VALUES
('analytics_platform', 5000.00, 'completed', NOW() - INTERVAL '1 day'),
('bridge_operations', 12000.00, 'completed', NOW() - INTERVAL '2 days'),
('enterprise_services', 25000.00, 'completed', NOW() - INTERVAL '3 days'),
('api_licensing', 3500.00, 'completed', NOW() - INTERVAL '4 days'),
('nock_optimization', 8500.00, 'completed', NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;