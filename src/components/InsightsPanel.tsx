import { AlertTriangle, TrendingUp, Activity, Zap } from 'lucide-react';
import type { FlowInsight } from '../types/flow';

interface InsightsPanelProps {
  insights: FlowInsight[];
}

const INSIGHT_ICONS = {
  delay: AlertTriangle,
  variance: Activity,
  bottleneck: Zap,
  impact: TrendingUp,
};

const SEVERITY_STYLES = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
};

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">All Systems Operating Smoothly</h3>
          <p className="text-sm text-gray-500">No significant delays or bottlenecks detected in patient flow.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => {
        const Icon = INSIGHT_ICONS[insight.type];
        const styles = SEVERITY_STYLES[insight.severity];

        return (
          <div
            key={index}
            className={`rounded-lg border p-4 ${styles.bg} ${styles.border}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-white ${styles.icon}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-gray-900">{insight.title}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
                    {insight.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{insight.description}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span>Department: {insight.department}</span>
                  <span>•</span>
                  <span>Type: {insight.type}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
