"use client"

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, PointElement, LineElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { ArrowLeftIcon, HeartIcon } from '@heroicons/react/24/outline';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

interface MonthlyFrequency { month: string; count: number; }
interface MttrPoint { month: string; avg_mttr_hours: number; }
interface FailureMode { problem: string; count: number; }
interface PartHistory { part: string; count: number; }
interface Prediction {
  ewma_interval_days: number;
  predicted_next_failure: string;
  trend_direction: 'Accelerating' | 'Stable' | 'Improving' | 'Insufficient data';
  confidence: number;
  last_failure: string;
  mttr_trend_label: 'Worsening' | 'Stable' | 'Improving' | 'Insufficient data';
}
interface HealthData {
  equipment_id: number;
  health_score: number;
  monthly_frequency: MonthlyFrequency[];
  mttr_trend: MttrPoint[];
  top_failure_modes: FailureMode[];
  top_parts: PartHistory[];
  prediction: Prediction | null;
  summary: { total_all_time: number; total_last_12m: number };
}

export default function EquipmentHealthPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const textColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/analytics/equipment-health/${id}/`,
        { headers: { 'Authorization': `Token ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch equipment health data');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`} />
    </div>
  );
  if (error) return (
    <div className={`m-6 p-4 rounded border-l-4 ${isDark ? 'bg-red-900/30 border-red-500 text-red-200' : 'bg-red-100 border-red-500 text-red-700'}`}>
      {error}
    </div>
  );
  if (!data) return null;

  // Health score colour
  const scoreColor = data.health_score >= 70 ? 'text-green-500' : data.health_score >= 40 ? 'text-yellow-500' : 'text-red-500';
  const scoreBg   = data.health_score >= 70
    ? (isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200')
    : data.health_score >= 40
    ? (isDark ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200')
    : (isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200');

  // Trend badge helpers
  const trendBadge = (dir: Prediction['trend_direction']) => {
    const s: Record<string, string> = {
      Accelerating: 'bg-red-100 text-red-700',
      Stable:       'bg-yellow-100 text-yellow-700',
      Improving:    'bg-green-100 text-green-700',
      'Insufficient data': 'bg-gray-100 text-gray-500',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s[dir]}`}>{dir}</span>;
  };

  const confidenceBadge = (c: number) => {
    const label = c >= 0.7 ? 'High' : c >= 0.4 ? 'Medium' : 'Low';
    const s = c >= 0.7 ? 'bg-green-100 text-green-700' : c >= 0.4 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s}`}>{label} confidence ({Math.round(c * 100)}%)</span>;
  };

  const mttrBadge = (label: Prediction['mttr_trend_label']) => {
    const s: Record<string, string> = {
      Worsening: 'bg-red-100 text-red-700',
      Stable:    'bg-yellow-100 text-yellow-700',
      Improving: 'bg-green-100 text-green-700',
      'Insufficient data': 'bg-gray-100 text-gray-500',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s[label]}`}>MTTR: {label}</span>;
  };

  // Chart: monthly frequency
  const freqLabels = data.monthly_frequency.map(m => m.month);
  const freqValues = data.monthly_frequency.map(m => m.count);
  const barData = {
    labels: freqLabels,
    datasets: [{
      label: 'Breakdowns',
      data: freqValues,
      backgroundColor: isDark ? 'rgba(96,165,250,0.7)' : 'rgba(59,130,246,0.7)',
      borderRadius: 4,
    }],
  };
  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: {
      x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
    },
  };

  // Chart: MTTR trend
  const mttrLabels = data.mttr_trend.map(m => m.month);
  const mttrValues = data.mttr_trend.map(m => m.avg_mttr_hours);
  const lineData = {
    labels: mttrLabels,
    datasets: [{
      label: 'Avg MTTR (hours)',
      data: mttrValues,
      borderColor: isDark ? '#f87171' : '#ef4444',
      backgroundColor: isDark ? 'rgba(248,113,113,0.15)' : 'rgba(239,68,68,0.1)',
      pointBackgroundColor: isDark ? '#f87171' : '#ef4444',
      tension: 0.3,
      fill: true,
    }],
  };
  const lineOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: textColor } } },
    scales: {
      x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
    },
  };

  const maxFaultCount = data.top_failure_modes[0]?.count || 1;
  const maxPartCount  = data.top_parts[0]?.count || 1;
  const card = `rounded-lg border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`;

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className={`p-2 rounded-lg hover:opacity-80 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <HeartIcon className={`h-6 w-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Equipment Health Dashboard
          </h1>
        </div>
        <span className={`ml-2 px-3 py-1 rounded-full text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
          ID #{id}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* Health Score */}
        <div className={`${card} ${scoreBg} col-span-1`}>
          <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Health Score</p>
          <p className={`text-5xl font-bold ${scoreColor}`}>{data.health_score}</p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>out of 100</p>
        </div>

        {/* Summary */}
        <div className={`${card}`}>
          <p className={`text-xs font-medium uppercase tracking-wide mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Breakdown Count</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>All-time</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.summary.total_all_time}</span>
            </div>
            <div className="flex justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Last 12 months</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.summary.total_last_12m}</span>
            </div>
          </div>
        </div>

        {/* Prediction card */}
        {data.prediction ? (
          <div className={`${card} md:col-span-2`}>
            <p className={`text-xs font-medium uppercase tracking-wide mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Next Failure Prediction</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Predicted date</p>
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(data.prediction.predicted_next_failure).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>EWMA interval</p>
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{data.prediction.ewma_interval_days} days</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Last failure</p>
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(data.prediction.last_failure).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendBadge(data.prediction.trend_direction)}
              {confidenceBadge(data.prediction.confidence)}
              {mttrBadge(data.prediction.mttr_trend_label)}
            </div>
          </div>
        ) : (
          <div className={`${card} md:col-span-2 flex items-center justify-center`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Insufficient data for prediction</p>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className={card}>
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Monthly Breakdown Frequency (Last 12 Months)
          </h3>
          <Bar data={barData} options={barOptions} />
        </div>
        <div className={card}>
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            MTTR Trend (Months with Completed Repairs)
          </h3>
          {data.mttr_trend.length > 0
            ? <Line data={lineData} options={lineOptions} />
            : <div className={`flex items-center justify-center h-48 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No completed repair data</div>
          }
        </div>
      </div>

      {/* Failure modes + Parts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={card}>
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Top Failure Modes (All-time)
          </h3>
          {data.top_failure_modes.length > 0 ? (
            <div className="space-y-3">
              {data.top_failure_modes.map((fm, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`truncate max-w-[80%] ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{fm.problem}</span>
                    <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{fm.count}</span>
                  </div>
                  <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div
                      className={`h-1.5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`}
                      style={{ width: `${(fm.count / maxFaultCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No failure data available</p>
          )}
        </div>

        <div className={card}>
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Parts Replacement History (All-time)
          </h3>
          {data.top_parts.length > 0 ? (
            <div className="space-y-3">
              {data.top_parts.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`truncate max-w-[80%] ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{p.part}</span>
                    <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{p.count}</span>
                  </div>
                  <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div
                      className={`h-1.5 rounded-full ${isDark ? 'bg-orange-400' : 'bg-orange-500'}`}
                      style={{ width: `${(p.count / maxPartCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No parts replacement data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
