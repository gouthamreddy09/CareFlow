export interface Patient {
  id?: string;
  patient_id: string;
  admission_date: string;
  discharge_date: string | null;
  age: number;
  gender: string;
  diagnosis: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  admission_type: 'emergency' | 'scheduled';
  created_at?: string;
}

export interface JourneyStep {
  departmentId: string;
  department: string;
  entryTime: string;
  exitTime?: string;
  waitTimeMinutes: number;
  processType: string;
}

export interface PatientRecord {
  id: string;
  patientId: string;
  admissionDate: string | null;
  dischargeDate: string | null;
  age: number;
  gender: string;
  diagnosis: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  admissionType: 'emergency' | 'scheduled';
  currentDepartment: string | null;
  journeySteps?: JourneyStep[];
}

export interface Department {
  id?: string;
  name: string;
  bed_capacity: number;
  avg_wait_time: number;
  staff_count: number;
  equipment_count: number;
  created_at?: string;
}

export interface DepartmentFlowLog {
  id?: string;
  patient_id: string;
  department_id: string;
  entry_time: string;
  exit_time: string | null;
  process_type: string;
  created_at?: string;
}

export interface Doctor {
  id?: string;
  doctor_id: string;
  department_id: string | null;
  experience_years: number;
  shift_type: 'day' | 'night' | 'rotating';
  created_at?: string;
}

export interface Readmission {
  id?: string;
  patient_id: string;
  readmission_date: string;
  days_since_discharge: number;
  reason: string;
  created_at?: string;
}

export interface GlobalFilters {
  dateRange: { start: string; end: string } | null;
  department: string | null;
  severity: string | null;
  readmissionsOnly: boolean;
}

export interface DashboardMetrics {
  totalAdmissions: number;
  averageLOS: number;
  readmissionRate: number;
  bedUtilization: number;
}

export interface AdmissionTrend {
  period: string;
  emergency: number;
  scheduled: number;
  total: number;
}

export interface DepartmentStats {
  name: string;
  patientsHandled: number;
  avgProcessingTime: number;
  bedUtilization: number;
}

export type DatasetType = 'patients' | 'departments' | 'flowLogs' | 'doctors' | 'readmissions';

export interface UploadStatus {
  type: DatasetType;
  status: 'pending' | 'validating' | 'cleaning' | 'uploading' | 'success' | 'error';
  message: string;
  recordCount: number;
  cleanedCount: number;
  errors: string[];
}
