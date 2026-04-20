'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { useRouter } from 'next/navigation';
import MonthlyVolume from './MonthlyVolume';
import DepartmentSummary from './DepartmentSummary';
import OpenJobsAge from './OpenJobsAge';
import EquipmentFaultAnalysis from './EquipmentFaultAnalysis';
import DataQualityAlerts from './DataQualityAlerts';
import {
  ChartBarIcon,
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  WrenchIcon,
} from '@heroicons/react/24/outline';

export default function AnalyticsPage() {
  const { token, isAuthenticated, authLoading } = useAuth();
  const { theme } = useAppContext();
  const router = useRouter();

  const [summaryStats, setSummaryStats] = useState({
    totalWorkOrders: 0,
    pending: 0,
    inProcess: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/signin');
  }, [isAuthenticated, authLoading, router]);

  const fetchSummaryStats = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/workorders/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const wos = data.results || [];
        setSummaryStats({
          totalWorkOrders: data.count || wos.length,
          pending:    wos.filter((w: { work_status?: { work_status?: string } }) => w.work_status?.work_status === 'Pending').length,
          inProcess:  wos.filter((w: { work_status?: { work_status?: string } }) => w.work_status?.work_status === 'In_Process').length,
          completed:  wos.filter((w: { work_status?: { work_status?: string } }) => w.work_status?.work_status === 'Completed').length,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchSummaryStats();
  }, [token, fetchSummaryStats]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  const themeClass = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const cardClass = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

  const completionRate = summaryStats.totalWorkOrders > 0
    ? Math.round((summaryStats.completed / summaryStats.totalWorkOrders) * 100)
    : 0;

  const STAT_CARDS = [
    {
      label: 'Total Work Orders',
      value: summaryStats.totalWorkOrders,
      icon: ChartBarIcon,
      color: 'text-teal-500',
      iconBg: theme === 'dark' ? 'bg-teal-900/40' : 'bg-teal-50',
    },
    {
      label: 'Pending',
      value: summaryStats.pending,
      icon: ClockIcon,
      color: 'text-yellow-500',
      iconBg: theme === 'dark' ? 'bg-yellow-900/40' : 'bg-yellow-50',
    },
    {
      label: 'In Progress',
      value: summaryStats.inProcess,
      icon: WrenchIcon,
      color: 'text-blue-500',
      iconBg: theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-50',
    },
    {
      label: 'Completed',
      value: summaryStats.completed,
      icon: CheckCircleIcon,
      color: 'text-green-500',
      iconBg: theme === 'dark' ? 'bg-green-900/40' : 'bg-green-50',
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: ChartBarIcon,
      color: 'text-purple-500',
      iconBg: theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-50',
    },
  ];

  return (
    <div className={`min-h-screen ${themeClass} transition-colors duration-200`}>
      <div className="container mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.push('/dashboard')}
            className={`p-2 rounded-lg transition-all hover:scale-110 ${
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-teal-600 flex items-center gap-3">
              <ChartBarIcon className="w-8 h-8" />
              Analytics
            </h1>
            <p className={`text-sm mt-0.5 ${textMuted}`}>
              Work order performance, machine health, and operational insights
            </p>
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {STAT_CARDS.map(({ label, value, icon: Icon, color, iconBg }) => (
            <div key={label} className={`${cardClass} rounded-xl shadow-lg p-5 flex items-center gap-4`}>
              <div className={`p-2.5 rounded-lg shrink-0 ${iconBg}`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-medium truncate ${textMuted}`}>{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Data quality alerts */}
        <DataQualityAlerts />

        {/* Monthly volume — full width */}
        <MonthlyVolume />

        {/* Department breakdown + Open jobs age */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DepartmentSummary />
          <OpenJobsAge />
        </div>

        {/* Equipment fault analysis + watch list */}
        <EquipmentFaultAnalysis />

      </div>
    </div>
  );
}
