-- V1__init_schema.sql
-- Baseline schema for CMMS

BEGIN;

-- 1. Reference Tables
CREATE TABLE IF NOT EXISTS public.roles (
    role_id serial PRIMARY KEY,
    role_name character varying(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.sites (
    site_id serial PRIMARY KEY,
    site_name character varying(255) NOT NULL UNIQUE,
    site_code character varying(50) UNIQUE,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.departments (
    department_id serial PRIMARY KEY,
    department_name character varying(100) NOT NULL,
    site_id integer REFERENCES public.sites(site_id) ON DELETE SET NULL
);

-- 2. Users
CREATE TABLE IF NOT EXISTS public.users (
    user_id serial PRIMARY KEY,
    full_name character varying(100),
    email character varying(100) UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role_id integer REFERENCES public.roles(role_id),
    department_id integer REFERENCES public.departments(department_id),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone,
    phone_number character varying(30)
);

-- 3. Equipment & Assets
CREATE TABLE IF NOT EXISTS public.equipment_categories (
    category_id serial PRIMARY KEY,
    name character varying(100) NOT NULL UNIQUE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.equipment_models (
    model_id serial PRIMARY KEY,
    name character varying(150) NOT NULL UNIQUE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.equipment (
    equipment_id serial PRIMARY KEY,
    name character varying(100),
    serial_number character varying(100),
    status character varying(50),
    location character varying(100),
    department_id integer REFERENCES public.departments(department_id),
    category_id integer REFERENCES public.equipment_categories(category_id),
    model_id integer REFERENCES public.equipment_models(model_id),
    asset_code character varying(50) UNIQUE,
    category character varying(255),
    model character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    manufacturer character varying(255),
    model_reference character varying(255),
    classification character varying(255),
    criticality character varying(255),
    purchase_date date,
    commissioning_date date,
    supplier_name character varying(255),
    contract_number character varying(255),
    warranty_end_date date,
    meter_unit character varying(50),
    start_meter_value numeric(12,2)
);

CREATE TABLE IF NOT EXISTS public.equipment_documents (
    id serial PRIMARY KEY,
    equipment_id integer REFERENCES public.equipment(equipment_id) ON DELETE CASCADE,
    document_name text,
    file_path text,
    file_size bigint,
    content_type character varying(255),
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    uploaded_by character varying(255)
);

CREATE TABLE IF NOT EXISTS public.equipment_history (
    id serial PRIMARY KEY,
    equipment_id integer REFERENCES public.equipment(equipment_id) ON DELETE CASCADE,
    action text,
    performed_by character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 4. Claims
CREATE TABLE IF NOT EXISTS public.claims (
    claim_id serial PRIMARY KEY,
    requester_id integer REFERENCES public.users(user_id),
    equipment_id integer REFERENCES public.equipment(equipment_id),
    department_id integer REFERENCES public.departments(department_id),
    site_id integer REFERENCES public.sites(site_id),
    title character varying(255) NOT NULL DEFAULT 'Untitled',
    description text,
    priority character varying(20) NOT NULL DEFAULT 'MEDIUM',
    status character varying(50) DEFAULT 'NEW',
    assigned_to_user_id integer REFERENCES public.users(user_id),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    closed_at timestamp without time zone,
    rejection_notes text,
    qualification_notes text,
    linked_wo_id integer
);

CREATE TABLE IF NOT EXISTS public.claim_photos (
    photo_id serial PRIMARY KEY,
    claim_id integer REFERENCES public.claims(claim_id) ON DELETE CASCADE,
    photo_url text,
    original_name text,
    file_path text,
    content_type character varying(255),
    file_size bigint,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    uploaded_by character varying(255)
);

CREATE TABLE IF NOT EXISTS public.claim_status_history (
    id serial PRIMARY KEY,
    claim_id integer REFERENCES public.claims(claim_id) ON DELETE CASCADE,
    old_status character varying(50),
    new_status character varying(50),
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    changed_by character varying(255),
    note text
);

-- 5. Work Orders
CREATE TABLE IF NOT EXISTS public.work_orders (
    wo_id serial PRIMARY KEY,
    claim_id integer REFERENCES public.claims(claim_id),
    equipment_id integer REFERENCES public.equipment(equipment_id) NOT NULL,
    parent_wo_id integer,
    wo_type character varying(50) NOT NULL,
    priority character varying(20) NOT NULL,
    status character varying(30) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    assigned_to_user_id integer REFERENCES public.users(user_id),
    estimated_time_hours numeric(10,2),
    actual_time_hours numeric(10,2),
    estimated_duration numeric(10,2),
    actual_duration numeric(10,2),
    estimated_cost numeric(12,2),
    actual_cost numeric(12,2),
    planned_start timestamp without time zone,
    planned_end timestamp without time zone,
    actual_start timestamp without time zone,
    actual_end timestamp without time zone,
    due_date timestamp without time zone,
    completed_at timestamp without time zone,
    completion_notes text,
    validation_notes text,
    validated_at timestamp without time zone,
    validated_by character varying(255),
    closed_at timestamp without time zone,
    closed_by character varying(255),
    cancellation_notes text,
    is_archived boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.work_order_status_history (
    id serial PRIMARY KEY,
    wo_id integer NOT NULL REFERENCES public.work_orders(wo_id) ON DELETE CASCADE,
    old_status character varying(30),
    new_status character varying(30) NOT NULL,
    changed_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by character varying(255),
    note text
);

-- 6. Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    task_id serial PRIMARY KEY,
    wo_id integer REFERENCES public.work_orders(wo_id) ON DELETE CASCADE,
    title character varying(255),
    description text NOT NULL,
    notes text,
    status character varying(20) DEFAULT 'TODO',
    assigned_to_user_id integer REFERENCES public.users(user_id),
    estimated_duration numeric(6,2),
    order_index integer NOT NULL DEFAULT 0,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    completed_by character varying(150),
    skipped_at timestamp without time zone,
    skipped_by character varying(255),
    blocked_reason text
);

-- 7. Inventory
CREATE TABLE IF NOT EXISTS public.spare_parts (
    part_id serial PRIMARY KEY,
    name character varying(255) NOT NULL,
    sku character varying(100) UNIQUE,
    category character varying(100),
    quantity_in_stock integer NOT NULL DEFAULT 0,
    min_stock_level integer NOT NULL DEFAULT 0,
    unit_cost numeric(12,2),
    location character varying(255),
    supplier character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_archived boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.part_usage (
    usage_id serial PRIMARY KEY,
    wo_id integer REFERENCES public.work_orders(wo_id) ON DELETE CASCADE NOT NULL,
    part_id integer REFERENCES public.spare_parts(part_id) NOT NULL,
    quantity_used integer NOT NULL,
    unit_cost_at_usage numeric(12,2),
    used_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 8. Maintenance Plans
CREATE TABLE IF NOT EXISTS public.maintenance_plans (
    plan_id serial PRIMARY KEY,
    equipment_id integer REFERENCES public.equipment(equipment_id) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    frequency_type character varying(20) NOT NULL,
    frequency_value integer NOT NULL,
    interval_unit character varying(50),
    status character varying(50) DEFAULT 'ACTIVE',
    technician_name character varying(255),
    last_generation_date timestamp without time zone,
    next_due_date timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 9. Meters & Monitoring
CREATE TABLE IF NOT EXISTS public.meters (
    meter_id serial PRIMARY KEY,
    equipment_id integer REFERENCES public.equipment(equipment_id) ON DELETE CASCADE,
    name character varying(255),
    unit character varying(50),
    meter_type character varying(50),
    value integer,
    last_reading_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.meter_logs (
    log_id serial PRIMARY KEY,
    meter_id integer REFERENCES public.meters(meter_id) ON DELETE CASCADE,
    value integer,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.meter_thresholds (
    id serial PRIMARY KEY,
    meter_id integer REFERENCES public.meters(meter_id) ON DELETE CASCADE,
    threshold_value integer,
    label character varying(100)
);

-- 10. Alerts & Audit
CREATE TABLE IF NOT EXISTS public.alerts (
    id serial PRIMARY KEY,
    equipment_id integer REFERENCES public.equipment(equipment_id) ON DELETE CASCADE,
    work_order_id integer REFERENCES public.work_orders(wo_id) ON DELETE SET NULL,
    meter_id integer REFERENCES public.meters(meter_id) ON DELETE SET NULL,
    alert_type character varying(50),
    message text,
    status character varying(30) DEFAULT 'open',
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id serial PRIMARY KEY,
    user_id integer REFERENCES public.users(user_id) ON DELETE SET NULL,
    action_type character varying(100),
    entity_name character varying(100),
    entity_id integer,
    action_details text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 11. Initial Data
INSERT INTO public.roles (role_name) VALUES ('ADMIN'), ('TECHNICIAN'), ('MANAGER'), ('VIEWER') ON CONFLICT DO NOTHING;

COMMIT;
