import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { BookOpen, Search, Sparkles, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

interface KnowledgeDoc {
  id: string;
  title: string;
  category: 'runbook' | 'playbook' | 'documentation';
  source?: string;
  description: string;
  updatedAt?: string;
  author?: string;
  tags?: string[];
}

export function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchKnowledgeDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken') || '';
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${baseUrl}/knowledge`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch knowledge base (HTTP ${res.status})`);
      }
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Vector RAG Knowledge Service unavailable');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKnowledgeDocs();
  }, [fetchKnowledgeDocs]);

  const filtered = docs.filter((item) => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">RAG Knowledge Base & Runbooks</h1>
          <p className="text-[13px] text-gray-500">Vector database documents for Generative AI Root Cause Analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchKnowledgeDocs}
            className="text-[12px] text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg border border-white/[0.06] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
          <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Vector RAG Ready
          </span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <span className="font-semibold block text-white">Vector RAG Engine Offline</span>
              <span>{error}</span>
            </div>
          </div>
          <button
            onClick={fetchKnowledgeDocs}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-medium self-start sm:self-auto transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px]">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search runbooks, playbooks, and troubleshooting guides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-gray-200 placeholder-gray-500 w-full text-[13px]"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'runbook', 'playbook', 'documentation'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-colors',
                activeCategory === cat ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/[0.02] text-gray-400 hover:bg-white/[0.06]'
              )}
            >
              {cat === 'all' ? 'All Categories' : `${cat}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Content / Loading / Empty */}
      {loading && docs.length === 0 ? (
        <SkeletonLoader rows={4} />
      ) : docs.length === 0 ? (
        <EmptyState
          title="No vector knowledge documents indexed"
          description="Vector embeddings store currently contains no runbook documents. Upload team runbooks or Markdown files to index them for Root Cause Analysis."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                    {item.category}
                  </span>
                  <span className="text-[11px] text-gray-500">{item.source || 'Internal'}</span>
                </div>
                <h3 className="text-[14px] font-bold text-white mb-2">{item.title}</h3>
                <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-3">{item.description}</p>
              </div>

              <div className="pt-3 border-t border-white/[0.04] space-y-2">
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span key={tag} className="text-[10px] text-gray-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                  <span>{item.author ? `By ${item.author}` : ''}</span>
                  <button className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
                    View Document <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}