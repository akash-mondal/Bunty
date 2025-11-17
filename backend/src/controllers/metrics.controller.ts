import { Request, Response } from 'express';
import metricsService from '../services/metrics.service';
import alertingService from '../services/alerting.service';
import logger from '../utils/logger';

export class MetricsController {
  /**
   * Get all metrics
   * GET /api/metrics
   */
  async getAllMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsService.getAllMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get metrics', { error });
      res.status(500).json({
        error: 'Failed to retrieve metrics',
      });
    }
  }

  /**
   * Get proof metrics
   * GET /api/metrics/proofs
   */
  async getProofMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsService.getProofMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get proof metrics', { error });
      res.status(500).json({
        error: 'Failed to retrieve proof metrics',
      });
    }
  }

  /**
   * Get API metrics
   * GET /api/metrics/api
   */
  async getAPIMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsService.getAPIMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get API metrics', { error });
      res.status(500).json({
        error: 'Failed to retrieve API metrics',
      });
    }
  }

  /**
   * Get external service metrics
   * GET /api/metrics/services
   */
  async getServiceMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsService.getExternalServiceMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get service metrics', { error });
      res.status(500).json({
        error: 'Failed to retrieve service metrics',
      });
    }
  }

  /**
   * Reset metrics (admin only)
   * POST /api/metrics/reset
   */
  async resetMetrics(_req: Request, res: Response): Promise<void> {
    try {
      await metricsService.resetMetrics();
      res.json({
        message: 'Metrics reset successfully',
      });
    } catch (error) {
      logger.error('Failed to reset metrics', { error });
      res.status(500).json({
        error: 'Failed to reset metrics',
      });
    }
  }

  /**
   * Get alert statistics
   * GET /api/metrics/alerts
   */
  async getAlertStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = alertingService.getAlertStats();
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get alert stats', { error });
      res.status(500).json({
        error: 'Failed to retrieve alert statistics',
      });
    }
  }

  /**
   * Test alert (admin only)
   * POST /api/metrics/alerts/test
   */
  async testAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertType } = req.body;
      
      if (!alertType) {
        res.status(400).json({
          error: 'alertType is required',
        });
        return;
      }

      await alertingService.testAlert(alertType);
      res.json({
        message: `Test alert triggered for ${alertType}`,
      });
    } catch (error) {
      logger.error('Failed to test alert', { error });
      res.status(500).json({
        error: 'Failed to trigger test alert',
      });
    }
  }
}
