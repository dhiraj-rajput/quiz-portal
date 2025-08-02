import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Enhanced logging interface
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  method?: string;
  url?: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
  statusCode?: number;
  responseTime?: number;
  error?: any;
  stack?: string;
}

class Logger {
  private logFile: string;
  private errorLogFile: string;

  constructor() {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.logFile = path.join(logsDir, 'app.log');
    this.errorLogFile = path.join(logsDir, 'error.log');
  }

  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    }) + '\n';
  }

  private writeToFile(filename: string, content: string): void {
    try {
      fs.appendFileSync(filename, content);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message: string, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...meta,
    };

    console.log(`[INFO] ${message}`, meta || '');
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(this.logFile, this.formatLogEntry(entry));
    }
  }

  warn(message: string, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...meta,
    };

    console.warn(`[WARN] ${message}`, meta || '');
    this.writeToFile(this.logFile, this.formatLogEntry(entry));
  }

  error(message: string, error?: any, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error?.message || error,
      stack: error?.stack,
      ...meta,
    };

    console.error(`[ERROR] ${message}`, error || '', meta || '');
    this.writeToFile(this.errorLogFile, this.formatLogEntry(entry));
  }

  debug(message: string, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      ...meta,
    };

    if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG_LOGS === 'true') {
      console.debug(`[DEBUG] ${message}`, meta || '');
      this.writeToFile(this.logFile, this.formatLogEntry(entry));
    }
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response
  res.send = function(body: any) {
    const responseTime = Date.now() - startTime;
    
    // Log request details
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id || 'anonymous',
      statusCode: res.statusCode,
      responseTime,
    });

    // Log slow requests (> 2 seconds)
    if (responseTime > 2000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        responseTime,
        userId: (req as any).user?.id || 'anonymous',
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

// Error logging middleware
export const errorLogger = (error: any, req: Request, _res: Response, next: NextFunction): void => {
  logger.error('Unhandled error', error, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id || 'anonymous',
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
  });

  next(error);
};

// Security event logging
export const securityLogger = {
  loginAttempt: (email: string, success: boolean, ip: string, userAgent?: string) => {
    logger.info('Login attempt', {
      email,
      success,
      ip,
      userAgent,
      event: 'login_attempt',
    });
  },

  loginFailure: (email: string, reason: string, ip: string, userAgent?: string) => {
    logger.warn('Login failure', {
      email,
      reason,
      ip,
      userAgent,
      event: 'login_failure',
    });
  },

  suspiciousActivity: (description: string, ip: string, userId?: string, meta?: any) => {
    logger.warn('Suspicious activity detected', {
      description,
      ip,
      userId: userId || 'anonymous',
      event: 'suspicious_activity',
      ...meta,
    });
  },

  rateLimitExceeded: (ip: string, endpoint: string, userAgent?: string) => {
    logger.warn('Rate limit exceeded', {
      ip,
      endpoint,
      userAgent,
      event: 'rate_limit_exceeded',
    });
  },

  unauthorizedAccess: (endpoint: string, ip: string, userId?: string) => {
    logger.warn('Unauthorized access attempt', {
      endpoint,
      ip,
      userId: userId || 'anonymous',
      event: 'unauthorized_access',
    });
  },

  dataExport: (type: string, userId: string, ip: string) => {
    logger.info('Data export', {
      type,
      userId,
      ip,
      event: 'data_export',
    });
  },

  adminAction: (action: string, targetUserId: string, adminId: string, ip: string) => {
    logger.info('Admin action', {
      action,
      targetUserId,
      adminId,
      ip,
      event: 'admin_action',
    });
  },
};

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, { count: number; totalTime: number; errors: number }>;

  private constructor() {
    this.metrics = new Map();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordRequest(endpoint: string, responseTime: number, isError: boolean = false): void {
    const key = `${endpoint}`;
    const existing = this.metrics.get(key) || { count: 0, totalTime: 0, errors: 0 };
    
    this.metrics.set(key, {
      count: existing.count + 1,
      totalTime: existing.totalTime + responseTime,
      errors: existing.errors + (isError ? 1 : 0),
    });
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [endpoint, data] of this.metrics.entries()) {
      result[endpoint] = {
        requests: data.count,
        averageResponseTime: Math.round(data.totalTime / data.count),
        errorRate: ((data.errors / data.count) * 100).toFixed(2) + '%',
        errors: data.errors,
      };
    }
    
    return result;
  }

  reset(): void {
    this.metrics.clear();
  }
}

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const monitor = PerformanceMonitor.getInstance();
  const originalSend = res.send;

  res.send = function(body: any) {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    monitor.recordRequest(req.route?.path || req.path, responseTime, isError);
    
    return originalSend.call(this, body);
  };

  next();
};

// Database query monitoring
export const queryMonitor = {
  logSlowQuery: (query: string, duration: number, collection?: string) => {
    if (duration > 1000) { // Log queries taking more than 1 second
      logger.warn('Slow database query', {
        query,
        duration,
        collection,
        event: 'slow_query',
      });
    }
  },

  logQueryError: (query: string, error: any, collection?: string) => {
    logger.error('Database query error', error, {
      query,
      collection,
      event: 'query_error',
    });
  },
};

// Health check monitoring
export const healthCheck = {
  checkDatabase: async (): Promise<boolean> => {
    try {
      // Import here to avoid circular dependency
      const { monitorDatabaseHealth } = await import('../utils/databaseOptimization');
      return await monitorDatabaseHealth();
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  },

  checkExternalServices: async (): Promise<Record<string, boolean>> => {
    const services: Record<string, boolean> = {};
    
    try {
      // Check email service
      services.email = true; // Mock for now
      
      // Check file storage
      services.fileStorage = fs.existsSync('./uploads');
      
      return services;
    } catch (error) {
      logger.error('External services health check failed', error);
      return { email: false, fileStorage: false };
    }
  },

  getSystemMetrics: () => {
    const used = process.memoryUsage();
    return {
      memory: {
        rss: Math.round(used.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(used.external / 1024 / 1024) + ' MB',
      },
      uptime: Math.round(process.uptime()) + ' seconds',
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : 'N/A (Windows)',
      nodeVersion: process.version,
    };
  },
};

export default {
  logger,
  requestLogger,
  errorLogger,
  securityLogger,
  performanceMonitor,
  PerformanceMonitor,
  queryMonitor,
  healthCheck,
};
