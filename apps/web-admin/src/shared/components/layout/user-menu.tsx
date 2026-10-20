import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';

import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';

function initials(name: string | undefined): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}

export function UserMenu({ signOutTo }: { signOutTo: string }) {
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
        className="flex items-center gap-2 rounded-lg p-1 pe-2 hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {initials(user?.full_name)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-foreground sm:block">
          {user?.full_name}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 z-40 mt-1 w-56 rounded-lg border border-border bg-popover p-1 shadow-popover"
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
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
