ALTER TABLE claims ADD COLUMN reported_severity VARCHAR(50);
ALTER TABLE claims ADD COLUMN validated_severity VARCHAR(50);

ALTER TABLE claims ALTER COLUMN priority DROP NOT NULL;

ALTER TABLE ai_priority_suggestions ADD COLUMN severity_score DECIMAL(10,2);
