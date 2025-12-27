-- Add age column to user table
ALTER TABLE user ADD COLUMN age INT NULL;

-- Add constraint to ensure age is within reasonable range
ALTER TABLE user ADD CONSTRAINT chk_age_range CHECK (age >= 0 AND age <= 150);
