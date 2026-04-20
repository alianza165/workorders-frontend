'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { BoltIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

interface DeptStat {
  total: number;
  open: number;
  median_hrs: number | null;
}

interface OverviewData {
  department_summary: Record<string, DeptStat>;
}

function formatResolution(hrs: number | null) {
  if (hrs === null) return '—';
  if (hrs >= 24) return `${(hrs / 24).toFixed(1)} days`;
  return `${hrs} hrs`;
}

const DEPT_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; darkBg: string }> = {
  Electrical: {
    icon: BoltIcon,
    color: 'text-blue-500',
    bg: 'bg-blue-50 border-blue-200',
    darkBg: 'bg-blue-900/20 border-blue-700',
  },
  Mechanical: {
    icon: WrenchScrewdriverIcon,
    color: 'text-orange-500',
    bg: 'bg-orange-50 border-orange-200',
    darkBg: 'bg-orange-900/20 border-orange-700',
  },
};

export default function DepartmentSummary() {
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [data, setData] = useState<Record<string, DeptStat>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/analytics/overview/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      if (res.ok) {
        const json: OverviewData = await res.json();
        setData(json.department_summary);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cardClass = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  const departments = ['Electrical', 'Mechanical'];

  return (
    <div className={`${cardClass} rounded-xl shadow-lg p-6`}>
      <h2 className={`text-xl font-bold mb-5 ${textMain}`}>Department Breakdown</h2>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {departments.map(dept => {
            const stat = data[dept];
            if (!stat) return null;
            const cfg = DEPT_CONFIG[dept];
            const Icon = cfg.icon;
            const completionRate = stat.total > 0
              ? Math.round(((stat.total - stat.open) / stat.total) * 100)
              : 0;

            return (
              <div
                key={dept}
                className={`rounded-xl border p-4 ${theme === 'dark' ? cfg.darkBg : cfg.bg}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                  <span className={`font-semibold text-base ${textMain}`}>{dept}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className={`text-xs ${textMuted} mb-1`}>Total WOs</p>
                    <p className={`text-2xl font-bold ${textMain}`}>{stat.total}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${textMuted} mb-1`}>Currently Open</p>
                    <p className={`text-2xl font-bold ${stat.open > 10 ? 'text-red-500' : stat.open > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                      {stat.open}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${textMuted} mb-1`}>Median Resolution</p>
                    <p className={`text-2xl font-bold ${textMain}`}>
                      {formatResolution(stat.median_hrs)}
                    </p>
                  </div>
                </div>

                {/* Completion rate bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={textMuted}>Completion rate</span>
                    <span className={`font-medium ${textMain}`}>{completionRate}%</span>
                  </div>
                  <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white/60'}`}>
                    <div
                      className="h-2 rounded-full bg-teal-500 transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
