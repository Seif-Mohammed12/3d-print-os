import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authApi } from '../api/auth-api';
import { useAuthStore } from '../../../shared/stores/auth-store';
import type {
  AuthResponse,
  CustomerRegisterData,
  LoginCredentials,
  RegisterData,
} from '../model/auth-types';

/** Store tokens and the session as soon as the server returns them. */
function useApplySession() {
  const queryClient = useQueryClient();
  const { setAuth, setTokens } = useAuthStore();

  return (session: AuthResponse) => {
    setTokens(session.tokens);
    setAuth({
      user: session.user,
      tenant: session.tenant,
      roles: session.roles,
      permissions: session.permissions,
      membershipId: null,
      defaultShopId: null,
    });
    queryClient.clear();
  };
}

export function useLogin() {
  const applySession = useApplySession();
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: applySession,
  });
}

export function useRegister() {
  const applySession = useApplySession();
  return useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: applySession,
  });
}

export function useRegisterCustomer() {
  const applySession = useApplySession();
  return useMutation({
    mutationFn: (data: CustomerRegisterData) => authApi.registerCustomer(data),
    onSuccess: applySession,
  });
}
