import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Menu, Plus, X } from 'lucide-react';

import { Button } from '../../ui';
import { BrandMark } from '../brand/brand-mark';
import { Sidebar } from './sidebar';
import { ThemeToggle, UserMenu } from './user-menu';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-56 shrink-0 lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-[hsl(205_34%_10%/0.55)]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-64 shadow-popover">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute end-2 top-2.5 z-10 rounded-sm p-2 text-sidebar-muted hover:bg-sidebar-raised hover:text-sidebar-foreground"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="-ms-2 rounded-sm p-2.5 text-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="hidden whitespace-nowrap text-[15px] font-bold text-foreground sm:inline">
              3D Print OS
            </span>
          </span>
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
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
