import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight, AlertTriangle, ArrowUpDown, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'acknowledged' | 'resolved' | 'closed';
  source?: string;
  createdAt?: string;
  timestamp?: string;
  service?: string;
  rootCause?: string;
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
  const dot: Record<string, string> = { open: 'bg-red-400', investigating: 'bg-amber-400', acknowledged: 'bg-blue-400', resolved: 'bg-emerald-400', closed: 'bg-gray-400' };
  const bg: Record<string, string> = { open: 'bg-red-500/10 text-red-400', investigating: 'bg-amber-500/10 text-amber-400', acknowledged: 'bg-blue-500/10 text-blue-400', resolved: 'bg-emerald-500/10 text-emerald-400', closed: 'bg-gray-500/10 text-gray-400' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize', bg[status.toLowerCase()] || 'bg-gray-500/10 text-gray-400')}>
      <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', dot[status.toLowerCase()] || 'bg-gray-400')} />{status}
    </span>
  );
}

const PAGE_SIZE = 8;

export function IncidentsPage() {
  const [, navigate] = useLocation();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken') || '';
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${baseUrl}/incidents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch incidents (HTTP ${res.status})`);
      }
      const data = await res.json();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) && !inc.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (severityFilter !== 'all' && inc.severity.toLowerCase() !== severityFilter) return false;
      if (statusFilter !== 'all' && inc.status.toLowerCase() !== statusFilter) return false;
      return true;
    });
  }, [incidents, search, severityFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Incidents</h1>
          <p className="text-[13px] text-gray-500">{filtered.length} incidents recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchIncidents}
            className="text-[12px] text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg border border-white/[0.06] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <span className="font-semibold block text-white">Backend Server Error</span>
              <span>{error}</span>
            </div>
          </div>
          <button
            onClick={fetchIncidents}
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
          <input type="text" placeholder="Search by title or ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent border-none outline-none text-gray-200 placeholder-gray-500 w-full text-[13px]" />
        </div>
        <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-gray-300 outline-none cursor-pointer">
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-gray-300 outline-none cursor-pointer">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Content / Loading / Empty */}
      {loading && incidents.length === 0 ? (
        <SkeletonLoader rows={5} />
      ) : incidents.length === 0 ? (
        <EmptyState
          title="No incidents found"
          description="There are currently no incidents recorded in the system. All microservices are operating normally."
        />
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">ID</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Title</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Severity</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Root Cause</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Time</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((inc) => (
                  <tr key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors group">
                    <td className="py-3 px-4 text-cyan-400 font-mono text-[12px]">{inc.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-gray-200 max-w-[240px] truncate font-medium">{inc.title}</td>
                    <td className="py-3 px-4"><SeverityBadge severity={inc.severity} /></td>
                    <td className="py-3 px-4"><StatusBadge status={inc.status} /></td>
                    <td className="py-3 px-4 text-gray-400 text-[12px] max-w-[180px] truncate">{inc.rootCause || 'Pending Analysis'}</td>
                    <td className="py-3 px-4 text-gray-500 text-[12px] whitespace-nowrap">
                      {inc.createdAt || inc.timestamp ? new Date(inc.createdAt || inc.timestamp!).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-[12px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors">Inspect</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <span className="text-[12px] text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="p-1.5 rounded-md hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="h-4 w-4 text-gray-400" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn('h-7 w-7 rounded-md text-[12px] font-medium transition-colors',
                      p === page ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-white/[0.04]'
                    )}>{p}</button>
                ))}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-md hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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
