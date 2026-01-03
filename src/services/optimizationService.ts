import { supabase } from '../lib/supabase';
import type { GlobalFilters } from '../types';
import { detectBottlenecks, type BottleneckDetection } from './bottleneckDetectionService';
import { simulateIntervention, compareInterventions, type SimulationIntervention } from './simulationService';

export interface OptimizationRecommendation {
  priority: number;
  departmentName: string;
  recommendationType: 'staff' | 'beds' | 'process_improvement' | 'reallocation';
  rationale: string;
  expectedImpact: {
    losReduction: number;
    costSavings: number;
    patientThroughputIncrease: number;
  };
  actionItems: string[];
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export interface StaffReallocationOpportunity {
  fromDepartment: string;
  toDepartment: string;
  staffCount: number;
  rationale: string;
  expectedImpact: string;
  feasibilityScore: number;
}

export interface CostToImpactIntervention {
  departmentName: string;
  interventionType: 'staff' | 'beds' | 'processing_time';
  interventionValue: number;
  estimatedCost: number;
  impactScore: number;
  roi: number;
  description: string;
  quickWins: boolean;
}

export async function getDepartmentUtilization(filters?: GlobalFilters) {
  const { data: departments } = await supabase.from('departments').select('*');

  if (!departments) return [];

  let flowQuery = supabase.from('department_flow_logs').select('*');

  if (filters?.dateRange) {
    flowQuery = flowQuery
      .gte('entry_time', filters.dateRange.start)
      .lte('entry_time', filters.dateRange.end + 'T23:59:59');
  }

  const { data: flowLogs } = await flowQuery;

  const utilization = departments.map(dept => {
    const deptLogs = flowLogs?.filter(log => log.department_id === dept.id) || [];
    const uniquePatients = new Set(deptLogs.map(log => log.patient_id)).size;

    const totalProcessingTime = deptLogs.reduce((sum, log) => {
      if (log.entry_time && log.exit_time) {
        const duration = (new Date(log.exit_time).getTime() - new Date(log.entry_time).getTime()) / (1000 * 60);
        return sum + duration;
      }
      return sum;
    }, 0);

    const avgProcessingTime = deptLogs.length > 0 ? totalProcessingTime / deptLogs.length : 0;
    const bedUtilization = dept.bed_capacity > 0 ? (uniquePatients / dept.bed_capacity) * 100 : 0;
    const staffUtilization = dept.staff_count > 0 ? (uniquePatients / dept.staff_count) : 0;

    return {
      ...dept,
      patientVolume: uniquePatients,
      avgProcessingTime,
      bedUtilization: Math.min(100, bedUtilization),
      staffUtilization,
      flowLogsCount: deptLogs.length,
    };
  });

  return utilization;
}

export async function getPrioritizedOptimizations(
  filters?: GlobalFilters
): Promise<OptimizationRecommendation[]> {
  const bottlenecks = await detectBottlenecks(filters);
  const utilization = await getDepartmentUtilization(filters);

  const recommendations: OptimizationRecommendation[] = [];

  for (const bottleneck of bottlenecks) {
    const deptUtil = utilization.find(u => u.name === bottleneck.departmentName);
    if (!deptUtil) continue;

    let urgency: 'critical' | 'high' | 'medium' | 'low';
    if (bottleneck.overallImpactScore > 75) urgency = 'critical';
    else if (bottleneck.overallImpactScore > 50) urgency = 'high';
    else if (bottleneck.overallImpactScore > 30) urgency = 'medium';
    else urgency = 'low';

    const losReduction = Math.abs(bottleneck.timeDeviation / 100) * (deptUtil.avgProcessingTime / 60 / 24);
    const costSavings = losReduction * bottleneck.patientsAffected * 2000;
    const throughputIncrease = Math.floor(bottleneck.patientsAffected * 0.15);

    if (bottleneck.bottleneckType === 'invisible' || bottleneck.delayPropagationScore > 40) {
      recommendations.push({
        priority: bottleneck.rank,
        departmentName: bottleneck.departmentName,
        recommendationType: 'process_improvement',
        rationale: `${bottleneck.departmentName} creates significant downstream delays despite moderate load. Process optimization will have cascading benefits.`,
        expectedImpact: {
          losReduction: Math.round(losReduction * 10) / 10,
          costSavings: Math.round(costSavings),
          patientThroughputIncrease: throughputIncrease,
        },
        actionItems: [
          'Conduct time-motion study to identify process inefficiencies',
          'Implement lean principles to reduce non-value-added activities',
          'Optimize patient handoff protocols',
          `Target ${bottleneck.downstreamDepartments.length} downstream departments for coordination`,
        ],
        urgency,
      });
    }

    if (deptUtil.staffUtilization > 8) {
      recommendations.push({
        priority: bottleneck.rank,
        departmentName: bottleneck.departmentName,
        recommendationType: 'staff',
        rationale: `High staff utilization (${deptUtil.staffUtilization.toFixed(1)} patients per staff) indicates understaffing contributing to delays.`,
        expectedImpact: {
          losReduction: Math.round(losReduction * 1.2 * 10) / 10,
          costSavings: Math.round(costSavings * 1.2),
          patientThroughputIncrease: Math.floor(throughputIncrease * 1.3),
        },
        actionItems: [
          `Add 2-3 additional staff members to handle peak loads`,
          'Consider flexible staffing during high-demand periods',
          'Cross-train staff from underutilized departments',
          'Implement overtime protocols for surge capacity',
        ],
        urgency,
      });
    }

    if (deptUtil.bedUtilization > 85) {
      recommendations.push({
        priority: bottleneck.rank,
        departmentName: bottleneck.departmentName,
        recommendationType: 'beds',
        rationale: `Bed utilization at ${deptUtil.bedUtilization.toFixed(1)}% creates capacity constraints and patient flow bottlenecks.`,
        expectedImpact: {
          losReduction: Math.round(losReduction * 0.8 * 10) / 10,
          costSavings: Math.round(costSavings * 0.8),
          patientThroughputIncrease: Math.floor(throughputIncrease * 1.5),
        },
        actionItems: [
          'Expand bed capacity by 10-15%',
          'Optimize discharge planning to increase turnover',
          'Implement virtual bed management system',
          'Consider ambulatory alternatives for appropriate patients',
        ],
        urgency,
      });
    }
  }

  recommendations.sort((a, b) => {
    const urgencyScore = { critical: 4, high: 3, medium: 2, low: 1 };
    const urgencyDiff = urgencyScore[b.urgency] - urgencyScore[a.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return a.priority - b.priority;
  });

  return recommendations;
}

export async function getStaffReallocationOpportunities(
  filters?: GlobalFilters
): Promise<StaffReallocationOpportunity[]> {
  const utilization = await getDepartmentUtilization(filters);
  const bottlenecks = await detectBottlenecks(filters);

  const opportunities: StaffReallocationOpportunity[] = [];

  const underutilized = utilization.filter(u =>
    u.staffUtilization < 4 &&
    u.staff_count > 5 &&
    !bottlenecks.some(b => b.departmentName === u.name)
  );

  const overutilized = utilization.filter(u =>
    u.staffUtilization > 8 ||
    bottlenecks.some(b => b.departmentName === u.name && b.overallImpactScore > 40)
  );

  for (const source of underutilized) {
    for (const target of overutilized) {
      const staffToReallocate = Math.min(2, Math.floor(source.staff_count * 0.2));

      const currentSourceUtil = source.staffUtilization;
      const newSourceUtil = (source.patientVolume / (source.staff_count - staffToReallocate));
      const currentTargetUtil = target.staffUtilization;
      const newTargetUtil = (target.patientVolume / (target.staff_count + staffToReallocate));

      const feasibilityScore = Math.min(100,
        ((newSourceUtil < 7 ? 50 : 0) + (newTargetUtil > 5 ? 50 : 0))
      );

      if (feasibilityScore > 50) {
        const bottleneck = bottlenecks.find(b => b.departmentName === target.name);
        const impactEstimate = bottleneck
          ? `Reduce processing time by ~${Math.round(staffToReallocate * 8)}%, improve ${bottleneck.patientsAffected} patient flows`
          : `Improve staff utilization from ${currentTargetUtil.toFixed(1)} to ${newTargetUtil.toFixed(1)} patients per staff`;

        opportunities.push({
          fromDepartment: source.name,
          toDepartment: target.name,
          staffCount: staffToReallocate,
          rationale: `${source.name} has low utilization (${currentSourceUtil.toFixed(1)} patients/staff) while ${target.name} is strained (${currentTargetUtil.toFixed(1)} patients/staff)`,
          expectedImpact: impactEstimate,
          feasibilityScore: Math.round(feasibilityScore),
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.feasibilityScore - a.feasibilityScore);
}

export async function getCostToImpactAnalysis(
  filters?: GlobalFilters
): Promise<CostToImpactIntervention[]> {
  const bottlenecks = await detectBottlenecks(filters);
  const interventions: CostToImpactIntervention[] = [];

  for (const bottleneck of bottlenecks.slice(0, 5)) {
    const { data: dept } = await supabase
      .from('departments')
      .select('*')
      .eq('name', bottleneck.departmentName)
      .maybeSingle();

    if (!dept) continue;

    const staffIntervention: SimulationIntervention = {
      type: 'staff',
      departmentName: bottleneck.departmentName,
      value: 2,
    };

    const bedIntervention: SimulationIntervention = {
      type: 'beds',
      departmentName: bottleneck.departmentName,
      value: 5,
    };

    const processIntervention: SimulationIntervention = {
      type: 'processing_time',
      departmentName: bottleneck.departmentName,
      value: 30,
    };

    const results = await compareInterventions(
      [staffIntervention, bedIntervention, processIntervention],
      filters
    );

    for (const sim of results.simulations) {
      const isQuickWin = sim.costBenefit.estimatedCost < 150000 && sim.costBenefit.impactScore > 25;

      let description = '';
      switch (sim.intervention.type) {
        case 'staff':
          description = `Add ${sim.intervention.value} staff members`;
          break;
        case 'beds':
          description = `Add ${sim.intervention.value} beds`;
          break;
        case 'processing_time':
          description = `Reduce processing time by ${sim.intervention.value} minutes`;
          break;
      }

      interventions.push({
        departmentName: sim.intervention.departmentName,
        interventionType: sim.intervention.type,
        interventionValue: sim.intervention.value,
        estimatedCost: sim.costBenefit.estimatedCost,
        impactScore: sim.costBenefit.impactScore,
        roi: sim.costBenefit.roi,
        description,
        quickWins: isQuickWin,
      });
    }
  }

  return interventions.sort((a, b) => b.roi - a.roi);
}
