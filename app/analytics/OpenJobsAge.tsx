'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { ClockIcon } from '@heroicons/react/24/outline';

interface AgeBuckets {
  lt_7d: number;
  lt_30d: number;
  lt_90d: number;
  gt_90d: number;
}

interface OverviewData {
  open_age_buckets: AgeBuckets;
}

const BUCKETS = [
  {
    key: 'lt_7d' as const,
    label: 'Less than 7 days',
    sublabel: 'Fresh — recently opened',
    barColor: 'bg-green-500',
    textColor: 'text-green-600',
    badgeBg: 'bg-green-100 text-green-700',
  },
  {
    key: 'lt_30d' as const,
    label: '7 – 30 days',
    sublabel: 'Getting stale',
    barColor: 'bg-yellow-400',
    textColor: 'text-yellow-600',
    badgeBg: 'bg-yellow-100 text-yellow-700',
  },
  {
    key: 'lt_90d' as const,
    label: '30 – 90 days',
    sublabel: 'Needs attention',
    barColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    badgeBg: 'bg-orange-100 text-orange-700',
  },
  {
    key: 'gt_90d' as const,
    label: 'Over 90 days',
    sublabel: 'Critically overdue',
    barColor: 'bg-red-500',
    textColor: 'text-red-600',
    badgeBg: 'bg-red-100 text-red-700',
  },
];

export default function OpenJobsAge() {
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [buckets, setBuckets] = useState<AgeBuckets | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/analytics/overview/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      if (res.ok) {
        const json: OverviewData = await res.json();
        setBuckets(json.open_age_buckets);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cardClass = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textMain = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const trackBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100';

  const total = buckets
    ? buckets.lt_7d + buckets.lt_30d + buckets.lt_90d + buckets.gt_90d
    : 0;

  return (
    <div className={`${cardClass} rounded-xl shadow-lg p-6`}>
      <div className="flex items-center justify-between mb-5">
        <h2 className={`text-xl font-bold flex items-center gap-2 ${textMain}`}>
          <ClockIcon className="w-5 h-5 text-teal-500" />
          Open Jobs by Age
        </h2>
        {!loading && total > 0 && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
            {total} open total
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
        </div>
      ) : !buckets || total === 0 ? (
        <div className={`text-center py-12 ${textMuted}`}>
          <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No open jobs right now</p>
        </div>
      ) : (
        <div className="space-y-5">
          {BUCKETS.map(({ key, label, sublabel, barColor, badgeBg }) => {
            const count = buckets[key];
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className={`text-sm font-medium ${textMain}`}>{label}</span>
                    <span className={`ml-2 text-xs ${textMuted}`}>{sublabel}</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeBg}`}>
                    {count} job{count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={`w-full rounded-full h-3 ${trackBg}`}>
                  <div
                    className={`h-3 rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className={`text-xs mt-0.5 text-right ${textMuted}`}>
                  {Math.round(pct)}% of open jobs
                </p>
              </div>
            );
          })}

          {/* Summary line */}
          <div className={`mt-2 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
            <p className={`text-xs ${textMuted}`}>
              <span className="font-semibold text-red-500">{buckets.gt_90d}</span>
              {' '}job{buckets.gt_90d !== 1 ? 's' : ''} have been open for over 3 months and require immediate review.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
