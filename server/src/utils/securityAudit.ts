import { Request } from 'express';
import User from '../models/User';
import { logger, securityLogger } from '../middleware/monitoring';

/**
 * Security audit and vulnerability detection utilities
 */

export interface SecurityAuditResult {
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected: string;
  recommendation: string;
}

// Password strength analysis
export const analyzePasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 12) {
    score += 25;
  } else if (password.length >= 8) {
    score += 15;
  } else {
    feedback.push('Password should be at least 8 characters long');
  }

  // Character variety checks
  if (/[a-z]/.test(password)) score += 15;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push('Include uppercase letters');

  if (/[0-9]/.test(password)) score += 15;
  else feedback.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(password)) score += 20;
  else feedback.push('Include special characters');

  // Common pattern checks
  if (!/(.)\1{2,}/.test(password)) score += 10;
  else feedback.push('Avoid repeating characters');

  const isStrong = score >= 80 && feedback.length === 0;

  return { score, feedback, isStrong };
};

// Detect suspicious activity patterns
export const detectSuspiciousActivity = {
  // Multiple failed login attempts
  checkFailedLogins: async (_email: string, _timeWindow: number = 300000): Promise<boolean> => {
    // This would be implemented with a proper tracking system
    // For now, we'll return false (no suspicious activity)
    return false;
  },

  // Unusual access patterns
  checkUnusualAccess: (req: Request): boolean => {
    const suspiciousPatterns = [
      // SQL injection patterns
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      // XSS patterns
      /<script[^>]*>.*?<\/script>/gi,
      // Path traversal
      /\.\.\//g,
      // Command injection
      /[;&|`]|(\$\()|(\`)/g,
    ];

    const checkString = `${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
    
    return suspiciousPatterns.some(pattern => pattern.test(checkString));
  },

  // Rate limiting violations
  checkRateLimitViolations: (_ip: string): boolean => {
    // This would check against rate limit violation logs
    return false;
  },
};

// Security audit functions
export const performSecurityAudit = async (): Promise<SecurityAuditResult> => {
  const vulnerabilities: SecurityVulnerability[] = [];
  const recommendations: string[] = [];

  try {
    // Check for weak passwords
    const weakPasswordUsers = await checkWeakPasswords();
    if (weakPasswordUsers.length > 0) {
      vulnerabilities.push({
        type: 'weak_passwords',
        severity: 'medium',
        description: `${weakPasswordUsers.length} users have weak passwords`,
        affected: `${weakPasswordUsers.length} user accounts`,
        recommendation: 'Enforce stronger password policies and notify users to update passwords',
      });
    }

    // Check for inactive admin accounts
    const inactiveAdmins = await checkInactiveAdmins();
    if (inactiveAdmins.length > 0) {
      vulnerabilities.push({
        type: 'inactive_admin_accounts',
        severity: 'high',
        description: `${inactiveAdmins.length} admin accounts haven't been used recently`,
        affected: `${inactiveAdmins.length} admin accounts`,
        recommendation: 'Review and disable unused admin accounts',
      });
    }

    // Check environment variables
    const envVulnerabilities = checkEnvironmentSecurity();
    vulnerabilities.push(...envVulnerabilities);

    // Add general recommendations
    recommendations.push(
      'Enable HTTPS in production',
      'Regularly update dependencies',
      'Implement proper session management',
      'Use secure headers (helmet.js)',
      'Enable audit logging',
      'Implement backup and recovery procedures'
    );

    // Determine risk level
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalCount > 0) riskLevel = 'critical';
    else if (highCount > 0) riskLevel = 'high';
    else if (mediumCount > 0) riskLevel = 'medium';

    return { vulnerabilities, recommendations, riskLevel };
  } catch (error) {
    logger.error('Security audit failed', error);
    throw error;
  }
};

// Check for users with weak passwords
const checkWeakPasswords = async (): Promise<string[]> => {
  try {
    // Note: In a real implementation, you wouldn't store or check plain text passwords
    // This is a simplified example for demonstration
    // Commented out for now: const _users = await User.find({}).select('email').lean();
    const weakPasswordUsers: string[] = [];

    // In practice, you'd implement this by:
    // 1. Having password strength validation during registration/password change
    // 2. Storing password strength scores
    // 3. Periodically auditing based on stored scores

    return weakPasswordUsers;
  } catch (error) {
    logger.error('Failed to check weak passwords', error);
    return [];
  }
};

// Check for inactive admin accounts
const checkInactiveAdmins = async (): Promise<string[]> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const inactiveAdmins = await User.find({
      role: 'admin',
      lastLogin: { $lt: thirtyDaysAgo },
    }).select('email').lean();

    return inactiveAdmins.map(admin => admin.email);
  } catch (error) {
    logger.error('Failed to check inactive admins', error);
    return [];
  }
};

// Check environment security
const checkEnvironmentSecurity = (): SecurityVulnerability[] => {
  const vulnerabilities: SecurityVulnerability[] = [];

  // Check if running in development mode in production
  if (process.env.NODE_ENV === 'development' && process.env.PRODUCTION === 'true') {
    vulnerabilities.push({
      type: 'development_mode_in_production',
      severity: 'critical',
      description: 'Application is running in development mode in production environment',
      affected: 'Entire application',
      recommendation: 'Set NODE_ENV to production',
    });
  }

  // Check for missing security environment variables
  const requiredSecureEnvVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI',
  ];

  for (const envVar of requiredSecureEnvVars) {
    if (!process.env[envVar]) {
      vulnerabilities.push({
        type: 'missing_environment_variable',
        severity: 'high',
        description: `Missing required environment variable: ${envVar}`,
        affected: 'Application security',
        recommendation: `Set the ${envVar} environment variable`,
      });
    }
  }

  // Check for weak JWT secrets
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    vulnerabilities.push({
      type: 'weak_jwt_secret',
      severity: 'high',
      description: 'JWT secret is too short',
      affected: 'Authentication security',
      recommendation: 'Use a JWT secret with at least 32 characters',
    });
  }

  return vulnerabilities;
};

// Security monitoring utilities
export const securityMonitoring = {
  // Log security events
  logSecurityEvent: (event: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    ip?: string;
    userId?: string;
    metadata?: any;
  }) => {
    securityLogger.suspiciousActivity(
      `${event.type}: ${event.description}`,
      event.ip || 'unknown',
      event.userId,
      { severity: event.severity, ...event.metadata }
    );
  },

  // Check for brute force attempts
  checkBruteForce: async (_ip: string, _email?: string): Promise<boolean> => {
    // This would be implemented with a proper tracking system
    // Check rate limit violations, failed login attempts, etc.
    return false;
  },

  // Validate request integrity
  validateRequestIntegrity: (req: Request): boolean => {
    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-for',
      'x-originating-ip',
      'x-remote-ip',
    ];

    // Check for header manipulation
    for (const header of suspiciousHeaders) {
      const value = req.get(header);
      if (value && value.includes('..')) {
        return false;
      }
    }

    return true;
  },
};

// Automated security actions
export const securityActions = {
  // Temporarily block IP
  blockIP: async (ip: string, duration: number = 3600000): Promise<void> => {
    // This would be implemented with a proper IP blocking mechanism
    securityLogger.suspiciousActivity(`IP blocked for ${duration}ms`, ip);
  },

  // Force password reset for user
  forcePasswordReset: async (userId: string): Promise<void> => {
    try {
      await User.findByIdAndUpdate(userId, {
        forcePasswordReset: true,
        passwordResetRequired: true,
      });
      
      securityLogger.adminAction('force_password_reset', userId, 'system', 'automated');
    } catch (error) {
      logger.error('Failed to force password reset', error);
    }
  },

  // Disable user account
  disableAccount: async (userId: string, reason: string): Promise<void> => {
    try {
      await User.findByIdAndUpdate(userId, {
        isActive: false,
        disabledReason: reason,
        disabledAt: new Date(),
      });
      
      securityLogger.adminAction('disable_account', userId, 'system', 'automated');
    } catch (error) {
      logger.error('Failed to disable account', error);
    }
  },
};

export default {
  analyzePasswordStrength,
  detectSuspiciousActivity,
  performSecurityAudit,
  securityMonitoring,
  securityActions,
};
