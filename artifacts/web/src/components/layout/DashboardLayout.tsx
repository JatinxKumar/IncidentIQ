import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  AlertTriangle,
  Activity,
  Brain,
  FileBarChart,
  GitBranch,
  BookOpen,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  Shield,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Incidents', href: '/incidents', icon: AlertTriangle, badge: 3 },
  { label: 'Anomalies', href: '/anomalies', icon: Activity },
  { label: 'Models', href: '/models', icon: Brain },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Repositories', href: '/repositories', icon: GitBranch },
  { label: 'Knowledge', href: '/knowledge', icon: BookOpen },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-[260px] z-50 flex flex-col',
          'bg-[#0d1117]/95 backdrop-blur-xl border-r border-white/[0.06]',
          'transform transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.06]">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-[15px] font-semibold tracking-tight text-white">IncidentIQ</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-medium uppercase tracking-wider">Enterprise</span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => {
                  navigate(item.href);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] font-medium transition-all duration-150',
                  active
                    ? 'bg-cyan-500/10 text-cyan-400 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                )}
              >
                <item.icon className={cn('h-[18px] w-[18px] flex-shrink-0', active ? 'text-cyan-400' : 'text-gray-500')} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-red-500/20 text-red-400 text-[11px] font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-violet-500/20">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-medium text-gray-200 truncate">{user?.username || 'User'}</p>
                <p className="text-[11px] text-gray-500 capitalize">{user?.role || 'viewer'}</p>
              </div>
              <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', isProfileOpen && 'rotate-180')} />
            </button>

            {isProfileOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#161b22] border border-white/[0.08] rounded-lg shadow-xl overflow-hidden">
                <button
                  onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-gray-300 hover:bg-white/[0.04] transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={() => { logout(); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/[0.06]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main content area ─── */}
      <div className="lg:ml-[260px] min-h-screen flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-14 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors p-1"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 min-w-[240px] text-[13px]">
              <Search className="h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search incidents, anomalies..."
                className="bg-transparent border-none outline-none text-gray-300 placeholder-gray-500 w-full text-[13px]"
              />
              <kbd className="hidden md:inline-flex px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-gray-500 font-mono">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification badge (placeholder) */}
            <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-colors">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0a0e1a]" />
            </button>

            {/* Status indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-400">All Systems Operational</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
