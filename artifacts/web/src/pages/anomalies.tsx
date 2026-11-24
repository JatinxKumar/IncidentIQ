import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Search, Activity, Zap, ShieldAlert, Cpu, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

interface Anomaly {
  id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'acknowledged' | 'resolved';
  service?: string;
  confidence?: number;
  timestamp?: string;
  type?: string;
}

function SeverityBadge({ severity }: { severity: string }) {
  const s: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/20',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider border', s[severity.toLowerCase()] || s.low)}>{severity}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const bg: Record<string, string> = { open: 'bg-red-500/10 text-red-400', investigating: 'bg-amber-500/10 text-amber-400', acknowledged: 'bg-blue-500/10 text-blue-400', resolved: 'bg-emerald-500/10 text-emerald-400' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize', bg[status.toLowerCase()] || 'bg-gray-500/10 text-gray-400')}>
      <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5" />{status}
    </span>
  );
}

const PAGE_SIZE = 8;

export function AnomaliesPage() {
  const [, navigate] = useLocation();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken') || '';
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${baseUrl}/anomalies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch anomalies (HTTP ${res.status})`);
      }
      const data = await res.json();
      setAnomalies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // If endpoint isn't ready or returns error
      setError(err?.message || 'Backend anomalies service offline');
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const filtered = useMemo(() => {
    return anomalies.filter((a) => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (severityFilter !== 'all' && a.severity.toLowerCase() !== severityFilter) return false;
      return true;
    });
  }, [anomalies, search, severityFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Anomalies Detection</h1>
          <p className="text-[13px] text-gray-500">Real-time ML telemetry metrics & anomaly streams</p>
        </div>
        <button
          onClick={fetchAnomalies}
          className="text-[12px] text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg border border-white/[0.06] flex items-center gap-1.5 transition-colors self-start"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <span className="font-semibold block text-white">Backend Anomalies Stream Disconnected</span>
              <span>{error}</span>
            </div>
          </div>
          <button
            onClick={fetchAnomalies}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-medium self-start sm:self-auto transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px]">
          <Search className="h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search anomalies by title or service..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent border-none outline-none text-gray-200 placeholder-gray-500 w-full text-[13px]"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-gray-300 outline-none cursor-pointer"
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Table / Loading / Empty */}
      {loading && anomalies.length === 0 ? (
        <SkeletonLoader rows={5} />
      ) : anomalies.length === 0 ? (
        <EmptyState
          title="No anomalies detected"
          description="ML telemetry model has not flagged any active metric anomalies across your monitored services."
        />
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">ID</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Title</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Service</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Severity</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((anom) => (
                  <tr key={anom.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 text-purple-400 font-mono text-[12px]">{anom.id}</td>
                    <td className="py-3 px-4 text-gray-200 font-medium">{anom.title}</td>
                    <td className="py-3 px-4 text-gray-400">{anom.service || 'Default'}</td>
                    <td className="py-3 px-4"><SeverityBadge severity={anom.severity} /></td>
                    <td className="py-3 px-4"><StatusBadge status={anom.status} /></td>
                    <td className="py-3 px-4 text-gray-500 text-[12px] whitespace-nowrap">
                      {anom.timestamp ? new Date(anom.timestamp).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <span className="text-[12px] text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md hover:bg-white/[0.04] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-400" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md hover:bg-white/[0.04] disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
