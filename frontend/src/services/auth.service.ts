import api, { apiClient } from '@/lib/api';
import { AuthTokens, LoginCredentials, RegisterCredentials, User } from '@/types/auth.types';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await api.post('/auth/login', credentials);
    const { user, accessToken, refreshToken, expiresIn } = response.data;

    apiClient.setTokens(accessToken, refreshToken);

    return {
      user,
      tokens: { accessToken, refreshToken, expiresIn },
    };
  }

  async register(credentials: RegisterCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const { confirmPassword, ...registerData } = credentials;
    const response = await api.post('/auth/register', registerData);
    const { user, accessToken, refreshToken, expiresIn } = response.data;

    apiClient.setTokens(accessToken, refreshToken);

    return {
      user,
      tokens: { accessToken, refreshToken, expiresIn },
    };
  }

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = apiClient.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh', { refreshToken });
    const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;

    apiClient.setTokens(accessToken, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken, expiresIn };
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.clearTokens();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = apiClient.getAccessToken();
      if (!token) return null;

      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!apiClient.getAccessToken();
  }
}

export const authService = new AuthService();
