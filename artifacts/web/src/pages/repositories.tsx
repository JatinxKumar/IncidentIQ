import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  GitBranch,
  Plus,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Github,
  GitCommit,
  GitPullRequest,
  Box,
  Clock,
  Star,
  GitFork,
  Radio,
  Lock,
  Globe,
  Trash2,
  ChevronRight,
  Activity,
  Layers,
  ChevronLeft
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { toast } from 'sonner';

interface GitHubAccountStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  connectedAt?: string;
  mode?: string;
  message?: string;
}

interface DiscoveredRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  defaultBranch: string;
  visibility: string;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  language: string | null;
  openIssuesCount: number;
}

interface LiveRepoDetails {
  repository: DiscoveredRepo | null;
  branches: string[];
  commits: Array<{
    sha: string;
    message: string;
    authorName: string;
    authorDate: string;
    url: string;
  }>;
  pullRequests: Array<{
    id: number;
    number: number;
    title: string;
    state: string;
    user: string;
    createdAt: string;
    htmlUrl: string;
    draft: boolean;
  }>;
  deployments: Array<{
    id: number;
    environment: string;
    createdAt: string;
    creator: string;
    status: string;
  }>;
  lastSynchronized: string;
}

interface MonitoredRepo {
  id: string;
  name: string;
  url: string;
  branch: string;
  status: 'connected' | 'disconnected' | 'error';
  lastScan?: string;
  incidentCount?: number;
  monitoringEnabled?: boolean;
  language?: string;
  createdAt?: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  repository: string;
  summary: string;
  timestamp: string;
}

export function RepositoriesPage() {
  const [activeTab, setActiveTab] = useState<'discovered' | 'monitored' | 'details' | 'timeline'>('discovered');
  const [modalOpen, setModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [connectingGh, setConnectingGh] = useState(false);

  // Manual connect repo modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // GitHub account & discovered repos state
  const [ghStatus, setGhStatus] = useState<GitHubAccountStatus>({ connected: false });
  const [discoveredRepos, setDiscoveredRepos] = useState<DiscoveredRepo[]>([]);
  const [discLoading, setDiscLoading] = useState(true);
  const [discPage, setDiscPage] = useState(1);

  // Monitored DB repos state
  const [monitoredRepos, setMonitoredRepos] = useState<MonitoredRepo[]>([]);
  const [monLoading, setMonLoading] = useState(false);

  // Selected repo for deep inspection
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null);
  const [liveDetails, setLiveDetails] = useState<LiveRepoDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Real-time Webhook activity timeline
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Helper: authenticated API fetch
  const authFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('accessToken') || '';
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    return res;
  }, []);

  // Check GitHub Connection Status
  const checkStatus = useCallback(async () => {
    try {
      const res = await authFetch('/repositories/status');
      if (res.ok) {
        const data = await res.json();
        setGhStatus(data);
        return data;
      }
    } catch {
      // offline fallback
    }
    return { connected: false };
  }, [authFetch]);

  // Fetch Discovered Repositories
  const fetchDiscovered = useCallback(async (page = 1) => {
    setDiscLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/repositories/github/discover?page=${page}&perPage=12`);
      if (res.ok) {
        const data = await res.json();
        setDiscoveredRepos(data.repositories || []);
        setDiscPage(page);
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status !== 400 && res.status !== 401) {
          setError(err.error || 'Failed to fetch GitHub repositories');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'GitHub discovery service offline');
    } finally {
      setDiscLoading(false);
    }
  }, [authFetch]);

  // Fetch Monitored Database Repos
  const fetchMonitored = useCallback(async () => {
    setMonLoading(true);
    try {
      const res = await authFetch('/repositories');
      if (res.ok) {
        const data = await res.json();
        setMonitoredRepos(Array.isArray(data) ? data : []);
      }
    } catch {
      // offline fallback
    } finally {
      setMonLoading(false);
    }
  }, [authFetch]);

  // Fetch Timeline Events
  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const res = await authFetch('/repositories/timeline');
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data.events || []);
      }
    } catch {
      // ignore
    } finally {
      setTimelineLoading(false);
    }
  }, [authFetch]);

  // Fetch Live Repo Details (Commits, PRs, Deployments)
  const fetchRepoDetails = useCallback(async (owner: string, name: string) => {
    setDetailsLoading(true);
    try {
      const res = await authFetch(`/repositories/github/details?owner=${owner}&repo=${name}`);
      if (res.ok) {
        const data = await res.json();
        setLiveDetails(data);
      } else {
        toast.error('Failed to retrieve live GitHub details for repository');
      }
    } catch {
      toast.error('GitHub API connection timeout');
    } finally {
      setDetailsLoading(false);
    }
  }, [authFetch]);

  // Initial loader
  useEffect(() => {
    checkStatus().then((status) => {
      if (status?.connected) {
        fetchDiscovered(1);
      } else {
        setDiscLoading(false);
      }
    });
    fetchMonitored();
    fetchTimeline();
  }, [checkStatus, fetchDiscovered, fetchMonitored, fetchTimeline]);

  // Handle GitHub Token / OAuth Connection
  const handleConnectGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setConnectingGh(true);
    try {
      const res = await authFetch('/repositories/github/connect', {
        method: 'POST',
        body: JSON.stringify({ token: tokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authorization failed');
      }
      toast.success(`Connected as @${data.account?.username}`);
      setTokenInput('');
      setModalOpen(false);
      await checkStatus();
      fetchDiscovered(1);
    } catch (err: any) {
      toast.error(err.message || 'GitHub connection failed');
    } finally {
      setConnectingGh(false);
    }
  };

  // Handle Disconnect GitHub
  const handleDisconnectGitHub = async () => {
    if (!confirm('Disconnect GitHub account from IncidentIQ?')) return;
    try {
      const res = await authFetch('/repositories/github/disconnect', { method: 'POST' });
      if (res.ok) {
        toast.success('GitHub account disconnected');
        setGhStatus({ connected: false });
        setDiscoveredRepos([]);
        setLiveDetails(null);
        setSelectedRepo(null);
      }
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  // Handle adding discovered repository to persistent monitored set
  const handleMonitorRepository = async (repo: DiscoveredRepo) => {
    try {
      const res = await authFetch('/repositories', {
        method: 'POST',
        body: JSON.stringify({
          url: repo.htmlUrl,
          branch: repo.defaultBranch || 'main'
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to monitor repository');
      }
      toast.success(`Monitoring activated for ${repo.name}`);
      fetchMonitored();
      setActiveTab('monitored');
    } catch (err: any) {
      toast.error(err.message || 'Could not monitor repository');
    }
  };

  // Inspect Live Repo Details
  const handleSelectRepo = (repo: DiscoveredRepo) => {
    const [owner, name] = repo.fullName.split('/');
    setSelectedRepo({ owner, name: name || repo.name });
    setActiveTab('details');
    fetchRepoDetails(owner, name || repo.name);
  };

  // Handle Manual Connect
  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl) return;
    setManualSubmitting(true);
    try {
      const res = await authFetch('/repositories', {
        method: 'POST',
        body: JSON.stringify({ url: manualUrl, branch: 'main' })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || 'Connection failed');
      }
      toast.success('Repository registered successfully');
      setManualUrl('');
      setManualModalOpen(false);
      fetchMonitored();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Account Header */}
      <div className="rounded-xl border border-white/[0.08] bg-gradient-to-r from-slate-900 via-[#0d131f] to-slate-900 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shadow-inner">
              <Github className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">GitHub Integration & Monitoring</h1>
                {ghStatus.connected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <Radio className="h-3 w-3 animate-pulse text-emerald-400" /> Connected (@{ghStatus.username})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-[13px] text-gray-400 mt-1">
                Real-time repository telemetry, deployment tracking, and commit timeline integration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {ghStatus.connected ? (
              <>
                <button
                  onClick={() => fetchDiscovered(discPage)}
                  className="px-3.5 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-gray-200 text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', discLoading && 'animate-spin')} /> Sync Repos
                </button>
                <button
                  onClick={handleDisconnectGitHub}
                  className="px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Github className="h-4 w-4" /> Connect GitHub Account
              </button>
            )}
            <button
              onClick={() => setManualModalOpen(true)}
              className="px-3.5 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add URL
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 mt-6 border-b border-white/[0.06] pt-1">
          <button
            onClick={() => setActiveTab('discovered')}
            className={cn(
              'px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2',
              activeTab === 'discovered'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            )}
          >
            <Github className="h-3.5 w-3.5" />
            <span>Discovered Repositories</span>
            {discoveredRepos.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px]">
                {discoveredRepos.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('monitored'); fetchMonitored(); }}
            className={cn(
              'px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2',
              activeTab === 'monitored'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Monitored in IncidentIQ</span>
            {monitoredRepos.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                {monitoredRepos.length}
              </span>
            )}
          </button>

          {selectedRepo && (
            <button
              onClick={() => setActiveTab('details')}
              className={cn(
                'px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2',
                activeTab === 'details'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>{selectedRepo.name} (Live Activity)</span>
            </button>
          )}

          <button
            onClick={() => { setActiveTab('timeline'); fetchTimeline(); }}
            className={cn(
              'px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2',
              activeTab === 'timeline'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Webhook Events</span>
            {timelineEvents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-400 text-[10px]">
                {timelineEvents.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center justify-between text-red-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchDiscovered(1)}
            className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-white font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* TAB 1: Discovered Repositories */}
      {activeTab === 'discovered' && (
        <div className="space-y-4">
          {!ghStatus.connected ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto flex items-center justify-center">
                <Github className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">Connect GitHub to Discover Repositories</h3>
                <p className="text-xs text-gray-400">
                  Authorize GitHub access to automatically discover repositories, inspect pull requests, commit streams, and deployment events without manual URL entry.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
              >
                <Github className="h-4 w-4" /> Connect GitHub
              </button>
            </div>
          ) : discLoading && discoveredRepos.length === 0 ? (
            <SkeletonLoader rows={4} />
          ) : discoveredRepos.length === 0 ? (
            <EmptyState
              title="No GitHub repositories found"
              description="No accessible repositories were returned for the connected GitHub credentials."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {discoveredRepos.map((repo) => {
                  const isMonitored = monitoredRepos.some(
                    (m) => m.url === repo.htmlUrl || m.name.toLowerCase() === repo.name.toLowerCase()
                  );
                  return (
                    <div
                      key={repo.id}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4 hover:border-cyan-500/30 hover:bg-white/[0.03] transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                            {repo.visibility === 'private' ? (
                              <Lock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                            ) : (
                              <Globe className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            )}
                            <span className="truncate" title={repo.fullName}>{repo.name}</span>
                          </h3>
                          <a
                            href={repo.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-500 hover:text-cyan-400 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <p className="text-[12px] text-gray-400 line-clamp-2 min-h-[32px]">
                          {repo.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/[0.04] space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3 text-cyan-400" /> {repo.defaultBranch}
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" /> {repo.stargazersCount}</span>
                            <span className="flex items-center gap-1"><GitFork className="h-3 w-3 text-gray-400" /> {repo.forksCount}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => handleSelectRepo(repo)}
                            className="text-[11px] font-semibold text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            Live Activity <ChevronRight className="h-3 w-3" />
                          </button>

                          {isMonitored ? (
                            <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Monitored
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMonitorRepository(repo)}
                              className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-cyan-500 hover:text-slate-950 text-gray-200 text-[11px] font-semibold transition-colors"
                            >
                              + Track
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.04] text-xs text-gray-400">
                <span>Showing page {discPage}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={discPage <= 1}
                    onClick={() => fetchDiscovered(discPage - 1)}
                    className="px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <button
                    onClick={() => fetchDiscovered(discPage + 1)}
                    className="px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] flex items-center gap-1"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: Monitored in IncidentIQ */}
      {activeTab === 'monitored' && (
        <div className="space-y-4">
          {monLoading && monitoredRepos.length === 0 ? (
            <SkeletonLoader rows={3} />
          ) : monitoredRepos.length === 0 ? (
            <EmptyState
              title="No repositories tracked in IncidentIQ"
              description="Click '+ Track' on any discovered repository or add a repository URL manually to bind deployment correlation."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {monitoredRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <GitBranch className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          {repo.name}
                          <a href={repo.url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-cyan-400">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </h3>
                        <span className="text-[11px] text-gray-400 font-mono">Branch: {repo.branch}</span>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                      repo.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'
                    )}>
                      {repo.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/[0.04] text-[12px]">
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">Language</span>
                      <span className="text-gray-200 font-medium">{repo.language || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">Incidents</span>
                      <span className="text-orange-400 font-bold">{repo.incidentCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">Status</span>
                      <span className="text-emerald-400 font-medium">Monitoring</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Deployment Correlation Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Live Deep Repository Details */}
      {activeTab === 'details' && selectedRepo && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Github className="h-4 w-4 text-cyan-400" />
                {selectedRepo.owner}/{selectedRepo.name}
              </h2>
              <span className="text-[11px] text-gray-400">Live GitHub API telemetry and activity feed</span>
            </div>
            <button
              onClick={() => fetchRepoDetails(selectedRepo.owner, selectedRepo.name)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-gray-200 flex items-center gap-1.5"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', detailsLoading && 'animate-spin')} /> Refresh Live Data
            </button>
          </div>

          {detailsLoading ? (
            <SkeletonLoader rows={4} />
          ) : !liveDetails ? (
            <EmptyState title="No details available" description="Could not load repository metadata." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Commits Column */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <GitCommit className="h-4 w-4 text-cyan-400" /> Recent Commits ({liveDetails.commits.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {liveDetails.commits.length === 0 ? (
                    <p className="text-xs text-gray-500">No commits found.</p>
                  ) : (
                    liveDetails.commits.map((c) => (
                      <div key={c.sha} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                        <p className="text-xs font-medium text-white line-clamp-2">{c.message}</p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span>{c.authorName}</span>
                          <span className="font-mono text-cyan-400">{c.sha.slice(0, 7)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pull Requests Column */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <GitPullRequest className="h-4 w-4 text-violet-400" /> Pull Requests ({liveDetails.pullRequests.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {liveDetails.pullRequests.length === 0 ? (
                    <p className="text-xs text-gray-500">No pull requests found.</p>
                  ) : (
                    liveDetails.pullRequests.map((pr) => (
                      <div key={pr.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-white line-clamp-2">#{pr.number} {pr.title}</p>
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-[9px] uppercase font-bold',
                            pr.state === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
                          )}>
                            {pr.state}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          By @{pr.user} • {new Date(pr.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Deployments & Branches */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <Box className="h-4 w-4 text-amber-400" /> Deployments ({liveDetails.deployments.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {liveDetails.deployments.length === 0 ? (
                      <p className="text-xs text-gray-500">No registered deployment events.</p>
                    ) : (
                      liveDetails.deployments.map((d) => (
                        <div key={d.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-white block">{d.environment}</span>
                            <span className="text-[10px] text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 uppercase">
                            {d.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <GitBranch className="h-4 w-4 text-cyan-400" /> Active Branches ({liveDetails.branches.length})
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {liveDetails.branches.map((b) => (
                      <span key={b} className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-gray-300">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Webhook Timeline */}
      {activeTab === 'timeline' && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" /> Real-time Webhook Activity Timeline
              </h3>
              <p className="text-[11px] text-gray-400">Events received via authenticated GitHub Webhook payloads</p>
            </div>
            <button
              onClick={fetchTimeline}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-gray-200 flex items-center gap-1.5"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', timelineLoading && 'animate-spin')} /> Refresh
            </button>
          </div>

          {timelineEvents.length === 0 ? (
            <EmptyState
              title="No webhook events received yet"
              description="Point your GitHub repository or GitHub App Webhooks to /api/github-webhooks/webhook to stream live deployment, push, and PR activity."
            />
          ) : (
            <div className="space-y-3">
              {timelineEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.02] flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{evt.summary}</p>
                      <span className="text-[11px] text-gray-400 font-mono">Repo: {evt.repository}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GitHub Account Connect Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-white/[0.1] rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Github className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Connect GitHub Integration</h3>
                <p className="text-xs text-gray-400">Authenticate with GitHub Personal Access Token or OAuth</p>
              </div>
            </div>

            <form onSubmit={handleConnectGitHub} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 block mb-1.5 font-medium">
                  GitHub Personal Access Token (classic or fine-grained)
                </label>
                <input
                  type="password"
                  placeholder="ghp_... or github_pat_..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-white text-xs outline-none focus:border-cyan-400 font-mono"
                  required
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Permissions required: <code className="text-gray-400">repo</code> (Full repository access) or read-only repository metadata. Token is stored securely in backend session memory.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connectingGh}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {connectingGh ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verifying...
                    </>
                  ) : (
                    'Authorize & Discover'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add URL Modal */}
      {manualModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-white/[0.1] rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Manually Add GitHub URL</h3>
            <form onSubmit={handleManualConnect} className="space-y-4">
              <div>
                <label className="text-[12px] text-gray-400 block mb-1">GitHub URL</label>
                <input
                  type="text"
                  placeholder="https://github.com/org/repo"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-[13px] outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-black font-bold text-[13px] disabled:opacity-50"
                >
                  {manualSubmitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
