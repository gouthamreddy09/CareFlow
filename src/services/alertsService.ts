import type { GlobalFilters } from '../types';
import { detectBottlenecks } from './bottleneckDetectionService';
import { getDepartmentUtilization } from './optimizationService';
import { getPatientJourneys } from './patientFlowService';

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'bottleneck' | 'discharge_delay' | 'readmission_risk' | 'capacity';
  departmentName: string;
  title: string;
  message: string;
  timestamp: string;
  metrics: {
    current: number;
    threshold: number;
    unit: string;
  };
  actionable: boolean;
  recommendedActions: string[];
}

export interface AlertThresholds {
  bottleneckImpactScore: number;
  bedUtilizationCritical: number;
  bedUtilizationWarning: number;
  avgProcessingTimeIncrease: number;
  readmissionRiskHigh: number;
  dischargeDelayMinutes: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  bottleneckImpactScore: 60,
  bedUtilizationCritical: 90,
  bedUtilizationWarning: 80,
  avgProcessingTimeIncrease: 50,
  readmissionRiskHigh: 25,
  dischargeDelayMinutes: 120,
};

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function detectBottleneckAlerts(
  filters?: GlobalFilters,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): Promise<Alert[]> {
  const bottlenecks = await detectBottlenecks(filters);
  const alerts: Alert[] = [];

  for (const bottleneck of bottlenecks) {
    if (bottleneck.overallImpactScore >= thresholds.bottleneckImpactScore) {
      const severity: Alert['severity'] =
        bottleneck.overallImpactScore >= 80 ? 'critical' :
        bottleneck.overallImpactScore >= 60 ? 'warning' : 'info';

      const actions: string[] = [];

      if (bottleneck.bottleneckType === 'invisible') {
        actions.push('Conduct root cause analysis of downstream delays');
        actions.push('Review patient handoff protocols');
        actions.push(`Coordinate with ${bottleneck.downstreamDepartments.length} affected departments`);
      } else if (bottleneck.bottleneckType === 'obvious') {
        actions.push('Immediate capacity assessment required');
        actions.push('Consider temporary staff augmentation');
        actions.push('Activate surge protocols if available');
      } else {
        actions.push('Monitor trend closely for escalation');
        actions.push('Prepare contingency plans');
        actions.push('Review recent operational changes');
      }

      alerts.push({
        id: generateAlertId(),
        severity,
        category: 'bottleneck',
        departmentName: bottleneck.departmentName,
        title: `${bottleneck.bottleneckType.charAt(0).toUpperCase() + bottleneck.bottleneckType.slice(1)} Bottleneck Detected`,
        message: `${bottleneck.departmentName} has an impact score of ${bottleneck.overallImpactScore.toFixed(1)} affecting ${bottleneck.patientsAffected} patients. ${bottleneck.whyBottleneck}`,
        timestamp: new Date().toISOString(),
        metrics: {
          current: bottleneck.overallImpactScore,
          threshold: thresholds.bottleneckImpactScore,
          unit: 'impact score',
        },
        actionable: true,
        recommendedActions: actions,
      });
    }

    if (bottleneck.timeDeviation >= thresholds.avgProcessingTimeIncrease) {
      alerts.push({
        id: generateAlertId(),
        severity: bottleneck.timeDeviation >= 100 ? 'critical' : 'warning',
        category: 'discharge_delay',
        departmentName: bottleneck.departmentName,
        title: 'Processing Time Significantly Elevated',
        message: `${bottleneck.departmentName} processing time is ${bottleneck.timeDeviation.toFixed(1)}% above expected, likely causing discharge delays for ${bottleneck.patientsAffected} patients.`,
        timestamp: new Date().toISOString(),
        metrics: {
          current: bottleneck.actualTime,
          threshold: bottleneck.expectedTime,
          unit: 'minutes',
        },
        actionable: true,
        recommendedActions: [
          'Identify specific delay causes',
          'Expedite discharge planning for ready patients',
          'Review staffing levels and skill mix',
          'Implement fast-track protocols if applicable',
        ],
      });
    }
  }

  return alerts;
}

export async function detectCapacityAlerts(
  filters?: GlobalFilters,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): Promise<Alert[]> {
  const utilization = await getDepartmentUtilization(filters);
  const alerts: Alert[] = [];

  for (const dept of utilization) {
    if (dept.bedUtilization >= thresholds.bedUtilizationCritical) {
      alerts.push({
        id: generateAlertId(),
        severity: 'critical',
        category: 'capacity',
        departmentName: dept.name,
        title: 'Critical Bed Capacity Reached',
        message: `${dept.name} is at ${dept.bedUtilization.toFixed(1)}% bed utilization. Immediate action required to prevent patient flow gridlock.`,
        timestamp: new Date().toISOString(),
        metrics: {
          current: dept.bedUtilization,
          threshold: thresholds.bedUtilizationCritical,
          unit: '%',
        },
        actionable: true,
        recommendedActions: [
          'Activate bed management protocols',
          'Accelerate discharge process for clinically ready patients',
          'Consider transfer to alternate facilities',
          'Implement admission diversion if necessary',
          'Deploy additional resources immediately',
        ],
      });
    } else if (dept.bedUtilization >= thresholds.bedUtilizationWarning) {
      alerts.push({
        id: generateAlertId(),
        severity: 'warning',
        category: 'capacity',
        departmentName: dept.name,
        title: 'High Bed Utilization',
        message: `${dept.name} is approaching capacity at ${dept.bedUtilization.toFixed(1)}% bed utilization. Prepare for potential constraints.`,
        timestamp: new Date().toISOString(),
        metrics: {
          current: dept.bedUtilization,
          threshold: thresholds.bedUtilizationWarning,
          unit: '%',
        },
        actionable: true,
        recommendedActions: [
          'Review expected discharges for next 24 hours',
          'Prepare surge capacity plans',
          'Coordinate with bed management team',
          'Monitor admission rates closely',
        ],
      });
    }

    if (dept.staffUtilization > 10) {
      alerts.push({
        id: generateAlertId(),
        severity: 'critical',
        category: 'capacity',
        departmentName: dept.name,
        title: 'Staff Overutilization',
        message: `${dept.name} staff handling ${dept.staffUtilization.toFixed(1)} patients per staff member. Risk of burnout and quality issues.`,
        timestamp: new Date().toISOString(),
        metrics: {
          current: dept.staffUtilization,
          threshold: 8,
          unit: 'patients per staff',
        },
        actionable: true,
        recommendedActions: [
          'Deploy float pool staff immediately',
          'Implement mandatory breaks to prevent burnout',
          'Consider overtime authorization',
          'Review patient acuity and adjust assignments',
        ],
      });
    }
  }

  return alerts;
}

export async function detectReadmissionRiskAlerts(
  filters?: GlobalFilters,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): Promise<Alert[]> {
  const bottlenecks = await detectBottlenecks(filters);
  const alerts: Alert[] = [];

  for (const bottleneck of bottlenecks) {
    const baseReadmissionRisk = 15;
    const timeImpact = (bottleneck.actualTime / 60) * 0.5;
    const delayImpact = bottleneck.downstreamDepartments.length * 2;
    const estimatedRisk = baseReadmissionRisk + timeImpact + delayImpact;

    if (estimatedRisk >= thresholds.readmissionRiskHigh) {
      alerts.push({
        id: generateAlertId(),
        severity: estimatedRisk >= 35 ? 'critical' : 'warning',
        category: 'readmission_risk',
        departmentName: bottleneck.departmentName,
        title: 'Elevated Readmission Risk',
        message: `Bottleneck conditions in ${bottleneck.departmentName} creating ${estimatedRisk.toFixed(1)}% estimated readmission risk due to prolonged processing times and care coordination issues.`,
        timestamp: new Date().toISOString(),
        metrics: {
          current: Math.round(estimatedRisk * 10) / 10,
          threshold: thresholds.readmissionRiskHigh,
          unit: '% risk',
        },
        actionable: true,
        recommendedActions: [
          'Enhance discharge planning and patient education',
          'Implement post-discharge follow-up calls within 48 hours',
          'Coordinate care transitions with primary care',
          'Review medication reconciliation processes',
          'Consider transitional care programs',
        ],
      });
    }
  }

  return alerts;
}

export async function getAllAlerts(
  filters?: GlobalFilters,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS
): Promise<Alert[]> {
  const [bottleneckAlerts, capacityAlerts, readmissionAlerts] = await Promise.all([
    detectBottleneckAlerts(filters, thresholds),
    detectCapacityAlerts(filters, thresholds),
    detectReadmissionRiskAlerts(filters, thresholds),
  ]);

  const allAlerts = [...bottleneckAlerts, ...capacityAlerts, ...readmissionAlerts];

  allAlerts.sort((a, b) => {
    const severityOrder = { critical: 3, warning: 2, info: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  return allAlerts;
}

export function getAlertsByDepartment(alerts: Alert[], departmentName: string): Alert[] {
  return alerts.filter(alert => alert.departmentName === departmentName);
}

export function getAlertsBySeverity(alerts: Alert[], severity: Alert['severity']): Alert[] {
  return alerts.filter(alert => alert.severity === severity);
}

export function getAlertsByCategory(alerts: Alert[], category: Alert['category']): Alert[] {
  return alerts.filter(alert => alert.category === category);
}
