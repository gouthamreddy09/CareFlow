import type { Patient, DepartmentFlowLog, Doctor, Readmission, Department } from '../types';

const DEPARTMENT_NAME_MAP: Record<string, string> = {
  'er': 'Emergency',
  'emergency room': 'Emergency',
  'emergency dept': 'Emergency',
  'ed': 'Emergency',
  'icu': 'ICU',
  'intensive care': 'ICU',
  'intensive care unit': 'ICU',
  'or': 'Surgery',
  'operating room': 'Surgery',
  'surgical': 'Surgery',
  'cardio': 'Cardiology',
  'cardiac': 'Cardiology',
  'heart': 'Cardiology',
  'neuro': 'Neurology',
  'neurological': 'Neurology',
  'ortho': 'Orthopedics',
  'orthopedic': 'Orthopedics',
  'peds': 'Pediatrics',
  'pediatric': 'Pediatrics',
  'children': 'Pediatrics',
  'onco': 'Oncology',
  'cancer': 'Oncology',
  'radiology': 'Radiology',
  'imaging': 'Radiology',
  'lab': 'Laboratory',
  'laboratory': 'Laboratory',
  'pathology': 'Laboratory',
  'pharmacy': 'Pharmacy',
  'internal medicine': 'Internal Medicine',
  'general medicine': 'Internal Medicine',
  'general': 'General',
  'outpatient': 'Outpatient',
  'inpatient': 'Inpatient',
};

export function standardizeDepartmentName(name: string): string {
  const normalized = name.toLowerCase().trim();
  return DEPARTMENT_NAME_MAP[normalized] ||
    name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
}

export function cleanPatientRecords(
  rows: Record<string, string>[]
): { cleaned: Partial<Patient>[]; errors: string[]; duplicates: number } {
  const errors: string[] = [];
  const seen = new Set<string>();
  const cleaned: Partial<Patient>[] = [];
  let duplicates = 0;

  for (const row of rows) {
    const patientId = row.patient_id?.trim();

    if (!patientId) {
      errors.push('Row missing patient_id');
      continue;
    }

    if (seen.has(patientId)) {
      duplicates++;
      continue;
    }
    seen.add(patientId);

    const admissionDate = parseDate(row.admission_date);
    const dischargeDate = row.discharge_date ? parseDate(row.discharge_date) : null;

    if (!admissionDate) {
      errors.push(`Invalid admission date for patient ${patientId}`);
      continue;
    }

    if (dischargeDate && new Date(dischargeDate) < new Date(admissionDate)) {
      errors.push(`Discharge date before admission for patient ${patientId}`);
      continue;
    }

    const severity = normalizeSeverity(row.severity);
    const admissionType = normalizeAdmissionType(row.admission_type);

    cleaned.push({
      patient_id: patientId,
      admission_date: admissionDate,
      discharge_date: dischargeDate,
      age: parseInt(row.age) || 0,
      gender: normalizeGender(row.gender),
      diagnosis: row.diagnosis?.trim() || 'Unknown',
      severity,
      admission_type: admissionType,
    });
  }

  return { cleaned, errors, duplicates };
}

export function cleanDepartmentFlowLogs(
  rows: Record<string, string>[],
  medianDuration: number = 120
): { cleaned: { patient_id: string; department_name: string; entry_time: string; exit_time: string | null; process_type: string }[]; errors: string[] } {
  const errors: string[] = [];
  const cleaned: { patient_id: string; department_name: string; entry_time: string; exit_time: string | null; process_type: string }[] = [];

  const patientLogs = new Map<string, typeof cleaned>();

  for (const row of rows) {
    const patientId = row.patient_id?.trim();
    const departmentName = standardizeDepartmentName(row.department_name || '');
    const entryTime = parseDateTime(row.entry_time);
    let exitTime = row.exit_time ? parseDateTime(row.exit_time) : null;

    if (!patientId || !departmentName || !entryTime) {
      errors.push(`Invalid flow log entry: missing required fields`);
      continue;
    }

    if (!exitTime) {
      const entryDate = new Date(entryTime);
      entryDate.setMinutes(entryDate.getMinutes() + medianDuration);
      exitTime = entryDate.toISOString();
    }

    if (new Date(exitTime) < new Date(entryTime)) {
      errors.push(`Exit time before entry time for patient ${patientId} in ${departmentName}`);
      continue;
    }

    const log = {
      patient_id: patientId,
      department_name: departmentName,
      entry_time: entryTime,
      exit_time: exitTime,
      process_type: row.process_type?.trim() || 'General',
    };

    if (!patientLogs.has(patientId)) {
      patientLogs.set(patientId, []);
    }
    patientLogs.get(patientId)!.push(log);
  }

  for (const [patientId, logs] of patientLogs) {
    logs.sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());

    let isValid = true;
    for (let i = 1; i < logs.length; i++) {
      const prevExit = logs[i - 1].exit_time ? new Date(logs[i - 1].exit_time!).getTime() : 0;
      const currEntry = new Date(logs[i].entry_time).getTime();

      if (currEntry < prevExit) {
        errors.push(`Overlapping department visits for patient ${patientId}`);
        isValid = false;
        break;
      }
    }

    if (isValid) {
      cleaned.push(...logs);
    }
  }

  return { cleaned, errors };
}

export function cleanDoctorRecords(
  rows: Record<string, string>[]
): { cleaned: { doctor_id: string; department_name: string; experience_years: number; shift_type: 'day' | 'night' | 'rotating' }[]; errors: string[] } {
  const errors: string[] = [];
  const seen = new Set<string>();
  const cleaned: { doctor_id: string; department_name: string; experience_years: number; shift_type: 'day' | 'night' | 'rotating' }[] = [];

  for (const row of rows) {
    const doctorId = row.doctor_id?.trim();

    if (!doctorId) {
      errors.push('Row missing doctor_id');
      continue;
    }

    if (seen.has(doctorId)) {
      continue;
    }
    seen.add(doctorId);

    cleaned.push({
      doctor_id: doctorId,
      department_name: standardizeDepartmentName(row.department_name || 'General'),
      experience_years: Math.max(0, parseInt(row.experience_years) || 0),
      shift_type: normalizeShiftType(row.shift_type),
    });
  }

  return { cleaned, errors };
}

export function cleanReadmissions(
  rows: Record<string, string>[]
): { cleaned: Partial<Readmission & { original_patient_id: string }>[]; errors: string[] } {
  const errors: string[] = [];
  const cleaned: Partial<Readmission & { original_patient_id: string }>[] = [];

  for (const row of rows) {
    const patientId = row.patient_id?.trim();
    const readmissionDate = parseDate(row.readmission_date);

    if (!patientId || !readmissionDate) {
      errors.push('Invalid readmission entry: missing required fields');
      continue;
    }

    cleaned.push({
      original_patient_id: patientId,
      readmission_date: readmissionDate,
      days_since_discharge: Math.max(0, parseInt(row.days_since_discharge) || 0),
      reason: row.reason?.trim() || 'Unknown',
    });
  }

  return { cleaned, errors };
}

export function cleanDepartmentResources(
  rows: Record<string, string>[]
): { cleaned: Partial<Department>[]; errors: string[] } {
  const errors: string[] = [];
  const departmentMap = new Map<string, Partial<Department>>();

  for (const row of rows) {
    const name = standardizeDepartmentName(row.department_name || '');

    if (!name) {
      errors.push('Row missing department_name');
      continue;
    }

    departmentMap.set(name, {
      name,
      bed_capacity: Math.max(0, parseInt(row.bed_capacity) || 0),
      avg_wait_time: Math.max(0, parseFloat(row.avg_wait_time) || 0),
      staff_count: Math.max(0, parseInt(row.staff_count) || 0),
      equipment_count: Math.max(0, parseInt(row.equipment_count) || 0),
    });
  }

  return { cleaned: Array.from(departmentMap.values()), errors };
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year: string, month: string, day: string;

      if (format === formats[0]) {
        [, year, month, day] = match;
      } else {
        [, month, day, year] = match;
      }

      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

function parseDateTime(dateTimeStr: string): string | null {
  if (!dateTimeStr) return null;

  const parsed = new Date(dateTimeStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
}

function normalizeSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
  const normalized = severity?.toLowerCase().trim();
  if (['low', 'mild', '1', 'minor'].includes(normalized)) return 'low';
  if (['medium', 'moderate', '2'].includes(normalized)) return 'medium';
  if (['high', 'severe', '3', 'serious'].includes(normalized)) return 'high';
  if (['critical', 'emergency', '4', 'life-threatening'].includes(normalized)) return 'critical';
  return 'medium';
}

function normalizeAdmissionType(type: string): 'emergency' | 'scheduled' {
  const normalized = type?.toLowerCase().trim();
  if (['emergency', 'urgent', 'unplanned', 'er'].includes(normalized)) return 'emergency';
  return 'scheduled';
}

function normalizeGender(gender: string): string {
  const normalized = gender?.toLowerCase().trim();
  if (['m', 'male', 'man'].includes(normalized)) return 'Male';
  if (['f', 'female', 'woman'].includes(normalized)) return 'Female';
  if (['other', 'non-binary', 'nb'].includes(normalized)) return 'Other';
  return 'Unknown';
}

function normalizeShiftType(shift: string): 'day' | 'night' | 'rotating' {
  const normalized = shift?.toLowerCase().trim();
  if (['day', 'morning', 'am'].includes(normalized)) return 'day';
  if (['night', 'evening', 'pm'].includes(normalized)) return 'night';
  return 'rotating';
}
