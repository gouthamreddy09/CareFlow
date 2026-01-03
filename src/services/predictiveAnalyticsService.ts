import type { PatientRecord } from '../types';

export interface AdmissionForecast {
  date: string;
  predictedAdmissions: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface BottleneckPrediction {
  departmentId: string;
  departmentName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedDate: string;
  probability: number;
  expectedImpact: number;
  historicalPattern: string;
  recommendation: string;
}

export interface CapacityRisk {
  date: string;
  department: string;
  currentCapacity: number;
  predictedDemand: number;
  utilizationRate: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ResourceShortageWarning {
  resourceType: 'beds' | 'staff' | 'equipment';
  department: string;
  shortageDate: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedGap: number;
  recommendation: string;
}

function calculateMovingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const windowValues = values.slice(start, i + 1);
    const avg = windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length;
    result.push(avg);
  }
  return result;
}

function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    numerator += xDiff * (values[i] - yMean);
    denominator += xDiff * xDiff;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

function exponentialSmoothing(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];

  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

export function forecastAdmissions(
  records: PatientRecord[],
  days: number
): AdmissionForecast[] {
  const dailyAdmissions = new Map<string, number>();

  records.forEach(record => {
    if (record.admissionDate) {
      const date = new Date(record.admissionDate).toISOString().split('T')[0];
      dailyAdmissions.set(date, (dailyAdmissions.get(date) || 0) + 1);
    }
  });

  const sortedDates = Array.from(dailyAdmissions.keys()).sort();
  const admissionValues = sortedDates.map(date => dailyAdmissions.get(date) || 0);

  if (admissionValues.length === 0) {
    return [];
  }

  const smoothed = exponentialSmoothing(admissionValues, 0.3);
  const trend = calculateTrend(smoothed);
  const lastValue = smoothed[smoothed.length - 1];
  const avgValue = admissionValues.reduce((sum, val) => sum + val, 0) / admissionValues.length;
  const stdDev = Math.sqrt(
    admissionValues.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / admissionValues.length
  );

  const forecasts: AdmissionForecast[] = [];
  const lastDate = new Date(sortedDates[sortedDates.length - 1]);

  for (let i = 1; i <= days; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);

    const trendComponent = trend * i;
    const seasonalFactor = 1 + 0.1 * Math.sin((i / 7) * 2 * Math.PI);
    const predicted = Math.max(0, Math.round((lastValue + trendComponent) * seasonalFactor));

    const trendDirection = trend > 0.5 ? 'increasing' : trend < -0.5 ? 'decreasing' : 'stable';

    forecasts.push({
      date: forecastDate.toISOString().split('T')[0],
      predictedAdmissions: predicted,
      confidenceInterval: {
        lower: Math.max(0, Math.round(predicted - 1.96 * stdDev)),
        upper: Math.round(predicted + 1.96 * stdDev)
      },
      trend: trendDirection
    });
  }

  return forecasts;
}

export function predictBottlenecks(
  records: PatientRecord[]
): BottleneckPrediction[] {
  const departmentMetrics = new Map<string, {
    avgWaitTime: number;
    totalPatients: number;
    delays: number[];
    peakHours: Map<number, number>;
  }>();

  records.forEach(record => {
    if (record.currentDepartment) {
      const dept = record.currentDepartment;

      if (!departmentMetrics.has(dept)) {
        departmentMetrics.set(dept, {
          avgWaitTime: 0,
          totalPatients: 0,
          delays: [],
          peakHours: new Map()
        });
      }

      const metrics = departmentMetrics.get(dept)!;
      metrics.totalPatients++;

      if (record.admissionDate) {
        const hour = new Date(record.admissionDate).getHours();
        metrics.peakHours.set(hour, (metrics.peakHours.get(hour) || 0) + 1);
      }

      if (record.journeySteps) {
        record.journeySteps.forEach(step => {
          if (step.waitTimeMinutes > 60) {
            metrics.delays.push(step.waitTimeMinutes);
          }
        });
      }
    }
  });

  const predictions: BottleneckPrediction[] = [];
  const now = new Date();

  departmentMetrics.forEach((metrics, deptName) => {
    const avgDelay = metrics.delays.length > 0
      ? metrics.delays.reduce((sum, d) => sum + d, 0) / metrics.delays.length
      : 0;

    const delayFrequency = metrics.delays.length / metrics.totalPatients;
    const maxPeakVolume = Math.max(...Array.from(metrics.peakHours.values()));
    const avgVolume = metrics.totalPatients / Math.max(1, metrics.peakHours.size);
    const peakRatio = maxPeakVolume / avgVolume;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    let probability: number;

    if (delayFrequency > 0.3 && avgDelay > 120) {
      riskLevel = 'critical';
      probability = 0.85;
    } else if (delayFrequency > 0.2 || avgDelay > 90) {
      riskLevel = 'high';
      probability = 0.65;
    } else if (delayFrequency > 0.1 || avgDelay > 60) {
      riskLevel = 'medium';
      probability = 0.40;
    } else {
      riskLevel = 'low';
      probability = 0.15;
    }

    const daysUntil = riskLevel === 'critical' ? 3 :
                      riskLevel === 'high' ? 7 :
                      riskLevel === 'medium' ? 14 : 30;

    const predictedDate = new Date(now);
    predictedDate.setDate(predictedDate.getDate() + daysUntil);

    const pattern = peakRatio > 1.5
      ? 'Peak hour congestion pattern'
      : delayFrequency > 0.2
      ? 'Consistent delay pattern'
      : 'Capacity constraint pattern';

    const recommendation = riskLevel === 'critical'
      ? `Immediate action required: Add ${Math.ceil(maxPeakVolume * 0.3)} staff during peak hours`
      : riskLevel === 'high'
      ? `Schedule additional resources: Consider ${Math.ceil(maxPeakVolume * 0.2)} extra staff`
      : riskLevel === 'medium'
      ? 'Monitor closely and prepare contingency staffing'
      : 'Continue normal operations with routine monitoring';

    predictions.push({
      departmentId: deptName.toLowerCase().replace(/\s+/g, '_'),
      departmentName: deptName,
      riskLevel,
      predictedDate: predictedDate.toISOString().split('T')[0],
      probability,
      expectedImpact: Math.round(avgDelay * delayFrequency),
      historicalPattern: pattern,
      recommendation
    });
  });

  return predictions.sort((a, b) => b.probability - a.probability);
}

export function predictCapacityRisks(
  records: PatientRecord[],
  forecastDays: number = 30
): CapacityRisk[] {
  const departmentCapacity = new Map<string, {
    currentLoad: number;
    historicalPeak: number;
    avgLoad: number;
  }>();

  records.forEach(record => {
    if (record.currentDepartment) {
      const dept = record.currentDepartment;

      if (!departmentCapacity.has(dept)) {
        departmentCapacity.set(dept, {
          currentLoad: 0,
          historicalPeak: 0,
          avgLoad: 0
        });
      }

      const capacity = departmentCapacity.get(dept)!;
      capacity.currentLoad++;
      capacity.historicalPeak = Math.max(capacity.historicalPeak, capacity.currentLoad);
    }
  });

  const risks: CapacityRisk[] = [];
  const baseDate = new Date();

  departmentCapacity.forEach((capacity, dept) => {
    const avgLoad = capacity.currentLoad;
    capacity.avgLoad = avgLoad;

    for (let day = 1; day <= forecastDays; day++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setDate(forecastDate.getDate() + day);

      const seasonalFactor = 1 + 0.15 * Math.sin((day / 7) * 2 * Math.PI);
      const trendFactor = 1 + (0.02 * (day / 30));
      const predictedDemand = Math.round(avgLoad * seasonalFactor * trendFactor);

      const assumedCapacity = Math.round(capacity.historicalPeak * 1.2);
      const utilizationRate = (predictedDemand / assumedCapacity) * 100;

      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (utilizationRate >= 95) riskLevel = 'critical';
      else if (utilizationRate >= 85) riskLevel = 'high';
      else if (utilizationRate >= 75) riskLevel = 'medium';
      else riskLevel = 'low';

      if (day % 7 === 0 || riskLevel === 'critical' || riskLevel === 'high') {
        risks.push({
          date: forecastDate.toISOString().split('T')[0],
          department: dept,
          currentCapacity: assumedCapacity,
          predictedDemand,
          utilizationRate: Math.round(utilizationRate),
          riskLevel
        });
      }
    }
  });

  return risks.sort((a, b) => {
    const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
  });
}

export function predictResourceShortages(
  records: PatientRecord[]
): ResourceShortageWarning[] {
  const departmentStats = new Map<string, {
    patientCount: number;
    avgLOS: number;
    peakLoad: number;
  }>();

  records.forEach(record => {
    if (record.currentDepartment) {
      const dept = record.currentDepartment;

      if (!departmentStats.has(dept)) {
        departmentStats.set(dept, {
          patientCount: 0,
          avgLOS: 0,
          peakLoad: 0
        });
      }

      const stats = departmentStats.get(dept)!;
      stats.patientCount++;

      if (record.admissionDate && record.dischargeDate) {
        const los = (new Date(record.dischargeDate).getTime() -
                    new Date(record.admissionDate).getTime()) / (1000 * 60 * 60 * 24);
        stats.avgLOS = (stats.avgLOS * (stats.patientCount - 1) + los) / stats.patientCount;
      }
    }
  });

  const warnings: ResourceShortageWarning[] = [];
  const baseDate = new Date();

  departmentStats.forEach((stats, dept) => {
    const growthRate = 0.05;
    const projectedPatients = Math.round(stats.patientCount * (1 + growthRate));
    const currentBeds = Math.ceil(stats.patientCount * 1.2);
    const requiredBeds = Math.ceil(projectedPatients * 1.1);

    if (requiredBeds > currentBeds) {
      const shortage = requiredBeds - currentBeds;
      const shortageDate = new Date(baseDate);
      shortageDate.setDate(shortageDate.getDate() + 14);

      let severity: 'low' | 'medium' | 'high' | 'critical';
      if (shortage > currentBeds * 0.3) severity = 'critical';
      else if (shortage > currentBeds * 0.2) severity = 'high';
      else if (shortage > currentBeds * 0.1) severity = 'medium';
      else severity = 'low';

      warnings.push({
        resourceType: 'beds',
        department: dept,
        shortageDate: shortageDate.toISOString().split('T')[0],
        severity,
        estimatedGap: shortage,
        recommendation: `Add ${shortage} beds or reduce average LOS by ${Math.round(stats.avgLOS * 0.15)} days`
      });
    }

    const requiredStaff = Math.ceil(projectedPatients / 8);
    const currentStaff = Math.ceil(stats.patientCount / 10);

    if (requiredStaff > currentStaff) {
      const staffShortage = requiredStaff - currentStaff;
      const shortageDate = new Date(baseDate);
      shortageDate.setDate(shortageDate.getDate() + 21);

      warnings.push({
        resourceType: 'staff',
        department: dept,
        shortageDate: shortageDate.toISOString().split('T')[0],
        severity: staffShortage > 5 ? 'high' : 'medium',
        estimatedGap: staffShortage,
        recommendation: `Recruit ${staffShortage} additional staff members or implement flexible scheduling`
      });
    }
  });

  return warnings.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}
