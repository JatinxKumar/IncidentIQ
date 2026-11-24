import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Activity,
  Shield,
  TrendingUp,
  TrendingDown,
  Zap,
  Server,
  Clock,
  Plus,
  Play,
  FileText,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Brain,
  GitBranch,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
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

function KpiCard({ label, value, trend, trendValue, icon: Icon, accent }: {
  label: string; value: string | number; trend?: 'up' | 'down' | 'stable';
  trendValue?: string; icon: React.ComponentType<{ className?: string }>; accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105', accent)}>
          <Icon className="h-[18px] w-[18px] text-white" />
        </div>
        {trendValue && (
          <div className={cn('flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full',
            trend === 'up' ? 'text-emerald-400 bg-emerald-500/10' :
            trend === 'down' ? 'text-red-400 bg-red-500/10' :
            'text-gray-400 bg-gray-500/10'
          )}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
            {trendValue}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-[13px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/20',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider border', styles[severity.toLowerCase()] || styles.low)}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-red-500/10 text-red-400',
    investigating: 'bg-amber-500/10 text-amber-400',
    acknowledged: 'bg-blue-500/10 text-blue-400',
    resolved: 'bg-emerald-500/10 text-emerald-400',
    closed: 'bg-gray-500/10 text-gray-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize', styles[status.toLowerCase()] || 'bg-gray-500/10 text-gray-400')}>
      <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5',
        status === 'open' ? 'bg-red-400' : status === 'investigating' ? 'bg-amber-400' :
        status === 'acknowledged' ? 'bg-blue-400' : status === 'resolved' ? 'bg-emerald-400' : 'bg-gray-400'
      )} />
      {status}
    </span>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161b22] border border-white/[0.08] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[12px] font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
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
      setError(err?.message || 'Backend API server unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30_000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Derived metrics from REAL data
  const totalIncidents = incidents.length;
  const activeIncidents = incidents.filter(i => i.status === 'open' || i.status === 'investigating').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  const healthScore = totalIncidents === 0 ? '100%' : `${Math.max(0, 100 - (criticalIncidents * 15 + activeIncidents * 5)).toFixed(1)}%`;

  // Severity breakdown
  const severityCounts = {
    critical: incidents.filter(i => i.severity === 'critical').length,
    high: incidents.filter(i => i.severity === 'high').length,
    medium: incidents.filter(i => i.severity === 'medium').length,
    low: incidents.filter(i => i.severity === 'low').length,
  };

  const severityPieData = [
    { name: 'Critical', value: severityCounts.critical, color: '#ef4444' },
    { name: 'High', value: severityCounts.high, color: '#f97316' },
    { name: 'Medium', value: severityCounts.medium, color: '#eab308' },
    { name: 'Low', value: severityCounts.low, color: '#22c55e' },
  ].filter(d => d.value > 0);

  // Status breakdown for bar chart
  const statusCounts = [
    { status: 'Open', count: incidents.filter(i => i.status === 'open').length, fill: '#ef4444' },
    { status: 'Investigating', count: incidents.filter(i => i.status === 'investigating').length, fill: '#f59e0b' },
    { status: 'Acknowledged', count: incidents.filter(i => i.status === 'acknowledged').length, fill: '#3b82f6' },
    { status: 'Resolved', count: incidents.filter(i => i.status === 'resolved').length, fill: '#22c55e' },
    { status: 'Closed', count: incidents.filter(i => i.status === 'closed').length, fill: '#6b7280' },
  ].filter(d => d.count > 0);

  // Incident trend by date (from real data)
  const incidentTrend = (() => {
    if (incidents.length === 0) return [];
    const byDate: Record<string, number> = {};
    incidents.forEach(inc => {
      const d = inc.createdAt || inc.timestamp;
      if (d) {
        const dateKey = new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        byDate[dateKey] = (byDate[dateKey] || 0) + 1;
      }
    });
    return Object.entries(byDate)
      .map(([date, count]) => ({ date, incidents: count }))
      .slice(-7);
  })();

  // Quick actions
  const quickActions = [
    { label: 'New Incident', icon: Plus, href: '/incidents', accent: 'from-cyan-500 to-blue-600' },
    { label: 'View Models', icon: Brain, href: '/models', accent: 'from-violet-500 to-purple-600' },
    { label: 'Repositories', icon: GitBranch, href: '/repositories', accent: 'from-emerald-500 to-green-600' },
    { label: 'Knowledge Base', icon: BookOpen, href: '/knowledge', accent: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{greeting}, {user?.username || 'User'}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Real-time infrastructure & incident monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="text-[12px] text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg border border-white/[0.06] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
          <span className="text-[11px] text-gray-500 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.06]">
            <Clock className="h-3 w-3 inline mr-1 -mt-0.5" />Auto-refreshes 30s
          </span>
        </div>
      </div>

      {/* Backend Unavailable Alert */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <span className="font-semibold block text-white">Backend API Server Disconnected</span>
              <span>{error}</span>
            </div>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-medium self-start sm:self-auto transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && incidents.length === 0 ? (
        <SkeletonLoader rows={6} />
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="System Health"
              value={healthScore}
              icon={Shield}
              accent="bg-gradient-to-br from-emerald-500 to-emerald-600"
              trend={criticalIncidents === 0 ? 'up' : 'down'}
              trendValue={criticalIncidents === 0 ? 'Healthy' : `${criticalIncidents} critical`}
            />
            <KpiCard
              label="Active Incidents"
              value={activeIncidents}
              icon={AlertTriangle}
              accent="bg-gradient-to-br from-orange-500 to-red-500"
              trend={activeIncidents > 5 ? 'down' : 'up'}
              trendValue={activeIncidents === 0 ? 'All clear' : `${activeIncidents} open`}
            />
            <KpiCard
              label="Resolved"
              value={resolvedIncidents}
              icon={CheckCircle2}
              accent="bg-gradient-to-br from-cyan-500 to-blue-600"
              trend="up"
              trendValue={totalIncidents > 0 ? `${((resolvedIncidents / totalIncidents) * 100).toFixed(0)}% rate` : 'N/A'}
            />
            <KpiCard
              label="Total Tracked"
              value={totalIncidents}
              icon={Server}
              accent="bg-gradient-to-br from-violet-500 to-purple-600"
            />
          </div>

          {/* Charts Row */}
          {incidents.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Incident Trend Area Chart */}
              {incidentTrend.length > 0 && (
                <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-[14px] font-semibold text-white mb-4">Incident Trend</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={incidentTrend}>
                      <defs>
                        <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RTooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="incidents" stroke="#06b6d4" fill="url(#incGrad)" strokeWidth={2} name="Incidents" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Severity Donut */}
              {severityPieData.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-[14px] font-semibold text-white mb-4">Severity Breakdown</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={severityPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {severityPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <RTooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-2 justify-center">
                    {severityPieData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}: {d.value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Distribution Bar Chart */}
          {statusCounts.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-[14px] font-semibold text-white mb-4">Incident Status Distribution</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={statusCounts} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="status" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                  <RTooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20} name="Count">
                    {statusCounts.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.href)}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.06] transition-all duration-200 group text-left"
              >
                <div className={cn('h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3 transition-transform group-hover:scale-110', action.accent)}>
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-[13px] font-medium text-gray-200 group-hover:text-white transition-colors">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Recent Incidents Table */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-white">Recent Incidents</h3>
              {incidents.length > 0 && (
                <button onClick={() => navigate('/incidents')} className="text-[12px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                  View all ({totalIncidents}) <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {incidents.length === 0 ? (
              <EmptyState
                title="No active incidents reported"
                description="Your connected microservices and databases are operating cleanly with zero reported incidents."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2.5 px-3 text-gray-500 font-medium text-[11px] uppercase tracking-wider">ID</th>
                      <th className="text-left py-2.5 px-3 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Title</th>
                      <th className="text-left py-2.5 px-3 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Severity</th>
                      <th className="text-left py-2.5 px-3 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Status</th>
                      <th className="text-left py-2.5 px-3 text-gray-500 font-medium text-[11px] uppercase tracking-wider">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.slice(0, 8).map((inc) => (
                      <tr key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}
                        className="border-b border-white/[0.03] hover:bg-white/[0.03] cursor-pointer transition-colors">
                        <td className="py-2.5 px-3 text-cyan-400 font-mono text-[12px]">{inc.id.slice(0, 8)}</td>
                        <td className="py-2.5 px-3 text-gray-200 font-medium max-w-[240px] truncate">{inc.title}</td>
                        <td className="py-2.5 px-3"><SeverityBadge severity={inc.severity} /></td>
                        <td className="py-2.5 px-3"><StatusBadge status={inc.status} /></td>
                        <td className="py-2.5 px-3 text-gray-500 text-[12px] whitespace-nowrap">
                          {inc.createdAt || inc.timestamp ? new Date(inc.createdAt || inc.timestamp!).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
