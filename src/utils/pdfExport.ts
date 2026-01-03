import type { ExecutiveReport } from '../services/reportService';
import { formatCurrency } from './currency';

function generateHTMLReport(report: ExecutiveReport): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Executive Decision Report</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
    }

    h1 {
      color: #1e40af;
      font-size: 24px;
      margin-bottom: 10px;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 10px;
    }

    h2 {
      color: #1e40af;
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #93c5fd;
      padding-bottom: 5px;
    }

    h3 {
      color: #374151;
      font-size: 16px;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .metadata {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }

    .summary-card {
      background-color: #eff6ff;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #1e40af;
    }

    .summary-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
    }

    .bottleneck-card {
      background-color: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .bottleneck-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .bottleneck-type {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-invisible {
      background-color: #fef3c7;
      color: #92400e;
    }

    .type-obvious {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .type-emerging {
      background-color: #fef9c3;
      color: #854d0e;
    }

    .metric {
      display: inline-block;
      margin-right: 20px;
      font-size: 14px;
    }

    .metric-label {
      color: #6b7280;
      font-size: 12px;
    }

    .metric-value {
      font-weight: bold;
      color: #1f2937;
    }

    ul {
      margin: 10px 0;
      padding-left: 20px;
    }

    li {
      margin-bottom: 8px;
    }

    .recommendation {
      background-color: #f9fafb;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }

    .recommendation.critical {
      border-left-color: #ef4444;
      background-color: #fef2f2;
    }

    .recommendation.high {
      border-left-color: #f59e0b;
      background-color: #fffbeb;
    }

    .urgency-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-right: 8px;
    }

    .urgency-critical {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .urgency-high {
      background-color: #fef3c7;
      color: #92400e;
    }

    .urgency-medium {
      background-color: #dbeafe;
      color: #1e40af;
    }

    .urgency-low {
      background-color: #f3f4f6;
      color: #374151;
    }

    .insight {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 12px 15px;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .next-step {
      margin-bottom: 12px;
      padding-left: 10px;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }

    @media print {
      body {
        padding: 0;
      }

      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Executive Decision Report</h1>
    <p style="font-size: 18px; color: #6b7280; margin: 0;">Bottleneck Intelligence & Optimization Analysis</p>
  </div>

  <div class="metadata">
    <p style="margin: 5px 0;"><strong>Generated:</strong> ${new Date(report.generatedAt).toLocaleString()}</p>
    <p style="margin: 5px 0;"><strong>Report Period:</strong> ${report.reportPeriod.start} to ${report.reportPeriod.end}</p>
  </div>

  <h2>Executive Summary</h2>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Total Bottlenecks</div>
      <div class="summary-value">${report.summary.totalBottlenecks}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Critical Bottlenecks</div>
      <div class="summary-value">${report.summary.criticalBottlenecks}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Est. LOS Reduction</div>
      <div class="summary-value">${report.summary.estimatedLOSReduction} days</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Projected Savings</div>
      <div class="summary-value">${formatCurrency(report.summary.projectedCostSavings)}</div>
    </div>
  </div>

  <h2>Top Bottlenecks</h2>

  ${report.topBottlenecks.map((b, idx) => `
    <div class="bottleneck-card">
      <div class="bottleneck-header">
        <h3 style="margin: 0;">#${b.rank} ${b.departmentName}</h3>
        <span class="bottleneck-type type-${b.type}">${b.type}</span>
      </div>

      <div style="margin-bottom: 15px;">
        <span class="metric">
          <span class="metric-label">Impact Score:</span>
          <span class="metric-value">${b.impactScore.toFixed(1)}</span>
        </span>
        <span class="metric">
          <span class="metric-label">Patients Affected:</span>
          <span class="metric-value">${b.patientsAffected}</span>
        </span>
      </div>

      <h4 style="color: #374151; margin-bottom: 8px;">Root Causes:</h4>
      <ul>
        ${b.rootCauses.map(cause => `<li>${cause}</li>`).join('')}
      </ul>

      <h4 style="color: #374151; margin-bottom: 8px;">Downstream Effects:</h4>
      <ul>
        ${b.downstreamEffects.map(effect => `<li>${effect}</li>`).join('')}
      </ul>
    </div>
  `).join('')}

  <h2>Recommended Actions</h2>

  ${report.recommendations.map(rec => `
    <div class="recommendation ${rec.urgency}">
      <div style="margin-bottom: 8px;">
        <span class="urgency-badge urgency-${rec.urgency}">${rec.urgency}</span>
        <strong>${rec.action}</strong>
      </div>
      <div style="font-size: 14px; color: #4b5563;">
        <p style="margin: 5px 0;"><strong>Expected Improvement:</strong> ${rec.expectedImprovement}</p>
        <p style="margin: 5px 0;"><strong>Estimated Investment:</strong> ${rec.estimatedCost}</p>
      </div>
    </div>
  `).join('')}

  <h2>Key Insights</h2>

  ${report.keyInsights.map((insight, idx) => `
    <div class="insight">
      <strong>${idx + 1}.</strong> ${insight}
    </div>
  `).join('')}

  <h2>Next Steps</h2>

  ${report.nextSteps.map((step, idx) => `
    <div class="next-step">
      <strong>${idx + 1}.</strong> ${step}
    </div>
  `).join('')}

  <div class="footer">
    <p>CareFlow - Bottleneck Intelligence System</p>
    <p>This report is generated from operational data and provides actionable insights for decision-making.</p>
  </div>
</body>
</html>
  `;

  return html;
}

export function exportReportAsPDF(report: ExecutiveReport): void {
  const htmlContent = generateHTMLReport(report);

  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Please allow pop-ups to export PDF');
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

export function exportReportAsHTML(report: ExecutiveReport): void {
  const htmlContent = generateHTMLReport(report);

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `executive-report-${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
