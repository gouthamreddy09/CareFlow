import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Calendar, Activity, Users, Bed, UserX, Loader2 } from 'lucide-react';
import type { PatientRecord } from '../../types';
import { getPatientRecords } from '../../services/dataService';
import {
  forecastAdmissions,
  predictBottlenecks,
  predictCapacityRisks,
  predictResourceShortages,
  type AdmissionForecast,
  type BottleneckPrediction,
  type CapacityRisk,
  type ResourceShortageWarning
} from '../../services/predictiveAnalyticsService';
import {
  identifyHighRiskPatients,
  analyzeReadmissionTrends,
  type ReadmissionRisk
} from '../../services/readmissionRiskService';
import { LineChart } from '../charts/LineChart';

export function StrategicRiskOutlook() {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [forecast14, setForecast14] = useState<AdmissionForecast[]>([]);
  const [forecast30, setForecast30] = useState<AdmissionForecast[]>([]);
  const [bottleneckPredictions, setBottleneckPredictions] = useState<BottleneckPrediction[]>([]);
  const [capacityRisks, setCapacityRisks] = useState<CapacityRisk[]>([]);
  const [resourceWarnings, setResourceWarnings] = useState<ResourceShortageWarning[]>([]);
  const [readmissionRisks, setReadmissionRisks] = useState<ReadmissionRisk[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'14' | '30'>('30');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const patientRecords = await getPatientRecords();
        setRecords(patientRecords);

        if (patientRecords.length > 0) {
          const forecast14Days = forecastAdmissions(patientRecords, 14);
          const forecast30Days = forecastAdmissions(patientRecords, 30);
          const bottlenecks = predictBottlenecks(patientRecords);
          const capacity = predictCapacityRisks(patientRecords, 30);
          const resources = predictResourceShortages(patientRecords);
          const readmissions = identifyHighRiskPatients(patientRecords, patientRecords);

          setForecast14(forecast14Days);
          setForecast30(forecast30Days);
          setBottleneckPredictions(bottlenecks);
          setCapacityRisks(capacity);
          setResourceWarnings(resources);
          setReadmissionRisks(readmissions.slice(0, 10));
        }
      } catch (error) {
        console.error('Failed to load predictive data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const activeForecast = selectedTimeframe === '14' ? forecast14 : forecast30;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const criticalRisks = capacityRisks.filter(r => r.riskLevel === 'critical').length;
  const highRisks = capacityRisks.filter(r => r.riskLevel === 'high').length;
  const criticalBottlenecks = bottleneckPredictions.filter(b => b.riskLevel === 'critical').length;
  const criticalShortages = resourceWarnings.filter(w => w.severity === 'critical').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Upload patient data to view predictive analytics and risk forecasts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Next 30 Days Risk Outlook</h2>
          <p className="text-sm text-gray-600 mt-1">Predictive intelligence for strategic planning</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTimeframe('14')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedTimeframe === '14'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            14 Days
          </button>
          <button
            onClick={() => setSelectedTimeframe('30')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedTimeframe === '30'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Critical Alerts</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {criticalRisks + criticalBottlenecks + criticalShortages}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-xs text-red-700 mt-2">Immediate action required</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-900">High Risk Events</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{highRisks}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-700 mt-2">Monitor closely</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Predicted Bottlenecks</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{bottleneckPredictions.length}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-blue-700 mt-2">Based on historical patterns</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900">Readmission Risks</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{readmissionRisks.length}</p>
            </div>
            <UserX className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-xs text-purple-700 mt-2">High-risk patients identified</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Admission Forecast</h3>
        </div>
        {activeForecast.length > 0 ? (
          <>
            <LineChart
              data={activeForecast.map(f => ({
                label: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                values: [
                  { name: 'Lower Bound', value: f.confidenceInterval.lower, color: '#93C5FD' },
                  { name: 'Predicted', value: f.predictedAdmissions, color: '#3B82F6' },
                  { name: 'Upper Bound', value: f.confidenceInterval.upper, color: '#1E40AF' }
                ]
              }))}
              height={300}
            />
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Average Daily</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeForecast.length > 0
                    ? Math.round(
                        activeForecast.reduce((sum, f) => sum + f.predictedAdmissions, 0) / activeForecast.length
                      )
                    : 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Peak Predicted</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeForecast.length > 0 ? Math.max(...activeForecast.map(f => f.predictedAdmissions)) : 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Trend</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {activeForecast.length > 0 ? activeForecast[activeForecast.length - 1]?.trend || 'stable' : 'stable'}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center text-gray-400 py-12">
            No forecast data available
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Expected Bottlenecks</h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {bottleneckPredictions.slice(0, 8).map((bottleneck, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getRiskColor(bottleneck.riskLevel)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{bottleneck.departmentName}</h4>
                    <p className="text-xs opacity-75 mt-1">
                      Expected: {new Date(bottleneck.predictedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskBadgeColor(bottleneck.riskLevel)}`}>
                    {Math.round(bottleneck.probability * 100)}%
                  </span>
                </div>
                <p className="text-sm mb-2">{bottleneck.historicalPattern}</p>
                <div className="bg-white bg-opacity-50 rounded p-2 text-sm">
                  <p className="font-medium text-xs mb-1">Recommendation:</p>
                  <p className="text-xs">{bottleneck.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Capacity Risk Levels</h3>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {capacityRisks.slice(0, 12).map((risk, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getRiskColor(risk.riskLevel)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{risk.department}</h4>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(risk.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskBadgeColor(risk.riskLevel)}`}>
                    {risk.utilizationRate}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Capacity: {risk.currentCapacity}</span>
                  <span>Demand: {risk.predictedDemand}</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      risk.riskLevel === 'critical' ? 'bg-red-600' :
                      risk.riskLevel === 'high' ? 'bg-orange-500' :
                      risk.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, risk.utilizationRate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bed className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Resource Shortage Warnings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resourceWarnings.map((warning, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getRiskColor(warning.severity)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    {warning.resourceType === 'beds' ? (
                      <Bed className="w-4 h-4" />
                    ) : warning.resourceType === 'staff' ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                    <h4 className="font-semibold capitalize">{warning.resourceType} Shortage</h4>
                  </div>
                  <p className="text-sm mt-1">{warning.department}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskBadgeColor(warning.severity)}`}>
                  {warning.severity}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Expected Date:</span>
                  <span className="font-medium">
                    {new Date(warning.shortageDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Gap:</span>
                  <span className="font-medium">{warning.estimatedGap} units</span>
                </div>
                <div className="bg-white bg-opacity-50 rounded p-2 mt-2">
                  <p className="font-medium text-xs mb-1">Action Required:</p>
                  <p className="text-xs">{warning.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserX className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Readmission Risk Patients</h3>
          <span className="text-sm text-gray-600">(influenced by operational delays)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Patient ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Risk Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Risk Level</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Delay Impact</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Estimated Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Top Factors</th>
              </tr>
            </thead>
            <tbody>
              {readmissionRisks.map((risk, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-mono">{risk.patientId}</td>
                  <td className="py-3 px-4 text-sm font-semibold">{risk.riskScore}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskBadgeColor(risk.riskLevel)}`}>
                      {risk.riskLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {risk.operationalImpact.delayInfluence > 0 ? (
                      <span className="text-orange-600 font-medium">
                        +{risk.operationalImpact.delayInfluence} pts
                      </span>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {new Date(risk.estimatedReadmissionDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="max-w-xs">
                      {risk.contributingFactors.slice(0, 2).map((factor, i) => (
                        <div key={i} className="text-xs text-gray-600">
                          • {factor.factor}
                        </div>
                      ))}
                    </div>
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
