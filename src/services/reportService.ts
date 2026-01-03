import type { GlobalFilters } from '../types';
import { detectBottlenecks } from './bottleneckDetectionService';
import { getPrioritizedOptimizations, getCostToImpactAnalysis } from './optimizationService';
import { getAllAlerts } from './alertsService';
import { formatCurrency } from '../utils/currency';

export interface ExecutiveReport {
  generatedAt: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  summary: {
    totalBottlenecks: number;
    criticalBottlenecks: number;
    estimatedLOSReduction: number;
    projectedCostSavings: number;
  };
  topBottlenecks: {
    rank: number;
    departmentName: string;
    type: 'invisible' | 'obvious' | 'emerging';
    impactScore: number;
    patientsAffected: number;
    rootCauses: string[];
    downstreamEffects: string[];
  }[];
  recommendations: {
    priority: number;
    action: string;
    expectedImprovement: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    estimatedCost: string;
  }[];
  keyInsights: string[];
  nextSteps: string[];
}

function identifyRootCauses(
  bottleneck: any
): string[] {
  const causes: string[] = [];

  if (bottleneck.timeDeviation > 50) {
    causes.push(`Processing time exceeds baseline by ${bottleneck.timeDeviation.toFixed(1)}%`);
  }

  if (bottleneck.varianceRatio > 1.5) {
    causes.push('Highly inconsistent processing times indicating unpredictable workflow');
  }

  if (bottleneck.zScore > 2) {
    causes.push('Statistically abnormal performance compared to other departments');
  }

  if (bottleneck.delayPropagationScore > 40) {
    causes.push('Creates cascading delays affecting downstream departments');
  }

  if (bottleneck.congestionIndicator > 1.0) {
    causes.push('Congestion and queuing effects causing patient backlog');
  }

  if (bottleneck.loadLevel === 'high') {
    causes.push('Operating at or above capacity with insufficient resources');
  }

  if (causes.length === 0) {
    causes.push('Process inefficiencies detected requiring operational review');
  }

  return causes;
}

function generateKeyInsights(
  bottlenecks: any[],
  recommendations: any[],
  alerts: any[]
): string[] {
  const insights: string[] = [];

  const invisibleBottlenecks = bottlenecks.filter(b => b.bottleneckType === 'invisible');
  if (invisibleBottlenecks.length > 0) {
    insights.push(
      `${invisibleBottlenecks.length} invisible bottleneck${invisibleBottlenecks.length > 1 ? 's' : ''} detected - departments with moderate load but significant downstream impact requiring immediate attention`
    );
  }

  const obviousBottlenecks = bottlenecks.filter(b => b.bottleneckType === 'obvious');
  if (obviousBottlenecks.length > 0) {
    insights.push(
      `${obviousBottlenecks.length} obvious bottleneck${obviousBottlenecks.length > 1 ? 's' : ''} identified - high-load departments with clear capacity constraints`
    );
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    insights.push(
      `${criticalAlerts.length} critical alert${criticalAlerts.length > 1 ? 's' : ''} requiring immediate intervention to prevent operational gridlock`
    );
  }

  const highImpact = bottlenecks.filter(b => b.overallImpactScore > 70);
  if (highImpact.length > 0) {
    const totalPatientsAffected = highImpact.reduce((sum, b) => sum + b.patientsAffected, 0);
    insights.push(
      `High-impact bottlenecks affecting ${totalPatientsAffected} patients, with potential for significant operational improvement`
    );
  }

  const urgentRecs = recommendations.filter(r => r.urgency === 'critical' || r.urgency === 'high');
  if (urgentRecs.length > 0) {
    insights.push(
      `${urgentRecs.length} high-priority recommendation${urgentRecs.length > 1 ? 's' : ''} identified with strong ROI potential`
    );
  }

  const departments = [...new Set(bottlenecks.map(b => b.departmentName))];
  if (departments.length > 0) {
    insights.push(
      `${departments.length} department${departments.length > 1 ? 's' : ''} require optimization focus: ${departments.slice(0, 3).join(', ')}${departments.length > 3 ? ', and others' : ''}`
    );
  }

  if (insights.length === 0) {
    insights.push('No significant bottlenecks detected - operations performing within expected parameters');
  }

  return insights;
}

function generateNextSteps(
  bottlenecks: any[],
  recommendations: any[]
): string[] {
  const steps: string[] = [];

  if (bottlenecks.length === 0) {
    steps.push('Continue monitoring key performance indicators');
    steps.push('Maintain current operational protocols');
    steps.push('Plan for capacity management during anticipated surge periods');
    return steps;
  }

  const criticalRecs = recommendations.filter(r => r.urgency === 'critical');
  if (criticalRecs.length > 0) {
    steps.push(
      `Immediate action: Address ${criticalRecs[0].departmentName} ${criticalRecs[0].recommendationType} requirements within 24-48 hours`
    );
  }

  const processImprovements = recommendations.filter(r => r.recommendationType === 'process_improvement');
  if (processImprovements.length > 0) {
    steps.push(
      `Schedule operational review for ${processImprovements[0].departmentName} within next week to identify workflow improvements`
    );
  }

  const staffingNeeds = recommendations.filter(r => r.recommendationType === 'staff');
  if (staffingNeeds.length > 0) {
    steps.push(
      'Conduct staffing analysis and develop recruitment or reallocation plan within 2 weeks'
    );
  }

  const capacityNeeds = recommendations.filter(r => r.recommendationType === 'beds');
  if (capacityNeeds.length > 0) {
    steps.push(
      'Initiate capacity expansion planning and explore short-term solutions'
    );
  }

  steps.push('Implement recommended interventions in priority order');
  steps.push('Establish monitoring metrics to track improvement');
  steps.push('Schedule follow-up assessment in 30 days to measure impact');

  return steps;
}

export async function generateExecutiveReport(
  filters?: GlobalFilters
): Promise<ExecutiveReport> {
  const bottlenecks = await detectBottlenecks(filters);
  const recommendations = await getPrioritizedOptimizations(filters);
  const costToImpact = await getCostToImpactAnalysis(filters);
  const alerts = await getAllAlerts(filters);

  const topBottlenecks = bottlenecks.slice(0, 3).map(b => ({
    rank: b.rank,
    departmentName: b.departmentName,
    type: b.bottleneckType,
    impactScore: b.overallImpactScore,
    patientsAffected: b.patientsAffected,
    rootCauses: identifyRootCauses(b),
    downstreamEffects: b.downstreamEffects,
  }));

  const criticalBottlenecks = bottlenecks.filter(b => b.overallImpactScore > 70).length;

  const estimatedLOSReduction = recommendations.slice(0, 3).reduce(
    (sum, r) => sum + r.expectedImpact.losReduction,
    0
  );

  const projectedCostSavings = recommendations.slice(0, 3).reduce(
    (sum, r) => sum + r.expectedImpact.costSavings,
    0
  );

  const topRecommendations = recommendations.slice(0, 5).map((rec, idx) => ({
    priority: idx + 1,
    action: `${rec.recommendationType.replace('_', ' ')} optimization for ${rec.departmentName}`,
    expectedImprovement: `${rec.expectedImpact.losReduction.toFixed(1)} day LOS reduction, ${rec.expectedImpact.patientThroughputIncrease} more patients/month`,
    urgency: rec.urgency,
    estimatedCost: formatCurrency(rec.expectedImpact.costSavings * 0.3),
  }));

  const keyInsights = generateKeyInsights(bottlenecks, recommendations, alerts);
  const nextSteps = generateNextSteps(bottlenecks, recommendations);

  const now = new Date();
  const reportPeriod = filters?.dateRange || {
    start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };

  return {
    generatedAt: now.toISOString(),
    reportPeriod,
    summary: {
      totalBottlenecks: bottlenecks.length,
      criticalBottlenecks,
      estimatedLOSReduction: Math.round(estimatedLOSReduction * 10) / 10,
      projectedCostSavings: Math.round(projectedCostSavings),
    },
    topBottlenecks,
    recommendations: topRecommendations,
    keyInsights,
    nextSteps,
  };
}

export function formatReportAsText(report: ExecutiveReport): string {
  let text = '';

  text += '='.repeat(80) + '\n';
  text += 'EXECUTIVE DECISION REPORT - BOTTLENECK INTELLIGENCE\n';
  text += '='.repeat(80) + '\n\n';

  text += `Generated: ${new Date(report.generatedAt).toLocaleString()}\n`;
  text += `Period: ${report.reportPeriod.start} to ${report.reportPeriod.end}\n\n`;

  text += '-'.repeat(80) + '\n';
  text += 'EXECUTIVE SUMMARY\n';
  text += '-'.repeat(80) + '\n';
  text += `Total Bottlenecks Identified: ${report.summary.totalBottlenecks}\n`;
  text += `Critical Bottlenecks: ${report.summary.criticalBottlenecks}\n`;
  text += `Estimated LOS Reduction Potential: ${report.summary.estimatedLOSReduction} days\n`;
  text += `Projected Annual Cost Savings: ${formatCurrency(report.summary.projectedCostSavings)}\n\n`;

  text += '-'.repeat(80) + '\n';
  text += 'TOP 3 BOTTLENECKS\n';
  text += '-'.repeat(80) + '\n';
  report.topBottlenecks.forEach((b, idx) => {
    text += `\n${idx + 1}. ${b.departmentName.toUpperCase()} (${b.type.toUpperCase()})\n`;
    text += `   Impact Score: ${b.impactScore.toFixed(1)} | Patients Affected: ${b.patientsAffected}\n\n`;
    text += '   Root Causes:\n';
    b.rootCauses.forEach(cause => {
      text += `   • ${cause}\n`;
    });
    text += '\n   Downstream Effects:\n';
    b.downstreamEffects.forEach(effect => {
      text += `   • ${effect}\n`;
    });
    text += '\n';
  });

  text += '-'.repeat(80) + '\n';
  text += 'RECOMMENDED ACTIONS\n';
  text += '-'.repeat(80) + '\n';
  report.recommendations.forEach(rec => {
    const urgencyMarker = rec.urgency === 'critical' ? '[CRITICAL] ' : rec.urgency === 'high' ? '[HIGH] ' : '';
    text += `\n${rec.priority}. ${urgencyMarker}${rec.action}\n`;
    text += `   Expected Impact: ${rec.expectedImprovement}\n`;
    text += `   Estimated Investment: ${rec.estimatedCost}\n`;
  });

  text += '\n' + '-'.repeat(80) + '\n';
  text += 'KEY INSIGHTS\n';
  text += '-'.repeat(80) + '\n';
  report.keyInsights.forEach((insight, idx) => {
    text += `${idx + 1}. ${insight}\n\n`;
  });

  text += '-'.repeat(80) + '\n';
  text += 'NEXT STEPS\n';
  text += '-'.repeat(80) + '\n';
  report.nextSteps.forEach((step, idx) => {
    text += `${idx + 1}. ${step}\n\n`;
  });

  text += '='.repeat(80) + '\n';
  text += 'END OF REPORT\n';
  text += '='.repeat(80) + '\n';

  return text;
}

export function exportReportAsJSON(report: ExecutiveReport): string {
  return JSON.stringify(report, null, 2);
}

export function downloadReport(report: ExecutiveReport, format: 'text' | 'json') {
  const content = format === 'json'
    ? exportReportAsJSON(report)
    : formatReportAsText(report);

  const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `executive-report-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'txt'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
