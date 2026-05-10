-- V4__add_meters_trigger_support.sql

-- Add meter support to maintenance plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='maintenance_plans' AND column_name='meter_id') THEN
        ALTER TABLE maintenance_plans ADD COLUMN meter_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='maintenance_plans' AND column_name='next_meter_reading') THEN
        ALTER TABLE maintenance_plans ADD COLUMN next_meter_reading DECIMAL(12,2);
    END IF;
END $$;

-- Enhance meter thresholds for warnings and recommendations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meter_thresholds' AND column_name='threshold_type') THEN
        ALTER TABLE meter_thresholds ADD COLUMN threshold_type VARCHAR(20) DEFAULT 'CRITICAL';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meter_thresholds' AND column_name='auto_recommend') THEN
        ALTER TABLE meter_thresholds ADD COLUMN auto_recommend BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
