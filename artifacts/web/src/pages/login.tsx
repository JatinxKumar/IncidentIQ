import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Shield, Eye, EyeOff, ArrowRight, Activity, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const [, navigate] = useLocation();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await login(email, password);
            toast.success('Signed in successfully');
            navigate('/dashboard');
        } catch (error: any) {
            const errorMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Invalid email or password';
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-['Inter',sans-serif] selection:bg-cyan-500 selection:text-white">
            {/* Left side: Product statement & visual panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

                {/* Brand Header */}
                <div
                    onClick={() => navigate('/')}
                    className="flex items-center gap-3 cursor-pointer group w-fit"
                >
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">IncidentIQ</span>
                </div>

                {/* Hero Feature Graphic */}
                <div className="my-auto space-y-6 relative z-10 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
                        <Activity className="h-3.5 w-3.5" />
                        <span>Real-time Telemetry & Anomaly Intelligence</span>
                    </div>

                    <h2 className="text-3xl font-extrabold text-white leading-tight">
                        Enterprise Observability Platform
                    </h2>

                    <p className="text-sm text-slate-400 leading-relaxed">
                        Sign in to monitor live telemetry streams, inspect ML-driven anomaly scores, and access Generative AI Root Cause Analysis.
                    </p>

                    <div className="space-y-3 pt-2">
                        {[
                            'Real-time metric anomaly classification',
                            'Generative AI Root Cause Analysis (RCA)',
                            'Vector RAG Knowledge Base integration',
                        ].map((feat, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs text-slate-300">
                                <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                                <span>{feat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer link */}
                <div className="text-xs text-slate-500">
                    © 2026 IncidentIQ 
                </div>
            </div>

            {/* Right side: Login Panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 left-6 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Landing Page</span>
                </button>

                <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-900/5">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight text-slate-900">IncidentIQ</span>
                    </div>

                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign in to IncidentIQ</h1>
                        <p className="text-xs text-slate-500 mt-1">Enter your organization credentials below</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@company.com"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-600 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-semibold text-slate-700">Password</label>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-600 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md shadow-slate-900/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="h-4 w-4 text-cyan-400" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                        Don't have an account?{' '}
                        <button
                            onClick={() => navigate('/register')}
                            className="text-cyan-700 hover:text-cyan-800 font-bold transition-colors"
                        >
                            Create an account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
