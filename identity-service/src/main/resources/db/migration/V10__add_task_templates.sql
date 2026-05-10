-- Create Task Templates Table
CREATE TABLE task_templates (
    template_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    equipment_category_id INTEGER,
    department_id INTEGER,
    default_priority VARCHAR(20) DEFAULT 'MEDIUM',
    estimated_hours DECIMAL(10, 2),
    default_assignee_role VARCHAR(50),
    requires_validation BOOLEAN DEFAULT FALSE,
    requires_document BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Task Template Items Table
CREATE TABLE task_template_items (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES task_templates(template_id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER,
    is_required BOOLEAN DEFAULT TRUE,
    estimated_minutes INTEGER
);

-- Seed Data: Annual MRI Inspection
INSERT INTO task_templates (code, name, description, default_priority, estimated_hours, default_assignee_role)
VALUES ('MRI-ANNUAL', 'Annual MRI Inspection', 'Comprehensive annual inspection and safety verification for MRI systems.', 'HIGH', 8.0, 'TECHNICIAN');

INSERT INTO task_template_items (template_id, label, sort_order, description) VALUES
((SELECT template_id FROM task_templates WHERE code = 'MRI-ANNUAL'), 'Cryogen level check', 1, 'Verify helium levels and pressure.'),
((SELECT template_id FROM task_templates WHERE code = 'MRI-ANNUAL'), 'Cooling system verification', 2, 'Inspect chillers and water flow.'),
((SELECT template_id FROM task_templates WHERE code = 'MRI-ANNUAL'), 'RF cabin integrity test', 3, 'Check for RF leaks and shield grounding.'),
((SELECT template_id FROM task_templates WHERE code = 'MRI-ANNUAL'), 'Image quality calibration', 4, 'Perform SNR and spatial resolution tests.'),
((SELECT template_id FROM task_templates WHERE code = 'MRI-ANNUAL'), 'Safety interlocking system check', 5, 'Verify emergency quench and door interlocks.');

-- Seed Data: ECG Calibration
INSERT INTO task_templates (code, name, description, default_priority, estimated_hours, default_assignee_role)
VALUES ('ECG-CAL', 'ECG Calibration checklist', 'Standard calibration and performance test for ECG monitors.', 'MEDIUM', 1.5, 'TECHNICIAN');

INSERT INTO task_template_items (template_id, label, sort_order, description) VALUES
((SELECT template_id FROM task_templates WHERE code = 'ECG-CAL'), 'Visual inspection', 1, 'Check cables, connectors and casing.'),
((SELECT template_id FROM task_templates WHERE code = 'ECG-CAL'), 'Electrical safety test', 2, 'Measure leakage current and grounding.'),
((SELECT template_id FROM task_templates WHERE code = 'ECG-CAL'), 'Signal accuracy test', 3, 'Use simulator to verify HR and waveform accuracy.'),
((SELECT template_id FROM task_templates WHERE code = 'ECG-CAL'), 'Battery performance test', 4, 'Verify backup duration.'),
((SELECT template_id FROM task_templates WHERE code = 'ECG-CAL'), 'Cleaning and labeling', 5, 'Apply calibration sticker.');

-- Seed Data: Ventilator Preventive Inspection
INSERT INTO task_templates (code, name, description, default_priority, estimated_hours, default_assignee_role)
VALUES ('VENT-PM', 'Ventilator Preventive Inspection', 'Semi-annual preventive maintenance for critical care ventilators.', 'CRITICAL', 3.0, 'TECHNICIAN');

INSERT INTO task_template_items (template_id, label, sort_order, description) VALUES
((SELECT template_id FROM task_templates WHERE code = 'VENT-PM'), 'O2 sensor calibration', 1, 'Verify Oxygen concentration accuracy.'),
((SELECT template_id FROM task_templates WHERE code = 'VENT-PM'), 'Pneumatic leakage test', 2, 'Check entire circuit for pressure drops.'),
((SELECT template_id FROM task_templates WHERE code = 'VENT-PM'), 'Filter replacement', 3, 'Replace HEPA and bacterial filters.'),
((SELECT template_id FROM task_templates WHERE code = 'VENT-PM'), 'Alarm verification', 4, 'Test high/low pressure and apnea alarms.'),
((SELECT template_id FROM task_templates WHERE code = 'VENT-PM'), 'Flow sensor calibration', 5, 'Verify tidal volume measurement accuracy.');

-- Seed Data: Ambulance Engine Inspection
INSERT INTO task_templates (code, name, description, default_priority, estimated_hours, default_assignee_role)
VALUES ('AMB-ENG', 'Ambulance Annual Engine Inspection', 'Complete mechanical and electrical engine diagnostic for ambulance fleet.', 'HIGH', 4.0, 'TECHNICIAN');

INSERT INTO task_template_items (template_id, label, sort_order, description) VALUES
((SELECT template_id FROM task_templates WHERE code = 'AMB-ENG'), 'Oil and filter change', 1, 'Full synthetic oil replacement.'),
((SELECT template_id FROM task_templates WHERE code = 'AMB-ENG'), 'Braking system diagnostic', 2, 'Verify pads, discs and ABS sensors.'),
((SELECT template_id FROM task_templates WHERE code = 'AMB-ENG'), 'Secondary battery check', 3, 'Test hospital-grade electrical system battery.'),
((SELECT template_id FROM task_templates WHERE code = 'AMB-ENG'), 'Siren and lighting verify', 4, 'Verify priority signal system functionality.'),
((SELECT template_id FROM task_templates WHERE code = 'AMB-ENG'), 'Engine coolant flush', 5, 'Verify pH and freezing point.');

-- Seed Data: Sterilizer Compliance Check
INSERT INTO task_templates (code, name, description, default_priority, estimated_hours, default_assignee_role)
VALUES ('STER-VAL', 'Sterilizer Compliance Check', 'Validation of sterilization parameters (Bowie-Dick and Vacuum tests).', 'CRITICAL', 2.5, 'TECHNICIAN');

INSERT INTO task_template_items (template_id, label, sort_order, description) VALUES
((SELECT template_id FROM task_templates WHERE code = 'STER-VAL'), 'Vacuum leak test', 1, 'Verify chamber integrity under negative pressure.'),
((SELECT template_id FROM task_templates WHERE code = 'STER-VAL'), 'Bowie-Dick test', 2, 'Verify steam penetration and air removal.'),
((SELECT template_id FROM task_templates WHERE code = 'STER-VAL'), 'Pressure gauge calibration', 3, 'Verify accuracy against master gauge.'),
((SELECT template_id FROM task_templates WHERE code = 'STER-VAL'), 'Door seal inspection', 4, 'Inspect gasket for wear and debris.'),
((SELECT template_id FROM task_templates WHERE code = 'STER-VAL'), 'Parameter record verification', 5, 'Verify log printouts match programmed values.');
