-- Add shared fields to LabResult table for simple sharing functionality
-- Migration: add_shared_fields_to_lab_results.sql

ALTER TABLE LabResult 
ADD COLUMN sharedWithPatient BOOLEAN DEFAULT FALSE AFTER releasedByDoctorId,
ADD COLUMN sharedAt DATETIME NULL AFTER sharedWithPatient;

-- Update existing records to have default values
UPDATE LabResult SET sharedWithPatient = FALSE WHERE sharedWithPatient IS NULL;

-- Add index for better query performance
CREATE INDEX idx_labresult_shared ON LabResult(sharedWithPatient);
CREATE INDEX idx_labresult_shared_date ON LabResult(sharedAt);
