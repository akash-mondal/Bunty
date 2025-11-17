import { Router } from 'express';
import { MetricsController } from '../controllers/metrics.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const metricsController = new MetricsController();

// All metrics routes require authentication
router.use(authenticateToken);

// Get all metrics
router.get('/', metricsController.getAllMetrics.bind(metricsController));

// Get specific metric categories
router.get('/proofs', metricsController.getProofMetrics.bind(metricsController));
router.get('/api', metricsController.getAPIMetrics.bind(metricsController));
router.get('/services', metricsController.getServiceMetrics.bind(metricsController));
router.get('/persona', metricsController.getPersonaMetrics.bind(metricsController));

// Reset metrics (admin only - could add admin middleware here)
router.post('/reset', metricsController.resetMetrics.bind(metricsController));

// Alert endpoints
router.get('/alerts', metricsController.getAlertStats.bind(metricsController));
router.post('/alerts/test', metricsController.testAlert.bind(metricsController));

export default router;
