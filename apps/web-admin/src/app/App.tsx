import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { QueryProvider } from '../shared/components/query-provider';
import { ThemeProvider } from '../shared/components/theme-provider';
import { AppLayout } from '../shared/components/layout/app-layout';
import { LoginPage } from './auth/login-page';
import { RegisterPage } from './auth/register-page';
import { DashboardPage } from './dashboard/dashboard-page';
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
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ThemeProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
