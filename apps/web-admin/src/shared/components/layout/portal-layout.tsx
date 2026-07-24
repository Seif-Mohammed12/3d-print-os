import { Outlet, Link } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

import { useAuthStore } from '../../stores/auth-store';

export function PortalLayout() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/portal/upload" className="text-xl font-bold text-foreground">
                3D Print OS
              </Link>
              <nav className="flex gap-4">
                <Link
                  to="/portal/upload"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  Get Quote
                </Link>
                <Link
                  to="/portal/quotes"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  My Quotes
                </Link>
                <Link
                  to="/portal/orders"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  My Orders
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{user.full_name}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
