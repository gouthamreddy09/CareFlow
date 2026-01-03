/*
  # Fix Unique Constraints for Workspace Isolation

  ## Overview
  Replace unique indexes with proper unique constraints needed for upsert operations.

  ## Changes
  1. Drop existing unique indexes
  2. Add proper unique constraints on composite keys (id + workspace_id)
  
  ## Notes
  - Supabase upsert requires constraints, not just indexes
  - Composite constraints ensure uniqueness within each workspace
*/

-- Drop existing indexes that were meant to be constraints
DROP INDEX IF EXISTS patients_patient_id_workspace_key;
DROP INDEX IF EXISTS departments_name_workspace_key;
DROP INDEX IF EXISTS doctors_doctor_id_workspace_key;

-- Add proper unique constraints
ALTER TABLE patients 
  ADD CONSTRAINT patients_patient_id_workspace_key UNIQUE (patient_id, workspace_id);

ALTER TABLE departments 
  ADD CONSTRAINT departments_name_workspace_key UNIQUE (name, workspace_id);

ALTER TABLE doctors 
  ADD CONSTRAINT doctors_doctor_id_workspace_key UNIQUE (doctor_id, workspace_id);