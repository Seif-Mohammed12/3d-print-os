import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  FileText,
  LayoutDashboard,
  ListOrdered,
  Package,
  Printer,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';

type NavItem = { label: string; to: string; icon: LucideIcon; end?: boolean };

const sections: Array<{ label?: string; items: NavItem[] }> = [
  {
    items: [
      { label: 'Dashboard', to: '/app', icon: LayoutDashboard, end: true },
      { label: 'Quotes', to: '/app/quotes', icon: FileText },
      { label: 'Orders', to: '/app/orders', icon: Receipt },
      { label: 'Customers', to: '/app/customers', icon: Users },
    ],
  },
  {
    label: 'Production',
    items: [
      { label: 'Queue', to: '/app/production/queue', icon: ListOrdered },
      { label: 'Printers', to: '/app/printers', icon: Printer },
      { label: 'Materials', to: '/app/materials', icon: Boxes },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Reports', to: '/app/reports', icon: BarChart3 },
      { label: 'Pricing', to: '/app/settings/pricing', icon: Package },
      { label: 'Settings', to: '/app/settings/shop', icon: Settings },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const tenant = useAuthStore((state) => state.tenant);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
          3D
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Print OS</p>
          {tenant?.name && <p className="truncate text-xs text-muted-foreground">{tenant.name}</p>}
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2" aria-label="Main">
        {sections.map((section, index) => (
          <div key={section.label ?? index}>
            {section.label && (
              <p className="px-2.5 pb-1.5 text-xs font-medium text-muted-foreground">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
