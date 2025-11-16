import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterRequest, LoginRequest, RefreshTokenRequest } from '../types/auth.types';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: RegisterRequest = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_001',
            message: 'Email and password are required',
            timestamp: Date.now()
          }
        });
        return;
      }

      const result = await authService.register(email, password);

      res.status(201).json({
        user: result.user,
        tokens: result.tokens
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      
      res.status(400).json({
        error: {
          code: 'AUTH_003',
          message: errorMessage,
          timestamp: Date.now()
        }
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_001',
            message: 'Email and password are required',
            timestamp: Date.now()
          }
        });
        return;
      }

      const result = await authService.login(email, password);

      res.status(200).json({
        user: result.user,
        tokens: result.tokens
      });
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      res.status(401).json({
        error: {
          code: 'AUTH_004',
          message: errorMessage,
          timestamp: Date.now()
        }
      });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_001',
            message: 'Refresh token is required',
            timestamp: Date.now()
          }
        });
        return;
      }

      const tokens = await authService.refreshToken(refreshToken);

      res.status(200).json({
        tokens
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      
      res.status(401).json({
        error: {
          code: 'AUTH_005',
          message: errorMessage,
          timestamp: Date.now()
        }
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now()
          }
        });
        return;
      }

      if (!refreshToken) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_001',
            message: 'Refresh token is required',
            timestamp: Date.now()
          }
        });
        return;
      }

      await authService.logout(userId, refreshToken);

      res.status(200).json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      res.status(500).json({
        error: {
          code: 'AUTH_006',
          message: 'Logout failed',
          timestamp: Date.now()
        }
      });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now()
          }
        });
        return;
      }

      const user = await authService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_001',
            message: 'User not found',
            timestamp: Date.now()
          }
        });
        return;
      }

      res.status(200).json({
        user
      });
    } catch (error) {
      console.error('Get user error:', error);
      
      res.status(500).json({
        error: {
          code: 'USER_002',
          message: 'Failed to retrieve user information',
          timestamp: Date.now()
        }
      });
    }
  }
}
