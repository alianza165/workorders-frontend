'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { ChartBarIcon } from '@heroicons/react/24/outline';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface MonthPoint { month: string; count: number; }

interface OverviewData {
  monthly_volume: MonthPoint[];
}

function formatMonth(ym: string) {
  const [year, month] = ym.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export default function MonthlyVolume() {
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [data, setData] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/analytics/overview/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      if (res.ok) {
        const json: OverviewData = await res.json();
        setData(json.monthly_volume);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cardClass = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-800';
  const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const gridColor = theme === 'dark' ? 'rgba(75,85,99,0.3)' : 'rgba(209,213,219,0.4)';
  const tickColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const barColor = theme === 'dark' ? 'rgba(20,184,166,0.75)' : 'rgba(13,148,136,0.75)';
  const barBorder = theme === 'dark' ? 'rgba(20,184,166,1)' : 'rgba(13,148,136,1)';

  const totalInPeriod = data.reduce((s, d) => s + d.count, 0);
  const peak = data.length ? Math.max(...data.map(d => d.count)) : 0;
  const peakMonth = data.find(d => d.count === peak);

  const chartData = {
    labels: data.map(d => formatMonth(d.month)),
    datasets: [{
      label: 'Work Orders',
      data: data.map(d => d.count),
      backgroundColor: barColor,
      borderColor: barBorder,
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: { label: string }[]) => items[0]?.label,
          label: (item: { parsed: { y: number } }) => ` ${item.parsed.y} work orders`,
        },
        backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
        titleColor: theme === 'dark' ? '#e5e7eb' : '#111827',
        bodyColor: theme === 'dark' ? '#d1d5db' : '#4b5563',
        borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tickColor, maxRotation: 45 },
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: tickColor, precision: 0 },
      },
    },
  };

  return (
    <div className={`${cardClass} rounded-xl shadow-lg p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${textMain}`}>
            <ChartBarIcon className="w-5 h-5 text-teal-500" />
            Work Order Volume — Last 24 Months
          </h2>
          <p className={`text-sm mt-1 ${textMuted}`}>
            Total work orders initiated per month
          </p>
        </div>
        {!loading && data.length > 0 && (
          <div className="flex gap-6 text-right">
            <div>
              <p className={`text-xs ${textMuted}`}>Total in period</p>
              <p className={`text-2xl font-bold text-teal-500`}>{totalInPeriod}</p>
            </div>
            {peakMonth && (
              <div>
                <p className={`text-xs ${textMuted}`}>Peak month</p>
                <p className={`text-2xl font-bold ${textMain}`}>{peak}</p>
                <p className={`text-xs ${textMuted}`}>{formatMonth(peakMonth.month)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
        </div>
      ) : data.length === 0 ? (
        <div className={`text-center py-16 ${textMuted}`}>No data available</div>
      ) : (
        <div style={{ height: '280px' }}>
          <Bar data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}
