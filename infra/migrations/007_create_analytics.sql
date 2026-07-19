-- Analytics views for business intelligence
-- Provides aggregated data for dashboards and reporting
-- Note: Views query underlying tables which already have indexes for performance

-- Drop existing views if they exist
DROP VIEW IF EXISTS analytics_revenue CASCADE;
DROP VIEW IF EXISTS analytics_material_usage CASCADE;
DROP VIEW IF EXISTS analytics_printer_utilization CASCADE;
DROP VIEW IF EXISTS analytics_order_status CASCADE;
DROP VIEW IF EXISTS analytics_customers CASCADE;
DROP VIEW IF EXISTS analytics_profitability CASCADE;
DROP VIEW IF EXISTS analytics_daily_summary CASCADE;

-- Revenue analytics view
CREATE OR REPLACE VIEW analytics_revenue AS
SELECT 
    tenant_id,
    shop_id,
    DATE_TRUNC('month', created_at) AS month,
    DATE_TRUNC('week', created_at) AS week,
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) AS total_orders,
    SUM(total_cents) AS total_revenue_cents,
    AVG(total_cents) AS average_order_value_cents,
    SUM(CASE WHEN payment_status = 'paid' THEN total_cents ELSE 0 END) AS paid_revenue_cents,
    SUM(CASE WHEN payment_status = 'pending' THEN total_cents ELSE 0 END) AS pending_revenue_cents,
    SUM(CASE WHEN payment_status = 'partial' THEN paid_amount_cents ELSE 0 END) AS partial_revenue_cents
FROM orders
GROUP BY 
    tenant_id, 
    shop_id,
    DATE_TRUNC('month', created_at),
    DATE_TRUNC('week', created_at),
    DATE_TRUNC('day', created_at);

-- Material usage analytics view
CREATE OR REPLACE VIEW analytics_material_usage AS
SELECT 
    m.tenant_id,
    m.material_type,
    m.brand,
    m.name AS material_name,
    COUNT(DISTINCT o.id) AS order_count,
    COUNT(DISTINCT o.customer_id) AS unique_customers,
    SUM(o.total_cents) AS total_revenue_cents,
    AVG(o.total_cents) AS average_order_value_cents
FROM orders o
JOIN quotes q ON o.quote_id = q.id
JOIN materials m ON q.material_id = m.id
WHERE o.status NOT IN ('cancelled', 'pending')
GROUP BY 
    m.tenant_id,
    m.material_type,
    m.brand,
    m.name;

-- Printer utilization analytics view
CREATE OR REPLACE VIEW analytics_printer_utilization AS
SELECT 
    p.tenant_id,
    p.shop_id,
    p.id AS printer_id,
    p.name AS printer_name,
    p.technology,
    COUNT(DISTINCT o.id) AS total_orders,
    COUNT(DISTINCT CASE WHEN o.production_status = 'in_progress' THEN o.id END) AS active_orders,
    COUNT(DISTINCT CASE WHEN o.production_status = 'completed' THEN o.id END) AS completed_orders,
    COUNT(DISTINCT CASE WHEN o.production_status = 'failed' THEN o.id END) AS failed_orders,
    SUM(o.total_cents) AS total_revenue_cents,
    ROUND(
        (COUNT(DISTINCT CASE WHEN o.production_status = 'completed' THEN o.id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT o.id)::NUMERIC, 0)) * 100, 
        2
    ) AS success_rate_percentage,
    ROUND(
        (COUNT(DISTINCT CASE WHEN o.production_status = 'failed' THEN o.id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT o.id)::NUMERIC, 0)) * 100, 
        2
    ) AS failure_rate_percentage
FROM printers p
LEFT JOIN orders o ON p.id = o.printer_id
GROUP BY 
    p.tenant_id,
    p.shop_id,
    p.id,
    p.name,
    p.technology;

-- Order status analytics view
CREATE OR REPLACE VIEW analytics_order_status AS
SELECT 
    tenant_id,
    shop_id,
    status,
    payment_status,
    production_status,
    delivery_status,
    COUNT(*) AS order_count,
    SUM(total_cents) AS total_value_cents,
    AVG(total_cents) AS average_value_cents,
    MIN(created_at) AS first_order,
    MAX(created_at) AS last_order
FROM orders
GROUP BY 
    tenant_id,
    shop_id,
    status,
    payment_status,
    production_status,
    delivery_status;

-- Customer analytics view
CREATE OR REPLACE VIEW analytics_customers AS
SELECT 
    o.tenant_id,
    o.shop_id,
    o.customer_id,
    COUNT(o.id) AS total_orders,
    SUM(o.total_cents) AS total_spent_cents,
    AVG(o.total_cents) AS average_order_value_cents,
    MIN(o.created_at) AS first_order_date,
    MAX(o.created_at) AS last_order_date,
    EXTRACT(DAY FROM (MAX(o.created_at) - MIN(o.created_at))) AS customer_lifetime_days,
    COUNT(DISTINCT DATE_TRUNC('month', o.created_at)) AS months_active,
    COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) AS completed_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) AS cancelled_orders,
    ROUND(
        (COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END)::NUMERIC / 
        NULLIF(COUNT(o.id)::NUMERIC, 0)) * 100, 
        2
    ) AS completion_rate_percentage
FROM orders o
GROUP BY 
    o.tenant_id,
    o.shop_id,
    o.customer_id;

-- Profitability analytics view (material cost vs revenue)
CREATE OR REPLACE VIEW analytics_profitability AS
SELECT 
    o.tenant_id,
    o.shop_id,
    m.material_type,
    m.name AS material_name,
    COUNT(o.id) AS order_count,
    SUM(o.total_cents) AS total_revenue_cents,
    SUM(q.material_cost_cents) AS total_material_cost_cents,
    SUM(q.machine_time_cost_cents) AS total_machine_cost_cents,
    SUM(q.electricity_cost_cents) AS total_electricity_cost_cents,
    SUM(q.maintenance_cost_cents) AS total_maintenance_cost_cents,
    SUM(q.subtotal_cents) AS total_production_cost_cents,
    SUM(o.total_cents) - SUM(q.subtotal_cents) AS gross_profit_cents,
    ROUND(
        ((SUM(o.total_cents) - SUM(q.subtotal_cents))::NUMERIC / 
        NULLIF(SUM(o.total_cents)::NUMERIC, 0)) * 100, 
        2
    ) AS profit_margin_percentage
FROM orders o
JOIN quotes q ON o.quote_id = q.id
LEFT JOIN materials m ON q.material_id = m.id
WHERE o.status NOT IN ('cancelled', 'pending')
GROUP BY 
    o.tenant_id,
    o.shop_id,
    m.material_type,
    m.name;

-- Daily summary analytics view
CREATE OR REPLACE VIEW analytics_daily_summary AS
SELECT 
    tenant_id,
    shop_id,
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS total_orders,
    SUM(total_cents) AS total_revenue_cents,
    AVG(total_cents) AS average_order_value_cents,
    COUNT(DISTINCT customer_id) AS unique_customers,
    COUNT(DISTINCT CASE WHEN status = 'completed' THEN id END) AS completed_orders,
    COUNT(DISTINCT CASE WHEN status = 'cancelled' THEN id END) AS cancelled_orders,
    COUNT(DISTINCT CASE WHEN production_status = 'in_progress' THEN id END) AS in_production_orders
FROM orders
GROUP BY 
    tenant_id,
    shop_id,
    DATE_TRUNC('day', created_at);
