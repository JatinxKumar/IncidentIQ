/**
 * pages/not-found.tsx — 404 page
 *
 * Shown when a user navigates to a route that does not exist.
 * Uses the IncidentIQ dark theme tokens.
 */
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-8">
      <div className="bg-card border border-card-border rounded-lg p-8 w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-10 w-10 text-chart-3" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          404 — Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground">
          This route does not exist. Check the URL or return to the dashboard.
        </p>
      </div>
    </div>
  );
}
