import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';

import { cn } from '../../lib/utils';

import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';

function initials(name: string | undefined): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function ThemeToggle({ onRail = false }: { onRail?: boolean }) {
  const { theme, toggleTheme } = useThemeStore();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-sm transition-colors duration-150 sm:h-9 sm:w-9',
        onRail
          ? 'text-sidebar-muted hover:bg-sidebar-raised hover:text-sidebar-foreground focus-visible:ring-offset-sidebar'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}

export function UserMenu({ signOutTo, onRail = false }: { signOutTo: string; onRail?: boolean }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const signOut = async () => {
    await logout();
    navigate(signOutTo, { replace: true });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex min-h-11 items-center gap-2 rounded-sm p-1 pe-2 sm:min-h-9',
          onRail ? 'hover:bg-sidebar-raised focus-visible:ring-offset-sidebar' : 'hover:bg-muted',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-stock-edge bg-stock-draft text-xs font-bold text-stock-ink">
          {initials(user?.full_name)}
        </span>
        <span
          className={cn(
            'hidden max-w-[10rem] truncate text-sm font-semibold sm:block',
            onRail ? 'text-sidebar-foreground' : 'text-foreground',
          )}
        >
          {user?.full_name}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 z-40 mt-1 w-56 rounded-sm border border-border bg-popover p-1 text-popover-foreground shadow-popover"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">{user?.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
