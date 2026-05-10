-- V6__reseed_premium_equipment.sql
-- Wipes all existing equipment data and replaces it with the premium hospital asset dataset.

-- 1. Wipe all related data to ensure a clean state
DELETE FROM meter_thresholds;
DELETE FROM meter_logs;
DELETE FROM meters;
DELETE FROM equipment_documents;
DELETE FROM equipment_history;
DELETE FROM equipment;

-- 2. Insert premium seed data
INSERT INTO equipment (
    asset_code, name, serial_number, status, location, department_id,
    classification, criticality, meter_unit, start_meter_value,
    manufacturer, model_reference
)
SELECT
    t.asset_code, t.name, t.serial_number, 'OPERATIONAL', t.location,
    d.department_id, t.classification, CAST(t.criticality AS VARCHAR), t.meter_unit, t.start_meter_value,
    t.manufacturer, t.model
FROM (VALUES
    ('EQ-BIO-001', 'MRI Scanner',                'MRI-2026-001',  'Radiology Room A',       'RADIOLOGY',      'BIOMEDICAL', 'CRITICAL', 'hours',  0, 'Siemens', 'Magnetom'),
    ('EQ-BIO-002', 'X-Ray Machine',              'XR-2026-014',   'Radiology Room B',        'RADIOLOGY',      'BIOMEDICAL', 'HIGH',     'hours',  0, 'GE Healthcare', 'Optima XR'),
    ('EQ-BIO-003', 'Ultrasound Unit',            'US-2026-008',   'Emergency Unit',          'EMERGENCY',      'BIOMEDICAL', 'HIGH',     'hours',  0, 'Philips', 'EPIQ'),
    ('EQ-BIO-004', 'CT Scanner',                 'CT-2026-003',   'Imaging Room 2',          'RADIOLOGY',      'BIOMEDICAL', 'CRITICAL', 'hours',  0, 'Canon Medical', 'Aquilion'),
    ('EQ-BIO-005', 'Ventilator',                 'VEN-2026-022',  'ICU Ward',                'ICU',            'BIOMEDICAL', 'CRITICAL', 'hours',  0, 'Drager', 'Evita'),
    ('EQ-BIO-006', 'Patient Monitor',            'MON-2026-011',  'ICU Bed 4',               'ICU',            'BIOMEDICAL', 'CRITICAL', 'hours',  0, 'Mindray', 'BeneVision'),
    ('EQ-BIO-007', 'Infusion Pump',              'INF-2026-017',  'ICU Storage',             'ICU',            'BIOMEDICAL', 'HIGH',     'hours',  0, 'B. Braun', 'Infusomat'),
    ('EQ-BIO-008', 'Defibrillator',              'DEF-2026-005',  'Emergency Triage',        'EMERGENCY',      'BIOMEDICAL', 'CRITICAL', 'hours',  0, 'Zoll', 'R Series'),
    ('EQ-BIO-009', 'ECG Machine',                'ECG-2026-009',  'Cardiology Room 1',       'CARDIOLOGY',     'BIOMEDICAL', 'HIGH',     'hours',  0, 'Schiller', 'CARDIOVIT'),
    ('EQ-BIO-010', 'Pulse Oximeter',             'POX-2026-015',  'Emergency Unit',          'EMERGENCY',      'BIOMEDICAL', 'MEDIUM',   'hours',  0, 'Masimo', 'Radical-7'),
    ('EQ-LAB-001', 'Hematology Analyzer',        'LAB-2026-031',  'Lab Room 2',              'LABORATORY',     'BIOMEDICAL', 'HIGH',     'acts',   0, 'Sysmex', 'XN-Series'),
    ('EQ-LAB-002', 'Biochemistry Analyzer',      'BIO-2026-021',  'Lab Room 1',              'LABORATORY',     'BIOMEDICAL', 'HIGH',     'acts',   0, 'Roche', 'Cobas'),
    ('EQ-LAB-003', 'Microscope',                 'MIC-2026-012',  'Microbiology Lab',        'LABORATORY',     'BIOMEDICAL', 'MEDIUM',   'hours',  0, 'Olympus', 'CX23'),
    ('EQ-LAB-004', 'Centrifuge',                 'CEN-2026-018',  'Lab Processing Area',     'LABORATORY',     'TECHNICAL',  'MEDIUM',   'cycles', 0, 'Eppendorf', '5810 R'),
    ('EQ-LAB-005', 'Laboratory Refrigerator',    'REF-2026-006',  'Lab Cold Storage',        'LABORATORY',     'TECHNICAL',  'HIGH',     'hours',  0, 'Haier Biomedical', 'HYC-390'),
    ('EQ-OR-001',  'Anesthesia Machine',         'ANE-2026-010',  'Operating Room 1',        'SURGERY',        'BIOMEDICAL', 'CRITICAL', 'hours',  0, 'GE Healthcare', 'Aespire'),
    ('EQ-OR-002',  'Operating Table',            'ORT-2026-004',  'Operating Room 1',        'SURGERY',        'TECHNICAL',  'HIGH',     'cycles', 0, 'Maquet', 'Alphastar'),
    ('EQ-OR-003',  'Surgical Light',             'LGT-2026-013',  'Operating Room 2',        'SURGERY',        'TECHNICAL',  'HIGH',     'hours',  0, 'Dr. Mach', 'LED 5'),
    ('EQ-OR-004',  'Suction Machine',            'SUC-2026-019',  'Operating Room 2',        'SURGERY',        'BIOMEDICAL', 'HIGH',     'hours',  0, 'Laerdal', 'LCSU 4'),
    ('EQ-OR-005',  'Autoclave',                  'AUT-2026-007',  'CSSD Room',               'STERILIZATION',  'TECHNICAL',  'CRITICAL', 'cycles', 0, 'Getinge', 'HS Series'),
    ('EQ-NEO-001', 'Infant Incubator',           'INC-2026-016',  'Neonatal ICU',            'NICU',           'BIOMEDICAL', 'CRITICAL', 'hours',  0, 'Atom Medical', 'Incu i'),
    ('EQ-NEO-002', 'Phototherapy Unit',          'PHT-2026-020',  'Neonatal ICU',            'NICU',           'BIOMEDICAL', 'HIGH',     'hours',  0, 'Phoenix Medical', 'Blue LED'),
    ('EQ-DEN-001', 'Dental X-Ray Machine',       'DXR-2026-023',  'Dental Room 1',           'DENTAL',         'BIOMEDICAL', 'MEDIUM',   'acts',   0, 'Planmeca', 'ProX'),
    ('EQ-EYE-001', 'Slit Lamp',                  'SLT-2026-024',  'Ophthalmology Room 1',    'OPHTHALMOLOGY',  'BIOMEDICAL', 'MEDIUM',   'hours',  0, 'Topcon', 'SL-D701'),
    ('EQ-ENT-001', 'Audiometer',                 'AUD-2026-025',  'ENT Room 1',              'ENT',            'BIOMEDICAL', 'MEDIUM',   'hours',  0, 'Interacoustics', 'AD629'),
    ('EQ-REH-001', 'Treadmill Rehab Unit',       'TRD-2026-026',  'Physio Room 1',           'PHYSIOTHERAPY',  'TECHNICAL',  'MEDIUM',   'hours',  0, 'Life Fitness', 'T5'),
    ('EQ-REH-002', 'Electrical Stimulation Dev', 'EST-2026-027',  'Physio Room 2',           'PHYSIOTHERAPY',  'BIOMEDICAL', 'MEDIUM',   'hours',  0, 'Chattanooga', 'Intelect'),
    ('EQ-ADM-001', 'Image Archiving System',     'PACS-2026-028', 'Server Room A',           'IT',             'IT',         'CRITICAL', 'hours',  0, 'Dell', 'PowerEdge'),
    ('EQ-ADM-002', 'Inventory Terminal',         'INV-2026-029',  'Supply Office',           'LOGISTICS',      'IT',         'LOW',      'hours',  0, 'HP', 'ProDesk'),
    ('EQ-ADM-003', 'Communication Console',      'COM-2026-030',  'Nurse Station A',         'ADMINISTRATION', 'IT',         'HIGH',     'hours',  0, 'Cisco', 'Unified Console')
) AS t(asset_code, name, serial_number, location, dept_name, classification, criticality, meter_unit, start_meter_value, manufacturer, model)
JOIN departments d ON UPPER(d.department_name) = t.dept_name
ON CONFLICT (asset_code) DO NOTHING;

-- 3. Automate meter creation for premium equipment
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
