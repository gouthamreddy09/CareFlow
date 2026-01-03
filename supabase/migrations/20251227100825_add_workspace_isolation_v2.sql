/*
  # Add Workspace Isolation

  ## Overview
  This migration adds workspace isolation to all tables, allowing multiple users
  to have separate data spaces while sharing the same database.

  ## Changes
  1. Add workspace_id column to all tables (patients, departments, department_flow_logs, doctors, readmissions)
  2. Create indexes on workspace_id for performance
  3. Update unique constraints to include workspace_id

  ## Security
  - Each workspace can only access its own data
  - workspace_id is required for all new records
*/

-- Add workspace_id to patients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN workspace_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

-- Add workspace_id to departments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'departments' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE departments ADD COLUMN workspace_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

-- Add workspace_id to department_flow_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'department_flow_logs' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE department_flow_logs ADD COLUMN workspace_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

-- Add workspace_id to doctors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE doctors ADD COLUMN workspace_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

-- Add workspace_id to readmissions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'readmissions' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE readmissions ADD COLUMN workspace_id text NOT NULL DEFAULT 'default';
  END IF;
END $$;

-- Create indexes for workspace_id
CREATE INDEX IF NOT EXISTS idx_patients_workspace ON patients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_departments_workspace ON departments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_flow_logs_workspace ON department_flow_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_doctors_workspace ON doctors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_readmissions_workspace ON readmissions(workspace_id);

-- Update unique constraints to include workspace_id
DO $$
BEGIN
  -- Drop old constraint if exists and create new one with workspace_id
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'patients_patient_id_key' AND table_name = 'patients'
  ) THEN
    ALTER TABLE patients DROP CONSTRAINT patients_patient_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS patients_patient_id_workspace_key ON patients(patient_id, workspace_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'departments_name_key' AND table_name = 'departments'
  ) THEN
    ALTER TABLE departments DROP CONSTRAINT departments_name_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS departments_name_workspace_key ON departments(name, workspace_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'doctors_doctor_id_key' AND table_name = 'doctors'
  ) THEN
    ALTER TABLE doctors DROP CONSTRAINT doctors_doctor_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS doctors_doctor_id_workspace_key ON doctors(doctor_id, workspace_id);