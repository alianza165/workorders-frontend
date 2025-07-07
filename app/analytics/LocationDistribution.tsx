"use client"

// components/analytics/LocationDistribution.tsx
import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { MapPinIcon, FunnelIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { DatePickerProps } from 'react-datepicker';
import { TooltipItem } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type ThemeAwareDatePickerProps = DatePickerProps & {
  theme?: 'light' | 'dark';
};

interface LocationData {
  department: string;
  area: string;
  count: number;
}

interface Department {
  id: number;
  department: string;
}

export default function LocationDistribution() {
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [data, setData] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    department: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchDepartments = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/departments/`, 
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      setDepartments(data.results);
    } catch (err) {
      console.error("Error loading departments:", err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('date_from', filters.dateFrom.toISOString());
      if (filters.dateTo) params.append('date_to', filters.dateTo.toISOString());
      if (filters.department) params.append('department', filters.department);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/locations/?${params.toString()}`, 
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchData();
  }, [filters]);

  const colorPalette = theme === 'dark'
    ? [
        'rgba(99, 102, 241, 0.7)',  // indigo-500
        'rgba(147, 51, 234, 0.7)',  // purple-600
        'rgba(236, 72, 153, 0.7)',  // pink-500
        'rgba(34, 197, 94, 0.7)',   // green-500
        'rgba(251, 191, 36, 0.7)',  // yellow-400
        'rgba(244, 63, 94, 0.7)'    // rose-500
      ]
    : [
        'rgba(59, 130, 246, 0.7)',  // blue-500
        'rgba(96, 165, 250, 0.7)',  // blue-400
        'rgba(56, 189, 248, 0.7)',  // sky-400
        'rgba(34, 197, 94, 0.7)',   // green-500
        'rgba(234, 179, 8, 0.7)',   // yellow-500
        'rgba(239, 68, 68, 0.7)'    // red-500
      ];

  const chartData = {
    labels: data.map(item => `${item.department} - ${item.area}`),
    datasets: [{
      label: 'Work Orders by Location',
      data: data.map(item => item.count),
      backgroundColor: data.map((_, index) => colorPalette[index % colorPalette.length]),
      borderColor: data.map((_, index) => colorPalette[index % colorPalette.length].replace('0.7', '1')),
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
        labels: {
          color: theme === 'dark' ? '#e5e7eb' : '#374151' // gray-200 / gray-700
        }
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y; // For bar charts, use parsed.y instead of raw
            return `${label}: ${value} work order${value !== 1 ? 's' : ''}`;
          }
        },
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        titleColor: theme === 'dark' ? '#e5e7eb' : '#111827',
        bodyColor: theme === 'dark' ? '#d1d5db' : '#4b5563',
        borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Work Orders',
          color: theme === 'dark' ? '#e5e7eb' : '#374151' // gray-200 / gray-700
        },
        grid: {
          color: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.3)' // gray-600/300
        },
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280' // gray-400 / gray-500
        }
      },
      x: {
        title: {
          display: true,
          text: 'Location (Department - Area)',
          color: theme === 'dark' ? '#e5e7eb' : '#374151' // gray-200 / gray-700
        },
        grid: {
          display: false
        },
        ticks: {
          color: theme === 'dark' ? '#9ca3af' : '#6b7280' // gray-400 / gray-500
        }
      }
    }
  };

  // Custom date picker component to handle theme
  const ThemeAwareDatePicker = ({ theme, ...props }: ThemeAwareDatePickerProps) => (
    <DatePicker
      className={`w-full p-2 rounded border ${
        theme === 'dark' 
          ? 'bg-gray-700 border-gray-600 text-white' 
          : 'bg-white border-gray-300 text-gray-700'
      }`}
      {...props}
    />
  );

const handleDateFromChange = (date: Date | null) => {
  setFilters(prev => ({
    ...prev,
    dateFrom: date || prev.dateFrom // Keep previous value if null
  }));
};

  return (
    <div className={`rounded-lg shadow p-6 ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold flex items-center ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>
          <MapPinIcon className="h-5 w-5 mr-2" />
          Work Order Locations
        </h2>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center text-sm px-3 py-1 rounded ${
            theme === 'dark' 
              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FunnelIcon className="h-4 w-4 mr-1" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              From Date
            </label>
            <ThemeAwareDatePicker
              selected={filters.dateFrom}
              onChange={handleDateFromChange}
              selectsStart
              startDate={filters.dateFrom}
              endDate={filters.dateTo}
              placeholderText="Select start date"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              To Date
            </label>
            <ThemeAwareDatePicker
              selected={filters.dateFrom}
              onChange={handleDateFromChange}
              selectsStart
              startDate={filters.dateFrom}
              endDate={filters.dateTo}
              placeholderText="Select start date"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({...filters, department: e.target.value})}
              className={`w-full p-2 rounded border ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
              disabled={departments.length === 0}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.department}>
                  {dept.department}
                </option>
              ))}
            </select>
            {departments.length === 0 && (
              <p className={`text-xs mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Loading departments...
              </p>
            )}
          </div>
        </div>
      )}

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
        <div className="flex justify-center items-center h-64">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            theme === 'dark' ? 'border-blue-400' : 'border-blue-600'
          }`}></div>
        </div>
      ) : data.length > 0 ? (
        <div className="">
          <Bar data={chartData} options={options} />
        </div>
      ) : (
        <div className={`text-center py-8 rounded ${
          theme === 'dark' ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'
        }`}>
          No location data available for the selected filters
        </div>
      )}

      <div className={`mt-6 ${
        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
      }`}>
        <h3 className="font-medium mb-2">Top Locations</h3>
        <div className="space-y-2">
          {data.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-8 text-sm font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {index + 1}.
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  {item.department} - {item.area}
                </div>
                <div className={`w-full rounded-full h-2.5 ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                }`}>
                  <div 
                    className={`h-2.5 rounded-full ${
                      theme === 'dark' ? 'bg-indigo-500' : 'bg-blue-500'
                    }`} 
                    style={{ width: `${(item.count / Math.max(...data.map(d => d.count))) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className={`w-12 text-right text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {item.count}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}