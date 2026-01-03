import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { getAllAlerts, type Alert } from '../services/alertsService';
import type { GlobalFilters } from '../types';

interface Props {
  filters?: GlobalFilters;
  limit?: number;
}

export default function AlertsPanel({ filters, limit }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAlerts();
  }, [filters]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const allAlerts = await getAllAlerts(filters);
      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts
    .filter(a => !dismissedAlerts.has(a.id))
    .slice(0, limit);

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'warning':
        return 'bg-orange-50 border-orange-300 text-orange-900';
      case 'info':
        return 'bg-blue-50 border-blue-300 text-blue-900';
    }
  };

  const getSeverityIconColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-600';
      case 'info':
        return 'text-blue-600';
    }
  };

  const getCategoryLabel = (category: Alert['category']) => {
    switch (category) {
      case 'bottleneck':
        return 'Bottleneck';
      case 'capacity':
        return 'Capacity';
      case 'discharge_delay':
        return 'Discharge Delay';
      case 'readmission_risk':
        return 'Readmission Risk';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="text-gray-500 text-sm">Loading alerts...</div>
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 text-green-700">
          <Info className="w-5 h-5" />
          <span className="text-sm font-medium">No active alerts</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={getSeverityIconColor(alert.severity)}>
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{alert.title}</h4>
                  <span className="px-2 py-0.5 bg-white bg-opacity-50 rounded text-xs font-medium">
                    {getCategoryLabel(alert.category)}
                  </span>
                </div>
                <p className="text-sm mb-2">{alert.message}</p>

                <div className="flex items-center gap-4 text-xs mb-3">
                  <span>
                    <strong>Department:</strong> {alert.departmentName}
                  </span>
                  <span>
                    <strong>Current:</strong> {alert.metrics.current.toFixed(1)} {alert.metrics.unit}
                  </span>
                  <span>
                    <strong>Threshold:</strong> {alert.metrics.threshold.toFixed(1)} {alert.metrics.unit}
                  </span>
                </div>

                {alert.actionable && alert.recommendedActions.length > 0 && (
                  <div className="bg-white bg-opacity-60 rounded p-3 mt-2">
                    <div className="text-xs font-semibold mb-1">Recommended Actions:</div>
                    <ul className="text-xs space-y-1">
                      {alert.recommendedActions.slice(0, 3).map((action, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
