"use client"
// components/analytics/EquipmentTypeAnalysis.tsx
import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  ChartOptions 
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { CpuChipIcon, FunnelIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import { DatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

ChartJS.register(ArcElement, Tooltip, Legend);

type ThemeAwareDatePickerProps = DatePickerProps & {
  theme?: 'light' | 'dark';
};

interface EquipmentTypeData {
  equipment_type: string;
  count: number;
  avg_completion_hours: number | null;
}

interface Department {
  id: number;
  department: string;
}

export default function EquipmentTypeAnalysis() {
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [data, setData] = useState<EquipmentTypeData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analytics/equipment-types/?${params.toString()}`, 
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch equipment data');
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

  // Dynamic color generation based on theme
  const generateColors = (count: number) => {
    const saturation = 70;
    const lightness = theme === 'dark' ? 60 : 50;

    return Array.from({ length: count }, (_, i) => {
      const hue = (i * 360) / count; // Spread hues across the full circle
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    });
  };

  const chartData = {
    labels: data.map(item => item.equipment_type),
    datasets: [{
      label: 'Work Orders by Equipment Type',
      data: data.map(item => item.count),
      backgroundColor: generateColors(data.length),
      borderColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      borderWidth: 1
    }]
  };

const options: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false, // Add this to disable automatic aspect ratio
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: theme === 'dark' ? '#e5e7eb' : '#374151',
        font: {
          size: 10
        },
        padding: 10,
        boxWidth: 16,
      },
      align: 'center',
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.label || '';
          const value = context.raw || 0;
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = Math.round((Number(value) / total) * 100);
          const avgHours = data[context.dataIndex].avg_completion_hours;
          
          let tooltip = `${label}: ${value} (${percentage}%)`;
          if (avgHours) {
            tooltip += `\nAvg: ${avgHours.toFixed(1)} hours`;
          }
          return tooltip;
        }
      },
      bodyFont: {
        size: 14
      }
    }
  },
  // These help maximize the pie area
  layout: {
    padding: {
      top: 20,
      bottom: 20 // Give space for legend
    }
  }
};

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
          <CpuChipIcon className="h-5 w-5 mr-2" />
          Equipment Type Analysis
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

      {/* Filter Panel (Same as LocationDistribution) */}
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
        <div className="flex justify-center items-center h-full">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            theme === 'dark' ? 'border-indigo-400' : 'border-blue-600'
          }`}></div>
        </div>
      ) : data.length > 0 ? (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/2" style={{ height: '450px' }}> {/* Increased height */}
            <div className="h-full w-full"> {/* Will fill the parent */}
              <Pie data={chartData} options={options} />
            </div>
          </div>
          <div className="lg:w-1/2">
            <h3 className={`font-medium mb-4 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Equipment Type Statistics
            </h3>
            
            {/* Fixed height container with scroll */}
            <div 
              className="space-y-4 overflow-y-auto"
              style={{ height: '400px' }} // Fixed height
            >
              {data.map((item, index) => (
                <div key={index} className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-medium ${
                      theme === 'dark' ? 'text-indigo-300' : 'text-blue-600'
                    }`}>
                      {item.equipment_type}
                    </span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      theme === 'dark' ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {item.count} work orders
                    </span>
                  </div>
                  {item.avg_completion_hours && (
                    <div className="flex items-center text-sm">
                      <span className={`mr-2 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Avg. Resolution:
                      </span>
                      <span className={`font-medium ${
                        theme === 'dark' ? 'text-green-300' : 'text-green-600'
                      }`}>
                        {item.avg_completion_hours.toFixed(1)} hours
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={`text-center py-8 rounded ${
          theme === 'dark' ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'
        }`}>
          No equipment type data available for the selected filters
        </div>
      )}
    </div>
  );
}