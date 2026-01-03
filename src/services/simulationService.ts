import { supabase } from '../lib/supabase';
import type { GlobalFilters } from '../types';
import { getPatientJourneys, getDepartmentDelays } from './patientFlowService';
import { detectBottlenecks } from './bottleneckDetectionService';

export interface SimulationIntervention {
  type: 'staff' | 'beds' | 'processing_time';
  departmentName: string;
  value: number;
}

export interface SimulationResult {
  intervention: SimulationIntervention;
  baseline: SimulationMetrics;
  projected: SimulationMetrics;
  improvements: {
    losReduction: number;
    losReductionPercent: number;
    bedUtilizationChange: number;
    readmissionRiskReduction: number;
    patientsImpacted: number;
  };
  costBenefit: {
    estimatedCost: number;
    impactScore: number;
    roi: number;
  };
}

export interface SimulationMetrics {
  averageLOS: number;
  bedUtilization: number;
  avgProcessingTime: number;
  readmissionRisk: number;
  throughput: number;
}

export interface MultiSimulationComparison {
  simulations: SimulationResult[];
  recommendations: string[];
  optimalIntervention: SimulationResult | null;
}

async function calculateBaselineMetrics(
  departmentName: string,
  filters?: GlobalFilters
): Promise<SimulationMetrics> {
  const journeys = await getPatientJourneys(filters);
  const delays = await getDepartmentDelays(filters);

  const departmentDelays = delays.filter(d => d.department === departmentName);

  const { data: dept } = await supabase
    .from('departments')
    .select('*')
    .eq('name', departmentName)
    .maybeSingle();

  const deptJourneys = journeys.filter(j =>
    j.stages.some(s => s.department === departmentName)
  );

  const departmentStages = deptJourneys
    .flatMap(j => j.stages)
    .filter(s => s.department === departmentName);

  const avgProcessingTime = departmentStages.length > 0
    ? departmentStages.reduce((sum, s) => sum + s.duration, 0) / departmentStages.length
    : 0;

  const totalLOS = deptJourneys.reduce((sum, j) => {
    if (j.admissionDate && j.dischargeDate) {
      const los = (new Date(j.dischargeDate).getTime() - new Date(j.admissionDate).getTime()) / (1000 * 60 * 60 * 24);
      return sum + los;
    }
    return sum;
  }, 0);

  const averageLOS = deptJourneys.length > 0 ? totalLOS / deptJourneys.length : 0;

  const bedCapacity = dept?.bed_capacity || 1;
  const currentPatients = departmentStages.length;
  const bedUtilization = (currentPatients / bedCapacity) * 100;

  const readmissionRisk = calculateReadmissionRisk(avgProcessingTime, departmentDelays.length);

  const throughput = departmentStages.length;

  return {
    averageLOS: Math.round(averageLOS * 10) / 10,
    bedUtilization: Math.min(100, Math.round(bedUtilization * 10) / 10),
    avgProcessingTime: Math.round(avgProcessingTime),
    readmissionRisk: Math.round(readmissionRisk * 10) / 10,
    throughput,
  };
}

function calculateReadmissionRisk(processingTime: number, delayCount: number): number {
  const baseRisk = 15;
  const timeImpact = (processingTime / 60) * 0.5;
  const delayImpact = delayCount * 0.3;

  return Math.min(100, baseRisk + timeImpact + delayImpact);
}

function projectStaffIntervention(
  baseline: SimulationMetrics,
  staffIncrease: number,
  currentStaff: number
): SimulationMetrics {
  const staffMultiplier = currentStaff / (currentStaff + staffIncrease);

  const newProcessingTime = baseline.avgProcessingTime * staffMultiplier;
  const processingReduction = baseline.avgProcessingTime - newProcessingTime;

  const losReduction = (processingReduction / 60) * 0.8;
  const newLOS = Math.max(0.1, baseline.averageLOS - losReduction);

  const bedUtilizationImprovement = losReduction * 5;
  const newBedUtilization = Math.max(0, baseline.bedUtilization - bedUtilizationImprovement);

  const readmissionReduction = (processingReduction / baseline.avgProcessingTime) * baseline.readmissionRisk * 0.3;
  const newReadmissionRisk = Math.max(0, baseline.readmissionRisk - readmissionReduction);

  const throughputIncrease = Math.floor(baseline.throughput * (1 + (staffIncrease / currentStaff) * 0.5));

  return {
    averageLOS: Math.round(newLOS * 10) / 10,
    bedUtilization: Math.round(newBedUtilization * 10) / 10,
    avgProcessingTime: Math.round(newProcessingTime),
    readmissionRisk: Math.round(newReadmissionRisk * 10) / 10,
    throughput: throughputIncrease,
  };
}

function projectBedsIntervention(
  baseline: SimulationMetrics,
  bedIncrease: number,
  currentBeds: number
): SimulationMetrics {
  const newBedCapacity = currentBeds + bedIncrease;
  const capacityIncrease = bedIncrease / currentBeds;

  const newBedUtilization = baseline.bedUtilization * (currentBeds / newBedCapacity);

  const waitTimeReduction = Math.min(capacityIncrease * 0.3, 0.5);
  const losReduction = baseline.averageLOS * waitTimeReduction * 0.4;
  const newLOS = Math.max(0.1, baseline.averageLOS - losReduction);

  const newProcessingTime = baseline.avgProcessingTime * (1 - waitTimeReduction * 0.2);

  const readmissionReduction = waitTimeReduction * baseline.readmissionRisk * 0.2;
  const newReadmissionRisk = Math.max(0, baseline.readmissionRisk - readmissionReduction);

  const throughputIncrease = Math.floor(baseline.throughput * (1 + capacityIncrease * 0.3));

  return {
    averageLOS: Math.round(newLOS * 10) / 10,
    bedUtilization: Math.round(newBedUtilization * 10) / 10,
    avgProcessingTime: Math.round(newProcessingTime),
    readmissionRisk: Math.round(newReadmissionRisk * 10) / 10,
    throughput: throughputIncrease,
  };
}

function projectProcessingTimeIntervention(
  baseline: SimulationMetrics,
  timeReduction: number
): SimulationMetrics {
  const newProcessingTime = Math.max(5, baseline.avgProcessingTime - timeReduction);
  const reductionRatio = timeReduction / baseline.avgProcessingTime;

  const losReduction = baseline.averageLOS * reductionRatio * 0.6;
  const newLOS = Math.max(0.1, baseline.averageLOS - losReduction);

  const bedUtilizationImprovement = reductionRatio * baseline.bedUtilization * 0.4;
  const newBedUtilization = Math.max(0, baseline.bedUtilization - bedUtilizationImprovement);

  const readmissionReduction = reductionRatio * baseline.readmissionRisk * 0.4;
  const newReadmissionRisk = Math.max(0, baseline.readmissionRisk - readmissionReduction);

  const throughputIncrease = Math.floor(baseline.throughput * (1 + reductionRatio * 0.7));

  return {
    averageLOS: Math.round(newLOS * 10) / 10,
    bedUtilization: Math.round(newBedUtilization * 10) / 10,
    avgProcessingTime: Math.round(newProcessingTime),
    readmissionRisk: Math.round(newReadmissionRisk * 10) / 10,
    throughput: throughputIncrease,
  };
}

function calculateCostBenefit(
  intervention: SimulationIntervention,
  improvements: SimulationResult['improvements'],
  currentStaff?: number,
  currentBeds?: number
): SimulationResult['costBenefit'] {
  let estimatedCost = 0;

  switch (intervention.type) {
    case 'staff':
      estimatedCost = intervention.value * 75000;
      break;
    case 'beds':
      estimatedCost = intervention.value * 50000;
      break;
    case 'processing_time':
      estimatedCost = intervention.value * 10000;
      break;
  }

  const impactScore =
    (improvements.losReductionPercent * 0.4) +
    (Math.abs(improvements.bedUtilizationChange) * 0.3) +
    (improvements.readmissionRiskReduction * 0.3);

  const roi = estimatedCost > 0
    ? (impactScore * improvements.patientsImpacted * 1000) / estimatedCost
    : 0;

  return {
    estimatedCost,
    impactScore: Math.round(impactScore * 10) / 10,
    roi: Math.round(roi * 100) / 100,
  };
}

export async function simulateIntervention(
  intervention: SimulationIntervention,
  filters?: GlobalFilters
): Promise<SimulationResult> {
  const baseline = await calculateBaselineMetrics(intervention.departmentName, filters);

  const { data: dept } = await supabase
    .from('departments')
    .select('*')
    .eq('name', intervention.departmentName)
    .maybeSingle();

  const currentStaff = dept?.staff_count || 10;
  const currentBeds = dept?.bed_capacity || 20;

  let projected: SimulationMetrics;

  switch (intervention.type) {
    case 'staff':
      projected = projectStaffIntervention(baseline, intervention.value, currentStaff);
      break;
    case 'beds':
      projected = projectBedsIntervention(baseline, intervention.value, currentBeds);
      break;
    case 'processing_time':
      projected = projectProcessingTimeIntervention(baseline, intervention.value);
      break;
    default:
      projected = baseline;
  }

  const losReduction = baseline.averageLOS - projected.averageLOS;
  const losReductionPercent = baseline.averageLOS > 0
    ? (losReduction / baseline.averageLOS) * 100
    : 0;

  const bedUtilizationChange = baseline.bedUtilization - projected.bedUtilization;
  const readmissionRiskReduction = baseline.readmissionRisk - projected.readmissionRisk;

  const improvements = {
    losReduction: Math.round(losReduction * 10) / 10,
    losReductionPercent: Math.round(losReductionPercent * 10) / 10,
    bedUtilizationChange: Math.round(bedUtilizationChange * 10) / 10,
    readmissionRiskReduction: Math.round(readmissionRiskReduction * 10) / 10,
    patientsImpacted: projected.throughput,
  };

  const costBenefit = calculateCostBenefit(intervention, improvements, currentStaff, currentBeds);

  return {
    intervention,
    baseline,
    projected,
    improvements,
    costBenefit,
  };
}

export async function compareInterventions(
  interventions: SimulationIntervention[],
  filters?: GlobalFilters
): Promise<MultiSimulationComparison> {
  const simulations = await Promise.all(
    interventions.map(i => simulateIntervention(i, filters))
  );

  simulations.sort((a, b) => b.costBenefit.roi - a.costBenefit.roi);

  const recommendations: string[] = [];
  const optimalIntervention = simulations[0] || null;

  if (optimalIntervention) {
    const { intervention, improvements, costBenefit } = optimalIntervention;

    recommendations.push(
      `Best ROI: ${intervention.type} intervention in ${intervention.departmentName}`
    );

    if (improvements.losReductionPercent > 20) {
      recommendations.push(
        `High impact: ${improvements.losReductionPercent.toFixed(1)}% reduction in length of stay`
      );
    }

    if (costBenefit.roi > 2) {
      recommendations.push(
        `Excellent return: ${costBenefit.roi.toFixed(2)}x return on investment`
      );
    }

    if (improvements.readmissionRiskReduction > 5) {
      recommendations.push(
        `Reduces readmission risk by ${improvements.readmissionRiskReduction.toFixed(1)}%`
      );
    }
  }

  const lowCostHighImpact = simulations.filter(
    s => s.costBenefit.estimatedCost < 200000 && s.costBenefit.impactScore > 20
  );

  if (lowCostHighImpact.length > 0) {
    recommendations.push(
      `${lowCostHighImpact.length} low-cost high-impact options available`
    );
  }

  return {
    simulations,
    recommendations,
    optimalIntervention,
  };
}
