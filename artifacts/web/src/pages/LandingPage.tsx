import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { PremiumLoader } from '@/components/common/PremiumLoader';
import { TypewriterHeadline } from '@/components/common/TypewriterHeadline';
import {
  Shield,
  Zap,
  Activity,
  Brain,
  BookOpen,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronRight,
  Server,
  BarChart3,
  Cpu,
  Clock,
  Sparkles,
  Search,
  AlertTriangle,
  FileText,
  TrendingDown,
  RefreshCw,
  Layers,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Premium loader state
  const [showLoader, setShowLoader] = useState(() => {
    // Only show loader if user hasn't seen it in this session
    return !sessionStorage.getItem('has_seen_loader');
  });

  const handleLoaderComplete = () => {
    sessionStorage.setItem('has_seen_loader', 'true');
    setShowLoader(false);
  };

  return (
    <>
      {showLoader && <PremiumLoader onComplete={handleLoaderComplete} />}

      <div
        style={{ cursor: "url('/custom-cursor.svg') 4 4, auto" }}
        className="min-h-screen bg-slate-50 text-slate-900 font-['Inter',sans-serif] antialiased selection:bg-cyan-500 selection:text-white [&_button]:cursor-pointer [&_a]:cursor-pointer"
      >
        {/* Floating Navbar */}
        <LandingNavbar />

        {/* ─── HERO SECTION ─── */}
        <section className="relative pt-36 pb-20 overflow-hidden bg-gradient-to-b from-slate-100/80 via-slate-50 to-white border-b border-slate-200/60">
          {/* Subtle background glow accents */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-br from-cyan-400/10 via-blue-500/10 to-indigo-500/5 blur-[140px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200/80 text-cyan-800 text-xs font-bold tracking-wide uppercase shadow-sm mb-6">
              <Zap className="h-3.5 w-3.5 text-cyan-600" />
              <span>AI-Powered Incident Intelligence Platform</span>
            </div>

            {/* Headline */}
            <TypewriterHeadline />

            {/* Description */}
            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
              IncidentIQ correlates telemetry streams, GitHub repository deployments, and machine-learning anomaly detection with Vector RAG runbooks for automated Root Cause Analysis.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xl shadow-slate-900/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group"
              >
                <span>{isAuthenticated ? 'Open Dashboard' : 'Get Started Free'}</span>
                <ArrowRight className="h-4 w-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate(isAuthenticated ? '/incidents' : '/login')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 font-semibold text-sm border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Explore Platform</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* Hero Product Visual / Dashboard Preview */}
            <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-200/90 bg-white/90 p-4 sm:p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-xl relative text-left">
              {/* Window Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-400 font-mono ml-2">app.incidentiq.io/dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>System Operational • 99.8% Uptime</span>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                  <span className="text-xs text-slate-500 block font-medium">System Health</span>
                  <span className="text-xl font-extrabold text-slate-900">92.4%</span>
                  <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">↑ +2.1% normal</span>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                  <span className="text-xs text-slate-500 block font-medium">Active Incidents</span>
                  <span className="text-xl font-extrabold text-slate-900">12</span>
                  <span className="text-[11px] text-amber-600 font-semibold block mt-0.5">3 Critical</span>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                  <span className="text-xs text-slate-500 block font-medium">Anomalies Detected</span>
                  <span className="text-xl font-extrabold text-slate-900">87</span>
                  <span className="text-[11px] text-cyan-700 font-semibold block mt-0.5">Real-time Stream</span>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                  <span className="text-xs text-slate-500 block font-medium">ML Model Accuracy</span>
                  <span className="text-xl font-extrabold text-blue-700">94.2%</span>
                  <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">Random Forest v2.4</span>
                </div>
              </div>

              {/* RCA Highlight Box */}
              <div className="rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50/80 to-blue-50/50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-cyan-700" />
                  <span className="text-xs font-bold text-slate-900">AI Root Cause Analysis — INC-1024</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold uppercase">Critical</span>
                </div>
                <p className="text-xs text-slate-700 font-medium">
                  Connection pool exhaustion detected in API Gateway. Identified slow query execution in PostgreSQL main deployment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── METRIC STRIP / STATS ─── */}
        <section className="py-12 bg-white border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">94.2%</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">ML Anomaly Accuracy</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-cyan-600 font-['Plus_Jakarta_Sans',sans-serif]">-68%</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Reduction in MTTR</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">&lt;4 mins</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Automated RCA Generation</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 font-['Plus_Jakarta_Sans',sans-serif]">24/7</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Continuous Telemetry Stream</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PROBLEM VS SOLUTION ─── */}
        <section className="py-20 bg-slate-50 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider bg-cyan-100/70 px-3 py-1 rounded-full">
                The IncidentIQ Advantage
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-3">From Alert Fatigue to Instant Resolution</h2>
              <p className="text-slate-600 mt-3 text-sm">Traditional monitoring floods engineering channels with noise. IncidentIQ turns telemetry into answers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Old Way */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-8 space-y-4">
                <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Traditional Alert Chaos</h3>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    Hundreds of unclassified alerts firing simultaneously across Slack.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    Engineers spending 2+ hours reading raw log files manually.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    No visibility into which code deployment broke the database.
                  </li>
                </ul>
              </div>

              {/* IncidentIQ Way */}
              <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/60 to-blue-50/40 p-8 space-y-4 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">IncidentIQ Intelligence</h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                    Machine learning classifies anomaly severity automatically.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                    Generative AI RCA pinpoints root cause and contributing factors.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                    Vector RAG instantly retrieves relevant team runbooks.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── ASYMMETRIC FEATURE GRID ─── */}
        <section className="py-20 bg-white border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-16">
              <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Core Capabilities</span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-2">Built for Modern SRE & DevOps Engineering</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 hover:shadow-lg transition-all">
                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Real-time Telemetry Processing</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Streams CPU, memory, disk I/O, and latency metrics continuously to detect anomalies within seconds.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 hover:shadow-lg transition-all">
                <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                  <Brain className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">ML Anomaly Classifier</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Trained Random Forest and XGBoost models score anomaly certainty and filter false positives out.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 hover:shadow-lg transition-all">
                <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-4">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Vector RAG Runbooks</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Embeds markdown runbooks into a vector index for instant knowledge retrieval during outages.
                </p>
              </div>

              {/* Feature 4 — Wide */}
              <div className="md:col-span-2 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2">
                  <GitBranch className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold">GitHub Repository & Deployment Tracking</h3>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  Automatically correlates incoming log exceptions with recent code commits, branches, and deployment webhooks.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 hover:shadow-lg transition-all">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Role-Based Access Control</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Strict Admin, Analyst, and Viewer permissions with JWT and bcrypt session persistence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold font-['Plus_Jakarta_Sans',sans-serif]">Ready to streamline your incident response?</h2>
            <p className="text-slate-400 mt-3 text-sm max-w-xl mx-auto">
              Get started with IncidentIQ today to monitor infrastructure, detect anomalies, and auto-generate root cause reports.
            </p>
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 hover:scale-105 transition-all flex items-center gap-2 group"
              >
                <span>{isAuthenticated ? 'Go to Dashboard' : 'Create Free Account'}</span>
                <ArrowRight className="h-4 w-4 text-cyan-200 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-slate-200 bg-white py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-bold text-[10px]">
                IQ
              </div>
              <span className="font-extrabold text-slate-900">IncidentIQ</span>
              <span>© 2026 IncidentIQ Platform. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 font-semibold text-slate-600">
              <button onClick={() => navigate('/login')} className="hover:text-slate-900 transition-colors">Sign In</button>
              <button onClick={() => navigate('/register')} className="hover:text-slate-900 transition-colors">Register</button>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
