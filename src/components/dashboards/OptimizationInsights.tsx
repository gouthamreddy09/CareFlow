import React, { useState, useEffect } from 'react';
import { Lightbulb, ArrowRight, DollarSign, Zap, RefreshCw } from 'lucide-react';
import {
  getPrioritizedOptimizations,
  getStaffReallocationOpportunities,
  getCostToImpactAnalysis,
  type OptimizationRecommendation,
  type StaffReallocationOpportunity,
  type CostToImpactIntervention
} from '../../services/optimizationService';
import type { GlobalFilters } from '../../types';
import { formatCurrency, formatCurrencyCompact } from '../../utils/currency';

interface Props {
  filters?: GlobalFilters;
}

export default function OptimizationInsights({ filters }: Props) {
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [reallocations, setReallocations] = useState<StaffReallocationOpportunity[]>([]);
  const [costImpact, setCostImpact] = useState<CostToImpactIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'reallocation' | 'cost-impact'>('recommendations');

  useEffect(() => {
    loadOptimizationData();
  }, [filters]);

  const loadOptimizationData = async () => {
    setLoading(true);
    try {
      const [recs, reallocs, costs] = await Promise.all([
        getPrioritizedOptimizations(filters),
        getStaffReallocationOpportunities(filters),
        getCostToImpactAnalysis(filters)
      ]);

      setRecommendations(recs);
      setReallocations(reallocs);
      setCostImpact(costs);
    } catch (error) {
      console.error('Error loading optimization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading optimization insights...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Optimization Insights</h2>
          <p className="text-gray-600 mt-1">Strategic recommendations for operational improvement</p>
        </div>
        <Lightbulb className="w-8 h-8 text-yellow-600" />
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'recommendations'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Priority Actions ({recommendations.length})
        </button>
        <button
          onClick={() => setActiveTab('reallocation')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'reallocation'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Staff Reallocation ({reallocations.length})
        </button>
        <button
          onClick={() => setActiveTab('cost-impact')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'cost-impact'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Cost-to-Impact ({costImpact.length})
        </button>
      </div>

      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No optimization recommendations at this time
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={`${rec.departmentName}-${rec.priority}`}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-gray-900">#{rec.priority}</span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {rec.departmentName}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getUrgencyColor(rec.urgency)}`}>
                        {rec.urgency.toUpperCase()}
                      </span>
                    </div>
                    <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium mb-3">
                      {rec.recommendationType.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{rec.rationale}</p>

                <div className="grid grid-cols-3 gap-4 mb-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">LOS Reduction</div>
                    <div className="text-lg font-bold text-green-600">
                      {rec.expectedImpact.losReduction.toFixed(1)} days
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Cost Savings</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(rec.expectedImpact.costSavings)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Throughput Increase</div>
                    <div className="text-lg font-bold text-green-600">
                      +{rec.expectedImpact.patientThroughputIncrease}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Action Items:</h4>
                  <ul className="space-y-2">
                    {rec.actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reallocation' && (
        <div className="space-y-4">
          {reallocations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No staff reallocation opportunities identified
            </div>
          ) : (
            reallocations.map((realloc, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">From</div>
                      <div className="font-semibold text-gray-900">{realloc.fromDepartment}</div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-blue-900">{realloc.staffCount} staff</span>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">To</div>
                      <div className="font-semibold text-gray-900">{realloc.toDepartment}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Feasibility</div>
                    <div className="text-2xl font-bold text-green-600">{realloc.feasibilityScore}%</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                  <div className="text-sm font-medium text-gray-900 mb-2">Rationale:</div>
                  <p className="text-sm text-gray-700">{realloc.rationale}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-900 mb-2">Expected Impact:</div>
                  <p className="text-sm text-green-800">{realloc.expectedImpact}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'cost-impact' && (
        <div className="space-y-4">
          {costImpact.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No cost-to-impact analysis available
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-blue-900">
                  <Zap className="w-5 h-5" />
                  <span className="font-semibold">Quick Wins</span>
                </div>
                <p className="text-sm text-blue-800 mt-1">
                  Interventions with cost below $150K and impact score above 25
                </p>
              </div>

              {costImpact.map((item, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-6 hover:shadow-md transition-shadow ${
                    item.quickWins ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.departmentName}
                        </h3>
                        {item.quickWins && (
                          <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-semibold">
                            QUICK WIN
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700">{item.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 bg-white rounded-lg p-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Estimated Cost</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrencyCompact(item.estimatedCost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Impact Score</div>
                      <div className="text-lg font-bold text-blue-600">
                        {item.impactScore.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">ROI</div>
                      <div className="text-lg font-bold text-green-600">
                        {item.roi.toFixed(2)}x
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Priority</div>
                      <div className="text-lg font-bold text-gray-900">
                        #{idx + 1}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
