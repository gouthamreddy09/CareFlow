import { supabase } from '../lib/supabase';
import type { Patient, Department, DepartmentFlowLog, Doctor, Readmission, GlobalFilters, PatientRecord, JourneyStep } from '../types';
import { getWorkspaceId } from '../utils/workspace';

export async function uploadPatients(patients: Partial<Patient>[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (patients.length === 0) return { success: true, count: 0 };

  const workspaceId = getWorkspaceId();
  const patientsWithWorkspace = patients.map(p => ({ ...p, workspace_id: workspaceId }));

  const { data, error } = await supabase
    .from('patients')
    .upsert(patientsWithWorkspace, { onConflict: 'patient_id,workspace_id' })
    .select();

  if (error) {
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: data?.length || 0 };
}

export async function uploadDepartments(departments: Partial<Department>[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (departments.length === 0) return { success: true, count: 0 };

  const workspaceId = getWorkspaceId();
  const departmentsWithWorkspace = departments.map(d => ({ ...d, workspace_id: workspaceId }));

  const { data, error } = await supabase
    .from('departments')
    .upsert(departmentsWithWorkspace, { onConflict: 'name,workspace_id' })
    .select();

  if (error) {
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: data?.length || 0 };
}

export async function uploadDepartmentFlowLogs(
  logs: { patient_id: string; department_name: string; entry_time: string; exit_time: string | null; process_type: string }[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (logs.length === 0) return { success: true, count: 0 };

  const workspaceId = getWorkspaceId();
  const { data: patients } = await supabase.from('patients').select('id, patient_id').eq('workspace_id', workspaceId);
  const { data: departments } = await supabase.from('departments').select('id, name').eq('workspace_id', workspaceId);

  const patientMap = new Map(patients?.map(p => [p.patient_id, p.id]) || []);
  const departmentMap = new Map(departments?.map(d => [d.name, d.id]) || []);

  const logsWithIds = logs
    .filter(log => patientMap.has(log.patient_id) && departmentMap.has(log.department_name))
    .map(log => ({
      patient_id: patientMap.get(log.patient_id),
      department_id: departmentMap.get(log.department_name),
      entry_time: log.entry_time,
      exit_time: log.exit_time,
      process_type: log.process_type,
      workspace_id: workspaceId,
    }));

  if (logsWithIds.length === 0) {
    return { success: true, count: 0, error: 'No matching patients or departments found' };
  }

  const { data, error } = await supabase
    .from('department_flow_logs')
    .insert(logsWithIds)
    .select();

  if (error) {
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: data?.length || 0 };
}

export async function uploadDoctors(
  doctors: { doctor_id: string; department_name: string; experience_years: number; shift_type: 'day' | 'night' | 'rotating' }[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (doctors.length === 0) return { success: true, count: 0 };

  const workspaceId = getWorkspaceId();
  const { data: departments } = await supabase.from('departments').select('id, name').eq('workspace_id', workspaceId);
  const departmentMap = new Map(departments?.map(d => [d.name, d.id]) || []);

  const doctorsWithIds = doctors.map(doc => ({
    doctor_id: doc.doctor_id,
    department_id: departmentMap.get(doc.department_name) || null,
    experience_years: doc.experience_years,
    shift_type: doc.shift_type,
    workspace_id: workspaceId,
  }));

  const { data, error } = await supabase
    .from('doctors')
    .upsert(doctorsWithIds, { onConflict: 'doctor_id,workspace_id' })
    .select();

  if (error) {
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: data?.length || 0 };
}

export async function uploadReadmissions(
  readmissions: { original_patient_id: string; readmission_date: string; days_since_discharge: number; reason: string }[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (readmissions.length === 0) return { success: true, count: 0 };

  const workspaceId = getWorkspaceId();
  const { data: patients } = await supabase.from('patients').select('id, patient_id').eq('workspace_id', workspaceId);
  const patientMap = new Map(patients?.map(p => [p.patient_id, p.id]) || []);

  const readmissionsWithIds = readmissions
    .filter(r => patientMap.has(r.original_patient_id))
    .map(r => ({
      patient_id: patientMap.get(r.original_patient_id),
      readmission_date: r.readmission_date,
      days_since_discharge: r.days_since_discharge,
      reason: r.reason,
      workspace_id: workspaceId,
    }));

  if (readmissionsWithIds.length === 0) {
    return { success: true, count: 0, error: 'No matching patients found' };
  }

  const { data, error } = await supabase
    .from('readmissions')
    .insert(readmissionsWithIds)
    .select();

  if (error) {
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: data?.length || 0 };
}

export async function getDepartments(): Promise<Department[]> {
  const workspaceId = getWorkspaceId();
  const { data, error } = await supabase.from('departments').select('*').eq('workspace_id', workspaceId).order('name');
  if (error) throw error;
  return data || [];
}

export async function getPatients(filters?: GlobalFilters): Promise<Patient[]> {
  const workspaceId = getWorkspaceId();
  let query = supabase.from('patients').select('*').eq('workspace_id', workspaceId);

  if (filters?.dateRange) {
    query = query
      .gte('admission_date', filters.dateRange.start)
      .lte('admission_date', filters.dateRange.end);
  }

  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }

  if (filters?.department) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id')
      .eq('name', filters.department)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (dept) {
      const { data: flowLogs } = await supabase
        .from('department_flow_logs')
        .select('patient_id')
        .eq('department_id', dept.id)
        .eq('workspace_id', workspaceId);

      if (flowLogs && flowLogs.length > 0) {
        const patientIds = [...new Set(flowLogs.map(log => log.patient_id))];
        query = query.in('id', patientIds);
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  const { data, error } = await query.order('admission_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPatientRecords(): Promise<PatientRecord[]> {
  const workspaceId = getWorkspaceId();

  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('admission_date', { ascending: false });

  if (patientsError) throw patientsError;
  if (!patients || patients.length === 0) return [];

  const { data: flowLogs, error: flowError } = await supabase
    .from('department_flow_logs')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (flowError) throw flowError;

  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('id, name')
    .eq('workspace_id', workspaceId);

  if (deptError) throw deptError;

  const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);

  const patientRecords: PatientRecord[] = patients.map(patient => {
    const patientLogs = flowLogs?.filter(log => log.patient_id === patient.id) || [];

    const journeySteps: JourneyStep[] = patientLogs
      .sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime())
      .map(log => {
        const entryTime = new Date(log.entry_time);
        const exitTime = log.exit_time ? new Date(log.exit_time) : new Date();
        const waitTimeMinutes = (exitTime.getTime() - entryTime.getTime()) / (1000 * 60);

        return {
          departmentId: log.department_id,
          department: deptMap.get(log.department_id) || 'Unknown',
          entryTime: log.entry_time,
          exitTime: log.exit_time || undefined,
          waitTimeMinutes: Math.round(waitTimeMinutes),
          processType: log.process_type
        };
      });

    const currentLog = patientLogs.find(log => !log.exit_time);
    const currentDepartment = currentLog ? deptMap.get(currentLog.department_id) : null;

    return {
      id: patient.id!,
      patientId: patient.patient_id,
      admissionDate: patient.admission_date,
      dischargeDate: patient.discharge_date,
      age: patient.age,
      gender: patient.gender,
      diagnosis: patient.diagnosis,
      severity: patient.severity,
      admissionType: patient.admission_type,
      currentDepartment: currentDepartment || null,
      journeySteps: journeySteps.length > 0 ? journeySteps : undefined
    };
  });

  return patientRecords;
}

export async function getReadmissions(filters?: GlobalFilters): Promise<Readmission[]> {
  const workspaceId = getWorkspaceId();
  let query = supabase.from('readmissions').select('*').eq('workspace_id', workspaceId);

  if (filters?.dateRange) {
    query = query
      .gte('readmission_date', filters.dateRange.start)
      .lte('readmission_date', filters.dateRange.end);
  }

  if (filters?.department) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id')
      .eq('name', filters.department)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (dept) {
      const { data: flowLogs } = await supabase
        .from('department_flow_logs')
        .select('patient_id')
        .eq('department_id', dept.id)
        .eq('workspace_id', workspaceId);

      if (flowLogs && flowLogs.length > 0) {
        const patientIds = [...new Set(flowLogs.map(log => log.patient_id))];
        query = query.in('patient_id', patientIds);
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getDepartmentFlowLogs(filters?: GlobalFilters): Promise<(DepartmentFlowLog & { department_name?: string })[]> {
  const workspaceId = getWorkspaceId();
  let query = supabase
    .from('department_flow_logs')
    .select(`
      *,
      departments:department_id (name)
    `)
    .eq('workspace_id', workspaceId);

  if (filters?.dateRange) {
    query = query
      .gte('entry_time', filters.dateRange.start)
      .lte('entry_time', filters.dateRange.end + 'T23:59:59');
  }

  if (filters?.department) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id')
      .eq('name', filters.department)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (dept) {
      query = query.eq('department_id', dept.id);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(log => ({
    ...log,
    department_name: (log.departments as { name: string } | null)?.name,
  }));
}

export async function clearAllData(): Promise<void> {
  const workspaceId = getWorkspaceId();
  await supabase.from('readmissions').delete().eq('workspace_id', workspaceId);
  await supabase.from('department_flow_logs').delete().eq('workspace_id', workspaceId);
  await supabase.from('doctors').delete().eq('workspace_id', workspaceId);
  await supabase.from('patients').delete().eq('workspace_id', workspaceId);
  await supabase.from('departments').delete().eq('workspace_id', workspaceId);
}

export async function getDataCounts(): Promise<{
  patients: number;
  departments: number;
  flowLogs: number;
  doctors: number;
  readmissions: number;
}> {
  const workspaceId = getWorkspaceId();
  const [patients, departments, flowLogs, doctors, readmissions] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('departments').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('department_flow_logs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('readmissions').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
  ]);

  return {
    patients: patients.count || 0,
    departments: departments.count || 0,
    flowLogs: flowLogs.count || 0,
    doctors: doctors.count || 0,
    readmissions: readmissions.count || 0,
  };
}
