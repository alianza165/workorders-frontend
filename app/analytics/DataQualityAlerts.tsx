'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import {
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CalendarDaysIcon,
  BoltIcon,
  BeakerIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface BulkCloseEvent {
  date: string;
  count: number;
}

interface Outlier {
  id: number;
  machine: string;
  department: string;
  problem: string;
  hours: number;
  days: number;
  started: string;
  finished: string;
}

interface PendingJob {
  id: number;
  machine: string;
  department: string;
  problem: string;
  days_open: number;
  opened: string;
}

interface CompletionStat {
  median_hrs: number;
  mean_hrs: number;
  p90_hrs: number;
  sample_count: number;
}

interface TestEntry {
  id: number;
  problem: string;
  department: string;
  opened: string;
}

interface DataQuality {
  summary: {
    bulk_close_event_days: number;
    extreme_outliers_count: number;
    chronically_pending_count: number;
    instant_completions: number;
    test_entries_count: number;
  };
  bulk_close_events: BulkCloseEvent[];
  extreme_outliers: Outlier[];
  chronically_pending: PendingJob[];
  completion_stats: Record<string, CompletionStat>;
  test_entries: TestEntry[];
}

function formatDays(days: number) {
  if (days >= 365) return `${(days / 365).toFixed(1)} yrs`;
  if (days >= 30) return `${Math.round(days / 30)} mo`;
  return `${days} days`;
}

function SectionHeader({
  title,
  count,
  open,
  onToggle,
  badge,
  theme,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  badge: 'red' | 'orange' | 'yellow' | 'blue';
  theme: string;
}) {
  const badgeColors = {
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  };

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
        theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
          {title}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[badge]}`}>
          {count}
        </span>
      </div>
      {open ? (
        <ChevronUpIcon className="w-4 h-4 text-gray-400" />
      ) : (
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}

export default function DataQualityAlerts() {
  const { token } = useAuth();
  const { theme } = useAppContext();
  const [data, setData] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const cardClass = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const subRowClass = theme === 'dark' ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100';
  const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const textMain = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/analytics/data-quality/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  const toggleSection = (key: string) =>
    setOpenSection(prev => (prev === key ? null : key));

  if (loading) return null;
  if (!data) return null;

  const { summary } = data;
  const totalIssues =
    summary.bulk_close_event_days +
    summary.chronically_pending_count +
    summary.extreme_outliers_count +
    (summary.test_entries_count > 0 ? 1 : 0);

  const severityColor =
    totalIssues === 0
      ? 'text-green-600'
      : summary.chronically_pending_count > 10 || summary.bulk_close_event_days > 5
      ? 'text-red-500'
      : 'text-orange-500';

  const bannerBg =
    totalIssues === 0
      ? theme === 'dark' ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'
      : theme === 'dark' ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-200';

  return (
    <div className={`${cardClass} rounded-xl shadow-lg border overflow-hidden`}>
      {/* Banner — always visible */}
      <button
        onClick={() => setPanelOpen(p => !p)}
        className={`w-full flex items-center justify-between px-6 py-4 ${bannerBg} border-b transition-colors`}
      >
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className={`w-5 h-5 ${severityColor}`} />
          <span className={`font-semibold text-sm ${textMain}`}>Data Quality Report</span>
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
              {summary.bulk_close_event_days} bulk-close day{summary.bulk_close_event_days !== 1 ? 's' : ''}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              {summary.chronically_pending_count} stale pending
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
              {summary.extreme_outliers_count} outliers
            </span>
            {summary.instant_completions > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                {summary.instant_completions} instant completions
              </span>
            )}
          </div>
        </div>
        {panelOpen ? (
          <ChevronUpIcon className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {panelOpen && (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">

          {/* ── Completion Time: Median vs Mean ── */}
          <div className="px-4 py-2">
            <SectionHeader
              title="Completion Time Reality (Median vs Mean)"
              count={Object.keys(data.completion_stats).length}
              open={openSection === 'stats'}
              onToggle={() => toggleSection('stats')}
              badge="blue"
              theme={theme}
            />
            {openSection === 'stats' && (
              <div className="mt-2 mb-3 px-2 space-y-3">
                <p className={`text-xs ${textMuted} flex items-start gap-1.5`}>
                  <InformationCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  Mean is heavily inflated by long-running jobs. Use median as the reliable turnaround benchmark.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(data.completion_stats).map(([dept, stat]) => (
                    <div key={dept} className={`rounded-lg border p-4 ${subRowClass}`}>
                      <p className={`text-sm font-semibold mb-3 ${textMain}`}>{dept}</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-green-600 font-medium">Median</p>
                          <p className={`text-lg font-bold ${textMain}`}>
                            {stat.median_hrs >= 24
                              ? `${(stat.median_hrs / 24).toFixed(1)}d`
                              : `${stat.median_hrs}h`}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${textMuted}`}>Mean</p>
                          <p className={`text-lg font-bold text-orange-500`}>
                            {stat.mean_hrs >= 24
                              ? `${(stat.mean_hrs / 24).toFixed(1)}d`
                              : `${stat.mean_hrs}h`}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${textMuted}`}>P90</p>
                          <p className={`text-lg font-bold ${textMain}`}>
                            {stat.p90_hrs >= 24
                              ? `${(stat.p90_hrs / 24).toFixed(1)}d`
                              : `${stat.p90_hrs}h`}
                          </p>
                        </div>
                      </div>
                      <p className={`text-xs mt-2 text-center ${textMuted}`}>
                        Mean is {Math.round(stat.mean_hrs / stat.median_hrs)}× the median — outlier skew
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Bulk Close Anomalies ── */}
          <div className="px-4 py-2">
            <SectionHeader
              title="Bulk-Close Anomalies"
              count={summary.bulk_close_event_days}
              open={openSection === 'bulk'}
              onToggle={() => toggleSection('bulk')}
              badge="orange"
              theme={theme}
            />
            {openSection === 'bulk' && (
              <div className="mt-2 mb-3 px-2 space-y-2">
                <p className={`text-xs ${textMuted} flex items-start gap-1.5`}>
                  <CalendarDaysIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  These dates had ≥10 jobs closed on the same day — suggesting batch administrative closures rather than real-time recording. Completion timestamps on these jobs are unreliable.
                </p>
                <div className="rounded-lg border overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                      <tr>
                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textMuted}`}>Date</th>
                        <th className={`px-4 py-2 text-right text-xs font-semibold ${textMuted}`}>Jobs Closed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {data.bulk_close_events.map(e => (
                        <tr key={e.date} className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                          <td className={`px-4 py-2 font-mono ${textMain}`}>{e.date}</td>
                          <td className="px-4 py-2 text-right">
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                              {e.count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Chronically Pending ── */}
          <div className="px-4 py-2">
            <SectionHeader
              title="Chronically Pending Jobs"
              count={summary.chronically_pending_count}
              open={openSection === 'pending'}
              onToggle={() => toggleSection('pending')}
              badge="red"
              theme={theme}
            />
            {openSection === 'pending' && (
              <div className="mt-2 mb-3 px-2 space-y-2">
                <p className={`text-xs ${textMuted} flex items-start gap-1.5`}>
                  <ClockIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  Jobs still in Pending status, opened more than 30 days ago. These have never been accepted or actioned.
                </p>
                <div className="rounded-lg border overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                      <tr>
                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textMuted}`}>ID</th>
                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textMuted}`}>Machine</th>
                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textMuted}`}>Dept</th>
                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textMuted}`}>Problem</th>
                        <th className={`px-4 py-2 text-right text-xs font-semibold ${textMuted}`}>Open</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {data.chronically_pending.map(j => (
                        <tr key={j.id} className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                          <td className="px-4 py-2 text-teal-600 font-semibold">#{j.id}</td>
                          <td className={`px-4 py-2 font-medium ${textMain}`}>{j.machine}</td>
                          <td className={`px-4 py-2 ${textMuted}`}>{j.department}</td>
                          <td className={`px-4 py-2 max-w-xs ${textMuted}`}>
                            <span className="line-clamp-2 text-xs">{j.problem}</span>
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              j.days_open > 365
                                ? 'bg-red-100 text-red-700'
                                : j.days_open > 90
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {formatDays(j.days_open)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Extreme Outliers ── */}
          <div className="px-4 py-2">
            <SectionHeader
              title="Long-Running Completed Jobs (>30 days)"
              count={summary.extreme_outliers_count}
              open={openSection === 'outliers'}
              onToggle={() => toggleSection('outliers')}
              badge="yellow"
              theme={theme}
            />
            {openSection === 'outliers' && (
              <div className="mt-2 mb-3 px-2 space-y-2">
                <p className={`text-xs ${textMuted} flex items-start gap-1.5`}>
                  <BoltIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  These completed jobs took over 30 days. Many coincide with bulk-close dates, meaning the recorded completion time reflects when the data was entered, not when the work was done.
                </p>
                <div className="rounded-lg border overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                      <tr>
                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textMuted}`}>ID</th>
                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textMuted}`}>Machine</th>
                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textMuted}`}>Problem</th>
                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textMuted}`}>Period</th>
                        <th className={`px-4 py-2 text-right text-xs font-semibold ${textMuted}`}>Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {data.extreme_outliers.map(o => (
                        <tr key={o.id} className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
                          <td className="px-4 py-2 text-teal-600 font-semibold">#{o.id}</td>
                          <td className={`px-4 py-2 font-medium ${textMain}`}>{o.machine}</td>
                          <td className={`px-4 py-2 max-w-xs ${textMuted}`}>
                            <span className="line-clamp-2 text-xs">{o.problem}</span>
                          </td>
                          <td className={`px-4 py-2 text-xs ${textMuted} whitespace-nowrap`}>
                            {o.started} → {o.finished}
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                              {formatDays(o.days)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Test Entries ── */}
          {summary.test_entries_count > 0 && (
            <div className="px-4 py-2">
              <SectionHeader
                title="Test / Junk Entries"
                count={summary.test_entries_count}
                open={openSection === 'test'}
                onToggle={() => toggleSection('test')}
                badge="blue"
                theme={theme}
              />
              {openSection === 'test' && (
                <div className="mt-2 mb-3 px-2 space-y-2">
                  <p className={`text-xs ${textMuted} flex items-start gap-1.5`}>
                    <BeakerIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    These appear to be test or placeholder entries that should be reviewed and removed.
                  </p>
                  <div className="space-y-1">
                    {data.test_entries.map(t => (
                      <div key={t.id} className={`rounded-lg border px-4 py-2 ${subRowClass}`}>
                        <span className="text-teal-600 font-semibold text-sm">#{t.id}</span>
                        <span className={`ml-3 text-xs ${textMuted}`}>{t.problem}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
