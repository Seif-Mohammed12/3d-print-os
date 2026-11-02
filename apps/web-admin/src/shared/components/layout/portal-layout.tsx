import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '../../lib/utils';
import { BrandMark } from '../brand/brand-mark';
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
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-4 sm:px-6">
          <NavLink to="/portal/upload" className="flex items-center gap-2">
            <BrandMark />
            <span className="text-[15px] font-bold tracking-[-0.01em] text-foreground">
              {tenant?.name ?? '3D Print OS'}
            </span>
          </NavLink>
          <div className="flex-1" />
          <ThemeToggle onRail />
          <UserMenu signOutTo="/portal/login" onRail />
        </div>
        <nav
          className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6"
          aria-label="Portal"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-150 sm:min-h-9',
                  isActive
                    ? 'bg-sidebar-active font-semibold text-sidebar-active-foreground'
                    : 'font-medium text-muted-foreground hover:bg-sidebar-raised hover:text-foreground',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
