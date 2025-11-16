import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();
const authController = new AuthController();

// Public routes with rate limiting
router.post('/register', authRateLimiter, (req, res) => authController.register(req, res));
router.post('/login', authRateLimiter, (req, res) => authController.login(req, res));
router.post('/refresh', authRateLimiter, (req, res) => authController.refresh(req, res));

// Protected routes
router.post('/logout', authenticateToken, (req, res) => authController.logout(req, res));
router.get('/me', authenticateToken, (req, res) => authController.me(req, res));

export default router;
