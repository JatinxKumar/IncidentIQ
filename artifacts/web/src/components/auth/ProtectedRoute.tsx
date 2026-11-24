import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Shield } from 'lucide-react';

type ProtectedRouteProps = {
    children: React.ReactNode;
    roles?: ('admin' | 'analyst' | 'viewer')[];
};

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { user, isAuthenticated, isInitializing } = useAuth();
    const [, navigate] = useLocation();

    useEffect(() => {
        if (isInitializing) return; // Wait until auth check finishes

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (roles && user && !roles.includes(user.role)) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, isInitializing, user, roles, navigate]);

    if (isInitializing) {
        return (
            <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center text-white">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 animate-pulse mb-4">
                    <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>Verifying session...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || (roles && user && !roles.includes(user.role))) {
        return null;
    }

    return <>{children}</>;
}
