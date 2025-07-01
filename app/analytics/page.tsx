'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { WorkOrder, WorkOrderResponse } from '../../types/workorder';
import { format, subMonths, differenceInHours } from 'date-fns';
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
import { 
  CalendarIcon, 
  ChartBarIcon, 
  ChartPieIcon, 
  ArrowTrendingUpIcon, 
  MapPinIcon,
  DocumentArrowDownIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

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

type AnalysisView = 'summary' | 'comparison' | 'equipment' | 'downtime' | 'prevention';
type TimeRange = '7days' | '30days' | '90days' | 'all';
type CompareDimension = 'none' | 'department' | 'equipment_type' | 'shift';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon }) => {
  const { theme } = useAppContext();
  
  return (
    <div className={`p-4 rounded-lg shadow flex items-start ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`p-3 rounded-full mr-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
        {icon}
      </div>
      <div>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {change !== undefined && (
          <p className={`text-sm mt-1 ${
            change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-500'
          }`}>
            {change > 0 ? '↑' : change < 0 ? '↓' : ''} {Math.abs(change)}% from last period
          </p>
        )}
      </div>
    </div>
  );
};

export default function EnhancedWorkOrderAnalytics() {
  const { token, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();
  const { theme } = useAppContext();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const [compareBy, setCompareBy] = useState<CompareDimension>('none');
  const [activeView, setActiveView] = useState<AnalysisView>('summary');
  const [prevPeriodData, setPrevPeriodData] = useState<WorkOrder[]>([]);

  // Calculate date ranges
  const getDateRange = (range: TimeRange) => {
    const now = new Date();
    switch (range) {
      case '7days': return subMonths(now, 0.25);
      case '30days': return subMonths(now, 1);
      case '90days': return subMonths(now, 3);
      case 'all': return new Date(0);
    }
  };

  // Fetch work orders for both current and previous period
  const fetchWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentDateFrom = getDateRange(timeRange);
      const prevDateFrom = getDateRange(timeRange === '7days' ? '7days' : 
                                       timeRange === '30days' ? '30days' : 
                                       timeRange === '90days' ? '90days' : 'all');

      const [currentRes, prevRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/?initiation_date__gte=${currentDateFrom.toISOString()}`, {
          headers: { 'Authorization': `Token ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/?initiation_date__gte=${prevDateFrom.toISOString()}&initiation_date__lte=${currentDateFrom.toISOString()}`, {
          headers: { 'Authorization': `Token ${token}` }
        })
      ]);

      if (!currentRes.ok || !prevRes.ok) throw new Error('Failed to fetch work orders');
      
      const currentData: WorkOrderResponse = await currentRes.json();
      const prevData: WorkOrderResponse = await prevRes.json();
      
      setWorkOrders(Array.isArray(currentData.results) ? currentData.results : []);
      setPrevPeriodData(Array.isArray(prevData.results) ? prevData.results : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setWorkOrders([]);
      setPrevPeriodData([]);
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

  // Calculate key metrics with comparison to previous period
  const calculateMetrics = () => {
    const current = {
      total: workOrders.length,
      completed: workOrders.filter(wo => wo.work_status?.work_status === 'Completed').length,
      pending: workOrders.filter(wo => wo.work_status?.work_status === 'Pending').length,
      avgResolutionTime: calculateAverageResolution(workOrders),
      downtimeHours: calculateTotalDowntime(workOrders)
    };

    const previous = {
      total: prevPeriodData.length,
      completed: prevPeriodData.filter(wo => wo.work_status?.work_status === 'Completed').length,
      pending: prevPeriodData.filter(wo => wo.work_status?.work_status === 'Pending').length,
      avgResolutionTime: calculateAverageResolution(prevPeriodData),
      downtimeHours: calculateTotalDowntime(prevPeriodData)
    };

    const calculateChange = (current: number, previous: number) => 
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

    return {
      total: {
        value: current.total,
        change: calculateChange(current.total, previous.total)
      },
      completionRate: {
        value: current.total > 0 ? Math.round((current.completed / current.total) * 100) : 0,
        change: calculateChange(
          current.total > 0 ? (current.completed / current.total) : 0,
          previous.total > 0 ? (previous.completed / previous.total) : 0
        )
      },
      avgResolutionTime: {
        value: formatHours(current.avgResolutionTime),
        change: calculateChange(current.avgResolutionTime, previous.avgResolutionTime)
      },
      downtimeHours: {
        value: current.downtimeHours,
        change: calculateChange(current.downtimeHours, previous.downtimeHours)
      }
    };
  };

  // Helper functions
  const calculateAverageResolution = (orders: WorkOrder[]) => {
    const resolved = orders.filter(wo => 
      wo.work_status?.work_status === 'Completed' && 
      wo.initiation_date && 
      wo.completion_date
    );
    
    if (resolved.length === 0) return 0;
    
    const totalHours = resolved.reduce((sum, wo) => {
      const start = new Date(wo.initiation_date);
      const end = new Date(wo.completion_date);
      return sum + differenceInHours(end, start);
    }, 0);
    
    return totalHours / resolved.length;
  };

  const calculateTotalDowntime = (orders: WorkOrder[]) => {
    return orders.reduce((sum, wo) => {
      if (wo.equipment?.downtime_hours) {
        return sum + wo.equipment.downtime_hours;
      }
      return sum;
    }, 0);
  };

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} mins`;
    if (hours < 24) return `${hours.toFixed(1)} hours`;
    return `${(hours / 24).toFixed(1)} days`;
  };

  // Generate comparison data
  const getComparisonData = () => {
    if (compareBy === 'none') return null;

    const groups: Record<string, WorkOrder[]> = {};

    workOrders.forEach(wo => {
      let key = 'Unknown';
      if (compareBy === 'department') {
        key = wo.department || 'Unknown';
      } else if (compareBy === 'equipment_type') {
        key = wo.equipment?.machine_type?.machine_type || 'Unknown';
      } else if (compareBy === 'shift') {
        // Assuming you have a shift field or can derive it from time
        key = 'Shift'; // Replace with actual shift calculation
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(wo);
    });

    return Object.entries(groups).map(([name, orders]) => ({
      name,
      count: orders.length,
      completed: orders.filter(wo => wo.work_status?.work_status === 'Completed').length,
      pending: orders.filter(wo => wo.work_status?.work_status === 'Pending').length,
      avgResolution: calculateAverageResolution(orders),
      downtime: calculateTotalDowntime(orders)
    }));
  };

  // Get top equipment issues
  const getTopEquipmentIssues = () => {
    const equipmentMap: Record<string, { count: number, type: string, problems: string[] }> = {};

    workOrders.forEach(wo => {
      const equipment = wo.equipment?.machine || 'Unknown';
      const type = wo.equipment?.machine_type?.machine_type || 'Unknown';

      if (!equipmentMap[equipment]) {
        equipmentMap[equipment] = { count: 0, type, problems: [] };
      }

      equipmentMap[equipment].count++;
      if (wo.problem) {
        equipmentMap[equipment].problems.push(wo.problem);
      }
    });

    return Object.entries(equipmentMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  };

  // Get prevention recommendations
  const getPreventionRecommendations = () => {
    const recurringIssues: Record<string, { count: number, equipment: string[] }> = {};
    const equipmentTypes: Record<string, number> = {};

    workOrders.forEach(wo => {
      const problem = wo.problem?.toLowerCase() || '';
      const equipment = wo.equipment?.machine || '';
      const type = wo.equipment?.machine_type?.machine_type || '';

      // Track recurring problems
      if (problem) {
        if (!recurringIssues[problem]) {
          recurringIssues[problem] = { count: 0, equipment: [] };
        }
        recurringIssues[problem].count++;
        if (equipment && !recurringIssues[problem].equipment.includes(equipment)) {
          recurringIssues[problem].equipment.push(equipment);
        }
      }

      // Track equipment type failures
      if (type) {
        equipmentTypes[type] = (equipmentTypes[type] || 0) + 1;
      }
    });

    // Generate recommendations
    const recommendations = [];
    
    // Recurring issues
    Object.entries(recurringIssues)
      .filter(([_, data]) => data.count > 2)
      .forEach(([problem, data]) => {
        recommendations.push({
          type: 'recurring_issue',
          priority: data.count > 5 ? 'high' : data.count > 3 ? 'medium' : 'low',
          title: `Recurring: ${problem}`,
          description: `Occurred ${data.count} times across ${data.equipment.length} equipment`,
          action: `Implement preventive maintenance for affected equipment`
        });
      });

    // Equipment type patterns
    const topEquipmentType = Object.entries(equipmentTypes)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topEquipmentType) {
      recommendations.push({
        type: 'equipment_pattern',
        priority: 'medium',
        title: `Frequent failures: ${topEquipmentType[0]}`,
        description: `Accounted for ${topEquipmentType[1]} work orders`,
        action: `Schedule comprehensive inspection of all ${topEquipmentType[0]} equipment`
      });
    }

    return recommendations;
  };

  const metrics = calculateMetrics();
  const comparisonData = getComparisonData();
  const topEquipment = getTopEquipmentIssues();
  const preventionRecommendations = getPreventionRecommendations();

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
          <h1 className="text-3xl font-bold">Advanced Work Order Analytics</h1>
          
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
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <button 
              onClick={() => {}} // Implement PDF export
              className={`flex items-center gap-2 px-4 py-2 rounded ${
                theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
              }`}
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Export Report
            </button>
          </div>
        </div>

        {error && (
          <div className={`mb-6 p-4 rounded-lg ${
            theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* View Navigation */}
        <div className={`mb-6 p-4 rounded-lg flex flex-wrap gap-2 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow'
        }`}>
          <button
            onClick={() => setActiveView('summary')}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeView === 'summary' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Summary
          </button>
          
          <button
            onClick={() => setActiveView('comparison')}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeView === 'comparison' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <UserGroupIcon className="h-5 w-5 mr-2" />
            Comparison
          </button>
          
          <button
            onClick={() => setActiveView('equipment')}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeView === 'equipment' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <MapPinIcon className="h-5 w-5 mr-2" />
            Equipment
          </button>
          
          <button
            onClick={() => setActiveView('downtime')}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeView === 'downtime' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <ClockIcon className="h-5 w-5 mr-2" />
            Downtime
          </button>
          
          <button
            onClick={() => setActiveView('prevention')}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeView === 'prevention' 
                ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <LightBulbIcon className="h-5 w-5 mr-2" />
            Prevention
          </button>
        </div>

        {/* Comparison Dimension Selector */}
        {activeView === 'comparison' && (
          <div className={`mb-6 p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow'
          }`}>
            <label className={`block mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Compare By</label>
            <div className="flex gap-4">
              <select
                className={`flex-1 p-2 border rounded-md ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                value={compareBy}
                onChange={(e) => setCompareBy(e.target.value as CompareDimension)}
              >
                <option value="none">No Comparison</option>
                <option value="department">Department</option>
                <option value="equipment_type">Equipment Type</option>
                <option value="shift">Shift</option>
              </select>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
              theme === 'dark' ? 'border-gray-300' : 'border-gray-900'
            }`}></div>
          </div>
        )}

        {/* Main Content */}
        {!loading && (
          <>
            {/* Summary View */}
            {activeView === 'summary' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Work Orders"
                    value={metrics.total.value}
                    change={metrics.total.change}
                    icon={<DocumentArrowDownIcon className="h-6 w-6" />}
                  />
                  <MetricCard
                    title="Completion Rate"
                    value={`${metrics.completionRate.value}%`}
                    change={metrics.completionRate.change}
                    icon={<ChartPieIcon className="h-6 w-6" />}
                  />
                  <MetricCard
                    title="Avg Resolution Time"
                    value={metrics.avgResolutionTime.value}
                    change={metrics.avgResolutionTime.change}
                    icon={<ClockIcon className="h-6 w-6" />}
                  />
                  <MetricCard
                    title="Total Downtime"
                    value={`${metrics.downtimeHours.value} hrs`}
                    change={metrics.downtimeHours.change}
                    icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                  />
                </div>

                {/* Trends Chart */}
                <div className={`p-6 rounded-lg shadow ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className="text-xl font-bold mb-4">Work Order Trends</h3>
                  <div className="h-96">
                    <Line 
                      data={{
                        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                        datasets: [
                          {
                            label: 'Current Period',
                            data: [12, 19, 8, 15],
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                          },
                          {
                            label: 'Previous Period',
                            data: [10, 15, 12, 8],
                            borderColor: 'rgba(153, 102, 255, 1)',
                            backgroundColor: 'rgba(153, 102, 255, 0.2)',
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              color: theme === 'dark' ? '#fff' : '#333',
                            }
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
                  </div>
                </div>

                {/* Top Equipment Issues */}
                <div className={`p-6 rounded-lg shadow ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className="text-xl font-bold mb-4">Top Equipment Issues</h3>
                  <div className="space-y-4">
                    {topEquipment.map(([equipment, data]) => (
                      <div key={equipment} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{equipment}</p>
                          <p className="text-sm opacity-70">{data.type}</p>
                          {data.problems.length > 0 && (
                            <p className="text-sm mt-1 line-clamp-1">
                              Common issue: {data.problems[0]}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {data.count} issues
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Comparison View */}
            {activeView === 'comparison' && compareBy !== 'none' && comparisonData && (
              <div className="space-y-6">
                <div className={`p-6 rounded-lg shadow ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className="text-xl font-bold mb-4">Comparison by {compareBy.replace('_', ' ')}</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className={`border-b ${
                          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                          <th className={`text-left py-3 px-4 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`}>{compareBy.replace('_', ' ')}</th>
                          <th className={`text-left py-3 px-4 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`}>Work Orders</th>
                          <th className={`text-left py-3 px-4 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`}>Completed</th>
                          <th className={`text-left py-3 px-4 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`}>Avg Resolution</th>
                          <th className={`text-left py-3 px-4 ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`}>Downtime (hrs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.map((item) => (
                          <tr key={item.name} className={`border-b ${
                            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                          }`}>
                            <td className="py-3 px-4 font-medium">{item.name}</td>
                            <td className="py-3 px-4">{item.count}</td>
                            <td className="py-3 px-4">{item.completed}</td>
                            <td className="py-3 px-4">{formatHours(item.avgResolution)}</td>
                            <td className="py-3 px-4">{item.downtime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`p-6 rounded-lg shadow ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className="text-xl font-bold mb-4">Performance Comparison</h3>
                  <div className="h-96">
                    <Bar 
                      data={{
                        labels: comparisonData.map(item => item.name),
                        datasets: [
                          {
                            label: 'Completion Rate',
                            data: comparisonData.map(item => 
                              item.count > 0 ? Math.round((item.completed / item.count) * 100) : 0
                            ),
                            backgroundColor: 'rgba(75, 192, 192, 0.7)',
                          },
                          {
                            label: 'Avg Resolution (hours)',
                            data: comparisonData.map(item => item.avgResolution),
                            backgroundColor: 'rgba(153, 102, 255, 0.7)',
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: theme === 'dark' ? '#fff' : '#333',
                            }
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
                  </div>
                </div>
              </div>
            )}

            {/* Equipment View */}
            {activeView === 'equipment' && (
              <div className="space-y-6">
                <div className={`p-6 rounded-lg shadow ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className="text-xl font-bold mb-4">Equipment Failure Analysis</h3>
                  <div className="h-96">
                    <Bar 
                      data={{
                        labels: topEquipment.map(([equipment]) => equipment),
                        datasets: [
                          {
                            label: 'Number of Issues',
                            data: topEquipment.map(([_, data]) => data.count),
                            backgroundColor: 'rgba(255, 99, 132, 0.7)',
                          }
                        ]
                      }}
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
                  </div>
                </div>

                <div className={`p-6 rounded-lg shadow ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className="text-xl font-bold mb-4">Equipment Details</h3>
                  <div className="space-y-4">
                    {topEquipment.map(([equipment, data]) => (
                      <div key={equipment} className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{equipment}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {data.type}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{data.count} reported issues</p>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Recent Problems:</p>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {data.problems.slice(0, 3).map((problem, i) => (
                              <li key={i} className="line-clamp-1">{problem}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Downtime View */}
            {activeView === 'downtime' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-6 rounded-lg shadow ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <h3 className="text-xl font-bold mb-4">Downtime by Equipment</h3>
                    <div className="h-64">
                      <Pie 
                        data={{
                          labels: topEquipment.map(([equipment]) => equipment),
                          datasets: [
                            {
                              data: topEquipment.map(([_, data]) => 
                                workOrders
                                  .filter(wo => wo.equipment?.machine === equipment)
                                  .reduce((sum, wo) => sum + (wo.equipment?.downtime_hours || 0), 0)
                              ),
                              backgroundColor: [
                                'rgba(255, 99, 132, 0.7)',
                                'rgba(54, 162, 235, 0.7)',
                                'rgba(255, 206, 86, 0.7)',
                                'rgba(75, 192, 192, 0.7)',
                                'rgba(153, 102, 255, 0.7)',
                              ],
                            }
                          ]
                        }}
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
                    </div>
                  </div>

                  <div className={`p-6 rounded-lg shadow ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <h3 className="text-xl font-bold mb-4">Downtime Impact</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm">Total Downtime Hours</p>
                        <p className="text-2xl font-bold">{metrics.downtimeHours.value} hrs</p>
                        <p className={`text-sm ${
                          metrics.downtimeHours.change > 0 ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {metrics.downtimeHours.change > 0 ? '↑' : '↓'} {Math.abs(metrics.downtimeHours.change)}% from last period
                        </p>
                      </div>
                      <div>
                        <p className="text-sm">Most Affected Equipment</p>
                        <p className="text-lg font-medium">{topEquipment[0]?.[0] || 'N/A'}</p>
                        <p className="text-sm">
                          {workOrders
                            .filter(wo => wo.equipment?.machine === topEquipment[0]?.[0])
                            .reduce((sum, wo) => sum + (wo.equipment?.downtime_hours || 0), 0)} hours
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-lg shadow ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className="text-xl font-bold mb-4">Downtime Trends</h3>
                  <div className="h-96">
                    <Line 
                      data={{
                        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                        datasets: [
                          {
                            label: 'Downtime Hours',
                            data: [24, 18, 32, 12],
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            fill: true,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: theme === 'dark' ? '#fff' : '#333',
                            }
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
                  </div>
                </div>
              </div>
            )}

            {/* Prevention View */}
            {activeView === 'prevention' && (
              <div className="space-y-6">
                <div className={`p-6 rounded-lg shadow ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className="text-xl font-bold mb-4">Prevention Recommendations</h3>
                  <div className="space-y-4">
                    {preventionRecommendations.length > 0 ? (
                      preventionRecommendations.map((rec, i) => (
                        <div key={i} className={`p-4 rounded-lg border-l-4 ${
                          rec.priority === 'high' ? 'border-red-500' :
                          rec.priority === 'medium' ? 'border-yellow-500' : 'border-green-500'
                        } ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{rec.title}</h4>
                              <p className="text-sm mt-1">{rec.description}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                              rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {rec.priority} priority
                            </span>
                          </div>
                          <div className="mt-3">
                            <p className="text-sm font-medium">Recommended Action:</p>
                            <p className="text-sm">{rec.action}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No specific prevention recommendations at this time</p>
                    )}
                  </div>
                </div>

                <div className={`p-6 rounded-lg shadow ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className="text-xl font-bold mb-4">Scheduled Maintenance</h3>
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <h4 className="font-medium">Next Preventive Maintenance</h4>
                      <p className="text-sm mt-1">Based on equipment usage and failure patterns</p>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm">Equipment</p>
                          <p className="font-medium">{topEquipment[0]?.[0] || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm">Recommended Date</p>
                          <p className="font-medium">{format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-sm">Maintenance Type</p>
                          <p className="font-medium">Full Inspection</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}