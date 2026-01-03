import { supabase } from '../lib/supabase';
import type { GlobalFilters, DashboardMetrics, AdmissionTrend, DepartmentStats } from '../types';

export async function getExecutiveMetrics(filters?: GlobalFilters): Promise<DashboardMetrics> {
  let patientQuery = supabase.from('patients').select('*');
  let readmissionQuery = supabase.from('readmissions').select('*');

  if (filters?.dateRange) {
    patientQuery = patientQuery
      .gte('admission_date', filters.dateRange.start)
      .lte('admission_date', filters.dateRange.end);
    readmissionQuery = readmissionQuery
      .gte('readmission_date', filters.dateRange.start)
      .lte('readmission_date', filters.dateRange.end);
  }

  if (filters?.severity) {
    patientQuery = patientQuery.eq('severity', filters.severity);
  }

  if (filters?.department) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id')
      .eq('name', filters.department)
      .maybeSingle();

    if (dept) {
      const { data: flowLogs } = await supabase
        .from('department_flow_logs')
        .select('patient_id')
        .eq('department_id', dept.id);

      if (flowLogs && flowLogs.length > 0) {
        const patientIds = [...new Set(flowLogs.map(log => log.patient_id))];
        patientQuery = patientQuery.in('id', patientIds);
        readmissionQuery = readmissionQuery.in('patient_id', patientIds);
      } else {
        patientQuery = patientQuery.in('id', []);
        readmissionQuery = readmissionQuery.in('patient_id', []);
      }
    }
  }

  if (filters?.readmissionsOnly) {
    const { data: readmissionData } = await supabase
      .from('readmissions')
      .select('patient_id');

    if (readmissionData && readmissionData.length > 0) {
      const readmittedPatientIds = [...new Set(readmissionData.map(r => r.patient_id))];
      patientQuery = patientQuery.in('id', readmittedPatientIds);
    } else {
      patientQuery = patientQuery.in('id', []);
    }
  }

  let departmentsQuery = supabase.from('departments').select('*');

  if (filters?.department) {
    departmentsQuery = departmentsQuery.eq('name', filters.department);
  }

  const [patientsResult, readmissionsResult, departmentsResult] = await Promise.all([
    patientQuery,
    readmissionQuery,
    departmentsQuery,
  ]);

  const patients = patientsResult.data || [];
  const readmissions = readmissionsResult.data || [];
  const departments = departmentsResult.data || [];

  const totalAdmissions = patients.length;

  let totalLOS = 0;
  let losCount = 0;
  for (const patient of patients) {
    if (patient.admission_date && patient.discharge_date) {
      const admission = new Date(patient.admission_date);
      const discharge = new Date(patient.discharge_date);
      const days = Math.ceil((discharge.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0) {
        totalLOS += days;
        losCount++;
      }
    }
  }
  const averageLOS = losCount > 0 ? totalLOS / losCount : 0;

  const thirtyDayReadmissions = readmissions.filter(r => r.days_since_discharge <= 30).length;
  const dischargedPatients = patients.filter(p => p.discharge_date).length;
  const readmissionRate = dischargedPatients > 0 ? (thirtyDayReadmissions / dischargedPatients) * 100 : 0;

  const totalBedCapacity = departments.reduce((sum, d) => sum + (d.bed_capacity || 0), 0);
  const currentPatients = patients.filter(p => !p.discharge_date).length;
  const bedUtilization = totalBedCapacity > 0 ? (currentPatients / totalBedCapacity) * 100 : 0;

  return {
    totalAdmissions,
    averageLOS: Math.round(averageLOS * 10) / 10,
    readmissionRate: Math.round(readmissionRate * 10) / 10,
    bedUtilization: Math.min(100, Math.round(bedUtilization * 10) / 10),
  };
}

export async function getAdmissionTrends(
  filters?: GlobalFilters,
  groupBy: 'week' | 'month' = 'month'
): Promise<AdmissionTrend[]> {
  let query = supabase.from('patients').select('admission_date, admission_type, id');

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
      .maybeSingle();

    if (dept) {
      const { data: flowLogs } = await supabase
        .from('department_flow_logs')
        .select('patient_id')
        .eq('department_id', dept.id);

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

  if (filters?.readmissionsOnly) {
    const { data: readmissionData } = await supabase
      .from('readmissions')
      .select('patient_id');

    if (readmissionData && readmissionData.length > 0) {
      const readmittedPatientIds = [...new Set(readmissionData.map(r => r.patient_id))];
      query = query.in('id', readmittedPatientIds);
    } else {
      return [];
    }
  }

  const { data: patients } = await query;

  if (!patients || patients.length === 0) {
    return [];
  }

  const groupedData = new Map<string, { emergency: number; scheduled: number }>();

  for (const patient of patients) {
    const date = new Date(patient.admission_date);
    let periodKey: string;

    if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      periodKey = weekStart.toISOString().split('T')[0];
    } else {
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!groupedData.has(periodKey)) {
      groupedData.set(periodKey, { emergency: 0, scheduled: 0 });
    }

    const group = groupedData.get(periodKey)!;
    if (patient.admission_type === 'emergency') {
      group.emergency++;
    } else {
      group.scheduled++;
    }
  }

  const trends: AdmissionTrend[] = Array.from(groupedData.entries())
    .map(([period, data]) => ({
      period,
      emergency: data.emergency,
      scheduled: data.scheduled,
      total: data.emergency + data.scheduled,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return trends;
}

export async function getDepartmentStats(filters?: GlobalFilters): Promise<DepartmentStats[]> {
  const { data: departments } = await supabase.from('departments').select('*');

  if (!departments || departments.length === 0) {
    return [];
  }

  let flowQuery = supabase.from('department_flow_logs').select('*');

  if (filters?.dateRange) {
    flowQuery = flowQuery
      .gte('entry_time', filters.dateRange.start)
      .lte('entry_time', filters.dateRange.end + 'T23:59:59');
  }

  if (filters?.severity) {
    const { data: severityPatients } = await supabase
      .from('patients')
      .select('id')
      .eq('severity', filters.severity);

    if (severityPatients && severityPatients.length > 0) {
      const severityPatientIds = severityPatients.map(p => p.id);
      flowQuery = flowQuery.in('patient_id', severityPatientIds);
    } else {
      return [];
    }
  }

  if (filters?.readmissionsOnly) {
    const { data: readmissionData } = await supabase
      .from('readmissions')
      .select('patient_id');

    if (readmissionData && readmissionData.length > 0) {
      const readmittedPatientIds = [...new Set(readmissionData.map(r => r.patient_id))];
      flowQuery = flowQuery.in('patient_id', readmittedPatientIds);
    } else {
      return [];
    }
  }

  const { data: flowLogs } = await flowQuery;

  const departmentMap = new Map(departments.map(d => [d.id, d]));
  const stats = new Map<string, { name: string; patientsHandled: number; totalTime: number; visits: number; bedCapacity: number }>();

  for (const dept of departments) {
    stats.set(dept.id, {
      name: dept.name,
      patientsHandled: 0,
      totalTime: 0,
      visits: 0,
      bedCapacity: dept.bed_capacity || 0,
    });
  }

  const patientsByDept = new Map<string, Set<string>>();

  if (flowLogs) {
    for (const log of flowLogs) {
      const deptId = log.department_id;
      if (!deptId || !stats.has(deptId)) continue;

      if (!patientsByDept.has(deptId)) {
        patientsByDept.set(deptId, new Set());
      }
      patientsByDept.get(deptId)!.add(log.patient_id);

      if (log.entry_time && log.exit_time) {
        const entry = new Date(log.entry_time);
        const exit = new Date(log.exit_time);
        const minutes = (exit.getTime() - entry.getTime()) / (1000 * 60);
        if (minutes > 0) {
          stats.get(deptId)!.totalTime += minutes;
          stats.get(deptId)!.visits++;
        }
      }
    }
  }

  for (const [deptId, patients] of patientsByDept) {
    if (stats.has(deptId)) {
      stats.get(deptId)!.patientsHandled = patients.size;
    }
  }

  const result: DepartmentStats[] = Array.from(stats.values()).map(stat => {
    const avgProcessingTime = stat.visits > 0
      ? Math.round(stat.totalTime / stat.visits)
      : 0;

    const bedUtilization = stat.bedCapacity > 0
      ? Math.min(100, Math.round((stat.patientsHandled / stat.bedCapacity) * 10) / 10)
      : 0;

    return {
      name: stat.name,
      patientsHandled: stat.patientsHandled,
      avgProcessingTime,
      bedUtilization,
    };
  });

  if (filters?.department) {
    return result.filter(r => r.name === filters.department);
  }

  return result.sort((a, b) => b.patientsHandled - a.patientsHandled);
}

export async function getTotalUniquePatients(filters?: GlobalFilters): Promise<number> {
  let flowQuery = supabase.from('department_flow_logs').select('patient_id');

  if (filters?.dateRange) {
    flowQuery = flowQuery
      .gte('entry_time', filters.dateRange.start)
      .lte('entry_time', filters.dateRange.end + 'T23:59:59');
  }

  if (filters?.department) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id')
      .eq('name', filters.department)
      .maybeSingle();

    if (dept) {
      flowQuery = flowQuery.eq('department_id', dept.id);
    } else {
      return 0;
    }
  }

  if (filters?.severity) {
    const { data: severityPatients } = await supabase
      .from('patients')
      .select('id')
      .eq('severity', filters.severity);

    if (severityPatients && severityPatients.length > 0) {
      const severityPatientIds = severityPatients.map(p => p.id);
      flowQuery = flowQuery.in('patient_id', severityPatientIds);
    } else {
      return 0;
    }
  }

  if (filters?.readmissionsOnly) {
    const { data: readmissionData } = await supabase
      .from('readmissions')
      .select('patient_id');

    if (readmissionData && readmissionData.length > 0) {
      const readmittedPatientIds = [...new Set(readmissionData.map(r => r.patient_id))];
      flowQuery = flowQuery.in('patient_id', readmittedPatientIds);
    } else {
      return 0;
    }
  }

  const { data: flowLogs } = await flowQuery;

  if (!flowLogs || flowLogs.length === 0) {
    return 0;
  }

  const uniquePatients = new Set(flowLogs.map(log => log.patient_id));
  return uniquePatients.size;
}
