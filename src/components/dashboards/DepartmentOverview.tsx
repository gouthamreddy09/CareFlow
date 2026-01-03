import { useEffect, useState } from 'react';
import { Building2, Users, Clock, Loader2 } from 'lucide-react';
import { BarChart } from '../charts/BarChart';
import { getDepartmentStats, getTotalUniquePatients } from '../../services/analyticsService';
import { getDepartments } from '../../services/dataService';
import type { GlobalFilters, DepartmentStats, Department } from '../../types';

interface DepartmentOverviewProps {
  filters: GlobalFilters;
}

export function DepartmentOverview({ filters }: DepartmentOverviewProps) {
  const [stats, setStats] = useState<DepartmentStats[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsData, departmentsData, uniquePatientsCount] = await Promise.all([
          getDepartmentStats(filters),
          getDepartments(),
          getTotalUniquePatients(filters),
        ]);
        setStats(statsData);

        const filteredDepartments = filters.department
          ? departmentsData.filter(d => d.name === filters.department)
          : departmentsData;

        setDepartments(filteredDepartments);
        setTotalPatients(uniquePatientsCount);
      } catch (error) {
        console.error('Failed to load department stats:', error);
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

  if (stats.length === 0 && departments.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        No department data available. Please upload hospital resources first.
      </div>
    );
  }

  const avgProcessingTime = stats.length > 0
    ? Math.round(stats.reduce((sum, s) => sum + s.avgProcessingTime, 0) / stats.length)
    : 0;
  const totalBedCapacity = departments.reduce((sum, d) => sum + (d.bed_capacity || 0), 0);
  const totalStaff = departments.reduce((sum, d) => sum + (d.staff_count || 0), 0);

  const patientsPerDeptData = stats
    .filter((s) => s.patientsHandled > 0)
    .map((s) => ({
      label: s.name,
      value: s.patientsHandled,
      color: '#3B82F6',
    }));

  const processingTimeData = stats
    .filter((s) => s.avgProcessingTime > 0)
    .map((s) => ({
      label: s.name,
      value: s.avgProcessingTime,
      color: '#10B981',
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Building2 className="w-5 h-5" />
            <span className="text-sm font-medium">Departments</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {filters.department ? 'Filtered view' : 'Active departments'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Patients Handled</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalPatients.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            {filters.department ? `In ${filters.department}` : 'Total across all departments'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">Avg Processing Time</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{avgProcessingTime} min</p>
          <p className="text-xs text-gray-500 mt-1">
            {filters.department ? `For ${filters.department}` : 'Average across departments'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Total Staff</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalStaff.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{totalBedCapacity} total bed capacity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Patients Handled per Department</h3>
          {patientsPerDeptData.length > 0 ? (
            <BarChart data={patientsPerDeptData} horizontal height={Math.max(200, patientsPerDeptData.length * 45)} />
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No patient flow data available</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Average Processing Time (minutes)</h3>
          {processingTimeData.length > 0 ? (
            <BarChart data={processingTimeData} horizontal height={Math.max(200, processingTimeData.length * 45)} />
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No processing time data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Department Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bed Capacity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Count
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Wait Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patients Handled
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Processing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departments.map((dept) => {
                const deptStats = stats.find((s) => s.name === dept.name);
                return (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {dept.bed_capacity || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {dept.staff_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {dept.avg_wait_time || 0} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-medium ${deptStats?.patientsHandled ? 'text-blue-600' : 'text-gray-400'}`}>
                        {deptStats?.patientsHandled || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm ${deptStats?.avgProcessingTime ? 'text-gray-600' : 'text-gray-400'}`}>
                        {deptStats?.avgProcessingTime || 0} min
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
