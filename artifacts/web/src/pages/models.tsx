import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Brain, Award, Play, BarChart2, RefreshCw, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';

interface Model {
  id: string;
  name: string;
  version?: string;
  accuracy: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  silhouetteScore?: number;
  status: 'active' | 'ready' | 'training' | 'inactive' | 'deprecated';
  isBest?: boolean;
  lastTrained?: string;
  dataPoints?: number;
  description?: string;
}

export function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken') || '';
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${baseUrl}/dashboard/models`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch ML models (HTTP ${res.status})`);
      }
      const data = await res.json();
      setModels(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'ML Service unreachable');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const comparisonData = models.map(m => ({
    name: m.name.split(' ')[0],
    Accuracy: m.accuracy || 0,
    Precision: m.precision || 0,
    Recall: m.recall || 0,
    F1: m.f1Score || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">ML Model Registry</h1>
          <p className="text-[13px] text-gray-500">Trained machine learning models for anomaly detection and RCA</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchModels}
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
              <span className="font-semibold block text-white">FastAPI ML Inference Service Status</span>
              <span>{error}</span>
            </div>
          </div>
          <button
            onClick={fetchModels}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white font-medium self-start sm:self-auto transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Content / Loading / Empty */}
      {loading && models.length === 0 ? (
        <SkeletonLoader rows={4} />
      ) : models.length === 0 ? (
        <EmptyState
          title="No trained models registered"
          description="The ML model pipeline has not registered any trained classifiers yet. Trigger a model training job to generate model artifacts."
        />
      ) : (
        <>
          {/* Comparison Chart */}
          {comparisonData.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold text-white flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-cyan-400" />
                  Model Performance Comparison
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={comparisonData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="Accuracy" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Precision" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Recall" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="F1" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
              <div
                key={model.id}
                className={cn(
                  'rounded-xl border p-5 space-y-4 transition-all duration-200',
                  model.isBest
                    ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent shadow-lg shadow-cyan-500/5'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-gray-500">{model.id}</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                    model.status === 'active' || model.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400' :
                    model.status === 'training' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'
                  )}>
                    {model.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-[15px] font-bold text-white">{model.name}</h3>
                  {model.description && <p className="text-[12px] text-gray-400 mt-1">{model.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Accuracy</div>
                    <div className="text-[16px] font-bold text-cyan-400">{model.accuracy}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">F1 Score</div>
                    <div className="text-[16px] font-bold text-emerald-400">{model.f1Score || 'N/A'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
