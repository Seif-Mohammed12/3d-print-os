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

import { useOrders } from '../../../features/orders/hooks/use-orders';
import { useQuotes } from '../../../features/quotes/hooks/use-quotes';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import { BrandName } from '../brand/brand-mark';

type NavItem = { label: string; to: string; icon: LucideIcon; end?: boolean };

const OPEN_ORDER = new Set(['accepted', 'production', 'printing', 'quality_check']);

const sections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Sales',
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
  // Same queries as the dashboard, so these counts come from the cache.
  const drafts = useQuotes({ status: 'draft', perPage: 1 });
  const orders = useOrders({ per_page: 100 });
  const open = (orders.data?.data ?? []).filter((o) => OPEN_ORDER.has(o.status));
  const counts: Record<string, { value: number; alert?: boolean } | undefined> = {
    '/app/quotes': drafts.data?.meta?.total ? { value: drafts.data.meta.total } : undefined,
    '/app/orders': open.length ? { value: open.length } : undefined,
    '/app/production/queue': open.length
      ? (() => {
          const failed = open.filter((o) => o.production_status === 'failed').length;
          return failed ? { value: failed, alert: true } : { value: open.length };
        })()
      : undefined,
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 pb-3 pt-4">
        <BrandName className="text-white dark:text-sidebar-foreground" />
        {tenant?.name && (
          <p className="mt-3 truncate rounded-sm bg-sidebar-raised px-2.5 py-2 text-[13px] font-semibold">
            {tenant.name}
          </p>
        )}
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-1" aria-label="Main">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 pb-1 text-xs font-semibold text-sidebar-muted">{section.label}</p>
            <div className="space-y-px">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-sm transition-colors duration-150 focus-visible:ring-offset-sidebar',
                      isActive
                        ? // The current page is the card pulled from the rack: paper body, yellow head.
                          'bg-sidebar-active font-semibold text-sidebar-active-foreground shadow-[inset_0_3px_0_hsl(var(--stock-quoted))]'
                        : 'font-medium text-sidebar-foreground hover:bg-sidebar-raised',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-sidebar-active-foreground' : 'text-sidebar-muted',
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex-1">{item.label}</span>
                      {counts[item.to] && (
                        <span
                          className={cn(
                            'tabular rounded-sm px-1.5 text-xs',
                            counts[item.to]?.alert
                              ? 'bg-stock-failed font-bold text-white'
                              : isActive
                                ? 'font-medium text-muted-foreground'
                                : 'font-medium text-sidebar-muted',
                          )}
                          aria-label={
                            counts[item.to]?.alert
                              ? `${counts[item.to]?.value} failed`
                              : `${counts[item.to]?.value} open`
                          }
                        >
                          {counts[item.to]?.value}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
