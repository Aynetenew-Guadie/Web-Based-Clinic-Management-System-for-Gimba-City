-- Migration to add employee_id column to users table
-- This migration adds the employee_id field to store centralized employee identifiers

ALTER TABLE users 
ADD COLUMN employee_id VARCHAR(20) UNIQUE;

-- Create index for better performance on employee_id lookups
CREATE INDEX idx_users_employee_id ON users(employee_id);

-- Update existing users with their employee IDs based on their roles
-- For doctors
UPDATE users 
SET employee_id = CONCAT('DOC', LPAD(CAST(id AS CHAR), 6, '0'))
WHERE role = 'doctor';

-- For patients  
UPDATE users 
SET employee_id = CONCAT('PAT', LPAD(CAST(id AS CHAR), 6, '0'))
WHERE role = 'patient';

-- For receptionists
UPDATE users 
SET employee_id = CONCAT('REC', LPAD(CAST(id AS CHAR), 6, '0'))
WHERE role = 'receptionist';

-- For lab technicians
UPDATE users 
SET employee_id = CONCAT('LAB', LPAD(CAST(id AS CHAR), 6, '0'))
WHERE role = 'lab_technician';

-- For admins
UPDATE users 
SET employee_id = CONCAT('ADM', LPAD(CAST(id AS CHAR), 6, '0'))
WHERE role = 'admin';
