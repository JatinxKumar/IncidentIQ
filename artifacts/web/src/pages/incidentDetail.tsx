import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Server,
  Activity,
  Brain,
  Shield,
  Cpu,
  HardDrive,
  Wifi,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer
} from 'recharts';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

interface IncidentDetail {
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
  metadata?: Record<string, any>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const s: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/20',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider border', s[severity.toLowerCase()] || s.low)}>{severity}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const bg: Record<string, string> = { open: 'bg-red-500/10 text-red-400', investigating: 'bg-amber-500/10 text-amber-400', acknowledged: 'bg-blue-500/10 text-blue-400', resolved: 'bg-emerald-500/10 text-emerald-400', closed: 'bg-gray-500/10 text-gray-400' };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium capitalize', bg[status.toLowerCase()] || 'bg-gray-500/10 text-gray-400')}>
      <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5" />{status}
    </span>
  );
}

const TELEMETRY_SERIES = [
  { time: '02:00', cpu: 45, memory: 60, latency: 42 },
  { time: '02:10', cpu: 52, memory: 65, latency: 48 },
  { time: '02:20', cpu: 78, memory: 82, latency: 120 },
  { time: '02:30', cpu: 95, memory: 92, latency: 230 },
  { time: '02:40', cpu: 88, memory: 94, latency: 210 },
  { time: '02:50', cpu: 72, memory: 85, latency: 145 },
];

export function IncidentDetailPage() {
  const [, navigate] = useLocation();
  const incidentId = window.location.pathname.split('/').pop() || '';

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('accessToken') || '';
        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(`${baseUrl}/incidents/${incidentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error(`Incident not found (HTTP ${res.status})`);
        }
        const data = await res.json();
        setIncident(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch incident details');
      } finally {
        setLoading(false);
      }
    }
    if (incidentId) {
      fetchDetail();
    }
  }, [incidentId]);

  if (loading) {
    return <SkeletonLoader rows={8} />;
  }

  if (error || !incident) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-12 text-center">
        <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Incident Details Unavailable</h2>
        <p className="text-xs text-gray-400">{error || 'The requested incident record does not exist or has been deleted.'}</p>
        <button
          onClick={() => navigate('/incidents')}
          className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-medium border border-white/[0.06] transition-colors"
        >
          ← Return to Incidents List
        </button>
      </div>
    );
  }

  const meta = incident.metadata || { cpu: 82, memory: 88, disk: 42, network: 190, anomalyScore: 0.92, confidence: 0.88 };

  return (
    <div className="space-y-6">
      {/* Back button & header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/incidents')}
            className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-cyan-400 text-[13px] font-semibold">{incident.id.slice(0, 8)}</span>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-xl font-bold text-white mt-1">{incident.title}</h1>
          </div>
        </div>
      </div>

      {/* Grid Layout: Main Investigation + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {incident.description && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-[14px] font-semibold text-white mb-2">Description</h3>
              <p className="text-[13px] text-gray-300 leading-relaxed">{incident.description}</p>
            </div>
          )}

          {/* Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-gray-400 text-[12px] mb-2">
                <span>CPU Usage</span>
                <Cpu className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-white">{meta.cpu || 82}%</div>
              <div className="w-full h-1 bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${meta.cpu || 82}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-gray-400 text-[12px] mb-2">
                <span>Memory</span>
                <Activity className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-white">{meta.memory || 88}%</div>
              <div className="w-full h-1 bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-purple-400" style={{ width: `${meta.memory || 88}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-gray-400 text-[12px] mb-2">
                <span>Disk I/O</span>
                <HardDrive className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white">{meta.disk || 42}%</div>
              <div className="w-full h-1 bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${meta.disk || 42}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-gray-400 text-[12px] mb-2">
                <span>Latency</span>
                <Wifi className="h-4 w-4 text-rose-400" />
              </div>
              <div className="text-xl font-bold text-white">{meta.network || 190} ms</div>
              <div className="w-full h-1 bg-white/[0.06] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-rose-400" style={{ width: `${Math.min(100, (meta.network || 190) / 3)}%` }} />
              </div>
            </div>
          </div>

          {/* Root Cause Analysis Panel */}
          <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-5 w-5 text-cyan-400" />
              <h3 className="text-[15px] font-semibold text-white">AI-Generated Root Cause Analysis</h3>
            </div>
            <p className="text-[13px] text-gray-300 leading-relaxed mb-4">
              {incident.rootCause || 'Root Cause Analysis is pending or waiting for machine learning model inference.'}
            </p>
          </div>
        </div>

        {/* Right Column: Metadata */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-[14px] font-semibold text-white border-b border-white/[0.06] pb-3">Incident Metadata</h3>
            
            <div className="space-y-3 text-[13px]">
              <div>
                <span className="text-gray-500 block text-[11px] uppercase">Incident ID</span>
                <span className="text-gray-200 font-mono text-[12px]">{incident.id}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] uppercase">Service</span>
                <span className="text-gray-200 font-medium">{incident.service || 'Default Service'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] uppercase">Detected At</span>
                <span className="text-gray-200 font-mono text-[12px]">
                  {incident.createdAt || incident.timestamp ? new Date(incident.createdAt || incident.timestamp!).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
