-- Migration to allow saving regulatory plans before the ID-based code is generated
ALTER TABLE regulatory_plans ALTER COLUMN plan_code DROP NOT NULL;
