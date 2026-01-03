import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { LineChart } from '../charts/LineChart';
import { BarChart } from '../charts/BarChart';
import { getAdmissionTrends } from '../../services/analyticsService';
import { getPatients } from '../../services/dataService';
import type { GlobalFilters, AdmissionTrend, Patient } from '../../types';

interface AdmissionTrendsProps {
  filters: GlobalFilters;
}

export function AdmissionTrends({ filters }: AdmissionTrendsProps) {
  const [trends, setTrends] = useState<AdmissionTrend[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [groupBy, setGroupBy] = useState<'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [trendsData, patientsData] = await Promise.all([
          getAdmissionTrends(filters, groupBy),
          getPatients(filters),
        ]);
        setTrends(trendsData);
        setPatients(patientsData);
      } catch (error) {
        console.error('Failed to load admission trends:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters, groupBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        No admission data available. Please upload patient records first.
      </div>
    );
  }

  const lineChartData = trends.map((t) => ({
    label: formatPeriodLabel(t.period, groupBy),
    values: [
      { name: 'Emergency', value: t.emergency, color: '#EF4444' },
      { name: 'Scheduled', value: t.scheduled, color: '#3B82F6' },
    ],
  }));

  const totalChartData = trends.map((t) => ({
    label: formatPeriodLabel(t.period, groupBy),
    value: t.total,
    color: '#10B981',
  }));

  const weekdayDistribution = calculateWeekdayDistribution(patients);
  const ageGroups = calculateAgeGroups(patients);

  const emergencyTotal = trends.reduce((sum, t) => sum + t.emergency, 0);
  const scheduledTotal = trends.reduce((sum, t) => sum + t.scheduled, 0);
  const emergencyRate = ((emergencyTotal / (emergencyTotal + scheduledTotal)) * 100) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Total Trend</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {trends.reduce((sum, t) => sum + t.total, 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total admissions in period</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Emergency Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{emergencyRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">{emergencyTotal} emergency admissions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Scheduled Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{(100 - emergencyRate).toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">{scheduledTotal} scheduled admissions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-gray-700">Admission Trends Over Time</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGroupBy('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                groupBy === 'week'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setGroupBy('month')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                groupBy === 'month'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
        <LineChart data={lineChartData} height={280} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Total Admissions by Period</h3>
          <BarChart data={totalChartData.slice(-12)} height={220} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Admissions by Day of Week</h3>
          <BarChart data={weekdayDistribution} height={220} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Admissions by Age Group</h3>
        <BarChart data={ageGroups} horizontal height={250} />
      </div>
    </div>
  );
}

function formatPeriodLabel(period: string, groupBy: 'week' | 'month'): string {
  if (groupBy === 'month') {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  const date = new Date(period);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function calculateWeekdayDistribution(patients: Patient[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = new Array(7).fill(0);

  for (const patient of patients) {
    if (patient.admission_date) {
      const day = new Date(patient.admission_date).getDay();
      counts[day]++;
    }
  }

  return days.map((label, i) => ({
    label,
    value: counts[i],
    color: i === 0 || i === 6 ? '#94A3B8' : '#3B82F6',
  }));
}

function calculateAgeGroups(patients: Patient[]) {
  const groups = [
    { label: '0-17', min: 0, max: 17, value: 0 },
    { label: '18-34', min: 18, max: 34, value: 0 },
    { label: '35-49', min: 35, max: 49, value: 0 },
    { label: '50-64', min: 50, max: 64, value: 0 },
    { label: '65-79', min: 65, max: 79, value: 0 },
    { label: '80+', min: 80, max: 150, value: 0 },
  ];

  for (const patient of patients) {
    const age = patient.age || 0;
    const group = groups.find((g) => age >= g.min && age <= g.max);
    if (group) group.value++;
  }

  const colors = ['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444'];
  return groups.map((g, i) => ({
    label: g.label,
    value: g.value,
    color: colors[i],
  }));
}
