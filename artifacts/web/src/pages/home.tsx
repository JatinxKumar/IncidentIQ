import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

export function Home() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">IncidentIQ Dashboard</h1>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-gray-300">
                Welcome, {user.username} ({user.role})
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Logout
            </Button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
          <p className="text-gray-400">
            This is the IncidentIQ dashboard. More features will be added soon.
          </p>

          {user?.role === 'admin' && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-medium text-white mb-2">Admin Panel</h3>
              <p className="text-gray-400">Admin-only content goes here</p>
            </div>
          )}

          {user?.role === 'analyst' && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-medium text-white mb-2">Analyst Tools</h3>
              <p className="text-gray-400">Analyst-only content goes here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
