import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import { ThemeToggle, UserMenu } from './user-menu';

const links = [
  { to: '/portal/upload', label: 'Get a quote' },
  { to: '/portal/quotes', label: 'Your quotes' },
  { to: '/portal/orders', label: 'Your orders' },
];

export function PortalLayout() {
  const tenant = useAuthStore((state) => state.tenant);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:px-6">
          <NavLink to="/portal/upload" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
              3D
            </span>
            <span className="text-sm font-semibold text-foreground">
              {tenant?.name ?? 'Print OS'}
            </span>
          </NavLink>
          <div className="flex-1" />
          <ThemeToggle />
          <UserMenu signOutTo="/portal/login" />
        </div>
        <nav
          className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6"
          aria-label="Portal"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
