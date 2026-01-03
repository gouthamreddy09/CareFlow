import { useEffect, useState } from 'react';
import { Users, Clock, RotateCcw, BedDouble, Loader2 } from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { DonutChart } from '../charts/DonutChart';
import { getExecutiveMetrics } from '../../services/analyticsService';
import { getPatients, getReadmissions } from '../../services/dataService';
import type { GlobalFilters, DashboardMetrics, Patient, Readmission } from '../../types';

interface ExecutiveOverviewProps {
  filters: GlobalFilters;
}

export function ExecutiveOverview({ filters }: ExecutiveOverviewProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [readmissions, setReadmissions] = useState<Readmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [metricsData, patientsData, readmissionsData] = await Promise.all([
          getExecutiveMetrics(filters),
          getPatients(filters),
          getReadmissions(filters),
        ]);
        setMetrics(metricsData);
        setPatients(patientsData);
        setReadmissions(readmissionsData);
      } catch (error) {
        console.error('Failed to load executive metrics:', error);
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

  if (!metrics) {
    return (
      <div className="text-center py-20 text-gray-500">
        No data available. Please upload datasets first.
      </div>
    );
  }

  const severityData = [
    { label: 'Low', value: patients.filter((p) => p.severity === 'low').length, color: '#10B981' },
    { label: 'Medium', value: patients.filter((p) => p.severity === 'medium').length, color: '#F59E0B' },
    { label: 'High', value: patients.filter((p) => p.severity === 'high').length, color: '#EF4444' },
    { label: 'Critical', value: patients.filter((p) => p.severity === 'critical').length, color: '#7C3AED' },
  ];

  const genderData = [
    { label: 'Male', value: patients.filter((p) => p.gender === 'Male').length, color: '#3B82F6' },
    { label: 'Female', value: patients.filter((p) => p.gender === 'Female').length, color: '#EC4899' },
    { label: 'Other', value: patients.filter((p) => p.gender === 'Other' || p.gender === 'Unknown').length, color: '#6B7280' },
  ];

  const readmissionReasons = readmissions.reduce((acc, r) => {
    const reason = r.reason || 'Unknown';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topReasons = Object.entries(readmissionReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Admissions"
          value={metrics.totalAdmissions.toLocaleString()}
          subtitle="Total patient admissions"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Average Length of Stay"
          value={`${metrics.averageLOS} days`}
          subtitle="Avg days per admission"
          icon={<Clock className="w-5 h-5" />}
          color="green"
        />
        <MetricCard
          title="30-Day Readmission Rate"
          value={`${metrics.readmissionRate}%`}
          subtitle="Patients readmitted within 30 days"
          icon={<RotateCcw className="w-5 h-5" />}
          color={metrics.readmissionRate > 15 ? 'red' : metrics.readmissionRate > 10 ? 'amber' : 'green'}
        />
        <MetricCard
          title="Bed Utilization"
          value={`${metrics.bedUtilization}%`}
          subtitle="Current occupancy rate"
          icon={<BedDouble className="w-5 h-5" />}
          color={metrics.bedUtilization > 90 ? 'red' : metrics.bedUtilization > 75 ? 'amber' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Patient Severity Distribution</h3>
          <DonutChart
            data={severityData}
            centerValue={patients.length}
            centerLabel="Patients"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Gender Distribution</h3>
          <DonutChart
            data={genderData.filter(d => d.value > 0)}
            centerValue={patients.length}
            centerLabel="Patients"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Top Readmission Reasons</h3>
          {topReasons.length > 0 ? (
            <div className="space-y-3">
              {topReasons.map(([reason, count], index) => (
                <div key={reason} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700 truncate max-w-[150px]">{reason}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No readmission data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Quick Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Emergency Admissions</p>
            <p className="text-xl font-semibold text-red-600 mt-1">
              {patients.filter((p) => p.admission_type === 'emergency').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Scheduled Admissions</p>
            <p className="text-xl font-semibold text-blue-600 mt-1">
              {patients.filter((p) => p.admission_type === 'scheduled').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current Inpatients</p>
            <p className="text-xl font-semibold text-emerald-600 mt-1">
              {patients.filter((p) => !p.discharge_date).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Readmissions</p>
            <p className="text-xl font-semibold text-amber-600 mt-1">
              {readmissions.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
