ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS pattern_type VARCHAR(80);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS model_id INTEGER;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS technician_id INTEGER;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS model_reference VARCHAR(255);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS affected_equipment_count INTEGER;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS total_downtime_hours DECIMAL(12,2);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS total_corrective_cost DECIMAL(14,2);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS average_repair_hours DECIMAL(12,2);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS mtbf_days DECIMAL(12,2);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS previous_mtbf_days DECIMAL(12,2);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS mtbf_change_percent DECIMAL(7,2);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS recurrence_score INTEGER;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS evidence_summary TEXT;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS detected_at TIMESTAMP;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS resolved_by_user_id INTEGER;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS resolution_note TEXT;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS ignored_by_user_id INTEGER;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS ignored_reason TEXT;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS anomaly_label VARCHAR(255);
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS detection_reason TEXT;
ALTER TABLE IF EXISTS ai_failure_patterns ADD COLUMN IF NOT EXISTS cause_group VARCHAR(50);

UPDATE ai_failure_patterns
SET pattern_type = COALESCE(pattern_type, 'EQUIPMENT_REPETITION'),
    title = COALESCE(title, anomaly_label, 'Structured reliability pattern'),
    evidence_summary = COALESCE(evidence_summary, detection_reason),
    affected_equipment_count = COALESCE(affected_equipment_count, 1),
    detected_at = COALESCE(detected_at, created_at, CURRENT_TIMESTAMP)
WHERE pattern_type IS NULL OR title IS NULL;

ALTER TABLE IF EXISTS ai_failure_patterns ALTER COLUMN pattern_type SET NOT NULL;
ALTER TABLE IF EXISTS ai_failure_patterns ALTER COLUMN title SET NOT NULL;
ALTER TABLE IF EXISTS ai_failure_patterns ALTER COLUMN equipment_id DROP NOT NULL;
ALTER TABLE IF EXISTS ai_failure_patterns ALTER COLUMN anomaly_label DROP NOT NULL;
ALTER TABLE IF EXISTS ai_failure_patterns ALTER COLUMN cause_group DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_failure_patterns_pattern_type ON ai_failure_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_ai_failure_patterns_model_id ON ai_failure_patterns(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_failure_patterns_department_id ON ai_failure_patterns(department_id);
CREATE INDEX IF NOT EXISTS idx_ai_failure_patterns_technician_id ON ai_failure_patterns(technician_id);
CREATE INDEX IF NOT EXISTS idx_ai_failure_patterns_location ON ai_failure_patterns(location);
CREATE INDEX IF NOT EXISTS idx_ai_failure_patterns_detected_at ON ai_failure_patterns(detected_at);
