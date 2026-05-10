-- V5__upgrade_inventory_management.sql

-- 1. Add batch and expiry tracking to spare parts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spare_parts' AND column_name='batch_number') THEN
        ALTER TABLE spare_parts ADD COLUMN batch_number VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='spare_parts' AND column_name='expiry_date') THEN
        ALTER TABLE spare_parts ADD COLUMN expiry_date DATE;
    END IF;
END $$;

-- 2. Create Restock Request system
CREATE TABLE IF NOT EXISTS restock_requests (
    request_id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    requested_by INTEGER NOT NULL,
    reviewed_by INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, COMPLETED
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    CONSTRAINT fk_restock_part FOREIGN KEY(part_id) REFERENCES spare_parts(part_id)
);

-- 3. Create Part-to-Model Compatibility mapping
CREATE TABLE IF NOT EXISTS model_spare_parts (
    model_id INTEGER NOT NULL,
    part_id INTEGER NOT NULL,
    PRIMARY KEY (model_id, part_id),
    CONSTRAINT fk_msp_model FOREIGN KEY(model_id) REFERENCES equipment_models(model_id),
    CONSTRAINT fk_msp_part FOREIGN KEY(part_id) REFERENCES spare_parts(part_id)
);
