import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { User, Bell, Shield, Sliders, Database, Save, Key, Globe, Palette, Lock, Webhook } from 'lucide-react';
import { toast } from 'sonner';

function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold text-white">{title}</h3>
        {description && <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ title, description, checked, onChange }: {
  title: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors">
      <div>
        <span className="text-[13px] font-medium text-white block">{title}</span>
        <span className="text-[11px] text-gray-500">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-cyan-500' : 'bg-white/[0.1]'
        )}
      >
        <span className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform duration-200 mt-0.5',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        )} />
      </button>
    </label>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Form states
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(true);
  const [pagerDuty, setPagerDuty] = useState(false);
  const [anomalyThreshold, setAnomalyThreshold] = useState('0.85');
  const [autoRca, setAutoRca] = useState(true);
  const [autoEscalate, setAutoEscalate] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Settings saved successfully');
  };

  const tabs = [
    { id: 'profile', label: 'Profile & Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'detection', label: 'Detection Rules', icon: Sliders },
    { id: 'integrations', label: 'Integrations', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Platform Settings</h1>
        <p className="text-[13px] text-gray-500">Manage user account, alert preferences, ML thresholds, and integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] gap-1 text-[13px] overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'pb-3 px-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <form onSubmit={handleSave} className="space-y-5">
        {activeTab === 'profile' && (
          <>
            <SettingsCard title="Account Information" description="Your personal details and organization role">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-gray-400 block mb-1.5 font-medium">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-[13px] outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-gray-400 block mb-1.5 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-[13px] outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[12px] text-gray-400 block mb-1.5 font-medium">Role</label>
                <input
                  type="text"
                  disabled
                  value={user?.role || 'viewer'}
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-gray-500 text-[13px] cursor-not-allowed capitalize"
                />
                <span className="text-[11px] text-gray-600 mt-1 block">Contact your organization admin to change your role.</span>
              </div>
            </SettingsCard>

            <SettingsCard title="Appearance" description="Theme and display preferences">
              <ToggleRow
                title="Dark Mode"
                description="Use dark color scheme across the platform"
                checked={darkMode}
                onChange={setDarkMode}
              />
            </SettingsCard>
          </>
        )}

        {activeTab === 'notifications' && (
          <SettingsCard title="Alert Dispatch Settings" description="Configure how and when you receive incident notifications">
            <div className="space-y-3">
              <ToggleRow
                title="Email Alerts for Critical Incidents"
                description="Send immediate emails when severity is critical"
                checked={emailAlerts}
                onChange={setEmailAlerts}
              />
              <ToggleRow
                title="Slack Webhook Notifications"
                description="Post incident events directly to #sre-alerts"
                checked={slackAlerts}
                onChange={setSlackAlerts}
              />
              <ToggleRow
                title="PagerDuty Integration"
                description="Trigger PagerDuty alerts for critical and high severity incidents"
                checked={pagerDuty}
                onChange={setPagerDuty}
              />
            </div>
          </SettingsCard>
        )}

        {activeTab === 'detection' && (
          <SettingsCard title="ML Detection Configuration" description="Fine-tune anomaly detection thresholds and automation rules">
            <div>
              <label className="text-[12px] text-gray-400 block mb-1.5 font-medium">Minimum Anomaly Score Threshold</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="0.99"
                value={anomalyThreshold}
                onChange={(e) => setAnomalyThreshold(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-[13px] outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">Scores above this threshold will automatically create an incident.</span>

              {/* Visual threshold indicator */}
              <div className="mt-3 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500 transition-all"
                  style={{ width: `${(parseFloat(anomalyThreshold) || 0.85) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>0.50 (Sensitive)</span>
                <span>0.99 (Conservative)</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <ToggleRow
                title="Automatic Generative AI RCA"
                description="Trigger LLM pipeline on critical incidents automatically"
                checked={autoRca}
                onChange={setAutoRca}
              />
              <ToggleRow
                title="Auto-Escalate High Severity"
                description="Automatically escalate high-severity anomalies to incidents"
                checked={autoEscalate}
                onChange={setAutoEscalate}
              />
            </div>
          </SettingsCard>
        )}

        {activeTab === 'integrations' && (
          <SettingsCard title="Active Integrations" description="Connected services and data sources">
            <div className="space-y-2 text-[13px]">
              {[
                { name: 'PostgreSQL Primary Database', status: 'Connected', statusColor: 'text-emerald-400', icon: Database },
                { name: 'FastAPI Python ML Service (localhost:8000)', status: 'Connected', statusColor: 'text-emerald-400', icon: Globe },
                { name: 'GitHub Repository Monitoring', status: 'Connected', statusColor: 'text-emerald-400', icon: Webhook },
              ].map((integration, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    <integration.icon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-200">{integration.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[11px] font-medium', integration.statusColor)}>{integration.status}</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </SettingsCard>
        )}

        {activeTab === 'security' && (
          <>
            <SettingsCard title="Authentication" description="Session and security configuration">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-[13px] text-gray-200 block">JWT Authentication</span>
                      <span className="text-[11px] text-gray-500">Access & refresh token pair</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-[13px] text-gray-200 block">bcrypt Password Hashing</span>
                      <span className="text-[11px] text-gray-500">Industry-standard password encryption</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400">Enabled</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-[13px] text-gray-200 block">RBAC (Role-Based Access Control)</span>
                      <span className="text-[11px] text-gray-500">admin, operator, viewer roles</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-cyan-400 capitalize">{user?.role || 'viewer'}</span>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard title="Active Sessions" description="Currently active authentication sessions">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div>
                  <span className="text-[13px] text-gray-200 block">Current Session</span>
                  <span className="text-[11px] text-gray-500">Logged in as {user?.email || user?.username || 'Unknown'}</span>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </SettingsCard>
          </>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white font-bold text-[13px] flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Save className="h-4 w-4" /> Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}