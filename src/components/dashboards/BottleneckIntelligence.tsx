import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, Activity, Users, ArrowRight, Info } from 'lucide-react';
import type { GlobalFilters } from '../../types';
import {
  detectBottlenecks,
  getDelayPropagationMap,
  getBottleneckTimeline,
  type BottleneckDetection,
  type DelayPropagation,
  type BottleneckTimeline,
} from '../../services/bottleneckDetectionService';

interface BottleneckIntelligenceProps {
  filters?: GlobalFilters;
}

export default function BottleneckIntelligence({ filters }: BottleneckIntelligenceProps) {
  const [bottlenecks, setBottlenecks] = useState<BottleneckDetection[]>([]);
  const [propagations, setPropagations] = useState<DelayPropagation[]>([]);
  const [timeline, setTimeline] = useState<BottleneckTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBottleneck, setSelectedBottleneck] = useState<BottleneckDetection | null>(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bottleneckData, propagationData, timelineData] = await Promise.all([
        detectBottlenecks(filters),
        getDelayPropagationMap(filters),
        getBottleneckTimeline(filters),
      ]);

      setBottlenecks(bottleneckData);
      setPropagations(propagationData);
      setTimeline(timelineData);

      if (bottleneckData.length > 0 && !selectedBottleneck) {
        setSelectedBottleneck(bottleneckData[0]);
      }
    } catch (error) {
      console.error('Failed to load bottleneck data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'invisible': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'obvious': return 'bg-red-100 text-red-800 border-red-300';
      case 'emerging': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getLoadColor = (load: string) => {
    switch (load) {
      case 'high': return 'text-red-600';
      case 'moderate': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getImpactColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-yellow-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading bottleneck analysis...</div>
      </div>
    );
  }

  if (bottlenecks.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No significant bottlenecks detected in the current dataset.</p>
        <p className="text-sm text-gray-500 mt-2">This indicates relatively smooth patient flow operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bottlenecks</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{bottlenecks.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Invisible Bottlenecks</p>
              <p className="text-2xl font-semibold text-orange-600 mt-1">
                {bottlenecks.filter(b => b.bottleneckType === 'invisible').length}
              </p>
            </div>
            <Activity className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Patients Affected</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {bottlenecks.reduce((sum, b) => sum + b.patientsAffected, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Impact Score</p>
              <p className="text-2xl font-semibold text-red-600 mt-1">
                {Math.round(bottlenecks.reduce((sum, b) => sum + b.overallImpactScore, 0) / bottlenecks.length)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Main Content: Ranked Bottlenecks and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranked Bottleneck List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Ranked Bottlenecks</h3>
            <p className="text-sm text-gray-600 mt-1">Ordered by overall impact score</p>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {bottlenecks.map((bottleneck) => (
              <button
                key={bottleneck.departmentName}
                onClick={() => setSelectedBottleneck(bottleneck)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  selectedBottleneck?.departmentName === bottleneck.departmentName ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-gray-700">#{bottleneck.rank}</span>
                      <h4 className="font-semibold text-gray-900">{bottleneck.departmentName}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getTypeColor(bottleneck.bottleneckType)}`}>
                        {bottleneck.bottleneckType}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-gray-500">Patient Impact</span>
                        <div className={`font-semibold ${getImpactColor(bottleneck.patientImpactScore)}`}>
                          {bottleneck.patientImpactScore}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Delay Propagation</span>
                        <div className={`font-semibold ${getImpactColor(bottleneck.delayPropagationScore)}`}>
                          {bottleneck.delayPropagationScore}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Resource Strain</span>
                        <div className={`font-semibold ${getImpactColor(bottleneck.resourceStrainScore)}`}>
                          {bottleneck.resourceStrainScore}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className={`font-medium ${getLoadColor(bottleneck.loadLevel)}`}>
                        {bottleneck.loadLevel} load
                      </span>
                      <span>•</span>
                      <span>{bottleneck.patientsAffected} patients</span>
                      <span>•</span>
                      <span>{bottleneck.timeDeviation > 0 ? '+' : ''}{bottleneck.timeDeviation}% time deviation</span>
                    </div>
                  </div>

                  <div className="ml-4">
                    <div className={`text-2xl font-bold ${getImpactColor(bottleneck.overallImpactScore)}`}>
                      {bottleneck.overallImpactScore}
                    </div>
                    <div className="text-xs text-gray-500 text-center">Overall</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bottleneck Details */}
        {selectedBottleneck && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedBottleneck.departmentName}</h3>
                  <p className="text-sm text-gray-600">Detailed Analysis</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border ${getTypeColor(selectedBottleneck.bottleneckType)}`}>
                  {selectedBottleneck.bottleneckType} bottleneck
                </span>
              </div>
            </div>

            <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
              {/* Why This Is A Bottleneck */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Why This Is A Bottleneck</h4>
                </div>
                <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  {selectedBottleneck.whyBottleneck}
                </p>
              </div>

              {/* Processing Time Analysis */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Processing Time Analysis</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600">Expected Time</div>
                    <div className="text-lg font-semibold text-gray-900">{selectedBottleneck.expectedTime} min</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600">Actual Time</div>
                    <div className="text-lg font-semibold text-gray-900">{selectedBottleneck.actualTime} min</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600">Time Deviation</div>
                    <div className={`text-lg font-semibold ${selectedBottleneck.timeDeviation > 50 ? 'text-red-600' : 'text-orange-600'}`}>
                      {selectedBottleneck.timeDeviation > 0 ? '+' : ''}{selectedBottleneck.timeDeviation}%
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600">Congestion Index</div>
                    <div className={`text-lg font-semibold ${selectedBottleneck.congestionIndicator > 1 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {selectedBottleneck.congestionIndicator}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistical Indicators */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Statistical Indicators</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-600">Z-Score</span>
                    <span className={`font-semibold ${Math.abs(selectedBottleneck.zScore) > 2 ? 'text-red-600' : 'text-gray-900'}`}>
                      {selectedBottleneck.zScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-600">IQR Position</span>
                    <span className={`font-semibold ${selectedBottleneck.iqrPosition > 1.5 ? 'text-red-600' : 'text-gray-900'}`}>
                      {selectedBottleneck.iqrPosition}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-600">Variance Ratio</span>
                    <span className={`font-semibold ${selectedBottleneck.varianceRatio > 1.5 ? 'text-red-600' : 'text-gray-900'}`}>
                      {selectedBottleneck.varianceRatio}x
                    </span>
                  </div>
                </div>
              </div>

              {/* Affected Patients */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <h4 className="font-semibold text-gray-900">Which Patients Are Affected</h4>
                </div>
                <div className="space-y-2">
                  {selectedBottleneck.affectedPatientTypes.map((type, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-purple-50 p-2 rounded border border-purple-200">
                      <span className="text-purple-600 font-semibold">•</span>
                      <span>{type}</span>
                    </div>
                  ))}
                  <div className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                    <strong>{selectedBottleneck.patientsAffected} total patients</strong> processed through this department
                  </div>
                </div>
              </div>

              {/* Downstream Effects */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="w-4 h-4 text-orange-600" />
                  <h4 className="font-semibold text-gray-900">Which Departments Suffer Downstream</h4>
                </div>
                <div className="space-y-2">
                  {selectedBottleneck.downstreamEffects.map((effect, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-orange-50 p-2 rounded border border-orange-200">
                      <span className="text-orange-600 font-semibold">•</span>
                      <span>{effect}</span>
                    </div>
                  ))}
                  {selectedBottleneck.downstreamDepartments.length > 0 && (
                    <div className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                      <strong>Affected departments:</strong> {selectedBottleneck.downstreamDepartments.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delay Propagation Heatmap */}
      {propagations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Delay Propagation Heatmap</h3>
            <p className="text-sm text-gray-600 mt-1">How delays cascade through departments</p>
          </div>
          <div className="p-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {propagations.slice(0, 15).map((prop, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-700 truncate">{prop.sourceDepartment}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 truncate">{prop.targetDepartment}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Avg Delay</div>
                      <div className="text-sm font-semibold text-gray-900">{prop.avgDelayTransferred} min</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Patients</div>
                      <div className="text-sm font-semibold text-gray-900">{prop.patientsAffected}</div>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-6 relative">
                      <div
                        className={`h-6 rounded-full flex items-center justify-end pr-2 text-xs font-semibold text-white ${
                          prop.propagationStrength >= 70 ? 'bg-red-500' :
                          prop.propagationStrength >= 40 ? 'bg-orange-500' :
                          'bg-yellow-500'
                        }`}
                        style={{ width: `${Math.min(prop.propagationStrength, 100)}%` }}
                      >
                        {prop.propagationStrength}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottleneck Timeline */}
      {timeline.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Bottleneck Emergence Timeline</h3>
            <p className="text-sm text-gray-600 mt-1">When and where bottlenecks develop over time</p>
          </div>
          <div className="p-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {timeline
                .filter(t => t.bottleneckScore > 5)
                .sort((a, b) => b.bottleneckScore - a.bottleneckScore)
                .slice(0, 20)
                .map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.departmentName}</div>
                      <div className="text-xs text-gray-500">{item.timestamp}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Congestion</div>
                      <div className={`text-sm font-semibold ${
                        item.congestionLevel > 1.5 ? 'text-red-600' :
                        item.congestionLevel > 1.0 ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        {item.congestionLevel}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Score</div>
                      <div className="text-sm font-semibold text-gray-900">{item.bottleneckScore}</div>
                    </div>
                    <div className="w-24">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.congestionLevel > 1.5 ? 'bg-red-500' :
                            item.congestionLevel > 1.0 ? 'bg-orange-500' :
                            'bg-yellow-500'
                          }`}
                          style={{ width: `${Math.min((item.congestionLevel / 2) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
