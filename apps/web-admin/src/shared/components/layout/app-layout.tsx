import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Menu, Plus, X } from 'lucide-react';

import { Button } from '../../ui';
import { Sidebar } from './sidebar';
import { ThemeToggle, UserMenu } from './user-menu';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-e border-border lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-64 border-e border-border shadow-popover">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute end-3 top-3.5 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/80 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="-ms-1 rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <Link to="/app/quotes/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              New quote
            </Button>
          </Link>
          <ThemeToggle />
          <UserMenu signOutTo="/login" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
