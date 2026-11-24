import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Shield, ChevronDown, ArrowRight, Menu, X, User as UserIcon, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LandingNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full font-['Inter',sans-serif] transition-all duration-300">
      {/* Container smoothly transforms from flat full-width navbar to floating glass capsule on scroll */}
      <div className={cn(
        'mx-auto transition-all duration-300 ease-in-out',
        isScrolled
          ? 'max-w-5xl mt-3 px-6 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md shadow-slate-900/5'
          : 'max-w-7xl px-8 py-5 bg-transparent border-b-0'
      )}>
        <div className="flex items-center justify-between">
          {/* Left: Brand Logo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Shield className="h-4.5 w-4.5 text-cyan-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900">
                IncidentIQ
              </span>
            </div>
          </div>

          {/* Center: Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600">
            <button onClick={() => navigate('/')} className="hover:text-slate-900 transition-colors flex items-center gap-1">
              Product <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            <button onClick={() => navigate('/')} className="hover:text-slate-900 transition-colors flex items-center gap-1">
              Platform <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            <button onClick={() => navigate('/')} className="hover:text-slate-900 transition-colors flex items-center gap-1">
              Solutions <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            <button onClick={() => navigate('/')} className="hover:text-slate-900 transition-colors">
              Resources
            </button>
            <button onClick={() => navigate('/')} className="hover:text-slate-900 transition-colors">
              Pricing
            </button>
          </nav>

          {/* Right: Actions / Authenticated User Info */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-colors text-xs font-semibold text-slate-800"
                >
                  <div className="h-6 w-6 rounded-full bg-slate-900 text-cyan-400 flex items-center justify-center text-[11px] font-bold">
                    {user?.username ? user.username.charAt(0).toUpperCase() : <UserIcon className="h-3.5 w-3.5" />}
                  </div>
                  <span>{user?.username || user?.email || 'Account'}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 text-slate-500 transition-transform', isProfileDropdownOpen && 'rotate-180')} />
                </button>

                {/* Authenticated User Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200/80 shadow-xl py-1 text-xs text-slate-700 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-900 truncate">{user?.username}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => { setIsProfileDropdownOpen(false); navigate('/dashboard'); }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => { setIsProfileDropdownOpen(false); navigate('/settings'); }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-500" />
                      Settings
                    </button>
                    <div className="border-t border-slate-100 my-0.5" />
                    <button
                      onClick={() => { setIsProfileDropdownOpen(false); logout(true); }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="h-3.5 w-3.5 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 group"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t border-slate-100 mt-3 space-y-2 text-xs font-semibold text-slate-700">
            <button onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} className="w-full text-left py-2 px-3 hover:bg-slate-50 rounded-lg">Product</button>
            <button onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} className="w-full text-left py-2 px-3 hover:bg-slate-50 rounded-lg">Platform</button>
            <button onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} className="w-full text-left py-2 px-3 hover:bg-slate-50 rounded-lg">Solutions</button>
            <button onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} className="w-full text-left py-2 px-3 hover:bg-slate-50 rounded-lg">Pricing</button>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <button onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }} className="w-full text-center py-2 text-xs font-bold text-white bg-slate-900 rounded-full">Dashboard</button>
                  <button onClick={() => { logout(true); setIsMobileMenuOpen(false); }} className="w-full text-center py-2 text-xs font-bold text-red-600 bg-red-50 rounded-full">Sign Out</button>
                </>
              ) : (
                <>
                  <button onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }} className="w-full text-center py-2 text-xs font-bold text-slate-800 bg-slate-100 rounded-full">Sign In</button>
                  <button onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }} className="w-full text-center py-2 text-xs font-bold text-white bg-slate-900 rounded-full">Get Started</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
