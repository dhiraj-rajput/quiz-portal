import express from 'express';
import { protect, restrictTo } from '../middleware/auth';
import { PerformanceMonitor, healthCheck, logger } from '../middleware/monitoring';
import { performSecurityAudit } from '../utils/securityAudit';

const router = express.Router();

// Health check endpoint - public for load balancers
router.get('/health', async (_req, res) => {
  try {
    const dbHealth = await healthCheck.checkDatabase();
    const servicesHealth = await healthCheck.checkExternalServices();
    
    const isHealthy = dbHealth && Object.values(servicesHealth).every(Boolean);
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      services: servicesHealth,
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// System metrics endpoint - admin only
router.get('/metrics', protect, restrictTo('super_admin', 'sub_admin'), (_req, res) => {
  try {
    const performanceMetrics = PerformanceMonitor.getInstance().getMetrics();
    const systemMetrics = healthCheck.getSystemMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      performance: performanceMetrics,
      system: systemMetrics,
    });
  } catch (error) {
    logger.error('Failed to get metrics', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
    });
  }
});

// Reset metrics endpoint - admin only
router.post('/metrics/reset', protect, restrictTo('super_admin', 'sub_admin'), (req, res) => {
  try {
    PerformanceMonitor.getInstance().reset();
    logger.info('Performance metrics reset', {
      adminId: (req as any).user.id,
      ip: req.ip,
    });
    
    res.json({
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to reset metrics', error);
    res.status(500).json({
      error: 'Failed to reset metrics',
    });
  }
});

// Detailed health check - admin only
router.get('/health/detailed', protect, restrictTo('super_admin', 'sub_admin'), async (_req, res) => {
  try {
    const dbHealth = await healthCheck.checkDatabase();
    const servicesHealth = await healthCheck.checkExternalServices();
    const systemMetrics = healthCheck.getSystemMetrics();
    const performanceMetrics = PerformanceMonitor.getInstance().getMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      database: dbHealth,
      services: servicesHealth,
      system: systemMetrics,
      performance: performanceMetrics,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || 'unknown',
    });
  } catch (error) {
    logger.error('Detailed health check failed', error);
    res.status(500).json({
      error: 'Detailed health check failed',
    });
  }
});

// Security audit endpoint - admin only
router.get('/security/audit', protect, restrictTo('super_admin', 'sub_admin'), async (req, res) => {
  try {
    const auditResult = await performSecurityAudit();
    
    logger.info('Security audit performed', {
      adminId: (req as any).user.id,
      ip: req.ip,
      vulnerabilities: auditResult.vulnerabilities.length,
      riskLevel: auditResult.riskLevel,
    });
    
    res.json({
      timestamp: new Date().toISOString(),
      audit: auditResult,
    });
  } catch (error) {
    logger.error('Security audit failed', error);
    res.status(500).json({
      error: 'Security audit failed',
    });
  }
});

export default router;
