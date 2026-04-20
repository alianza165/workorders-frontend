'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { WrenchIcon, ExclamationTriangleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface TopMachine {
  machine: string;
  machine_type: string;
  fault_count: number;
  median_repair_hrs: number | null;
}

interface WatchlistItem {
  equipment_id: number;
  equipment_name: string;
  last_failure: string;
  ewma_interval_days: number;
  days_overdue: number;
  trend_direction: 'Accelerating' | 'Stable' | 'Improving' | 'Insufficient data';
  predicted_next_failure: string;
}

function formatHours(hrs: number | null) {
  if (hrs === null) return '—';
  if (hrs >= 24) return `${(hrs / 24).toFixed(1)}d`;
  return `${hrs}h`;
}

export default function EquipmentFaultAnalysis() {
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [topMachines, setTopMachines] = useState<TopMachine[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, faultsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/analytics/overview/`,
          { headers: { Authorization: `Token ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/analytics/equipment-faults/`,
          { headers: { Authorization: `Token ${token}` } }),
      ]);
      if (overviewRes.ok) {
        const j = await overviewRes.json();
        setTopMachines(j.top_machines || []);
      }
      if (faultsRes.ok) {
        const j = await faultsRes.json();
        setWatchlist(j.predictive_candidates || []);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cardClass = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const rowHover = theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const divider = theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100';
  const subBg = theme === 'dark' ? 'bg-gray-700/40' : 'bg-gray-50';

  const trendBadge = (dir: WatchlistItem['trend_direction']) => {
    const map: Record<string, string> = {
      Accelerating: 'bg-red-100 text-red-700',
      Stable: 'bg-yellow-100 text-yellow-700',
      Improving: 'bg-green-100 text-green-700',
      'Insufficient data': 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[dir] ?? map['Insufficient data']}`}>
        {dir}
      </span>
    );
  };

  const maxFaults = topMachines.length ? Math.max(...topMachines.map(m => m.fault_count)) : 1;

  if (loading) return (
    <div className={`${cardClass} rounded-xl shadow-lg p-6 flex justify-center items-center h-64`}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
    </div>
  );

  return (
    <div className={`${cardClass} rounded-xl shadow-lg overflow-hidden`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">

        {/* ── Left: Top Problem Machines (all-time) ── */}
        <div className="p-6">
          <h2 className={`text-xl font-bold flex items-center gap-2 mb-1 ${textMain}`}>
            <WrenchIcon className="w-5 h-5 text-teal-500" />
            Top Problem Machines
          </h2>
          <p className={`text-xs mb-5 ${textMuted}`}>All-time fault count — excludes catch-all entries</p>

          {topMachines.length === 0 ? (
            <p className={`text-center py-10 ${textMuted}`}>No data</p>
          ) : (
            <div className={`divide-y ${divider}`}>
              {topMachines.map((m, i) => (
                <div key={m.machine} className={`py-3 ${rowHover} transition-colors rounded px-2 -mx-2`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold w-5 text-center shrink-0 ${textMuted}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${textMain}`}>{m.machine}</p>
                        <p className={`text-xs truncate ${textMuted}`}>{m.machine_type}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-sm font-bold text-teal-500">{m.fault_count}</span>
                      <span className={`text-xs ml-1 ${textMuted}`}>faults</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 pl-7">
                    <div className={`flex-1 rounded-full h-1.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div
                        className="h-1.5 rounded-full bg-teal-500"
                        style={{ width: `${(m.fault_count / maxFaults) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs shrink-0 ${textMuted}`}>
                      Median: {formatHours(m.median_repair_hrs)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Watch List ── */}
        <div className="p-6">
          <h2 className={`text-xl font-bold flex items-center gap-2 mb-1 ${textMain}`}>
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
            Maintenance Watch List
          </h2>
          <p className={`text-xs mb-5 ${textMuted}`}>
            Equipment predicted to fail soon based on failure history
          </p>

          {watchlist.length === 0 ? (
            <div className={`rounded-lg ${subBg} p-8 text-center`}>
              <p className={`text-sm font-medium ${textMain}`}>All clear</p>
              <p className={`text-xs mt-1 ${textMuted}`}>No equipment currently flagged for imminent failure</p>
            </div>
          ) : (
            <div className="space-y-3">
              {watchlist.map(item => {
                const isOverdue = item.days_overdue > 0;
                return (
                  <div
                    key={item.equipment_id}
                    className={`rounded-lg border p-4 ${
                      isOverdue
                        ? theme === 'dark'
                          ? 'border-red-700 bg-red-900/20'
                          : 'border-red-200 bg-red-50'
                        : theme === 'dark'
                          ? 'border-orange-700 bg-orange-900/20'
                          : 'border-orange-200 bg-orange-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className={`font-semibold text-sm ${textMain}`}>{item.equipment_name}</p>
                      <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                        isOverdue
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {isOverdue ? `${item.days_overdue}d overdue` : 'Due soon'}
                      </span>
                    </div>

                    <div className={`grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3 ${textMuted}`}>
                      <span>Last failure: <span className={`font-medium ${textMain}`}>{new Date(item.last_failure).toLocaleDateString()}</span></span>
                      <span>Avg interval: <span className={`font-medium ${textMain}`}>{item.ewma_interval_days} days</span></span>
                      <span>Next predicted: <span className={`font-medium ${textMain}`}>{new Date(item.predicted_next_failure).toLocaleDateString()}</span></span>
                      <span>{trendBadge(item.trend_direction)}</span>
                    </div>

                    <Link
                      href={`/equipment-health/${item.equipment_id}`}
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                      }`}
                    >
                      View full health report
                      <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
