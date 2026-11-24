/**
 * App.tsx — Root application component
 */
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

import NotFound from '@/pages/not-found';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/login';
import { RegisterPage } from '@/pages/register';
import { DashboardPage } from '@/pages/DashboardPage';
import { IncidentsPage } from '@/pages/incidents';
import { IncidentDetailPage } from '@/pages/incidentDetail';
import { AnomaliesPage } from '@/pages/anomalies';
import { ModelsPage } from '@/pages/models';
import { ReportsPage } from '@/pages/reports';
import { RepositoriesPage } from '@/pages/repositories';
import { KnowledgePage } from '@/pages/knowledge';
import { SettingsPage } from '@/pages/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchInterval: 30_000, // 30s background refetch for real-time dashboard update
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function HomeRoute() {
  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      <ProtectedRoute>
        <DashboardLayout>
          <Switch>
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/incidents/:id" component={IncidentDetailPage} />
            <Route path="/incidents" component={IncidentsPage} />
            <Route path="/anomalies" component={AnomaliesPage} />
            <Route path="/models" component={ModelsPage} />
            <Route path="/reports" component={ReportsPage} />
            <Route path="/repositories" component={RepositoriesPage} />
            <Route path="/knowledge" component={KnowledgePage} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </ProtectedRoute>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
        <SonnerToaster position="top-right" richColors theme="dark" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
