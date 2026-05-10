-- V15__add_due_date_to_claims.sql
-- Add nullable due_date column to claims table for Automatic Prioritization module.
-- Existing claims will retain due_date = NULL (no backfill).

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='due_date') THEN
        ALTER TABLE claims ADD COLUMN due_date TIMESTAMP NULL;
    END IF;
END $$;

-- Indexes for prioritization queries
CREATE INDEX IF NOT EXISTS idx_claims_due_date ON claims(due_date);
CREATE INDEX IF NOT EXISTS idx_claims_priority_due_date ON claims(priority, due_date);
