import { Link, useLocation } from 'react-router-dom';
import {
  Settings,
  Users,
  Package,
  Printer,
  DollarSign,
  BarChart3,
  Brain,
  Factory,
  Building2,
  Cog,
} from 'lucide-react';

import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Intelligence Hub',
    icon: Brain,
    items: [
      { label: 'Model Analysis', href: '/intelligence/model-analysis', icon: Brain },
      { label: 'Printability', href: '/intelligence/printability', icon: Brain },
      { label: 'Quote Generator', href: '/intelligence/quote-generator', icon: DollarSign },
      { label: 'AI Recommendations', href: '/intelligence/recommendations', icon: Brain },
    ],
  },
  {
    label: 'Production',
    icon: Factory,
    items: [
      { label: 'Print Queue', href: '/production/queue', icon: Package },
      { label: 'Printer Fleet', href: '/production/fleet', icon: Printer },
      { label: 'Material Inventory', href: '/production/materials', icon: Package },
      { label: 'Job History', href: '/production/history', icon: BarChart3 },
    ],
  },
  {
    label: 'Business',
    icon: Building2,
    items: [
      { label: 'Quotes', href: '/business/quotes', icon: DollarSign },
      { label: 'Orders', href: '/business/orders', icon: Package },
      { label: 'Customers', href: '/business/customers', icon: Users },
      { label: 'Revenue', href: '/business/revenue', icon: BarChart3 },
    ],
  },
  {
    label: 'Configuration',
    icon: Cog,
    items: [
      { label: 'Printers', href: '/config/printers', icon: Printer },
      { label: 'Materials', href: '/config/materials', icon: Package },
      { label: 'Pricing Rules', href: '/config/pricing', icon: DollarSign },
      { label: 'Settings', href: '/config/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r border-border bg-card">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-border px-6">
          <h1 className="text-xl font-bold text-foreground">3D Print OS</h1>
        </div>
        <nav className="flex-1 space-y-6 p-4 overflow-y-auto">
          {navSections.map((section) => {
            const SectionIcon = section.icon;

            return (
              <div key={section.label}>
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <SectionIcon className="h-4 w-4" />
                  {section.label}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive =
                      location.pathname === item.href ||
                      location.pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
