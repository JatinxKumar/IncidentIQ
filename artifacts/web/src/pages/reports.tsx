import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Download, Eye, Plus, Search, Calendar, AlertCircle, RefreshCw, BarChart3, ClipboardCheck } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

interface Report {
  id: string;
  title: string;
  type: string;
  status: string;
  author: string;
  generatedAt: string;
  severity?: string;
  pages?: number;
}

export function ReportsPage() {
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken') || '';
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${baseUrl}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setError('Reports API unavailable');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filtered = reports.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalReports = reports.length;
  const completedReports = reports.filter(r => r.status === 'completed').length;
  const draftReports = reports.filter(r => r.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Incident & SLA Reports</h1>
          <p className="text-[13px] text-gray-500">Automated post-mortems, compliance, and incident summaries</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            className="text-[12px] text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg border border-white/[0.06] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
          <button className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Generate Report
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between gap-3 text-amber-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error} — No reports API endpoint detected. Reports will be available once the backend reports endpoint is implemented.</span>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-xl font-bold text-white">{totalReports}</div>
            <div className="text-[12px] text-gray-500">Total Reports</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <ClipboardCheck className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-xl font-bold text-white">{completedReports}</div>
            <div className="text-[12px] text-gray-500">Completed</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-xl font-bold text-white">{draftReports}</div>
            <div className="text-[12px] text-gray-500">Drafts</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px]">
          <Search className="h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search reports by title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-gray-200 placeholder-gray-500 w-full text-[13px]"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonLoader rows={4} />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports available"
          description="Reports will be generated automatically once the reports API endpoint is connected. You can also generate manual post-mortem reports."
        />
      ) : (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Report ID</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Title</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Author</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rpt) => (
                <tr key={rpt.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-4 text-cyan-400 font-mono text-[12px]">{rpt.id}</td>
                  <td className="py-3 px-4 text-gray-200 font-medium">{rpt.title}</td>
                  <td className="py-3 px-4 text-gray-400 capitalize">{rpt.type}</td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      'px-2 py-0.5 rounded-md text-[11px] font-medium capitalize',
                      rpt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      rpt.status === 'draft' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                    )}>
                      {rpt.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{rpt.author}</td>
                  <td className="py-3 px-4 text-gray-500 text-[12px] whitespace-nowrap">{new Date(rpt.generatedAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-white/[0.06] text-gray-400 hover:text-cyan-400 transition-colors" title="Download PDF">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
