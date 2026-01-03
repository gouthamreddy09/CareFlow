import type { PatientRecord } from '../types';

export interface ReadmissionRisk {
  patientId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  contributingFactors: ReadmissionFactor[];
  estimatedReadmissionDate: string;
  preventionRecommendations: string[];
  operationalImpact: {
    delayInfluence: number;
    departmentRisk: string[];
  };
}

export interface ReadmissionFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface ReadmissionTrend {
  period: string;
  totalReadmissions: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  preventableReadmissions: number;
}

function calculateLengthOfStay(admissionDate: string, dischargeDate: string): number {
  const admission = new Date(admissionDate).getTime();
  const discharge = new Date(dischargeDate).getTime();
  return (discharge - admission) / (1000 * 60 * 60 * 24);
}

function calculateOperationalDelayScore(record: PatientRecord): number {
  if (!record.journeySteps || record.journeySteps.length === 0) return 0;

  const totalWaitTime = record.journeySteps.reduce(
    (sum, step) => sum + (step.waitTimeMinutes || 0),
    0
  );
  const avgWaitPerStep = totalWaitTime / record.journeySteps.length;

  if (avgWaitPerStep > 120) return 30;
  if (avgWaitPerStep > 90) return 20;
  if (avgWaitPerStep > 60) return 10;
  return 0;
}

function identifyHighRiskDepartments(record: PatientRecord): string[] {
  const highRiskDepts: string[] = [];

  if (record.journeySteps) {
    record.journeySteps.forEach(step => {
      if (step.waitTimeMinutes > 120) {
        if (!highRiskDepts.includes(step.departmentId)) {
          highRiskDepts.push(step.departmentId);
        }
      }
    });
  }

  return highRiskDepts;
}

export function predictReadmissionRisk(
  record: PatientRecord,
  historicalRecords: PatientRecord[]
): ReadmissionRisk {
  const factors: ReadmissionFactor[] = [];
  let totalRiskScore = 0;

  const lengthOfStay = record.admissionDate && record.dischargeDate
    ? calculateLengthOfStay(record.admissionDate, record.dischargeDate)
    : 0;

  if (lengthOfStay > 0) {
    if (lengthOfStay < 2) {
      const impact = 25;
      totalRiskScore += impact;
      factors.push({
        factor: 'Short Length of Stay',
        impact,
        description: `LOS of ${lengthOfStay.toFixed(1)} days indicates potential premature discharge`
      });
    } else if (lengthOfStay > 14) {
      const impact = 20;
      totalRiskScore += impact;
      factors.push({
        factor: 'Extended Length of Stay',
        impact,
        description: `LOS of ${lengthOfStay.toFixed(1)} days suggests complex medical needs`
      });
    }
  }

  const operationalDelayScore = calculateOperationalDelayScore(record);
  if (operationalDelayScore > 0) {
    totalRiskScore += operationalDelayScore;
    factors.push({
      factor: 'Operational Delays',
      impact: operationalDelayScore,
      description: 'Significant wait times may indicate rushed care or incomplete treatment'
    });
  }

  if (record.journeySteps) {
    const departmentChanges = record.journeySteps.length;
    if (departmentChanges > 5) {
      const impact = 15;
      totalRiskScore += impact;
      factors.push({
        factor: 'Multiple Department Transfers',
        impact,
        description: `${departmentChanges} transfers increase coordination complexity`
      });
    }
  }

  const patientHistory = historicalRecords.filter(
    r => r.patientId === record.patientId && r.id !== record.id
  );

  if (patientHistory.length > 0) {
    const recentVisits = patientHistory.filter(r => {
      if (!r.admissionDate || !record.admissionDate) return false;
      const daysDiff = (new Date(record.admissionDate).getTime() -
                       new Date(r.admissionDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 0 && daysDiff < 90;
    });

    if (recentVisits.length > 0) {
      const impact = Math.min(30, recentVisits.length * 15);
      totalRiskScore += impact;
      factors.push({
        factor: 'Recent Hospital Visits',
        impact,
        description: `${recentVisits.length} visits in last 90 days indicates ongoing health issues`
      });
    }
  }

  if (record.admissionDate) {
    const dayOfWeek = new Date(record.admissionDate).getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      const impact = 10;
      totalRiskScore += impact;
      factors.push({
        factor: 'Weekend Discharge',
        impact,
        description: 'Limited follow-up care availability increases readmission risk'
      });
    }
  }

  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (totalRiskScore >= 70) riskLevel = 'critical';
  else if (totalRiskScore >= 50) riskLevel = 'high';
  else if (totalRiskScore >= 30) riskLevel = 'medium';
  else riskLevel = 'low';

  const daysUntilReadmission = riskLevel === 'critical' ? 7 :
                               riskLevel === 'high' ? 14 :
                               riskLevel === 'medium' ? 30 : 90;

  const estimatedDate = new Date(record.dischargeDate || new Date());
  estimatedDate.setDate(estimatedDate.getDate() + daysUntilReadmission);

  const recommendations = generateRecommendations(factors, riskLevel);
  const highRiskDepartments = identifyHighRiskDepartments(record);

  return {
    patientId: record.patientId,
    riskScore: totalRiskScore,
    riskLevel,
    contributingFactors: factors.sort((a, b) => b.impact - a.impact),
    estimatedReadmissionDate: estimatedDate.toISOString().split('T')[0],
    preventionRecommendations: recommendations,
    operationalImpact: {
      delayInfluence: operationalDelayScore,
      departmentRisk: highRiskDepartments
    }
  };
}

function generateRecommendations(
  factors: ReadmissionFactor[],
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
): string[] {
  const recommendations: string[] = [];

  if (riskLevel === 'critical' || riskLevel === 'high') {
    recommendations.push('Schedule follow-up appointment within 48-72 hours of discharge');
    recommendations.push('Arrange home health care visit within first week');
  }

  factors.forEach(factor => {
    switch (factor.factor) {
      case 'Short Length of Stay':
        recommendations.push('Ensure comprehensive discharge planning and patient education');
        recommendations.push('Verify patient understanding of medications and care instructions');
        break;
      case 'Extended Length of Stay':
        recommendations.push('Coordinate with specialist for complex care management');
        recommendations.push('Establish clear post-discharge care plan with primary care provider');
        break;
      case 'Operational Delays':
        recommendations.push('Review care coordination to reduce treatment gaps');
        recommendations.push('Ensure all pending test results are reviewed before discharge');
        break;
      case 'Multiple Department Transfers':
        recommendations.push('Assign care coordinator for transition management');
        recommendations.push('Conduct comprehensive medication reconciliation');
        break;
      case 'Recent Hospital Visits':
        recommendations.push('Evaluate for chronic disease management program enrollment');
        recommendations.push('Consider palliative care consultation if appropriate');
        break;
      case 'Weekend Discharge':
        recommendations.push('Ensure 24/7 contact information provided to patient');
        recommendations.push('Schedule next-day follow-up call to assess patient status');
        break;
    }
  });

  return Array.from(new Set(recommendations)).slice(0, 5);
}

export function analyzeReadmissionTrends(
  records: PatientRecord[],
  historicalRecords: PatientRecord[]
): ReadmissionTrend[] {
  const monthlyData = new Map<string, {
    readmissions: ReadmissionRisk[];
    total: number;
  }>();

  records.forEach(record => {
    if (!record.dischargeDate) return;

    const month = record.dischargeDate.substring(0, 7);
    const risk = predictReadmissionRisk(record, historicalRecords);

    if (!monthlyData.has(month)) {
      monthlyData.set(month, { readmissions: [], total: 0 });
    }

    const data = monthlyData.get(month)!;
    data.readmissions.push(risk);
    data.total++;
  });

  const trends: ReadmissionTrend[] = [];

  monthlyData.forEach((data, month) => {
    const distribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    data.readmissions.forEach(risk => {
      distribution[risk.riskLevel]++;
    });

    const preventable = data.readmissions.filter(
      risk => risk.operationalImpact.delayInfluence > 10
    ).length;

    trends.push({
      period: month,
      totalReadmissions: data.total,
      riskDistribution: distribution,
      preventableReadmissions: preventable
    });
  });

  return trends.sort((a, b) => a.period.localeCompare(b.period));
}

export function identifyHighRiskPatients(
  records: PatientRecord[],
  historicalRecords: PatientRecord[]
): ReadmissionRisk[] {
  const risks = records
    .filter(r => r.dischargeDate)
    .map(record => predictReadmissionRisk(record, historicalRecords))
    .filter(risk => risk.riskLevel === 'high' || risk.riskLevel === 'critical');

  return risks.sort((a, b) => b.riskScore - a.riskScore);
}
