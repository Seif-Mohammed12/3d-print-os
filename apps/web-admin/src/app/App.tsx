import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from '../shared/components/error-boundary';
import { ToastProvider } from '../shared/components/feedback/toast-provider';
import { AppLayout } from '../shared/components/layout/app-layout';
import { PortalLayout } from '../shared/components/layout/portal-layout';
import { QueryProvider } from '../shared/components/query-provider';
import { ThemeProvider } from '../shared/components/theme-provider';
import { homePathForRoles, STAFF_ROLES } from '../shared/lib/constants';
import { useAuthStore } from '../shared/stores/auth-store';
import { LoginPage } from './auth/login-page';
import { RegisterPage } from './auth/register-page';
import { CustomersPage } from './customers/customers-page';
import { DashboardPage } from './dashboard/dashboard-page';
import { MaterialsPage } from './materials/materials-page';
import { OrderDetailPage } from './orders/order-detail-page';
import { OrdersPage } from './orders/orders-page';
import { PortalOrdersPage } from './portal/portal-orders-page';
import { PortalQuotesPage } from './portal/portal-quotes-page';
import { PortalUploadPage } from './portal/portal-upload-page';
import { PrinterDetailPage } from './printers/printer-detail-page';
import { PrintersPage } from './printers/printers-page';
import { QueuePage } from './production/queue-page';
import { NewQuotePage } from './quotes/new-quote-page';
import { QuoteDetailPage } from './quotes/quote-detail-page';
import { QuotesPage } from './quotes/quotes-page';
import { ReportsPage } from './reports/reports-page';
import { PricingPage } from './settings/pricing-page';
import { ShopSettingsPage } from './settings/shop-settings-page';

function RequireRole({
  audience,
  children,
}: {
  audience: 'staff' | 'customer';
  children: ReactNode;
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const roles = useAuthStore((state) => state.roles);

  if (!isAuthenticated) {
    return <Navigate to={audience === 'staff' ? '/login' : '/portal/login'} replace />;
  }
  const isStaff = roles.some((role) => (STAFF_ROLES as readonly string[]).includes(role));
  if ((audience === 'staff') !== isStaff) {
    return <Navigate to={homePathForRoles(roles)} replace />;
  }
  return <>{children}</>;
}

function HomeRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const roles = useAuthStore((state) => state.roles);
  return <Navigate to={isAuthenticated ? homePathForRoles(roles) : '/login'} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <ToastProvider>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/login" element={<LoginPage audience="staff" />} />
                <Route path="/register" element={<RegisterPage audience="staff" />} />
                <Route path="/portal/login" element={<LoginPage audience="customer" />} />
                <Route path="/portal/register" element={<RegisterPage audience="customer" />} />

                <Route
                  path="/portal"
                  element={
                    <RequireRole audience="customer">
                      <PortalLayout />
                    </RequireRole>
                  }
                >
                  <Route index element={<Navigate to="/portal/upload" replace />} />
                  <Route path="upload" element={<PortalUploadPage />} />
                  <Route path="quotes" element={<PortalQuotesPage />} />
                  <Route path="orders" element={<PortalOrdersPage />} />
                </Route>

                <Route
                  path="/app"
                  element={
                    <RequireRole audience="staff">
                      <AppLayout />
                    </RequireRole>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="quotes" element={<QuotesPage />} />
                  <Route path="quotes/new" element={<NewQuotePage />} />
                  <Route path="quotes/:id" element={<QuoteDetailPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:id" element={<OrderDetailPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="production/queue" element={<QueuePage />} />
                  <Route path="printers" element={<PrintersPage />} />
                  <Route path="printers/:id" element={<PrinterDetailPage />} />
                  <Route path="materials" element={<MaterialsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="settings/pricing" element={<PricingPage />} />
                  <Route path="settings/shop" element={<ShopSettingsPage />} />
                  <Route path="*" element={<Navigate to="/app" replace />} />
                </Route>

                <Route path="*" element={<HomeRedirect />} />
              </Routes>
            </ToastProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
