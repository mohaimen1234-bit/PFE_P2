-- V16__create_ai_priority_suggestions.sql
-- Create table for AI priority suggestions and decisions

CREATE TABLE IF NOT EXISTS ai_priority_suggestions (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    current_priority VARCHAR(50),
    suggested_priority VARCHAR(50) NOT NULL,
    final_priority VARCHAR(50),
    score DECIMAL(5,2),
    confidence DECIMAL(5,2),
    criticality_score DECIMAL(5,2),
    service_impact_score DECIMAL(5,2),
    failure_history_score DECIMAL(5,2),
    sla_score DECIMAL(5,2),
    suggested_due_date TIMESTAMP,
    final_due_date TIMESTAMP,
    due_date_was_overridden BOOLEAN,
    due_date_override_reason TEXT,
    sla_status VARCHAR(50),
    reason TEXT,
    recommendation TEXT,
    decision_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    decision_reason TEXT,
    decided_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    decided_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_priority_claim UNIQUE (claim_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_priority_claim_id ON ai_priority_suggestions(claim_id);
CREATE INDEX IF NOT EXISTS idx_ai_priority_decision_status ON ai_priority_suggestions(decision_status);
CREATE INDEX IF NOT EXISTS idx_ai_priority_sla_status ON ai_priority_suggestions(sla_status);
CREATE INDEX IF NOT EXISTS idx_ai_priority_suggested_priority ON ai_priority_suggestions(suggested_priority);
CREATE INDEX IF NOT EXISTS idx_ai_priority_created_at ON ai_priority_suggestions(created_at);
