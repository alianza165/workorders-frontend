"use client"

// components/analytics/EquipmentFaultAnalysis.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { ExclamationTriangleIcon, ClockIcon, WrenchIcon } from '@heroicons/react/24/outline';

interface FaultItem {
  equipment__machine: string;
  equipment__machine_type__machine_type: string;
  problem: string;
  fault_count: number;
  avg_repair_hours: number;
}

interface PredictiveItem {
  equipment_name: string;
  last_failure: string;
  avg_interval_days: number;
  days_overdue: number;
}

export default function EquipmentFaultAnalysis() {
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [faultData, setFaultData] = useState<FaultItem[]>([]);
  const [predictiveData, setPredictiveData] = useState<PredictiveItem[]>([]);
  const [loading, setLoading] = useState(true);
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
      
      if (!response.ok) throw new Error('Failed to fetch fault data');
      const data = await response.json();
      
      // Convert string durations to hours and filter invalid data
      const processedFaultData = data.fault_analysis.map(item => ({
        ...item,
        // Convert seconds to hours if needed, or use as-is if already in hours
        avg_repair_hours: item.avg_repair_hours 
          ? parseFloat(item.avg_repair_hours) / (item.avg_repair_hours > 10000 ? 3600 : 1)
          : 0
      })).filter(item => item.avg_repair_hours < 1000); // Filter out unrealistic values

      // Process predictive candidates to handle zero intervals
      const processedPredictiveData = data.predictive_candidates
        .filter(item => item.avg_interval_days > 0) // Exclude invalid intervals
        .map(item => ({
          ...item,
          last_failure: new Date(item.last_failure),
          days_overdue: Math.max(0, item.days_overdue) // Ensure non-negative
        }));

      setFaultData(processedFaultData);
      setPredictiveData(processedPredictiveData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(faultData)
  }, [faultData]);

  useEffect(() => {
    fetchData();
  }, []);

  // Group problems by equipment
  const equipmentProblems = faultData.reduce((acc, item) => {
    const key = `${item.equipment__machine} (${item.equipment__machine_type__machine_type})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      problem: item.problem,
      count: item.fault_count,
      avgHours: item.avg_repair_hours
    });
    return acc;
  }, {} as Record<string, Array<{problem: string, count: number, avgHours: number}>>);

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

    {error && (
      <div className={`p-4 mb-6 rounded border-l-4 ${
        theme === 'dark' 
          ? 'bg-red-900/30 border-red-500 text-red-200' 
          : 'bg-red-100 border-red-500 text-red-700'
      }`}>
        {error}
      </div>
    )}

    {loading ? (
      <div className="flex justify-center items-center h-64">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
          theme === 'dark' ? 'border-yellow-400' : 'border-yellow-500'
        }`}></div>
      </div>
    ) : (
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Current Faults - Fixed height with scroll */}
        <div className="lg:w-1/2">
          <h3 className={`flex items-center text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-700'
          }`}>
            <WrenchIcon className="h-5 w-5 mr-2" />
            Most Frequent Faults (Last 90 Days)
          </h3>
          
          <div className="space-y-4 overflow-y-auto" style={{ height: '400px' }}>
            {Object.entries(equipmentProblems).map(([equipment, problems]) => (
              <div key={equipment} className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <h4 className={`font-medium mb-3 ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                }`}>
                  {equipment}
                </h4>
                
                <div className="space-y-3">
                  {problems.map((prob, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {prob.problem}
                        </p>
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Avg. repair: {prob.avgHours > 0 ? 
                            `${prob.avgHours.toFixed(1)} hours` : 
                            'N/A'
                          }
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        theme === 'dark' ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {prob.count} occurrence{prob.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Predictive Analysis - Fixed height with scroll */}
        <div className="lg:w-1/2">
          <h3 className={`flex items-center text-lg font-semibold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-700'
          }`}>
            <ClockIcon className="h-5 w-5 mr-2" />
            Potential Upcoming Issues
          </h3>
          
          <div className="space-y-4 overflow-y-auto" style={{ height: '400px' }}>
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
                      item.days_overdue > 0 
                        ? theme === 'dark' 
                          ? 'bg-red-900/80 text-red-200' 
                          : 'bg-red-100 text-red-700'
                        : theme === 'dark' 
                          ? 'bg-yellow-900/80 text-yellow-200' 
                          : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.days_overdue > 0 
                        ? `${item.days_overdue} day${item.days_overdue > 1 ? 's' : ''} overdue`
                        : 'Due soon'}
                    </span>
                  </div>
                  
                  <div className={`text-sm space-y-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    <p>Last failed: {item.last_failure.toLocaleDateString()}</p>
                    <p>Average interval: {item.avg_interval_days} days</p>
                    <p className={`font-medium ${
                      theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'
                    }`}>
                      Recommended: Schedule preventive maintenance
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
    )}
  </div>
);
}