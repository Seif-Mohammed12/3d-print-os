import { apiClient } from '../../../shared/api/api-client';
import { handleApiError } from '../../../shared/api/api-error-handler';
import type { AuthResponse, LoginCredentials, RegisterData } from '../model/auth-types';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.instance.post<{ data: AuthResponse }>('/auth/login', credentials);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.instance.post<{ data: AuthResponse }>('/auth/register', data);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.instance.post('/auth/logout', { refreshToken });
    } catch (error) {
      handleApiError(error);
    }
  },

  async refresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const response = await apiClient.instance.post<{ data: { tokens: { access_token: string; refresh_token: string } } }>(
        '/auth/refresh',
        { refreshToken }
      );
      return response.data.data.tokens;
    } catch (error) {
      handleApiError(error);
    }
  },

  async me(): Promise<AuthResponse> {
    try {
      const response = await apiClient.instance.get<{ data: AuthResponse }>('/auth/me');
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};
