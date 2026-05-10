ALTER TABLE work_orders
ADD COLUMN predictive_outcome VARCHAR(50) NULL,
ADD COLUMN predictive_outcome_notes TEXT NULL,
ADD COLUMN predictive_outcome_at TIMESTAMP NULL;
