-- V3__upgrade_cmms_modules.sql
-- Migration for CMMS Module Additions (Sub-tasks, Multi-assignments, Notifications, Inventory Audit)

-- 1. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    reference_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- 2. Work Order Followers (Watchers)
CREATE TABLE IF NOT EXISTS work_order_followers (
    id SERIAL PRIMARY KEY,
    wo_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wo_follower UNIQUE(wo_id, user_id)
);

-- 3. Work Order Assignments (Multi-technician support)
CREATE TABLE IF NOT EXISTS work_order_assignments (
    id SERIAL PRIMARY KEY,
    wo_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER,
    CONSTRAINT uq_wo_assignment UNIQUE(wo_id, user_id)
);

-- 4. Subtasks (Checklists for Tasks)
CREATE TABLE IF NOT EXISTS sub_tasks (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,
    order_index INTEGER DEFAULT 0
);

-- 5. Inventory Transactions (Audit log for spare parts)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    reference_id INTEGER,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Alterations for Work Orders and Tasks

-- Add parent_wo_id for follow-on work orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_orders' AND column_name='parent_wo_id') THEN
        ALTER TABLE work_orders ADD COLUMN parent_wo_id INTEGER;
    END IF;
END $$;

-- Add failure_reason for failed tasks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='failure_reason') THEN
        ALTER TABLE tasks ADD COLUMN failure_reason TEXT;
    END IF;
END $$;

-- Add task_id linking to part_usage
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='part_usage' AND column_name='task_id') THEN
        ALTER TABLE part_usage ADD COLUMN task_id INTEGER;
    END IF;
END $$;
