-- V6__reseed_premium_equipment.sql
-- Wipes all existing equipment data and replaces it with the premium hospital asset dataset.

-- -- 1. Wipe all related data to ensure a clean state (reverse order of dependencies)
DELETE FROM claim_status_history;
DELETE FROM claim_photos;
DELETE FROM sub_tasks;
DELETE FROM part_usage;
DELETE FROM tasks;
DELETE FROM work_order_assignments;
DELETE FROM work_order_followers;
DELETE FROM work_orders;
DELETE FROM maintenance_plans;
DELETE FROM claims;
DELETE FROM restock_requests;
DELETE FROM inventory_transactions;
DELETE FROM notifications;
DELETE FROM meter_thresholds;
DELETE FROM meter_logs;
DELETE FROM meters;
DELETE FROM equipment_documents;
DELETE FROM equipment_history;
DELETE FROM equipment;

-- 2. Add columns if not exists (for clean migration)
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS category VARCHAR(255);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS model VARCHAR(255);

-- 3. Ensure all required departments exist
INSERT INTO departments (department_name)
SELECT d.name
FROM (VALUES 
    ('RADIOLOGY'), ('EMERGENCY'), ('ICU'), ('LABORATORY'), 
    ('SURGERY'), ('STERILIZATION'), ('NICU'), ('DENTAL'), 
    ('OPHTHALMOLOGY'), ('ENT'), ('PHYSIOTHERAPY'), ('IT'), 
    ('LOGISTICS'), ('ADMINISTRATION'), ('CARDIOLOGY')
) AS d(name)
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE department_name = d.name
);

-- 4. Insert premium seed data
INSERT INTO equipment (
    asset_code, name, serial_number, status, location, department_id,
    classification, category, model, criticality, meter_unit, start_meter_value,
    manufacturer
)
SELECT
    t.asset_code, t.name, t.serial_number, 'OPERATIONAL', t.location,
    d.department_id, t.classification, t.category, t.model, 
    CAST(t.criticality AS VARCHAR), t.meter_unit, t.start_meter_value,
    t.manufacturer
FROM (VALUES
    ('EQ-BIO-001', 'MRI Scanner',                'MRI-2026-001',  'Radiology Room A',       'RADIOLOGY',      'BIOMEDICAL', 'IMAGING',           'Magnetom',    'CRITICAL', 'hours',  0, 'Siemens'),
    ('EQ-BIO-002', 'X-Ray Machine',              'XR-2026-014',   'Radiology Room B',        'RADIOLOGY',      'BIOMEDICAL', 'IMAGING',           'Optima XR',   'HIGH',     'hours',  0, 'GE Healthcare'),
    ('EQ-BIO-003', 'Ultrasound Unit',            'US-2026-008',   'Emergency Unit',          'EMERGENCY',      'BIOMEDICAL', 'IMAGING',           'EPIQ',        'HIGH',     'hours',  0, 'Philips'),
    ('EQ-BIO-004', 'CT Scanner',                 'CT-2026-003',   'Imaging Room 2',          'RADIOLOGY',      'BIOMEDICAL', 'IMAGING',           'Aquilion',    'CRITICAL', 'hours',  0, 'Canon Medical'),
    ('EQ-BIO-005', 'Ventilator',                 'VEN-2026-022',  'ICU Ward',                'ICU',            'BIOMEDICAL', 'LIFE_SUPPORT',      'Evita',       'CRITICAL', 'hours',  0, 'Drager'),
    ('EQ-BIO-006', 'Patient Monitor',            'MON-2026-011',  'ICU Bed 4',               'ICU',            'BIOMEDICAL', 'MONITORING',        'BeneVision',  'CRITICAL', 'hours',  0, 'Mindray'),
    ('EQ-BIO-007', 'Infusion Pump',              'INF-2026-017',  'ICU Storage',             'ICU',            'BIOMEDICAL', 'LIFE_SUPPORT',      'Infusomat',   'HIGH',     'hours',  0, 'B. Braun'),
    ('EQ-BIO-008', 'Defibrillator',              'DEF-2026-005',  'Emergency Triage',        'EMERGENCY',      'BIOMEDICAL', 'LIFE_SUPPORT',      'R Series',    'CRITICAL', 'hours',  0, 'Zoll'),
    ('EQ-BIO-009', 'ECG Machine',                'ECG-2026-009',  'Cardiology Room 1',       'CARDIOLOGY',     'BIOMEDICAL', 'MONITORING',        'CARDIOVIT',   'HIGH',     'hours',  0, 'Schiller'),
    ('EQ-BIO-010', 'Pulse Oximeter',             'POX-2026-015',  'Emergency Unit',          'EMERGENCY',      'BIOMEDICAL', 'MONITORING',        'Radical-7',   'MEDIUM',   'hours',  0, 'Masimo'),
    ('EQ-LAB-001', 'Hematology Analyzer',        'LAB-2026-031',  'Lab Room 2',              'LABORATORY',     'BIOMEDICAL', 'LABORATORY',       'XN-Series',   'HIGH',     'acts',   0, 'Sysmex'),
    ('EQ-LAB-002', 'Biochemistry Analyzer',      'BIO-2026-021',  'Lab Room 1',              'LABORATORY',     'BIOMEDICAL', 'LABORATORY',       'Cobas',       'HIGH',     'acts',   0, 'Roche'),
    ('EQ-LAB-003', 'Microscope',                 'MIC-2026-012',  'Microbiology Lab',        'LABORATORY',     'BIOMEDICAL', 'LABORATORY',       'CX23',        'MEDIUM',   'hours',  0, 'Olympus'),
    ('EQ-LAB-004', 'Centrifuge',                 'CEN-2026-018',  'Lab Processing Area',     'LABORATORY',     'TECHNICAL',  'LABORATORY',       '5810 R',      'MEDIUM',   'cycles', 0, 'Eppendorf'),
    ('EQ-LAB-005', 'Laboratory Refrigerator',    'REF-2026-006',  'Lab Cold Storage',        'LABORATORY',     'TECHNICAL',  'LABORATORY',       'HYC-390',     'HIGH',     'hours',  0, 'Haier Biomedical'),
    ('EQ-OR-001',  'Anesthesia Machine',         'ANE-2026-010',  'Operating Room 1',        'SURGERY',        'BIOMEDICAL', 'SURGICAL',          'Aespire',     'CRITICAL', 'hours',  0, 'GE Healthcare'),
    ('EQ-OR-002',  'Operating Table',            'ORT-2026-004',  'Operating Room 1',        'SURGERY',        'TECHNICAL',  'SURGICAL',          'Alphastar',   'HIGH',     'cycles', 0, 'Maquet'),
    ('EQ-OR-003',  'Surgical Light',             'LGT-2026-013',  'Operating Room 2',        'SURGERY',        'TECHNICAL',  'SURGICAL',          'LED 5',       'HIGH',     'hours',  0, 'Dr. Mach'),
    ('EQ-OR-004',  'Suction Machine',            'SUC-2026-019',  'Operating Room 2',        'SURGERY',        'BIOMEDICAL', 'SURGICAL',          'LCSU 4',      'HIGH',     'hours',  0, 'Laerdal'),
    ('EQ-OR-005',  'Autoclave',                  'AUT-2026-007',  'CSSD Room',               'STERILIZATION',  'TECHNICAL',  'STERILIZATION',    'HS Series',   'CRITICAL', 'cycles', 0, 'Getinge'),
    ('EQ-NEO-001', 'Infant Incubator',           'INC-2026-016',  'Neonatal ICU',            'NICU',           'BIOMEDICAL', 'NEONATAL',          'Incu i',      'CRITICAL', 'hours',  0, 'Atom Medical'),
    ('EQ-NEO-002', 'Phototherapy Unit',          'PHT-2026-020',  'Neonatal ICU',            'NICU',           'BIOMEDICAL', 'NEONATAL',          'Blue LED',    'HIGH',     'hours',  0, 'Phoenix Medical'),
    ('EQ-DEN-001', 'Dental X-Ray Machine',       'DXR-2026-023',  'Dental Room 1',           'DENTAL',         'BIOMEDICAL', 'DENTAL',            'ProX',        'MEDIUM',   'acts',   0, 'Planmeca'),
    ('EQ-EYE-001', 'Slit Lamp',                  'SLT-2026-024',  'Ophthalmology Room 1',    'OPHTHALMOLOGY',  'BIOMEDICAL', 'OPHTHALMOLOGY',     'SL-D701',     'MEDIUM',   'hours',  0, 'Topcon'),
    ('EQ-ENT-001', 'Audiometer',                 'AUD-2026-025',  'ENT Room 1',              'ENT',            'BIOMEDICAL', 'ENT',               'AD629',       'MEDIUM',   'hours',  0, 'Interacoustics'),
    ('EQ-REH-001', 'Treadmill Rehab Unit',       'TRD-2026-026',  'Physio Room 1',           'PHYSIOTHERAPY',  'TECHNICAL',  'REHABILITATION',    'T5',          'MEDIUM',   'hours',  0, 'Life Fitness'),
    ('EQ-REH-002', 'Electrical Stimulation Dev', 'EST-2026-027',  'Physio Room 2',           'PHYSIOTHERAPY',  'BIOMEDICAL', 'REHABILITATION',    'Intelect',    'MEDIUM',   'hours',  0, 'Chattanooga'),
    ('EQ-ADM-001', 'Image Archiving System',     'PACS-2026-028', 'Server Room A',           'IT',             'IT',         'INFORMATION_SYSTEM','PowerEdge',   'CRITICAL', 'hours',  0, 'Dell'),
    ('EQ-ADM-002', 'Inventory Terminal',         'INV-2026-029',  'Supply Office',           'LOGISTICS',      'IT',         'LOGISTICS',         'ProDesk',     'LOW',      'hours',  0, 'HP'),
    ('EQ-ADM-003', 'Communication Console',      'COM-2026-030',  'Nurse Station A',         'ADMINISTRATION', 'IT',         'INFORMATION_SYSTEM','Unified Console','HIGH',   'hours',  0, 'Cisco')
) AS t(asset_code, name, serial_number, location, dept_name, classification, category, model, criticality, meter_unit, start_meter_value, manufacturer)
JOIN departments d ON UPPER(d.department_name) = t.dept_name
ON CONFLICT (asset_code) DO NOTHING;

-- 5. Automate meter creation for premium equipment
INSERT INTO meters (equipment_id, name, unit, meter_type, value, last_reading_at)
SELECT e.equipment_id,
       e.name || ' Usage',
       e.meter_unit,
       'ODOMETER',
       e.start_meter_value,
       NOW()
FROM equipment e
WHERE NOT EXISTS (SELECT 1 FROM meters m WHERE m.equipment_id = e.equipment_id)
  AND e.meter_unit IS NOT NULL;
