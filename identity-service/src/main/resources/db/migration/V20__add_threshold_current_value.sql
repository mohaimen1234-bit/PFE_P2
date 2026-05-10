-- Add current_value column to meter_thresholds for tracking accumulated usage since last reset.
-- The meter value itself is never automatically reset; only this tracking value resets on preventive WO completion.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meter_thresholds' AND column_name='current_value') THEN
        ALTER TABLE meter_thresholds ADD COLUMN current_value NUMERIC(12,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meter_thresholds' AND column_name='last_reset_at') THEN
        ALTER TABLE meter_thresholds ADD COLUMN last_reset_at TIMESTAMP;
    END IF;
END$$;
