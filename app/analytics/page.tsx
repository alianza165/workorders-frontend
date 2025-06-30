'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { WorkOrder, WorkOrderResponse } from '../../types/workorder';
import { format, subMonths } from 'date-fns';
import { useAppContext } from '../context/AppContext';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { FunnelIcon, CalendarIcon, ChartBarIcon, ChartPieIcon, ArrowTrendingUpIcon, MapPinIcon } from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

export default function WorkOrderAnalytics() {
  const { token, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();
  const { theme } = useAppContext();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [activeChart, setActiveChart] = useState<'status' | 'department' | 'type' | 'trend' | 'location'>('status');

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case '7days':
        return subMonths(now, 0.25); // ~1 week
      case '30days':
        return subMonths(now, 1);
      case '90days':
        return subMonths(now, 3);
      case 'all':
        return new Date(0); // Unix epoch
    }
  };

  const fetchWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/`);
      const dateFrom = getDateRange();
      apiUrl.searchParams.append('initiation_date__gte', dateFrom.toISOString());
      
      const response = await fetch(apiUrl.toString(), {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch work orders');
      
      const data: WorkOrderResponse = await response.json();
      
      if (Array.isArray(data.results)) {
        setWorkOrders(data.results);
      } else {
        setWorkOrders([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token, timeRange]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, authLoading, router]);

  // Process data for charts
  const getStatusDistribution = () => {
    const statusCounts: Record<string, number> = {};
    
    workOrders.forEach(order => {
      let status = 'Unknown';
      if (order.closed?.closed === 'Yes') {
        status = 'Closed';
      } else if (order.accepted === false) {
        status = 'Rejected';
      } else if (order.work_status) {
        status = order.work_status.work_status;
      }
      
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    
    return {
      labels,
      datasets: [{
        label: 'Work Orders by Status',
        data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      }]
    };
  };

  const getLocationDistribution = () => {
    const locationCounts: Record<string, number> = {};
    const departmentCounts: Record<string, number> = {};
    const areaCounts: Record<string, number> = {};
    
    workOrders.forEach(order => {
      const location = order.equipment.location;
      if (location) {
        // Count by full location (department + area)
        const fullLocation = `${location.department?.department || 'Unknown'} - ${location.area || 'Unknown'}`;
        locationCounts[fullLocation] = (locationCounts[fullLocation] || 0) + 1;
        
        // Count by department only
        const dept = location.department?.department || 'Unknown';
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
        
        // Count by area only
        const area = location.area || 'Unknown';
        areaCounts[area] = (areaCounts[area] || 0) + 1;
      }
    });

    // You can choose which level to display - here using full location
    const labels = Object.keys(locationCounts);
    const data = Object.values(locationCounts);
    
    return {
      labels,
      datasets: [{
        label: 'Work Orders by Location',
        data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
        borderWidth: 1,
      }],
      // Also return the other breakdowns for potential use
      departmentCounts,
      areaCounts
    };
  };

  const getDepartmentDistribution = () => {
    const deptCounts: Record<string, number> = {};
    
    workOrders.forEach(order => {
      const dept = order.department || 'Unknown';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const labels = Object.keys(deptCounts);
    const data = Object.values(deptCounts);
    
    return {
      labels,
      datasets: [{
        label: 'Work Orders by Department',
        data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderWidth: 1,
      }]
    };
  };

  const getWorkTypeDistribution = () => {
    const typeCounts: Record<string, number> = {};
    
    workOrders.forEach(order => {
      const type = order.type_of_work?.type_of_work || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);
    
    return {
      labels,
      datasets: [{
        label: 'Work Orders by Type',
        data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
        ],
        borderWidth: 1,
      }]
    };
  };

  const getTrendData = () => {
    // Group by week or month based on time range
    const dateFormat = timeRange === '7days' ? 'EEEE' : timeRange === '30days' ? 'MMM dd' : 'MMM yyyy';
    
    const dateCounts: Record<string, number> = {};
    
    workOrders.forEach(order => {
      const date = new Date(order.initiation_date);
      const dateKey = format(date, dateFormat);
      dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
    });

    // Sort dates chronologically
    const sortedDates = Object.keys(dateCounts).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    const labels = sortedDates;
    const data = labels.map(date => dateCounts[date]);
    
    return {
      labels,
      datasets: [{
        label: 'Work Orders Over Time',
        data,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true,
      }]
    };
  };

  const getCompletionStats = () => {
    let totalCompleted = 0;
    let totalPending = 0;
    let totalRejected = 0;
    let totalClosed = 0;
    let totalInProcess = 0;

    workOrders.forEach(order => {
      if (order.closed?.closed === 'Yes') {
        totalClosed++;
      } else if (order.accepted === false) {
        totalRejected++;
      } else if (order.work_status?.work_status === 'Completed') {
        totalCompleted++;
      } else if (order.work_status?.work_status === 'Pending') {
        totalPending++;
      } else if (order.work_status?.work_status === 'In_Process') {
        totalInProcess++;
      }
    });

    return {
      totalCompleted,
      totalPending,
      totalRejected,
      totalClosed,
      totalInProcess,
      total: workOrders.length,
      completionRate: workOrders.length > 0 
        ? Math.round(((totalCompleted + totalClosed) / workOrders.length) * 100) 
        : 0,
    };
  };

  const getTopEquipmentIssues = () => {
    const equipmentCounts: Record<string, {count: number, machineType: string}> = {};
    
    workOrders.forEach(order => {
      const equipment = order.equipment.machine;
      const machineType = order.equipment.machine_type.machine_type;
      
      if (!equipmentCounts[equipment]) {
        equipmentCounts[equipment] = { count: 0, machineType };
      }
      equipmentCounts[equipment].count++;
    });

    return Object.entries(equipmentCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  };

  const getCommonProblems = () => {
    const problemKeywords: Record<string, number> = {};
    
    workOrders.forEach(order => {
      if (order.problem) {
        // Simple keyword extraction (improve as needed)
        const words = order.problem.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 4) { // Ignore short words
            problemKeywords[word] = (problemKeywords[word] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(problemKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  const stats = getCompletionStats();
  const topEquipment = getTopEquipmentIssues();
  const commonProblems = getCommonProblems();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Work Order Analytics</h1>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-3 py-2 rounded-md ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow'
            }`}>
              <CalendarIcon className="h-5 w-5 mr-2" />
                <select
                  className={`bg-transparent focus:outline-none ${
                    theme === 'dark' ? 'text-white' : 'text-gray-700'
                  }`}
                  value={timeRange}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "7days" || value === "30days" || value === "90days" || value === "all") {
                      setTimeRange(value);
                    }
                  }}
                >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-lg ${
            theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-lg shadow ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className="text-lg font-medium mb-2">Total Work Orders</h3>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          
          <div className={`p-6 rounded-lg shadow ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className="text-lg font-medium mb-2">Completion Rate</h3>
            <p className="text-3xl font-bold">{stats.completionRate}%</p>
          </div>
          
          <div className={`p-6 rounded-lg shadow ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className="text-lg font-medium mb-2">Completed</h3>
            <p className="text-3xl font-bold">{stats.totalCompleted}</p>
          </div>
          
          <div className={`p-6 rounded-lg shadow ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className="text-lg font-medium mb-2">Pending</h3>
            <p className="text-3xl font-bold">{stats.totalPending}</p>
          </div>
        </div>

        {/* Chart Navigation */}
        <div className={`mb-6 p-4 rounded-lg flex flex-wrap gap-2 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow'
        }`}>
          <button
            onClick={() => setActiveChart('status')}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeChart === 'status' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <ChartPieIcon className="h-5 w-5 mr-2" />
            Status
          </button>
          
          <button
            onClick={() => setActiveChart('department')}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeChart === 'department' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Department
          </button>
          
          <button
            onClick={() => setActiveChart('type')}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeChart === 'type' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Work Type
          </button>
          
          <button
            onClick={() => setActiveChart('trend')}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeChart === 'trend' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
            Trends
          </button>

          <button
            onClick={() => setActiveChart('location')}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeChart === 'location' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <MapPinIcon className="h-5 w-5 mr-2" />
            Locations
          </button>
        </div>

        {/* Main Chart Area */}
        <div className={`mb-8 p-6 rounded-lg shadow ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                theme === 'dark' ? 'border-gray-300' : 'border-gray-900'
              }`}></div>
            </div>
          ) : (
            <div className="h-96">
              {activeChart === 'status' && (
                <Pie 
                  data={getStatusDistribution()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: theme === 'dark' ? '#fff' : '#333',
                        }
                      }
                    }
                  }} 
                />
              )}
              
              {activeChart === 'department' && (
                <Bar 
                  data={getDepartmentDistribution()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: theme === 'dark' ? '#fff' : '#333',
                        },
                        grid: {
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        }
                      },
                      x: {
                        ticks: {
                          color: theme === 'dark' ? '#fff' : '#333',
                        },
                        grid: {
                          display: false,
                        }
                      }
                    }
                  }} 
                />
              )}
              
              {activeChart === 'type' && (
                <Bar 
                  data={getWorkTypeDistribution()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: theme === 'dark' ? '#fff' : '#333',
                        },
                        grid: {
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        }
                      },
                      x: {
                        ticks: {
                          color: theme === 'dark' ? '#fff' : '#333',
                        },
                        grid: {
                          display: false,
                        }
                      }
                    }
                  }} 
                />
              )}
              
              {activeChart === 'trend' && (
                <Line 
                  data={getTrendData()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: theme === 'dark' ? '#fff' : '#333',
                        },
                        grid: {
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        }
                      },
                      x: {
                        ticks: {
                          color: theme === 'dark' ? '#fff' : '#333',
                        },
                        grid: {
                          display: false,
                        }
                      }
                    }
                  }} 
                />
              )}

              {activeChart === 'location' && (
                <Bar 
                  data={getLocationDistribution()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: theme === 'dark' ? '#fff' : '#333',
                        },
                        grid: {
                          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        }
                      },
                      x: {
                        ticks: {
                          color: theme === 'dark' ? '#fff' : '#333',
                        },
                        grid: {
                          display: false,
                        }
                      }
                    }
                  }} 
                />
              )}
            </div>
          )}
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Equipment Issues */}
          <div className={`p-6 rounded-lg shadow ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className="text-xl font-bold mb-4">Top Equipment with Most Issues</h3>
            {topEquipment.length > 0 ? (
              <div className="space-y-3">
                {topEquipment.map(([equipment, data]) => (
                  <div key={equipment} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{equipment}</p>
                      <p className="text-sm opacity-70">{data.machineType}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {data.count} issues
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No equipment data available</p>
            )}
          </div>

          {/* Common Problem Keywords */}
          <div className={`p-6 rounded-lg shadow ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className="text-xl font-bold mb-4">Common Problem Keywords</h3>
            {commonProblems.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {commonProblems.map(([word, count]) => (
                  <span 
                    key={word}
                    className={`px-3 py-1 rounded-full text-sm ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {word} ({count})
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No problem data available</p>
            )}
          </div>
          
          <div className={`p-6 rounded-lg shadow ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className="text-xl font-bold mb-4">Top Locations</h3>
            {getLocationDistribution().labels.length > 0 ? (
              <div className="space-y-3">
                {Object.entries(getLocationDistribution().departmentCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([dept, count]) => (
                    <div key={dept} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{dept}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {count} work orders
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500">No location data available</p>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className={`p-6 rounded-lg shadow mb-8 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h3 className="text-xl font-bold mb-4">Status Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`p-4 rounded-lg text-center ${
              theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
            }`}>
              <p className="text-sm opacity-80">Completed</p>
              <p className="text-2xl font-bold">{stats.totalCompleted}</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${
              theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100'
            }`}>
              <p className="text-sm opacity-80">Pending</p>
              <p className="text-2xl font-bold">{stats.totalPending}</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${
              theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
            }`}>
              <p className="text-sm opacity-80">Rejected</p>
              <p className="text-2xl font-bold">{stats.totalRejected}</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${
              theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
            }`}>
              <p className="text-sm opacity-80">Closed</p>
              <p className="text-2xl font-bold">{stats.totalClosed}</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${
              theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
            }`}>
              <p className="text-sm opacity-80">In Process</p>
              <p className="text-2xl font-bold">{stats.totalInProcess}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}