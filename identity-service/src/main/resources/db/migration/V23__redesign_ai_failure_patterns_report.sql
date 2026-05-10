-- Redesign ai_failure_patterns table for structured reporting
-- Drop existing indices that might conflict or become irrelevant
DROP INDEX IF EXISTS idx_ai_failure_patterns_pattern_type;
DROP INDEX IF EXISTS idx_ai_failure_patterns_model_id;
DROP INDEX IF EXISTS idx_ai_failure_patterns_department_id;
DROP INDEX IF EXISTS idx_ai_failure_patterns_technician_id;
DROP INDEX IF EXISTS idx_ai_failure_patterns_location;
DROP INDEX IF EXISTS idx_ai_failure_patterns_detected_at;
DROP INDEX IF EXISTS idx_ai_failure_patterns_equipment_id;
DROP INDEX IF EXISTS idx_ai_failure_patterns_status;
DROP INDEX IF EXISTS idx_ai_failure_patterns_severity;

-- Alter table to add new columns and rename/drop old ones
ALTER TABLE ai_failure_patterns 
    ADD COLUMN IF NOT EXISTS status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20),
    ADD COLUMN IF NOT EXISTS equipment_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS asset_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS department_id INTEGER,
    ADD COLUMN IF NOT EXISTS analysis_window_days INTEGER,
    ADD COLUMN IF NOT EXISTS recurrence_window_days INTEGER,
    ADD COLUMN IF NOT EXISTS average_days_between_failures DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS short_interval_recurrence_count INTEGER,
    ADD COLUMN IF NOT EXISTS post_repair_recurrence_count INTEGER,
    ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP,
    
    -- Contextual Signals
    ADD COLUMN IF NOT EXISTS same_model_affected_equipment_count INTEGER,
    ADD COLUMN IF NOT EXISTS same_model_event_count INTEGER,
    ADD COLUMN IF NOT EXISTS same_manufacturer_event_count INTEGER,
    ADD COLUMN IF NOT EXISTS department_event_count INTEGER,
    ADD COLUMN IF NOT EXISTS department_event_percentage DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS location_event_count INTEGER,
    ADD COLUMN IF NOT EXISTS location_affected_equipment_count INTEGER,
    ADD COLUMN IF NOT EXISTS repeated_technician_id INTEGER,
    
    ADD COLUMN IF NOT EXISTS technician_signal_summary TEXT,
    ADD COLUMN IF NOT EXISTS model_signal_summary TEXT,
    ADD COLUMN IF NOT EXISTS manufacturer_signal_summary TEXT,
    ADD COLUMN IF NOT EXISTS department_signal_summary TEXT,
    ADD COLUMN IF NOT EXISTS location_signal_summary TEXT,
    ADD COLUMN IF NOT EXISTS downtime_signal_summary TEXT,
    ADD COLUMN IF NOT EXISTS post_repair_signal_summary TEXT,
    
    -- Report Text & Evidence
    ADD COLUMN IF NOT EXISTS probable_explanation TEXT,
    ADD COLUMN IF NOT EXISTS recommendation TEXT,
    ADD COLUMN IF NOT EXISTS matched_claim_ids_json TEXT,
    ADD COLUMN IF NOT EXISTS matched_work_order_ids_json TEXT,
    
    -- Status tracking dates/users
    ADD COLUMN IF NOT EXISTS reviewed_by_user_id INTEGER,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS ignored_at TIMESTAMP;

-- Remove old columns that are no longer needed in the new design
ALTER TABLE ai_failure_patterns 
    DROP COLUMN IF EXISTS total_corrective_cost,
    DROP COLUMN IF EXISTS average_repair_hours,
    DROP COLUMN IF EXISTS mtbf_days,
    DROP COLUMN IF EXISTS previous_mtbf_days,
    DROP COLUMN IF EXISTS mtbf_change_percent,
    DROP COLUMN IF EXISTS created_work_order_id,
    DROP COLUMN IF EXISTS anomaly_label,
    DROP COLUMN IF EXISTS detection_reason,
    DROP COLUMN IF EXISTS cause_group;

-- Update existing data to REPETITIVE_FAILURE pattern type if necessary
UPDATE ai_failure_patterns SET pattern_type = 'REPETITIVE_FAILURE' WHERE pattern_type IS NULL OR pattern_type != 'REPETITIVE_FAILURE';
UPDATE ai_failure_patterns SET status = 'NEW' WHERE status IS NULL;
UPDATE ai_failure_patterns SET severity = 'MEDIUM' WHERE severity IS NULL;
UPDATE ai_failure_patterns SET title = 'Repetitive Failure Report' WHERE title IS NULL;

-- Re-create useful indices
CREATE INDEX idx_ai_failure_patterns_pattern_type ON ai_failure_patterns(pattern_type);
CREATE INDEX idx_ai_failure_patterns_equipment_id ON ai_failure_patterns(equipment_id);
CREATE INDEX idx_ai_failure_patterns_detected_at ON ai_failure_patterns(detected_at);
CREATE INDEX idx_ai_failure_patterns_status ON ai_failure_patterns(status);
CREATE INDEX idx_ai_failure_patterns_severity ON ai_failure_patterns(severity);
