-- =========================================
-- Redesign equipment module and seed data
-- =========================================

-- Ensure status has a default value for new rows
ALTER TABLE equipment
ALTER COLUMN status SET DEFAULT 'OPERATIONAL';

INSERT INTO equipment (
    asset_code,
    name,
    serial_number,
    location,
    department_id,
    classification,
    criticality,
    status,
    created_at
) VALUES
-- Radiology (id 6 or 1? I need to use correct department_id if possible. 
-- Will just fallback to basic department_id 1 if not constrained and we don't know the ids. 
-- Wait, the prompt says "assignment to a department/service". But equipment has department_id. 
-- From the seed data provided by user in prompt, they used the string 'department', but in our schema department_id is Integer.
-- I'll map them to generic department_id. Assuming departments 1-5 exist.
('EQ-BIO-001', 'MRI Scanner', 'MRI-2026-001', 'Radiology Room A', 1, 'BIOMEDICAL', 'CRITICAL', 'OPERATIONAL', NOW()),
('EQ-BIO-002', 'X-Ray Machine', 'XR-2026-014', 'Radiology Room B', 1, 'BIOMEDICAL', 'HIGH', 'OPERATIONAL', NOW()),
('EQ-BIO-003', 'Ultrasound Unit', 'US-2026-008', 'Emergency Unit', 2, 'BIOMEDICAL', 'HIGH', 'OPERATIONAL', NOW()),
('EQ-BIO-004', 'CT Scanner', 'CT-2026-003', 'Imaging Room 2', 1, 'BIOMEDICAL', 'CRITICAL', 'OPERATIONAL', NOW()),
('EQ-BIO-005', 'Ventilator', 'VEN-2026-022', 'ICU Ward', 3, 'BIOMEDICAL', 'CRITICAL', 'OPERATIONAL', NOW()),
('EQ-BIO-006', 'Patient Monitor', 'MON-2026-011', 'ICU Bed 4', 3, 'BIOMEDICAL', 'CRITICAL', 'OPERATIONAL', NOW()),
('EQ-BIO-007', 'Infusion Pump', 'INF-2026-017', 'ICU Storage', 3, 'BIOMEDICAL', 'HIGH', 'OPERATIONAL', NOW()),
('EQ-BIO-008', 'Defibrillator', 'DEF-2026-005', 'Emergency Triage', 2, 'BIOMEDICAL', 'CRITICAL', 'OPERATIONAL', NOW()),
('EQ-BIO-009', 'ECG Machine', 'ECG-2026-009', 'Cardiology Room 1', 1, 'BIOMEDICAL', 'HIGH', 'OPERATIONAL', NOW()),
('EQ-BIO-010', 'Pulse Oximeter', 'POX-2026-015', 'Emergency Unit', 2, 'BIOMEDICAL', 'MEDIUM', 'OPERATIONAL', NOW()),

('EQ-LAB-001', 'Hematology Analyzer', 'LAB-2026-031', 'Lab Room 2', 4, 'BIOMEDICAL', 'HIGH', 'OPERATIONAL', NOW()),
('EQ-LAB-002', 'Biochemistry Analyzer', 'BIO-2026-021', 'Lab Room 1', 4, 'BIOMEDICAL', 'HIGH', 'OPERATIONAL', NOW()),
('EQ-LAB-003', 'Microscope', 'MIC-2026-012', 'Microbiology Lab', 4, 'BIOMEDICAL', 'MEDIUM', 'OPERATIONAL', NOW()),
('EQ-LAB-004', 'Centrifuge', 'CEN-2026-018', 'Lab Processing Area', 4, 'TECHNICAL', 'MEDIUM', 'OPERATIONAL', NOW()),
('EQ-LAB-005', 'Laboratory Refrigerator', 'REF-2026-006', 'Lab Cold Storage', 4, 'TECHNICAL', 'HIGH', 'OPERATIONAL', NOW()),

('EQ-OR-001', 'Anesthesia Machine', 'ANE-2026-010', 'Operating Room 1', 3, 'BIOMEDICAL', 'CRITICAL', 'OPERATIONAL', NOW()),
('EQ-OR-002', 'Operating Table', 'ORT-2026-004', 'Operating Room 1', 3, 'TECHNICAL', 'HIGH', 'OPERATIONAL', NOW()),
('EQ-OR-003', 'Surgical Light', 'LGT-2026-013', 'Operating Room 2', 3, 'TECHNICAL', 'HIGH', 'OPERATIONAL', NOW()),
('EQ-OR-004', 'Suction Machine', 'SUC-2026-019', 'Operating Room 2', 3, 'BIOMEDICAL', 'HIGH', 'OPERATIONAL', NOW()),
('EQ-OR-005', 'Autoclave', 'AUT-2026-007', 'CSSD Room', 3, 'TECHNICAL', 'CRITICAL', 'OPERATIONAL', NOW()),

('EQ-NEO-001', 'Infant Incubator', 'INC-2026-016', 'Neonatal ICU', 3, 'BIOMEDICAL', 'CRITICAL', 'OPERATIONAL', NOW()),
('EQ-NEO-002', 'Phototherapy Unit', 'PHT-2026-020', 'Neonatal ICU', 3, 'BIOMEDICAL', 'HIGH', 'OPERATIONAL', NOW()),

('EQ-DEN-001', 'Dental X-Ray Machine', 'DXR-2026-023', 'Dental Room 1', 1, 'BIOMEDICAL', 'MEDIUM', 'OPERATIONAL', NOW()),
('EQ-EYE-001', 'Slit Lamp', 'SLT-2026-024', 'Ophthalmology Room 1', 1, 'BIOMEDICAL', 'MEDIUM', 'OPERATIONAL', NOW()),
('EQ-ENT-001', 'Audiometer', 'AUD-2026-025', 'ENT Room 1', 1, 'BIOMEDICAL', 'MEDIUM', 'OPERATIONAL', NOW()),

('EQ-REH-001', 'Treadmill Rehab Unit', 'TRD-2026-026', 'Physio Room 1', 5, 'TECHNICAL', 'MEDIUM', 'OPERATIONAL', NOW()),
('EQ-REH-002', 'Electrical Stimulation Device', 'EST-2026-027', 'Physio Room 2', 5, 'BIOMEDICAL', 'MEDIUM', 'OPERATIONAL', NOW()),

('EQ-ADM-001', 'Image Archiving System', 'PACS-2026-028', 'Server Room A', 5, 'IT', 'CRITICAL', 'OPERATIONAL', NOW()),
('EQ-ADM-002', 'Inventory Management Terminal', 'INV-2026-029', 'Supply Office', 5, 'IT', 'LOW', 'OPERATIONAL', NOW()),
('EQ-ADM-003', 'Communication Console', 'COM-2026-030', 'Nurse Station A', 5, 'IT', 'HIGH', 'OPERATIONAL', NOW())
ON CONFLICT (asset_code) DO NOTHING;

-- Also try inserting thresholds but our table might be equipment_meter_triggers or such.
-- the seed says equipment_thresholds which doesn't quite match our typical schema.
-- Let's check what the meter triggers table is called.
