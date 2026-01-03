import { supabase } from '../lib/supabase';
import type { GlobalFilters } from '../types';
import type {
  PatientJourney,
  DepartmentDelay,
  PatientFlowPath,
  FlowInsight,
  DepartmentTimeContribution,
} from '../types/flow';

const DEPARTMENT_CATEGORIES: Record<string, 'Emergency' | 'Diagnostics' | 'Treatment' | 'Recovery' | 'Discharge'> = {
  'Emergency': 'Emergency',
  'ER': 'Emergency',
  'Trauma': 'Emergency',
  'ICU': 'Treatment',
  'Surgery': 'Treatment',
  'Operating Room': 'Treatment',
  'Cardiology': 'Treatment',
  'Neurology': 'Treatment',
  'Oncology': 'Treatment',
  'Orthopedics': 'Treatment',
  'Orthopedic Surgery': 'Treatment',
  'Pediatrics': 'Treatment',
  'Internal Medicine': 'Treatment',
  'Pulmonology': 'Treatment',
  'Rheumatology': 'Treatment',
  'Nephrology': 'Treatment',
  'Psychiatry': 'Treatment',
  'Urology': 'Treatment',
  'Gastroenterology': 'Treatment',
  'Dermatology': 'Treatment',
  'Cardiothoracic Surgery': 'Treatment',
  'Neurosurgery': 'Treatment',
  'Ent': 'Treatment',
  'Gynecology': 'Treatment',
  'Obstetrics': 'Treatment',
  'Ophthalmology': 'Treatment',
  'Burn Unit': 'Treatment',
  'Infectious Diseases': 'Treatment',
  'Dialysis': 'Treatment',
  'Radiology': 'Diagnostics',
  'Laboratory': 'Diagnostics',
  'Imaging': 'Diagnostics',
  'Pathology': 'Diagnostics',
  'Recovery': 'Recovery',
  'Post-Op': 'Recovery',
  'Rehabilitation': 'Recovery',
  'Discharge': 'Discharge',
  'Discharge Planning': 'Discharge',
  'Pharmacy': 'Discharge',
  'General': 'Treatment',
  'Inpatient': 'Treatment',
  'Outpatient': 'Treatment',
};

export function categorizeDepartment(deptName: string): 'Emergency' | 'Diagnostics' | 'Treatment' | 'Recovery' | 'Discharge' {
  return DEPARTMENT_CATEGORIES[deptName] || 'Treatment';
}

export const CATEGORY_COLORS: Record<string, string> = {
  Emergency: '#EF4444',
  Diagnostics: '#3B82F6',
  Treatment: '#10B981',
  Recovery: '#F59E0B',
  Discharge: '#8B5CF6',
};

export async function getPatientJourneys(filters?: GlobalFilters): Promise<PatientJourney[]> {
  let query = supabase
    .from('department_flow_logs')
    .select(`
      *,
      patients!inner(patient_id, admission_date, discharge_date),
      departments(name)
    `);

  if (filters?.dateRange) {
    query = query
      .gte('entry_time', filters.dateRange.start)
      .lte('entry_time', filters.dateRange.end + 'T23:59:59');
  }

  if (filters?.severity) {
    query = query.eq('patients.severity', filters.severity);
  }

  if (filters?.readmissionsOnly) {
    const { data: readmissionData } = await supabase
      .from('readmissions')
      .select('patient_id');

    if (readmissionData && readmissionData.length > 0) {
      const readmittedPatientIds = [...new Set(readmissionData.map(r => r.patient_id))];
      query = query.in('patient_id', readmittedPatientIds);
    } else {
      return [];
    }
  }

  const { data: flowLogs } = await query;

  if (!flowLogs || flowLogs.length === 0) {
    return [];
  }

  const journeyMap = new Map<string, PatientJourney>();

  for (const log of flowLogs) {
    const patientId = (log.patients as any)?.patient_id;
    const deptName = (log.departments as any)?.name || 'Unknown';

    if (!patientId || !log.entry_time || !log.exit_time) continue;

    if (filters?.department && deptName !== filters.department) continue;

    const entry = new Date(log.entry_time);
    const exit = new Date(log.exit_time);
    const duration = (exit.getTime() - entry.getTime()) / (1000 * 60);

    if (duration < 0) continue;

    if (!journeyMap.has(patientId)) {
      journeyMap.set(patientId, {
        patientId,
        totalDuration: 0,
        stages: [],
      });
    }

    const journey = journeyMap.get(patientId)!;
    journey.stages.push({
      department: deptName,
      category: categorizeDepartment(deptName),
      entryTime: log.entry_time,
      exitTime: log.exit_time,
      duration,
    });
  }

  for (const journey of journeyMap.values()) {
    journey.stages.sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
    journey.totalDuration = journey.stages.reduce((sum, stage) => sum + stage.duration, 0);
  }

  return Array.from(journeyMap.values());
}

export async function getDepartmentDelays(filters?: GlobalFilters): Promise<DepartmentDelay[]> {
  const journeys = await getPatientJourneys(filters);

  if (journeys.length === 0) {
    return [];
  }

  const deptStats = new Map<string, {
    times: number[];
    category: string;
    totalImpact: number;
    patientCount: number;
  }>();

  for (const journey of journeys) {
    for (const stage of journey.stages) {
      if (!deptStats.has(stage.department)) {
        deptStats.set(stage.department, {
          times: [],
          category: stage.category,
          totalImpact: 0,
          patientCount: 0,
        });
      }

      const stats = deptStats.get(stage.department)!;
      stats.times.push(stage.duration);
      stats.totalImpact += stage.duration;
      stats.patientCount++;
    }
  }

  const delays: DepartmentDelay[] = [];

  for (const [deptName, stats] of deptStats) {
    const sortedTimes = [...stats.times].sort((a, b) => a - b);
    const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)] || 0;
    const actualAvgTime = stats.times.reduce((a, b) => a + b, 0) / stats.times.length;

    const variance = stats.times.reduce((sum, t) => sum + Math.pow(t - actualAvgTime, 2), 0) / stats.times.length;
    const delayRatio = medianTime > 0 ? actualAvgTime / medianTime : 1;

    const totalFlowTime = journeys.reduce((sum, j) => sum + j.totalDuration, 0);
    const impactOnLOS = totalFlowTime > 0 ? (stats.totalImpact / totalFlowTime) * 100 : 0;

    const queueBuildup = variance > actualAvgTime * 0.5 ? variance / actualAvgTime : 0;

    delays.push({
      departmentName: deptName,
      category: stats.category,
      medianTime: Math.round(medianTime),
      actualAvgTime: Math.round(actualAvgTime),
      delayRatio: Math.round(delayRatio * 100) / 100,
      variance: Math.round(variance),
      queueBuildup: Math.round(queueBuildup * 100) / 100,
      impactOnLOS: Math.round(impactOnLOS * 10) / 10,
      patientCount: stats.patientCount,
    });
  }

  return delays.sort((a, b) => b.delayRatio - a.delayRatio);
}

export async function getPatientFlowPaths(filters?: GlobalFilters): Promise<PatientFlowPath[]> {
  const filtersWithoutDept = filters ? { ...filters, department: undefined } : undefined;
  const journeys = await getPatientJourneys(filtersWithoutDept);

  const pathMap = new Map<string, { count: number; totalDuration: number }>();

  for (const journey of journeys) {
    for (let i = 0; i < journey.stages.length - 1; i++) {
      const from = journey.stages[i].department;
      const to = journey.stages[i + 1].department;

      if (filters?.department && from !== filters.department && to !== filters.department) {
        continue;
      }

      const key = `${from}→${to}`;

      if (!pathMap.has(key)) {
        pathMap.set(key, { count: 0, totalDuration: 0 });
      }

      const path = pathMap.get(key)!;
      path.count++;
      path.totalDuration += journey.stages[i + 1].duration;
    }
  }

  const paths: PatientFlowPath[] = [];
  for (const [key, data] of pathMap) {
    const [from, to] = key.split('→');
    paths.push({
      from,
      to,
      count: data.count,
      avgDuration: Math.round(data.totalDuration / data.count),
    });
  }

  return paths.sort((a, b) => b.count - a.count);
}

export async function getDepartmentTimeContributions(filters?: GlobalFilters): Promise<DepartmentTimeContribution[]> {
  const journeys = await getPatientJourneys(filters);

  if (journeys.length === 0) {
    return [];
  }

  const deptTimes = new Map<string, { totalTime: number; patientCount: number }>();
  let grandTotal = 0;

  for (const journey of journeys) {
    for (const stage of journey.stages) {
      if (!deptTimes.has(stage.department)) {
        deptTimes.set(stage.department, { totalTime: 0, patientCount: 0 });
      }

      const stats = deptTimes.get(stage.department)!;
      stats.totalTime += stage.duration;
      stats.patientCount++;
      grandTotal += stage.duration;
    }
  }

  const contributions: DepartmentTimeContribution[] = [];

  for (const [dept, stats] of deptTimes) {
    contributions.push({
      department: dept,
      avgTime: Math.round(stats.totalTime / stats.patientCount),
      percentage: Math.round((stats.totalTime / grandTotal) * 1000) / 10,
      patientCount: stats.patientCount,
    });
  }

  return contributions.sort((a, b) => b.percentage - a.percentage);
}

export async function generateFlowInsights(filters?: GlobalFilters): Promise<FlowInsight[]> {
  const [delays, contributions, journeys] = await Promise.all([
    getDepartmentDelays(filters),
    getDepartmentTimeContributions(filters),
    getPatientJourneys(filters),
  ]);

  const insights: FlowInsight[] = [];

  for (const delay of delays) {
    if (delay.delayRatio > 1.5 && delay.patientCount >= 5) {
      const contrib = contributions.find(c => c.department === delay.departmentName);
      insights.push({
        type: 'delay',
        severity: delay.delayRatio > 2 ? 'high' : 'medium',
        title: `${delay.departmentName} Processing Delays`,
        description: `${delay.departmentName} takes ${Math.round((delay.delayRatio - 1) * 100)}% longer than median (${delay.medianTime} min). Average processing time: ${delay.actualAvgTime} min.`,
        department: delay.departmentName,
        metric: delay.delayRatio,
      });

      if (contrib && contrib.percentage < 15 && delay.impactOnLOS > 10) {
        insights.push({
          type: 'impact',
          severity: 'high',
          title: `Disproportionate ${delay.departmentName} Impact`,
          description: `${delay.departmentName} delays increase total LOS by ${delay.impactOnLOS}% despite handling only ${contrib.percentage}% of patient flow.`,
          department: delay.departmentName,
          metric: delay.impactOnLOS,
        });
      }
    }

    if (delay.variance > delay.actualAvgTime * 0.8 && delay.patientCount >= 5) {
      insights.push({
        type: 'variance',
        severity: delay.variance > delay.actualAvgTime * 1.5 ? 'high' : 'medium',
        title: `High Variance in ${delay.departmentName}`,
        description: `Processing time variance in ${delay.departmentName} is abnormally high (${delay.variance} min²), indicating inconsistent patient handling.`,
        department: delay.departmentName,
        metric: delay.variance,
      });
    }

    if (delay.queueBuildup > 1.2 && delay.patientCount >= 5) {
      insights.push({
        type: 'bottleneck',
        severity: delay.queueBuildup > 1.5 ? 'high' : 'medium',
        title: `Queue Buildup in ${delay.departmentName}`,
        description: `${delay.departmentName} shows signs of queue buildup with high processing variance (queue indicator: ${delay.queueBuildup}).`,
        department: delay.departmentName,
        metric: delay.queueBuildup,
      });
    }
  }

  const avgJourneyDuration = journeys.reduce((sum, j) => sum + j.totalDuration, 0) / journeys.length;
  const longJourneys = journeys.filter(j => j.totalDuration > avgJourneyDuration * 1.5);

  if (longJourneys.length > journeys.length * 0.2) {
    insights.push({
      type: 'impact',
      severity: 'high',
      title: 'Extended Patient Journeys',
      description: `${Math.round((longJourneys.length / journeys.length) * 100)}% of patients experience journeys 50% longer than average (${Math.round(avgJourneyDuration)} min).`,
      department: 'System-wide',
      metric: longJourneys.length / journeys.length,
    });
  }

  return insights.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

export async function getCategoryTimeBreakdown(filters?: GlobalFilters): Promise<Record<string, number>> {
  const journeys = await getPatientJourneys(filters);

  const breakdown: Record<string, number> = {
    Emergency: 0,
    Diagnostics: 0,
    Treatment: 0,
    Recovery: 0,
    Discharge: 0,
  };

  for (const journey of journeys) {
    for (const stage of journey.stages) {
      breakdown[stage.category] += stage.duration;
    }
  }

  return breakdown;
}
