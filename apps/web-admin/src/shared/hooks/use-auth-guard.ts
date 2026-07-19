import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../stores/auth-store';

export function useAuthGuard() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return isAuthenticated;
}
