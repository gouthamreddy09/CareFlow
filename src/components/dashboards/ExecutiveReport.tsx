import React, { useState, useEffect } from 'react';
import { FileText, Download, AlertTriangle, TrendingDown } from 'lucide-react';
import { generateExecutiveReport, downloadReport, type ExecutiveReport as Report } from '../../services/reportService';
import { exportReportAsPDF, exportReportAsHTML } from '../../utils/pdfExport';
import type { GlobalFilters } from '../../types';
import { formatCurrencyCompact } from '../../utils/currency';

interface Props {
  filters?: GlobalFilters;
}

export default function ExecutiveReport({ filters }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [filters]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const generatedReport = await generateExecutiveReport(filters);
      setReport(generatedReport);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (report) {
      exportReportAsPDF(report);
    }
  };

  const handleExportHTML = () => {
    if (report) {
      exportReportAsHTML(report);
    }
  };

  const handleExportText = () => {
    if (report) {
      downloadReport(report, 'text');
    }
  };

  const handleExportJSON = () => {
    if (report) {
      downloadReport(report, 'json');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Generating executive report...</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12 text-gray-500">
          Unable to generate report
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Executive Decision Report</h2>
          <p className="text-gray-600 mt-1">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Export as PDF (using browser print)"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleExportHTML}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            HTML
          </button>
          <button
            onClick={handleExportText}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="text-sm text-blue-900">
          <strong>Report Period:</strong> {report.reportPeriod.start} to {report.reportPeriod.end}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Executive Summary
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="text-sm text-red-700 mb-1">Total Bottlenecks</div>
            <div className="text-3xl font-bold text-red-900">{report.summary.totalBottlenecks}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Critical Issues</div>
            <div className="text-3xl font-bold text-orange-900">{report.summary.criticalBottlenecks}</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-700 mb-1">LOS Reduction Potential</div>
            <div className="text-3xl font-bold text-green-900">{report.summary.estimatedLOSReduction}d</div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Projected Savings</div>
            <div className="text-3xl font-bold text-blue-900">
              {formatCurrencyCompact(report.summary.projectedCostSavings)}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          Top 3 Bottlenecks
        </h3>

        <div className="space-y-4">
          {report.topBottlenecks.map((bottleneck) => (
            <div
              key={bottleneck.rank}
              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-gray-900">#{bottleneck.rank}</span>
                    <h4 className="text-xl font-semibold text-gray-900">{bottleneck.departmentName}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      bottleneck.type === 'invisible' ? 'bg-yellow-100 text-yellow-800' :
                      bottleneck.type === 'obvious' ? 'bg-red-100 text-red-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {bottleneck.type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Impact Score</div>
                  <div className="text-2xl font-bold text-red-600">{bottleneck.impactScore.toFixed(1)}</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-1">Patients Affected</div>
                <div className="text-lg font-semibold text-gray-900">{bottleneck.patientsAffected}</div>
              </div>

              <div className="bg-red-50 rounded-lg p-4 mb-3">
                <h5 className="font-semibold text-red-900 mb-2 text-sm">Root Causes:</h5>
                <ul className="space-y-1">
                  {bottleneck.rootCauses.map((cause, idx) => (
                    <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span>{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <h5 className="font-semibold text-orange-900 mb-2 text-sm">Downstream Effects:</h5>
                <ul className="space-y-1">
                  {bottleneck.downstreamEffects.map((effect, idx) => (
                    <li key={idx} className="text-sm text-orange-800 flex items-start gap-2">
                      <span className="text-orange-600">•</span>
                      <span>{effect}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingDown className="w-6 h-6 text-green-600" />
          Recommended Actions
        </h3>

        <div className="space-y-3">
          {report.recommendations.map((rec) => (
            <div
              key={rec.priority}
              className={`rounded-lg p-4 border-l-4 ${
                rec.urgency === 'critical' ? 'bg-red-50 border-red-500' :
                rec.urgency === 'high' ? 'bg-orange-50 border-orange-500' :
                rec.urgency === 'medium' ? 'bg-blue-50 border-blue-500' :
                'bg-gray-50 border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-gray-900">#{rec.priority}</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      rec.urgency === 'critical' ? 'bg-red-200 text-red-900' :
                      rec.urgency === 'high' ? 'bg-orange-200 text-orange-900' :
                      rec.urgency === 'medium' ? 'bg-blue-200 text-blue-900' :
                      'bg-gray-200 text-gray-900'
                    }`}>
                      {rec.urgency.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{rec.action}</h4>
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>Expected Improvement:</strong> {rec.expectedImprovement}
                  </div>
                  <div className="text-sm text-gray-700">
                    <strong>Estimated Investment:</strong> {rec.estimatedCost}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Key Insights</h3>
        <div className="space-y-3">
          {report.keyInsights.map((insight, idx) => (
            <div key={idx} className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-900">{idx + 1}.</span>
                <p className="text-blue-900">{insight}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Next Steps</h3>
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
          <ol className="space-y-3">
            {report.nextSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  {idx + 1}
                </span>
                <p className="text-gray-900 pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
