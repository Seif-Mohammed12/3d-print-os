import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authApi } from '../api/auth-api';
import { useAuthStore } from '../../../shared/stores/auth-store';
import type { LoginCredentials, RegisterData } from '../model/auth-types';

export function useLogin() {
  const queryClient = useQueryClient();
  const { setAuth, setTokens } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
  });

  useEffect(() => {
    if (mutation.data) {
      setTokens(mutation.data.tokens);
      setAuth({
        user: mutation.data.user,
        tenant: mutation.data.tenant,
        roles: mutation.data.roles,
        permissions: mutation.data.permissions,
        membershipId: null,
        defaultShopId: null,
      });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    }
  }, [mutation.data, setAuth, setTokens, queryClient]);

  return mutation;
}

export function useRegister() {
  const queryClient = useQueryClient();
  const { setAuth, setTokens } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
  });

  useEffect(() => {
    if (mutation.data) {
      setTokens(mutation.data.tokens);
      setAuth({
        user: mutation.data.user,
        tenant: mutation.data.tenant,
        roles: mutation.data.roles,
        permissions: mutation.data.permissions,
        membershipId: null,
        defaultShopId: null,
      });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    }
  }, [mutation.data, setAuth, setTokens, queryClient]);

  return mutation;
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  const mutation = useMutation({
    mutationFn: () => logout(),
  });

  useEffect(() => {
    if (mutation.isSuccess) {
      queryClient.clear();
    }
  }, [mutation.isSuccess, queryClient]);

  return mutation;
}

export function useMe() {
  const { setAuth } = useAuthStore();

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    enabled: false, // Only run when explicitly called
  });

  useEffect(() => {
    if (query.data) {
      setAuth({
        user: query.data.user,
        tenant: query.data.tenant,
        roles: query.data.roles,
        permissions: query.data.permissions,
        membershipId: null,
        defaultShopId: null,
      });
    }
  }, [query.data, setAuth]);

  return query;
}
