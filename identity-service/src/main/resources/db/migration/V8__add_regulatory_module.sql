-- Migration for Regulatory Maintenance Module
CREATE TABLE regulatory_plans (
    plan_id SERIAL PRIMARY KEY,
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    equipment_id INT NOT NULL,
    priority VARCHAR(50) NOT NULL,
    recurrence_unit VARCHAR(50) NOT NULL, -- MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL
    recurrence_value INT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    next_due_date TIMESTAMP NOT NULL,
    last_execution_date TIMESTAMP,
    reminder_days INT DEFAULT 7,
    grace_period INT DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    compliance_reference TEXT,
    requires_document BOOLEAN DEFAULT FALSE,
    document_type VARCHAR(100),
    assigned_technician_id INT,
    estimated_duration DECIMAL(10, 2),
    checklist_template TEXT, -- JSON string
    postponement_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE TABLE wo_checklists (
    checklist_id SERIAL PRIMARY KEY,
    wo_id INT NOT NULL UNIQUE,
    items_json TEXT NOT NULL, -- JSON string of the checklist state
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add REGULATORY to WorkOrderType if not already handled by JPA
-- (In this project, WorkOrderType is an enum in Java, and the DB column is VARCHAR.
--  We just need to make sure the data fits.)

-- Add link from WorkOrder to RegulatoryPlan
ALTER TABLE work_orders ADD COLUMN regulatory_plan_id INT;
CREATE INDEX idx_wo_regulatory_plan ON work_orders(regulatory_plan_id);

CREATE INDEX idx_rp_equipment ON regulatory_plans(equipment_id);
CREATE INDEX idx_rp_next_due ON regulatory_plans(next_due_date);
CREATE INDEX idx_wo_checklist_wo ON wo_checklists(wo_id);
