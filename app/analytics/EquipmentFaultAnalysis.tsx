"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { ExclamationTriangleIcon, ClockIcon, WrenchIcon } from '@heroicons/react/24/outline';

// Type definitions
interface FaultAnalysisItem {
  equipment__machine: string;
  equipment__machine_type__machine_type: string;
  problem: string;
  fault_count: number;
  avg_repair_hours: number;
}

interface PredictiveCandidate {
  equipment_id: number;
  equipment_name: string;
  last_failure: string; // ISO string
  avg_interval_days: number;
  days_overdue: number;
}

interface ApiResponse {
  fault_analysis: FaultAnalysisItem[];
  predictive_candidates: PredictiveCandidate[];
}

interface ProcessedFaultItem extends Omit<FaultAnalysisItem, 'avg_repair_hours'> {
  avgRepairHours: number;
  formattedProblem: string;
}

interface ProcessedPredictiveItem extends Omit<PredictiveCandidate, 'last_failure'> {
  lastFailure: Date;
  status: 'overdue' | 'due_soon';
  severity: 'critical' | 'warning';
}

export default function EquipmentFaultAnalysis() {
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [faultData, setFaultData] = useState<ProcessedFaultItem[]>([]);
  const [predictiveData, setPredictiveData] = useState<ProcessedPredictiveItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/equipment-faults/`, 
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch equipment fault data');
      
      const data: ApiResponse = await response.json();

      // Process fault data
      const processedFaultData: ProcessedFaultItem[] = data.fault_analysis.map(item => ({
        ...item,
        avgRepairHours: item.avg_repair_hours / 3600, // Convert seconds to hours
        formattedProblem: item.problem.replace(/\r\n/g, ' ').trim()
      }));

      // Process predictive data
      const processedPredictiveData: ProcessedPredictiveItem[] = data.predictive_candidates.map(item => {
        const lastFailure = new Date(item.last_failure);
        const status: 'overdue' | 'due_soon' = item.days_overdue > 0 ? 'overdue' : 'due_soon';
        const severity: 'critical' | 'warning' = item.days_overdue > 30 ? 'critical' : 'warning';
        
        return {
          ...item,
          lastFailure,
          status,
          severity
        };
      });

      setFaultData(processedFaultData);
      setPredictiveData(processedPredictiveData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group fault data by equipment
  const equipmentFaults = faultData.reduce<Record<string, ProcessedFaultItem[]>>((acc, item) => {
    const key = `${item.equipment__machine} (${item.equipment__machine_type__machine_type})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
          theme === 'dark' ? 'border-blue-400' : 'border-blue-600'
        }`}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded border-l-4 ${
        theme === 'dark' 
          ? 'bg-red-900/30 border-red-500 text-red-200' 
          : 'bg-red-100 border-red-500 text-red-700'
      }`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow p-6 ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="flex items-center mb-6">
        <ExclamationTriangleIcon className={`h-6 w-6 mr-2 ${
          theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'
        }`} />
        <h2 className={`text-xl font-bold ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>
          Equipment Fault Analysis
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current Faults Section */}
        <div>
          <h3 className={`flex items-center text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-700'
          }`}>
            <WrenchIcon className="h-5 w-5 mr-2" />
            Most Frequent Faults
          </h3>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {Object.entries(equipmentFaults).map(([equipment, faults]) => (
              <div key={equipment} className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <h4 className={`font-medium mb-3 ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                }`}>
                  {equipment}
                </h4>
                
                <div className="space-y-3">
                  {faults.map((fault, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {fault.formattedProblem}
                        </p>
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Avg. repair: {fault.avgRepairHours.toFixed(1)} hours
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        theme === 'dark' ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {fault.fault_count} occurrence{fault.fault_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Predictive Analysis Section */}
        <div>
          <h3 className={`flex items-center text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-700'
          }`}>
            <ClockIcon className="h-5 w-5 mr-2" />
            Maintenance Predictions
          </h3>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {predictiveData.length > 0 ? (
              predictiveData.map((item, idx) => (
                <div key={idx} className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-medium ${
                      theme === 'dark' ? 'text-orange-300' : 'text-orange-600'
                    }`}>
                      {item.equipment_name}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'overdue'
                        ? theme === 'dark' 
                          ? 'bg-red-900/80 text-red-200' 
                          : 'bg-red-100 text-red-700'
                        : theme === 'dark' 
                          ? 'bg-yellow-900/80 text-yellow-200' 
                          : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.days_overdue > 0 
                        ? `${item.days_overdue} day${item.days_overdue !== 1 ? 's' : ''} overdue`
                        : 'Due soon'}
                    </span>
                  </div>
                  
                  <div className={`text-sm space-y-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <p>Last failure: {item.lastFailure.toLocaleDateString()}</p>
                    <p>Average interval: {item.avg_interval_days} days</p>
                    <p className={`font-medium ${
                      item.severity === 'critical'
                        ? theme === 'dark' ? 'text-red-300' : 'text-red-600'
                        : theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'
                    }`}>
                      {item.severity === 'critical' 
                        ? 'Immediate maintenance required' 
                        : 'Schedule maintenance soon'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className={`p-4 rounded-lg text-center ${
                theme === 'dark' ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}>
                No equipment currently predicted for imminent failure
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}