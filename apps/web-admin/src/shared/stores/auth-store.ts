import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiClient } from '../api/api-client';
import { STORAGE_KEYS } from '../lib/constants';
import type { AuthState, User, Tenant, Tokens } from '../types/auth-types';

interface AuthStore extends AuthState {
  setAuth: (data: {
    user: User;
    tenant: Tenant;
    roles: string[];
    permissions: string[];
    membershipId: string | null;
    defaultShopId: string | null;
  }) => void;
  setTokens: (tokens: Tokens) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      roles: [],
      permissions: [],
      membershipId: null,
      defaultShopId: null,
      isAuthenticated: false,

      setAuth: (data) =>
        set({
          user: data.user,
          tenant: data.tenant,
          roles: data.roles,
          permissions: data.permissions,
          membershipId: data.membershipId,
          defaultShopId: data.defaultShopId,
          isAuthenticated: true,
        }),

      setTokens: (tokens) => {
        apiClient.setAccessToken(tokens.access_token);
        apiClient.setRefreshToken(tokens.refresh_token);
      },

      clearAuth: () =>
        set({
          user: null,
          tenant: null,
          roles: [],
          permissions: [],
          membershipId: null,
          defaultShopId: null,
          isAuthenticated: false,
        }),

      logout: async () => {
        try {
          const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
          if (refreshToken) {
            await apiClient.instance.post('/auth/logout', { refreshToken });
          }
        } catch {
          // Ignore logout errors
        } finally {
          apiClient.clearTokens();
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          set({
            user: null,
            tenant: null,
            roles: [],
            permissions: [],
            membershipId: null,
            defaultShopId: null,
            isAuthenticated: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        roles: state.roles,
        permissions: state.permissions,
        membershipId: state.membershipId,
        defaultShopId: state.defaultShopId,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
