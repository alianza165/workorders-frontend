"use client"

// components/analytics/StatusTrend.tsx
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface StatusTrendData {
  status: string;
  data: number[];
}

export default function StatusTrend() {
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [data, setData] = useState<{
    dates: string[];
    results: StatusTrendData[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    timeframe: 30, // days
    groupBy: 'week' // day/week/month
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        timeframe: filters.timeframe.toString(),
        group_by: filters.groupBy
      });
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/status-trend/?${params.toString()}`, 
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch status trend data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  // Status color mapping
  const statusColors = {
    'Pending': theme === 'dark' ? 'rgba(234, 179, 8, 0.7)' : 'rgba(234, 179, 8, 0.7)',    // yellow-500
    'In_Process': theme === 'dark' ? 'rgba(59, 130, 246, 0.7)' : 'rgba(59, 130, 246, 0.7)', // blue-500
    'Completed': theme === 'dark' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(16, 185, 129, 0.7)',   // green-500
    'Rejected': theme === 'dark' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.7)',      // red-500
    'Closed': theme === 'dark' ? 'rgba(139, 92, 246, 0.7)' : 'rgba(139, 92, 246, 0.7)'      // purple-500
  };

  const chartData = {
    labels: data?.dates || [],
    datasets: data?.results.map(status => ({
      label: status.status,
      data: status.data,
      borderColor: statusColors[status.status as keyof typeof statusColors],
      backgroundColor: statusColors[status.status as keyof typeof statusColors],
      tension: 0.3,
      pointRadius: 3,
      pointHoverRadius: 5
    })) || []
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme === 'dark' ? '#e5e7eb' : '#374151'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        titleColor: theme === 'dark' ? '#e5e7eb' : '#111827',
        bodyColor: theme === 'dark' ? '#d1d5db' : '#4b5563',
        borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db'
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time Period',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
        },
        grid: {
          color: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.3)'
        },
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Number of Work Orders',
          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
        },
        grid: {
          color: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.3)'
        },
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280'
        },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  return (
    <div className={`rounded-lg shadow p-6 ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold flex items-center ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>
          <ArrowsRightLeftIcon className="h-5 w-5 mr-2" />
          Status Trend Over Time
        </h2>
        <div className="flex space-x-2">
          <select
            value={filters.timeframe}
            onChange={(e) => setFilters({...filters, timeframe: parseInt(e.target.value)})}
            className={`text-sm rounded border ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <select
            value={filters.groupBy}
            onChange={(e) => setFilters({...filters, groupBy: e.target.value})}
            className={`text-sm rounded border ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {error && (
        <div className={`p-4 mb-4 rounded border-l-4 ${
          theme === 'dark' 
            ? 'bg-red-900/30 border-red-500 text-red-200' 
            : 'bg-red-100 border-red-500 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            theme === 'dark' ? 'border-purple-400' : 'border-purple-600'
          }`}></div>
        </div>
      ) : data ? (
        <div className="h-96">
          <Line data={chartData} options={options} />
        </div>
      ) : (
        <div className={`text-center py-8 rounded ${
          theme === 'dark' ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'
        }`}>
          No status trend data available
        </div>
      )}
    </div>
  );
}