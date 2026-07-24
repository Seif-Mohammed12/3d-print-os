import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../stores/auth-store';

export function useBusinessGuard() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const roles = useAuthStore((state) => state.roles);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const businessRoles = ['owner', 'admin', 'employee'];
    const hasBusinessRole = roles.some(role => businessRoles.includes(role));

    if (!hasBusinessRole) {
      navigate('/portal/upload', { replace: true });
    }
  }, [isAuthenticated, roles, navigate]);

  return isAuthenticated;
}

export function useCustomerGuard() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const roles = useAuthStore((state) => state.roles);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/portal/login', { replace: true });
      return;
    }

    const hasCustomerRole = roles.includes('customer');

    if (!hasCustomerRole) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, roles, navigate]);

  return isAuthenticated;
}
