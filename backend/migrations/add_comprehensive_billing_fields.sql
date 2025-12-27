-- Migration to add comprehensive billing fields
-- This adds support for separate consultation, diagnosis, and lab test fees

ALTER TABLE Billings ADD COLUMN IF NOT EXISTS appointmentId INT NULL;
ALTER TABLE Billings ADD COLUMN IF NOT EXISTS consultationFee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE Billings ADD COLUMN IF NOT EXISTS diagnosisFee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE Billings ADD COLUMN IF NOT EXISTS labTestFee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE Billings ADD COLUMN IF NOT EXISTS consultationDescription TEXT NULL;
ALTER TABLE Billings ADD COLUMN IF NOT EXISTS diagnosisDescription TEXT NULL;
ALTER TABLE Billings ADD COLUMN IF NOT EXISTS labTestDescription TEXT NULL;

-- Update existing records to have default values
UPDATE Billings SET 
    consultationFee = 0,
    diagnosisFee = 0,
    labTestFee = 0
WHERE consultationFee IS NULL OR diagnosisFee IS NULL OR labTestFee IS NULL;
