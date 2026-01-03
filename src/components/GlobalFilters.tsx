import { Calendar, Building2, AlertTriangle, X, RefreshCw } from 'lucide-react';
import type { GlobalFilters as FilterType } from '../types';

interface GlobalFiltersProps {
  filters: FilterType;
  departments: string[];
  onFilterChange: (filters: FilterType) => void;
}

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function GlobalFilters({ filters, departments, onFilterChange }: GlobalFiltersProps) {
  const hasActiveFilters = filters.dateRange || filters.department || filters.severity || filters.readmissionsOnly;

  const clearAllFilters = () => {
    onFilterChange({ dateRange: null, department: null, severity: null, readmissionsOnly: false });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Date Range
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateRange?.start || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  dateRange: e.target.value
                    ? { start: e.target.value, end: filters.dateRange?.end || e.target.value }
                    : null,
                })
              }
              className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="date"
              value={filters.dateRange?.end || ''}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  dateRange: e.target.value
                    ? { start: filters.dateRange?.start || e.target.value, end: e.target.value }
                    : null,
                })
              }
              className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Department
          </label>
          <select
            value={filters.department || ''}
            onChange={(e) =>
              onFilterChange({ ...filters, department: e.target.value || null })
            }
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Severity
          </label>
          <select
            value={filters.severity || ''}
            onChange={(e) =>
              onFilterChange({ ...filters, severity: e.target.value || null })
            }
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Severity Levels</option>
            {SEVERITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Readmissions
          </label>
          <label className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={filters.readmissionsOnly}
              onChange={(e) =>
                onFilterChange({ ...filters, readmissionsOnly: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Only show readmissions</span>
          </label>
        </div>
      </div>
    </div>
  );
}
