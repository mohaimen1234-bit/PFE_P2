CREATE TABLE ai_failure_patterns (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    equipment_id INTEGER,
    model_id INTEGER,
    department_id INTEGER,
    technician_id INTEGER,
    location VARCHAR(255),
    manufacturer VARCHAR(255),
    model_reference VARCHAR(255),
    occurrence_count INTEGER NOT NULL,
    affected_equipment_count INTEGER,
    first_seen_at TIMESTAMP,
    last_seen_at TIMESTAMP,
    total_downtime_hours DECIMAL(12,2),
    total_corrective_cost DECIMAL(14,2),
    average_repair_hours DECIMAL(12,2),
    mtbf_days DECIMAL(12,2),
    previous_mtbf_days DECIMAL(12,2),
    mtbf_change_percent DECIMAL(7,2),
    recurrence_score INTEGER,
    title VARCHAR(255) NOT NULL,
    evidence_summary TEXT,
    recommendation TEXT,
    matched_claim_ids_json TEXT,
    matched_work_order_ids_json TEXT,
    created_work_order_id INTEGER,
    detected_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by_user_id INTEGER,
    resolved_at TIMESTAMP,
    resolved_by_user_id INTEGER,
    resolution_note TEXT,
    ignored_at TIMESTAMP,
    ignored_by_user_id INTEGER,
    ignored_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_ai_failure_patterns_pattern_type ON ai_failure_patterns(pattern_type);
CREATE INDEX idx_ai_failure_patterns_equipment_id ON ai_failure_patterns(equipment_id);
CREATE INDEX idx_ai_failure_patterns_model_id ON ai_failure_patterns(model_id);
CREATE INDEX idx_ai_failure_patterns_department_id ON ai_failure_patterns(department_id);
CREATE INDEX idx_ai_failure_patterns_technician_id ON ai_failure_patterns(technician_id);
CREATE INDEX idx_ai_failure_patterns_location ON ai_failure_patterns(location);
CREATE INDEX idx_ai_failure_patterns_severity ON ai_failure_patterns(severity);
CREATE INDEX idx_ai_failure_patterns_status ON ai_failure_patterns(status);
CREATE INDEX idx_ai_failure_patterns_last_seen_at ON ai_failure_patterns(last_seen_at);
CREATE INDEX idx_ai_failure_patterns_occurrence_count ON ai_failure_patterns(occurrence_count);
CREATE INDEX idx_ai_failure_patterns_detected_at ON ai_failure_patterns(detected_at);
