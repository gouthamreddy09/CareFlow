/*
  # Healthcare Analytics Database Schema

  ## Overview
  This migration creates the complete database schema for a multi-department hospital
  analytics platform, supporting patient records, department flows, doctors, resources,
  and readmission tracking.

  ## New Tables

  1. `patients`
     - `id` (uuid, primary key) - Internal identifier
     - `patient_id` (text, unique) - External patient identifier from CSV
     - `admission_date` (date) - Date patient was admitted
     - `discharge_date` (date) - Date patient was discharged
     - `age` (integer) - Patient age
     - `gender` (text) - Patient gender
     - `diagnosis` (text) - Primary diagnosis
     - `severity` (text) - Severity level (low, medium, high, critical)
     - `admission_type` (text) - Emergency or Scheduled
     - `created_at` (timestamptz) - Record creation timestamp

  2. `departments`
     - `id` (uuid, primary key) - Internal identifier
     - `name` (text, unique) - Standardized department name
     - `bed_capacity` (integer) - Total bed capacity
     - `avg_wait_time` (numeric) - Average wait time in minutes
     - `staff_count` (integer) - Number of staff members
     - `equipment_count` (integer) - Number of equipment items
     - `created_at` (timestamptz) - Record creation timestamp

  3. `department_flow_logs`
     - `id` (uuid, primary key) - Internal identifier
     - `patient_id` (uuid, foreign key) - Reference to patients table
     - `department_id` (uuid, foreign key) - Reference to departments table
     - `entry_time` (timestamptz) - Time patient entered department
     - `exit_time` (timestamptz) - Time patient exited department
     - `process_type` (text) - Type of process/treatment
     - `created_at` (timestamptz) - Record creation timestamp

  4. `doctors`
     - `id` (uuid, primary key) - Internal identifier
     - `doctor_id` (text, unique) - External doctor identifier from CSV
     - `department_id` (uuid, foreign key) - Reference to departments table
     - `experience_years` (integer) - Years of experience
     - `shift_type` (text) - Day, Night, or Rotating
     - `created_at` (timestamptz) - Record creation timestamp

  5. `readmissions`
     - `id` (uuid, primary key) - Internal identifier
     - `patient_id` (uuid, foreign key) - Reference to patients table
     - `readmission_date` (date) - Date of readmission
     - `days_since_discharge` (integer) - Days between discharge and readmission
     - `reason` (text) - Reason for readmission
     - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - RLS enabled on all tables
  - Policies allow authenticated users to manage data
  - Service role has full access for data ingestion
*/

-- Create departments table first (referenced by others)
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  bed_capacity integer DEFAULT 0,
  avg_wait_time numeric(10, 2) DEFAULT 0,
  staff_count integer DEFAULT 0,
  equipment_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete departments"
  ON departments FOR DELETE
  TO authenticated
  USING (true);

-- Allow anon access for demo purposes
CREATE POLICY "Anon users can read departments"
  ON departments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert departments"
  ON departments FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update departments"
  ON departments FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete departments"
  ON departments FOR DELETE
  TO anon
  USING (true);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id text UNIQUE NOT NULL,
  admission_date date NOT NULL,
  discharge_date date,
  age integer CHECK (age >= 0 AND age <= 150),
  gender text,
  diagnosis text,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  admission_type text CHECK (admission_type IN ('emergency', 'scheduled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete patients"
  ON patients FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon users can read patients"
  ON patients FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert patients"
  ON patients FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update patients"
  ON patients FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete patients"
  ON patients FOR DELETE
  TO anon
  USING (true);

-- Create department flow logs table
CREATE TABLE IF NOT EXISTS department_flow_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  entry_time timestamptz NOT NULL,
  exit_time timestamptz,
  process_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE department_flow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read flow logs"
  ON department_flow_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert flow logs"
  ON department_flow_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update flow logs"
  ON department_flow_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete flow logs"
  ON department_flow_logs FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon users can read flow logs"
  ON department_flow_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert flow logs"
  ON department_flow_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update flow logs"
  ON department_flow_logs FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete flow logs"
  ON department_flow_logs FOR DELETE
  TO anon
  USING (true);

-- Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id text UNIQUE NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  experience_years integer DEFAULT 0 CHECK (experience_years >= 0),
  shift_type text CHECK (shift_type IN ('day', 'night', 'rotating')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read doctors"
  ON doctors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert doctors"
  ON doctors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update doctors"
  ON doctors FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete doctors"
  ON doctors FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon users can read doctors"
  ON doctors FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert doctors"
  ON doctors FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update doctors"
  ON doctors FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete doctors"
  ON doctors FOR DELETE
  TO anon
  USING (true);

-- Create readmissions table
CREATE TABLE IF NOT EXISTS readmissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  readmission_date date NOT NULL,
  days_since_discharge integer DEFAULT 0 CHECK (days_since_discharge >= 0),
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE readmissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read readmissions"
  ON readmissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert readmissions"
  ON readmissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update readmissions"
  ON readmissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete readmissions"
  ON readmissions FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon users can read readmissions"
  ON readmissions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert readmissions"
  ON readmissions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update readmissions"
  ON readmissions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete readmissions"
  ON readmissions FOR DELETE
  TO anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_admission_date ON patients(admission_date);
CREATE INDEX IF NOT EXISTS idx_patients_discharge_date ON patients(discharge_date);
CREATE INDEX IF NOT EXISTS idx_patients_severity ON patients(severity);
CREATE INDEX IF NOT EXISTS idx_patients_admission_type ON patients(admission_type);
CREATE INDEX IF NOT EXISTS idx_flow_logs_patient ON department_flow_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_flow_logs_department ON department_flow_logs(department_id);
CREATE INDEX IF NOT EXISTS idx_flow_logs_entry_time ON department_flow_logs(entry_time);
CREATE INDEX IF NOT EXISTS idx_doctors_department ON doctors(department_id);
CREATE INDEX IF NOT EXISTS idx_readmissions_patient ON readmissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_readmissions_date ON readmissions(readmission_date);
CREATE INDEX IF NOT EXISTS idx_readmissions_days ON readmissions(days_since_discharge);