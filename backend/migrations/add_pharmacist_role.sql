-- Migration: Add 'pharmacist' to users.role enum and update IDs

ALTER TABLE users 
MODIFY COLUMN role ENUM('patient','doctor','receptionist','lab_technician','admin','pharmacist') NOT NULL;

-- Assign employee IDs for existing pharmacists
UPDATE users 
SET employee_id = CONCAT('PHA', LPAD(CAST(id AS CHAR), 6, '0'))
WHERE role = 'pharmacist' AND (employee_id IS NULL OR employee_id = '');
