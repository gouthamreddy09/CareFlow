import { supabase } from '../lib/supabase';
import type { GlobalFilters } from '../types';
import { getPatientJourneys, getDepartmentDelays } from './patientFlowService';

export interface BottleneckDetection {
  departmentName: string;
  rank: number;
  bottleneckType: 'invisible' | 'obvious' | 'emerging';

  // Core metrics
  expectedTime: number;
  actualTime: number;
  timeDeviation: number;

  // Statistical measures
  zScore: number;
  iqrPosition: number;
  varianceRatio: number;

  // Impact scores
  patientImpactScore: number;
  delayPropagationScore: number;
  resourceStrainScore: number;
  overallImpactScore: number;

  // Affected data
  patientsAffected: number;
  downstreamDepartments: string[];

  // Explanations
  whyBottleneck: string;
  affectedPatientTypes: string[];
  downstreamEffects: string[];

  // Additional context
  loadLevel: 'low' | 'moderate' | 'high';
  congestionIndicator: number;
}

export interface DelayPropagation {
  sourceDepartment: string;
  targetDepartment: string;
  avgDelayTransferred: number;
  patientsAffected: number;
  propagationStrength: number;
}

export interface BottleneckTimeline {
  timestamp: string;
  departmentName: string;
  congestionLevel: number;
  bottleneckScore: number;
}

interface DepartmentAnalysis {
  name: string;
  times: number[];
  patientVolume: number;
  downstreamDelays: Map<string, number>;
  processingVariance: number;
  expectedTime: number;
  actualTime: number;
}

function calculateStatistics(values: number[]): {
  mean: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  stdDev: number;
} {
  if (values.length === 0) {
    return { mean: 0, median: 0, q1: 0, q3: 0, iqr: 0, stdDev: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  const median = sorted[Math.floor(sorted.length / 2)];
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { mean, median, q1, q3, iqr, stdDev };
}

function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function calculateIQRPosition(value: number, q1: number, q3: number, iqr: number): number {
  if (iqr === 0) return 0;
  if (value < q1) return (q1 - value) / iqr;
  if (value > q3) return (value - q3) / iqr;
  return 0;
}

async function analyzeDepartmentFlows(filters?: GlobalFilters): Promise<Map<string, DepartmentAnalysis>> {
  const journeys = await getPatientJourneys(filters);
  const deptAnalysis = new Map<string, DepartmentAnalysis>();

  for (const journey of journeys) {
    for (let i = 0; i < journey.stages.length; i++) {
      const stage = journey.stages[i];

      if (!deptAnalysis.has(stage.department)) {
        deptAnalysis.set(stage.department, {
          name: stage.department,
          times: [],
          patientVolume: 0,
          downstreamDelays: new Map(),
          processingVariance: 0,
          expectedTime: 0,
          actualTime: 0,
        });
      }

      const analysis = deptAnalysis.get(stage.department)!;
      analysis.times.push(stage.duration);
      analysis.patientVolume++;

      // Track downstream delays
      if (i < journey.stages.length - 1) {
        const nextStage = journey.stages[i + 1];
        const waitTime = (new Date(nextStage.entryTime).getTime() - new Date(stage.exitTime).getTime()) / (1000 * 60);

        if (waitTime > 0) {
          const currentDelay = analysis.downstreamDelays.get(nextStage.department) || 0;
          analysis.downstreamDelays.set(nextStage.department, currentDelay + waitTime);
        }
      }
    }
  }

  // Calculate statistics for each department
  for (const [_, analysis] of deptAnalysis) {
    const stats = calculateStatistics(analysis.times);
    analysis.expectedTime = stats.median;
    analysis.actualTime = stats.mean;
    analysis.processingVariance = Math.pow(stats.stdDev, 2);
  }

  return deptAnalysis;
}

export async function detectBottlenecks(filters?: GlobalFilters): Promise<BottleneckDetection[]> {
  const deptAnalysis = await analyzeDepartmentFlows(filters);
  const delays = await getDepartmentDelays(filters);

  if (deptAnalysis.size === 0) {
    return [];
  }

  // Calculate global statistics
  const allTimes: number[] = [];
  const allVolumes: number[] = [];

  for (const analysis of deptAnalysis.values()) {
    allTimes.push(...analysis.times);
    allVolumes.push(analysis.patientVolume);
  }

  const globalStats = calculateStatistics(allTimes);
  const volumeStats = calculateStatistics(allVolumes);

  const bottlenecks: BottleneckDetection[] = [];

  for (const [deptName, analysis] of deptAnalysis) {
    // Skip if insufficient data
    if (analysis.times.length < 3) continue;

    const deptStats = calculateStatistics(analysis.times);

    // Calculate Z-score for processing time
    const zScore = calculateZScore(analysis.actualTime, globalStats.mean, globalStats.stdDev);

    // Calculate IQR position
    const iqrPosition = calculateIQRPosition(analysis.actualTime, globalStats.q1, globalStats.q3, globalStats.iqr);

    // Calculate variance ratio
    const varianceRatio = globalStats.stdDev > 0 ? deptStats.stdDev / globalStats.stdDev : 1;

    // Calculate time deviation
    const timeDeviation = analysis.expectedTime > 0
      ? ((analysis.actualTime - analysis.expectedTime) / analysis.expectedTime) * 100
      : 0;

    // Calculate delay propagation score
    let totalDownstreamDelay = 0;
    const downstreamDepts: string[] = [];

    for (const [downstreamDept, delay] of analysis.downstreamDelays) {
      totalDownstreamDelay += delay;
      if (delay > deptStats.mean * 0.2) {
        downstreamDepts.push(downstreamDept);
      }
    }

    const avgDownstreamDelay = analysis.downstreamDelays.size > 0
      ? totalDownstreamDelay / analysis.downstreamDelays.size
      : 0;

    const delayPropagationScore = Math.min((avgDownstreamDelay / analysis.actualTime) * 100, 100);

    // Calculate patient impact score
    const volumePercentile = volumeStats.mean > 0
      ? (analysis.patientVolume / volumeStats.mean) * 100
      : 0;

    const timeImpact = Math.abs(timeDeviation);
    const patientImpactScore = (volumePercentile * 0.4) + (timeImpact * 0.6);

    // Calculate resource strain score
    const congestionIndicator = deptStats.stdDev > deptStats.mean * 0.5
      ? deptStats.stdDev / deptStats.mean
      : 0;

    const resourceStrainScore = Math.min(
      (congestionIndicator * 30) + (varianceRatio * 40) + (Math.abs(zScore) * 30),
      100
    );

    // Overall impact score
    const overallImpactScore =
      (patientImpactScore * 0.35) +
      (delayPropagationScore * 0.35) +
      (resourceStrainScore * 0.3);

    // Determine load level
    let loadLevel: 'low' | 'moderate' | 'high';
    if (volumePercentile < 60) loadLevel = 'low';
    else if (volumePercentile < 100) loadLevel = 'moderate';
    else loadLevel = 'high';

    // Determine bottleneck type
    let bottleneckType: 'invisible' | 'obvious' | 'emerging';
    if (loadLevel === 'moderate' && delayPropagationScore > 30) {
      bottleneckType = 'invisible';
    } else if (loadLevel === 'high' && timeDeviation > 50) {
      bottleneckType = 'obvious';
    } else if (varianceRatio > 1.3 && congestionIndicator > 0.8) {
      bottleneckType = 'emerging';
    } else {
      continue; // Not a significant bottleneck
    }

    // Generate explanations
    const explanations = generateExplanations(
      deptName,
      analysis,
      {
        zScore,
        iqrPosition,
        varianceRatio,
        timeDeviation,
        delayPropagationScore,
        congestionIndicator,
        loadLevel,
      }
    );

    bottlenecks.push({
      departmentName: deptName,
      rank: 0, // Will be set after sorting
      bottleneckType,
      expectedTime: Math.round(analysis.expectedTime),
      actualTime: Math.round(analysis.actualTime),
      timeDeviation: Math.round(timeDeviation * 10) / 10,
      zScore: Math.round(zScore * 100) / 100,
      iqrPosition: Math.round(iqrPosition * 100) / 100,
      varianceRatio: Math.round(varianceRatio * 100) / 100,
      patientImpactScore: Math.round(patientImpactScore * 10) / 10,
      delayPropagationScore: Math.round(delayPropagationScore * 10) / 10,
      resourceStrainScore: Math.round(resourceStrainScore * 10) / 10,
      overallImpactScore: Math.round(overallImpactScore * 10) / 10,
      patientsAffected: analysis.patientVolume,
      downstreamDepartments: downstreamDepts,
      whyBottleneck: explanations.whyBottleneck,
      affectedPatientTypes: explanations.affectedPatientTypes,
      downstreamEffects: explanations.downstreamEffects,
      loadLevel,
      congestionIndicator: Math.round(congestionIndicator * 100) / 100,
    });
  }

  // Sort by overall impact score and assign ranks
  bottlenecks.sort((a, b) => b.overallImpactScore - a.overallImpactScore);
  bottlenecks.forEach((b, idx) => b.rank = idx + 1);

  return bottlenecks;
}

function generateExplanations(
  deptName: string,
  analysis: DepartmentAnalysis,
  metrics: {
    zScore: number;
    iqrPosition: number;
    varianceRatio: number;
    timeDeviation: number;
    delayPropagationScore: number;
    congestionIndicator: number;
    loadLevel: 'low' | 'moderate' | 'high';
  }
): {
  whyBottleneck: string;
  affectedPatientTypes: string[];
  downstreamEffects: string[];
} {
  const reasons: string[] = [];
  const patientTypes: string[] = [];
  const effects: string[] = [];

  // Why this is a bottleneck
  if (metrics.loadLevel === 'moderate' && metrics.delayPropagationScore > 30) {
    reasons.push(`Despite moderate patient volume (${analysis.patientVolume} patients), this department creates significant downstream delays`);
  }

  if (metrics.timeDeviation > 50) {
    reasons.push(`Processing time is ${Math.round(metrics.timeDeviation)}% longer than expected`);
  }

  if (metrics.varianceRatio > 1.5) {
    reasons.push(`Processing time is highly inconsistent (${Math.round(metrics.varianceRatio * 100)}% more variable than average)`);
  }

  if (metrics.zScore > 2) {
    reasons.push(`Processing time is statistically abnormal (${Math.abs(Math.round(metrics.zScore * 10) / 10)} standard deviations above average)`);
  }

  if (metrics.congestionIndicator > 1.0) {
    reasons.push(`High congestion detected with unpredictable wait times`);
  }

  const whyBottleneck = reasons.length > 0
    ? reasons.join('. ') + '.'
    : 'This department shows signs of operational inefficiency that impact patient flow.';

  // Affected patient types
  if (analysis.patientVolume > 50) {
    patientTypes.push('High-volume patients experiencing delays');
  } else if (analysis.patientVolume > 20) {
    patientTypes.push('Moderate number of patients with extended wait times');
  } else {
    patientTypes.push('Critical pathway patients facing bottlenecks');
  }

  if (metrics.timeDeviation > 100) {
    patientTypes.push('All patients experience significantly extended stays');
  } else if (metrics.timeDeviation > 50) {
    patientTypes.push('Most patients face longer-than-expected processing');
  }

  if (metrics.varianceRatio > 1.5) {
    patientTypes.push('Unpredictable wait times affect patient satisfaction');
  }

  // Downstream effects
  if (analysis.downstreamDelays.size > 0) {
    const topDownstream = Array.from(analysis.downstreamDelays.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [dept, delay] of topDownstream) {
      effects.push(`${dept} experiences average ${Math.round(delay / analysis.patientVolume)} min delays per patient`);
    }
  }

  if (metrics.delayPropagationScore > 50) {
    effects.push('Delays cascade through multiple downstream departments');
  }

  if (metrics.congestionIndicator > 1.2) {
    effects.push('Creates queuing effects that block bed availability');
  }

  return {
    whyBottleneck,
    affectedPatientTypes: patientTypes.slice(0, 3),
    downstreamEffects: effects.length > 0 ? effects : ['Limited downstream impact detected'],
  };
}

export async function getDelayPropagationMap(filters?: GlobalFilters): Promise<DelayPropagation[]> {
  const journeys = await getPatientJourneys(filters);
  const propagationMap = new Map<string, {
    totalDelay: number;
    count: number;
  }>();

  for (const journey of journeys) {
    for (let i = 0; i < journey.stages.length - 1; i++) {
      const current = journey.stages[i];
      const next = journey.stages[i + 1];

      const waitTime = (new Date(next.entryTime).getTime() - new Date(current.exitTime).getTime()) / (1000 * 60);

      if (waitTime > 5) { // Only count significant waits
        const key = `${current.department}→${next.department}`;

        if (!propagationMap.has(key)) {
          propagationMap.set(key, { totalDelay: 0, count: 0 });
        }

        const prop = propagationMap.get(key)!;
        prop.totalDelay += waitTime;
        prop.count++;
      }
    }
  }

  const propagations: DelayPropagation[] = [];

  for (const [key, data] of propagationMap) {
    const [source, target] = key.split('→');
    const avgDelay = data.totalDelay / data.count;
    const propagationStrength = Math.min((avgDelay / 60) * 100, 100); // Normalize to 0-100

    propagations.push({
      sourceDepartment: source,
      targetDepartment: target,
      avgDelayTransferred: Math.round(avgDelay),
      patientsAffected: data.count,
      propagationStrength: Math.round(propagationStrength * 10) / 10,
    });
  }

  return propagations.sort((a, b) => b.propagationStrength - a.propagationStrength);
}

export async function getBottleneckTimeline(filters?: GlobalFilters): Promise<BottleneckTimeline[]> {
  const journeys = await getPatientJourneys(filters);
  const timeSlots = new Map<string, Map<string, number[]>>();

  // Group by time slots (4-hour windows)
  for (const journey of journeys) {
    for (const stage of journey.stages) {
      const entryDate = new Date(stage.entryTime);
      const hourSlot = Math.floor(entryDate.getHours() / 4) * 4;
      const timeKey = `${entryDate.toISOString().split('T')[0]} ${hourSlot.toString().padStart(2, '0')}:00`;

      if (!timeSlots.has(timeKey)) {
        timeSlots.set(timeKey, new Map());
      }

      const deptMap = timeSlots.get(timeKey)!;
      if (!deptMap.has(stage.department)) {
        deptMap.set(stage.department, []);
      }

      deptMap.get(stage.department)!.push(stage.duration);
    }
  }

  const timeline: BottleneckTimeline[] = [];

  for (const [timestamp, deptMap] of timeSlots) {
    for (const [dept, times] of deptMap) {
      const stats = calculateStatistics(times);
      const congestionLevel = stats.stdDev / (stats.mean || 1);
      const bottleneckScore = times.length * congestionLevel * (stats.mean / 60);

      timeline.push({
        timestamp,
        departmentName: dept,
        congestionLevel: Math.round(congestionLevel * 100) / 100,
        bottleneckScore: Math.round(bottleneckScore * 10) / 10,
      });
    }
  }

  return timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
