import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { QueryProvider } from '../shared/components/query-provider';
import { ThemeProvider } from '../shared/components/theme-provider';
import { ToastProvider } from '../shared/components/feedback/toast-provider';
import { ErrorBoundary } from '../shared/components/error-boundary';
import { AppLayout } from '../shared/components/layout/app-layout';
import { LoginPage } from './auth/login-page';
import { RegisterPage } from './auth/register-page';
import { ModelAnalysisPage } from './intelligence/model-analysis-page';
import { PrintabilityPage } from './intelligence/printability-page';
import { QuoteGeneratorPage } from './intelligence/quote-generator-page';
import { RecommendationsPage } from './intelligence/recommendations-page';
import { PrintQueuePage } from './production/queue-page';
import { PrinterFleetPage } from './production/fleet-page';
import { MaterialInventoryPage } from './production/materials-page';
import { JobHistoryPage } from './production/history-page';
import { QuotesPage } from './business/quotes-page';
import { OrdersPage } from './dashboard/orders-page';
import { CustomersPage } from './dashboard/customers-page';
import { RevenuePage } from './business/revenue-page';
import { ConfigPrintersPage } from './config/printers-page';
import { ConfigMaterialsPage } from './config/materials-page';
import { ConfigPricingPage } from './config/pricing-page';
import { ConfigSettingsPage } from './config/settings-page';
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
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/intelligence/model-analysis" replace />} />
                  <Route path="intelligence/model-analysis" element={<ModelAnalysisPage />} />
                  <Route path="intelligence/printability" element={<PrintabilityPage />} />
                  <Route path="intelligence/quote-generator" element={<QuoteGeneratorPage />} />
                  <Route path="intelligence/recommendations" element={<RecommendationsPage />} />
                  <Route path="production/queue" element={<PrintQueuePage />} />
                  <Route path="production/fleet" element={<PrinterFleetPage />} />
                  <Route path="production/materials" element={<MaterialInventoryPage />} />
                  <Route path="production/history" element={<JobHistoryPage />} />
                  <Route path="business/quotes" element={<QuotesPage />} />
                  <Route path="business/orders" element={<OrdersPage />} />
                  <Route path="business/customers" element={<CustomersPage />} />
                  <Route path="business/revenue" element={<RevenuePage />} />
                  <Route path="config/printers" element={<ConfigPrintersPage />} />
                  <Route path="config/materials" element={<ConfigMaterialsPage />} />
                  <Route path="config/pricing" element={<ConfigPricingPage />} />
                  <Route path="config/settings" element={<ConfigSettingsPage />} />
                </Route>
              </Routes>
            </ToastProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
