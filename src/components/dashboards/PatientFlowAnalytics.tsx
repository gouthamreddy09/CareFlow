import { useEffect, useState } from 'react';
import { Activity, Clock, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';
import { SankeyDiagram } from '../charts/SankeyDiagram';
import { DonutChart } from '../charts/DonutChart';
import { BarChart } from '../charts/BarChart';
import { JourneyTimeline } from '../JourneyTimeline';
import { InsightsPanel } from '../InsightsPanel';
import { MetricCard } from '../MetricCard';
import {
  getPatientJourneys,
  getDepartmentDelays,
  getPatientFlowPaths,
  getDepartmentTimeContributions,
  generateFlowInsights,
  getCategoryTimeBreakdown,
  CATEGORY_COLORS,
} from '../../services/patientFlowService';
import type { GlobalFilters } from '../../types';
import type {
  PatientJourney,
  DepartmentDelay,
  PatientFlowPath,
  DepartmentTimeContribution,
  FlowInsight,
} from '../../types/flow';

interface PatientFlowAnalyticsProps {
  filters: GlobalFilters;
}

export function PatientFlowAnalytics({ filters }: PatientFlowAnalyticsProps) {
  const [journeys, setJourneys] = useState<PatientJourney[]>([]);
  const [delays, setDelays] = useState<DepartmentDelay[]>([]);
  const [flowPaths, setFlowPaths] = useState<PatientFlowPath[]>([]);
  const [timeContributions, setTimeContributions] = useState<DepartmentTimeContribution[]>([]);
  const [insights, setInsights] = useState<FlowInsight[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [
          journeysData,
          delaysData,
          pathsData,
          contributionsData,
          insightsData,
          categoryData,
        ] = await Promise.all([
          getPatientJourneys(filters),
          getDepartmentDelays(filters),
          getPatientFlowPaths(filters),
          getDepartmentTimeContributions(filters),
          generateFlowInsights(filters),
          getCategoryTimeBreakdown(filters),
        ]);

        setJourneys(journeysData);
        setDelays(delaysData);
        setFlowPaths(pathsData);
        setTimeContributions(contributionsData);
        setInsights(insightsData);
        setCategoryBreakdown(categoryData);
      } catch (error) {
        console.error('Failed to load patient flow data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (journeys.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        No patient flow data available. Please upload department flow logs first.
      </div>
    );
  }

  const avgJourneyDuration = journeys.reduce((sum, j) => sum + j.totalDuration, 0) / journeys.length;
  const avgStages = journeys.reduce((sum, j) => sum + j.stages.length, 0) / journeys.length;
  const totalDelayRatio = delays.length > 0
    ? delays.reduce((sum, d) => sum + d.delayRatio, 0) / delays.length
    : 1;

  const categoryData = Object.entries(categoryBreakdown).map(([category, time]) => ({
    label: category,
    value: Math.round(time),
    color: CATEGORY_COLORS[category] || '#6B7280',
  }));

  const delayRatioData = delays.slice(0, 10).map(d => ({
    label: d.departmentName,
    value: d.delayRatio,
    color: d.delayRatio > 1.5 ? '#EF4444' : d.delayRatio > 1.2 ? '#F59E0B' : '#10B981',
  }));

  const varianceData = delays
    .filter(d => d.variance > 0)
    .sort((a, b) => b.variance - a.variance)
    .slice(0, 8)
    .map(d => ({
      label: d.departmentName,
      value: d.variance,
      color: '#8B5CF6',
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Journey Duration"
          value={`${Math.round(avgJourneyDuration)} min`}
          subtitle={`${Math.round(avgJourneyDuration / 60)} hours average`}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Avg Stages per Journey"
          value={avgStages.toFixed(1)}
          subtitle={`${journeys.length} total journeys`}
          icon={<Activity className="w-5 h-5" />}
          color="green"
        />
        <MetricCard
          title="Overall Delay Ratio"
          value={totalDelayRatio.toFixed(2)}
          subtitle="Actual vs Expected Time"
          icon={<TrendingUp className="w-5 h-5" />}
          color={totalDelayRatio > 1.5 ? 'red' : totalDelayRatio > 1.2 ? 'amber' : 'green'}
        />
        <MetricCard
          title="Active Insights"
          value={insights.length}
          subtitle={`${insights.filter(i => i.severity === 'high').length} high severity`}
          icon={<AlertCircle className="w-5 h-5" />}
          color={insights.filter(i => i.severity === 'high').length > 0 ? 'red' : 'gray'}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Automated Insights</h3>
        <InsightsPanel insights={insights} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Time by Category</h3>
          <DonutChart
            data={categoryData}
            size={220}
            centerValue={Math.round(avgJourneyDuration)}
            centerLabel="Avg Minutes"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Department Time Contributions</h3>
          {timeContributions.length > 0 ? (
            <div className="space-y-3">
              {timeContributions.slice(0, 8).map((contrib) => (
                <div key={contrib.department}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{contrib.department}</span>
                    <span className="text-gray-500">{contrib.percentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${contrib.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                    <span>{contrib.avgTime} min avg</span>
                    <span>{contrib.patientCount} patients</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Patient Flow Paths (Sankey Diagram)</h3>
            <p className="text-xs text-gray-500 mt-1">
              Visual representation of patient movement between departments. Hover to see details.
            </p>
          </div>
          {flowPaths.length > 0 && (
            <div className="text-xs text-gray-500">
              {flowPaths.length} unique paths
            </div>
          )}
        </div>
        {flowPaths.length > 0 ? (
          <SankeyDiagram paths={flowPaths.slice(0, 25)} height={500} />
        ) : (
          <div className="flex items-center justify-center text-gray-400 py-12">
            <div className="text-center">
              <p className="font-medium">No patient flow paths found</p>
              <p className="text-sm mt-1">Flow paths require patients to move between at least two departments</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Sample Patient Journeys</h3>
        <JourneyTimeline journeys={journeys} maxDisplay={12} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Department Delay Ratios</h3>
          <p className="text-xs text-gray-500 mb-4">Actual time / Median time (higher = more delays)</p>
          {delayRatioData.length > 0 ? (
            <BarChart data={delayRatioData} horizontal height={300} />
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No delay data available</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Processing Time Variance</h3>
          <p className="text-xs text-gray-500 mb-4">Higher variance indicates inconsistent processing</p>
          {varianceData.length > 0 ? (
            <BarChart data={varianceData} horizontal height={300} />
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No variance data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Department Process Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Median Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Avg
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delay Ratio
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Queue Buildup
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LOS Impact
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {delays.map((delay) => (
                <tr key={delay.departmentName} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{delay.departmentName}</span>
                      <span className="block text-xs text-gray-500">{delay.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                    {delay.medianTime} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                    {delay.actualAvgTime} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`text-sm font-medium ${
                        delay.delayRatio > 1.5
                          ? 'text-red-600'
                          : delay.delayRatio > 1.2
                          ? 'text-amber-600'
                          : 'text-green-600'
                      }`}
                    >
                      {delay.delayRatio}x
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                    {delay.variance} min²
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`text-sm ${
                        delay.queueBuildup > 1.5
                          ? 'text-red-600 font-medium'
                          : delay.queueBuildup > 1.2
                          ? 'text-amber-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {delay.queueBuildup}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-900">{delay.impactOnLOS}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
