import express from 'express';
import { protect, authorize } from '../middleware/auth';
import AnalyticsService from '../utils/analyticsService';

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    const analyticsService = (req.app as any).analyticsService as AnalyticsService;
    const stats = await analyticsService.getDashboardStats();
    
    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

// Get test analytics
router.get('/tests/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const analyticsService = (req.app as any).analyticsService as AnalyticsService;
    const analytics = await analyticsService.getTestAnalytics(req.params.id);
    
    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Test not found',
      });
    }
    
    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch test analytics',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

// Get student performance
router.get('/students/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const analyticsService = (req.app as any).analyticsService as AnalyticsService;
    const performance = await analyticsService.getStudentPerformance(req.params.id);
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }
    
    return res.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student performance',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

// Get module analytics
router.get('/modules/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const analyticsService = (req.app as any).analyticsService as AnalyticsService;
    const analytics = await analyticsService.getModuleAnalytics(req.params.id);
    
    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Module not found',
      });
    }
    
    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch module analytics',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

// Get performance trends
router.get('/trends', protect, authorize('admin'), async (req, res) => {
  try {
    const period = req.query.period as 'week' | 'month' | 'quarter' || 'month';
    const analyticsService = (req.app as any).analyticsService as AnalyticsService;
    const trends = await analyticsService.getPerformanceTrends(period);
    
    return res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch performance trends',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

// Export analytics data
router.get('/export/:type', protect, authorize('admin'), async (req, res) => {
  try {
    const type = req.params.type as 'users' | 'tests' | 'modules' | 'performance';
    const analyticsService = (req.app as any).analyticsService as AnalyticsService;
    const data = await analyticsService.exportAnalyticsData(type);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-analytics-${new Date().toISOString().split('T')[0]}.json"`);
    
    return res.json({
      success: true,
      data,
      exportDate: new Date().toISOString(),
      type,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to export analytics data',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

// Get real-time active sessions
router.get('/active-sessions', protect, authorize('admin'), async (req, res) => {
  try {
    const webSocketService = (req.app as any).webSocket;
    const activeSessions = webSocketService.getActiveTestSessions();
    
    return res.json({
      success: true,
      data: {
        activeSessions,
        totalActive: activeSessions.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active sessions',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

// Send broadcast notification to all students
router.post('/broadcast', protect, authorize('admin'), async (req, res) => {
  try {
    const { message, type = 'info' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }
    
    const webSocketService = (req.app as any).webSocket;
    webSocketService.notifyRole('student', 'admin:notification', {
      message,
      type,
      timestamp: new Date().toISOString(),
      from: 'admin',
    });
    
    return res.json({
      success: true,
      message: 'Broadcast sent successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send broadcast',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

export default router;
