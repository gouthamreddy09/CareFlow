import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, TrendingDown, DollarSign, Users, Bed, Clock } from 'lucide-react';
import { simulateIntervention, compareInterventions, type SimulationIntervention, type SimulationResult } from '../../services/simulationService';
import type { GlobalFilters } from '../../types';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/currency';

interface Props {
  filters?: GlobalFilters;
}

export default function SimulationEngine({ filters }: Props) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [interventionType, setInterventionType] = useState<'staff' | 'beds' | 'processing_time'>('staff');
  const [interventionValue, setInterventionValue] = useState<number>(2);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    const { data } = await supabase.from('departments').select('name');
    if (data) {
      const deptNames = data.map(d => d.name).sort();
      setDepartments(deptNames);
      if (deptNames.length > 0) {
        setSelectedDepartment(deptNames[0]);
      }
    }
  };

  const runSimulation = async () => {
    if (!selectedDepartment) return;

    setLoading(true);
    try {
      const intervention: SimulationIntervention = {
        type: interventionType,
        departmentName: selectedDepartment,
        value: interventionValue,
      };

      const result = await simulateIntervention(intervention, filters);
      setSimulationResult(result);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const compareAllInterventions = async () => {
    if (!selectedDepartment) return;

    setComparing(true);
    try {
      const interventions: SimulationIntervention[] = [
        { type: 'staff', departmentName: selectedDepartment, value: 2 },
        { type: 'beds', departmentName: selectedDepartment, value: 5 },
        { type: 'processing_time', departmentName: selectedDepartment, value: 30 },
      ];

      const comparison = await compareInterventions(interventions, filters);
      if (comparison.optimalIntervention) {
        setSimulationResult(comparison.optimalIntervention);
      }
    } catch (error) {
      console.error('Comparison error:', error);
    } finally {
      setComparing(false);
    }
  };

  const getInterventionLabel = () => {
    switch (interventionType) {
      case 'staff':
        return 'Additional Staff Members';
      case 'beds':
        return 'Additional Beds';
      case 'processing_time':
        return 'Time Reduction (minutes)';
    }
  };

  const getInterventionIcon = () => {
    switch (interventionType) {
      case 'staff':
        return <Users className="w-5 h-5" />;
      case 'beds':
        return <Bed className="w-5 h-5" />;
      case 'processing_time':
        return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">What-If Simulation Engine</h2>
          <p className="text-gray-600 mt-1">Model interventions and predict operational impact</p>
        </div>
        <Play className="w-8 h-8 text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Intervention Type
          </label>
          <select
            value={interventionType}
            onChange={(e) => setInterventionType(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="staff">Add Staff</option>
            <option value="beds">Add Beds</option>
            <option value="processing_time">Reduce Processing Time</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {getInterventionLabel()}
          </label>
          <input
            type="number"
            value={interventionValue}
            onChange={(e) => setInterventionValue(Number(e.target.value))}
            min="1"
            max={interventionType === 'processing_time' ? 120 : 20}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={runSimulation}
          disabled={loading || !selectedDepartment}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-5 h-5" />
          {loading ? 'Running...' : 'Run Simulation'}
        </button>

        <button
          onClick={compareAllInterventions}
          disabled={comparing || !selectedDepartment}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <TrendingUp className="w-5 h-5" />
          {comparing ? 'Comparing...' : 'Compare All Options'}
        </button>
      </div>

      {simulationResult && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {getInterventionIcon()}
              <h3 className="font-semibold text-blue-900">
                Simulation: {simulationResult.intervention.type.replace('_', ' ')}
                {' '}({simulationResult.intervention.value} {interventionType === 'processing_time' ? 'min' : 'units'})
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Average LOS</div>
              <div className="text-2xl font-bold text-gray-900">
                {simulationResult.projected.averageLOS}d
              </div>
              <div className={`text-sm flex items-center gap-1 ${
                simulationResult.improvements.losReduction > 0 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {simulationResult.improvements.losReduction > 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    -{simulationResult.improvements.losReduction}d
                    ({simulationResult.improvements.losReductionPercent.toFixed(1)}%)
                  </>
                ) : (
                  'No change'
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Bed Utilization</div>
              <div className="text-2xl font-bold text-gray-900">
                {simulationResult.projected.bedUtilization}%
              </div>
              <div className={`text-sm flex items-center gap-1 ${
                simulationResult.improvements.bedUtilizationChange > 0 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {simulationResult.improvements.bedUtilizationChange > 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    -{simulationResult.improvements.bedUtilizationChange.toFixed(1)}%
                  </>
                ) : (
                  'No change'
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Readmission Risk</div>
              <div className="text-2xl font-bold text-gray-900">
                {simulationResult.projected.readmissionRisk}%
              </div>
              <div className={`text-sm flex items-center gap-1 ${
                simulationResult.improvements.readmissionRiskReduction > 0 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {simulationResult.improvements.readmissionRiskReduction > 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    -{simulationResult.improvements.readmissionRiskReduction.toFixed(1)}%
                  </>
                ) : (
                  'No change'
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Patient Throughput</div>
              <div className="text-2xl font-bold text-gray-900">
                {simulationResult.projected.throughput}
              </div>
              <div className={`text-sm flex items-center gap-1 ${
                simulationResult.projected.throughput > simulationResult.baseline.throughput ? 'text-green-600' : 'text-gray-500'
              }`}>
                {simulationResult.projected.throughput > simulationResult.baseline.throughput ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    +{simulationResult.projected.throughput - simulationResult.baseline.throughput} patients
                  </>
                ) : (
                  'No change'
                )}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Cost-Benefit Analysis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Estimated Cost</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(simulationResult.costBenefit.estimatedCost)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Impact Score</div>
                <div className="text-xl font-bold text-gray-900">
                  {simulationResult.costBenefit.impactScore.toFixed(1)}/100
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Return on Investment</div>
                <div className="text-xl font-bold text-green-600">
                  {simulationResult.costBenefit.roi.toFixed(2)}x
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Key Insights</h4>
            <ul className="space-y-2">
              {simulationResult.improvements.losReduction > 0 && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                  <span>
                    Reduces average length of stay by {simulationResult.improvements.losReduction.toFixed(1)} days
                    ({simulationResult.improvements.losReductionPercent.toFixed(1)}% improvement)
                  </span>
                </li>
              )}
              {simulationResult.improvements.bedUtilizationChange > 5 && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                  <span>
                    Frees up {simulationResult.improvements.bedUtilizationChange.toFixed(1)}% bed capacity for additional patients
                  </span>
                </li>
              )}
              {simulationResult.improvements.readmissionRiskReduction > 0 && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                  <span>
                    Lowers readmission risk by {simulationResult.improvements.readmissionRiskReduction.toFixed(1)}%, improving patient outcomes
                  </span>
                </li>
              )}
              {simulationResult.costBenefit.roi > 1.5 && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                  <span>
                    Strong ROI of {simulationResult.costBenefit.roi.toFixed(2)}x indicates cost-effective intervention
                  </span>
                </li>
              )}
              {simulationResult.improvements.patientsImpacted > 0 && (
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                  <span>
                    Positively impacts {simulationResult.improvements.patientsImpacted} patients per period
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
