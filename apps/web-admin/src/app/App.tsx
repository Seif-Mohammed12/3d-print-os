import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { QueryProvider } from '../shared/components/query-provider';
import { ThemeProvider } from '../shared/components/theme-provider';
import { ToastProvider } from '../shared/components/feedback/toast-provider';
import { ErrorBoundary } from '../shared/components/error-boundary';
import { AppLayout } from '../shared/components/layout/app-layout';
import { LoginPage } from './auth/login-page';
import { RegisterPage } from './auth/register-page';
import { DashboardPage } from './dashboard/dashboard-page';
import { CustomersPage } from './dashboard/customers-page';
import { OrdersPage } from './dashboard/orders-page';
import { PricingPage } from './dashboard/pricing-page';
import { PrintersPage } from './dashboard/printers-page';
import { AnalyticsPage } from './dashboard/analytics-page';
import { SettingsPage } from './dashboard/settings-page';
import { useAuthGuard } from '../shared/hooks/use-auth-guard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  useAuthGuard();
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <ToastProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="printers" element={<PrintersPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </ToastProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
