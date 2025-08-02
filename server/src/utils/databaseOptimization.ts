import mongoose from 'mongoose';
import User from '../models/User';
import MockTest from '../models/MockTest';
import TestResult from '../models/TestResult';
import Module from '../models/Module';
import ModuleAssignment from '../models/ModuleAssignment';
import TestAssignment from '../models/TestAssignment';
import PendingRequest from '../models/PendingRequest';
import { logger } from '../middleware/monitoring';

/**
 * Database optimization utilities for improved performance
 */

// Index creation for better query performance
export const createDatabaseIndexes = async (): Promise<void> => {
  try {
    logger.info('Creating database indexes...');

    // User indexes (email index is already created by schema unique: true)
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ isApproved: 1 });
    await User.collection.createIndex({ createdAt: 1 });

    // MockTest indexes
    await MockTest.collection.createIndex({ createdBy: 1 });
    await MockTest.collection.createIndex({ isActive: 1 });
    await MockTest.collection.createIndex({ subject: 1 });
    await MockTest.collection.createIndex({ difficulty: 1 });
    await MockTest.collection.createIndex({ createdAt: -1 });

    // TestResult indexes - use userId (not studentId)
    await TestResult.collection.createIndex({ userId: 1 });
    await TestResult.collection.createIndex({ testId: 1 });
    await TestResult.collection.createIndex({ userId: 1, testId: 1, attemptNumber: 1 }, { unique: true });
    await TestResult.collection.createIndex({ submittedAt: -1 });
    await TestResult.collection.createIndex({ score: -1 });

    // Module indexes
    await Module.collection.createIndex({ createdBy: 1 });
    await Module.collection.createIndex({ isActive: 1 });
    await Module.collection.createIndex({ subject: 1 });
    await Module.collection.createIndex({ createdAt: -1 });

    // ModuleAssignment indexes
    await ModuleAssignment.collection.createIndex({ moduleId: 1 });
    await ModuleAssignment.collection.createIndex({ assignedTo: 1 });
    await ModuleAssignment.collection.createIndex({ moduleId: 1, assignedTo: 1 });
    await ModuleAssignment.collection.createIndex({ assignedAt: -1 });
    await ModuleAssignment.collection.createIndex({ dueDate: 1 });

    // TestAssignment indexes
    await TestAssignment.collection.createIndex({ testId: 1 });
    await TestAssignment.collection.createIndex({ assignedTo: 1 });
    await TestAssignment.collection.createIndex({ testId: 1, assignedTo: 1 });
    await TestAssignment.collection.createIndex({ assignedAt: -1 });
    await TestAssignment.collection.createIndex({ dueDate: 1 });

    // PendingRequest indexes
    await PendingRequest.collection.createIndex({ userId: 1 });
    await PendingRequest.collection.createIndex({ status: 1 });
    await PendingRequest.collection.createIndex({ requestType: 1 });
    await PendingRequest.collection.createIndex({ createdAt: -1 });

    // Compound indexes for common query patterns
    await TestResult.collection.createIndex({ userId: 1, submittedAt: -1 });
    await MockTest.collection.createIndex({ isActive: 1, subject: 1 });
    await Module.collection.createIndex({ isActive: 1, subject: 1 });

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Failed to create database indexes', error);
    throw error;
  }
};

// Query optimization utilities
export const optimizedQueries = {
  // Get user with limited fields
  getUserBasic: (userId: string) => {
    return User.findById(userId)
      .select('firstName lastName email role isApproved')
      .lean();
  },

  // Get active tests with pagination
  getActiveTests: (page: number = 1, limit: number = 10, subject?: string) => {
    const query: any = { isActive: true };
    if (subject) query.subject = subject;

    return MockTest.find(query)
      .select('title subject difficulty duration totalMarks createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },

  // Get student test results with pagination
  getStudentResults: (userId: string, page: number = 1, limit: number = 10) => {
    return TestResult.find({ userId })
      .populate('testId', 'title subject difficulty totalMarks')
      .select('testId score percentage submittedAt timeTaken')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },

  // Get test results for analytics
  getTestAnalytics: (testId: string) => {
    return TestResult.aggregate([
      { $match: { testId: new mongoose.Types.ObjectId(testId) } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: '$score' },
          averagePercentage: { $avg: '$percentage' },
          averageTimeTaken: { $avg: '$timeTaken' },
          maxScore: { $max: '$score' },
          minScore: { $min: '$score' },
        },
      },
    ]);
  },

  // Get student performance analytics
  getStudentAnalytics: (userId: string) => {
    return TestResult.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'mocktests',
          localField: 'testId',
          foreignField: '_id',
          as: 'test',
        },
      },
      { $unwind: '$test' },
      {
        $group: {
          _id: '$test.subject',
          totalTests: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          totalPoints: { $sum: '$score' },
          bestScore: { $max: '$percentage' },
        },
      },
      { $sort: { averageScore: -1 } },
    ]);
  },

  // Get due assignments
  getDueAssignments: (userId: string, daysAhead: number = 7) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return Promise.all([
      TestAssignment.find({
        assignedTo: userId,
        dueDate: { $lte: futureDate, $gte: new Date() },
      })
        .populate('testId', 'title subject difficulty')
        .sort({ dueDate: 1 })
        .lean(),
      
      ModuleAssignment.find({
        assignedTo: userId,
        dueDate: { $lte: futureDate, $gte: new Date() },
      })
        .populate('moduleId', 'title subject')
        .sort({ dueDate: 1 })
        .lean(),
    ]);
  },

  // Get dashboard stats (optimized)
  getDashboardStats: async () => {
    const [
      totalUsers,
      totalStudents,
      totalTests,
      totalModules,
      recentResults,
      pendingRequests,
    ] = await Promise.all([
      User.countDocuments().lean(),
      User.countDocuments({ role: 'student', isApproved: true }).lean(),
      MockTest.countDocuments({ isActive: true }).lean(),
      Module.countDocuments({ isActive: true }).lean(),
      TestResult.countDocuments({
        submittedAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      }).lean(),
      PendingRequest.countDocuments({ status: 'pending' }).lean(),
    ]);

    return {
      totalUsers,
      totalStudents,
      totalTests,
      totalModules,
      recentResults,
      pendingRequests,
    };
  },
};

// Database connection monitoring
export const monitorDatabaseHealth = async (): Promise<boolean> => {
  try {
    const state = mongoose.connection.readyState;
    
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if (state !== 1) {
      logger.warn('Database connection issue', { state });
      return false;
    }

    // Test a simple query
    await User.findOne().lean().maxTimeMS(5000);
    return true;
  } catch (error) {
    logger.error('Database health check failed', error);
    return false;
  }
};

// Cleanup old data
export const cleanupOldData = async (): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    // Clean up old pending requests (older than 30 days)
    const deletedRequests = await PendingRequest.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      status: { $in: ['approved', 'rejected'] },
    });

    // Archive old test results (older than 1 year) - mark as archived instead of deleting
    const archivedResults = await TestResult.updateMany(
      { submittedAt: { $lt: oneYearAgo } },
      { $set: { archived: true } },
    );

    logger.info('Database cleanup completed', {
      deletedRequests: deletedRequests.deletedCount,
      archivedResults: archivedResults.modifiedCount,
    });
  } catch (error) {
    logger.error('Database cleanup failed', error);
    throw error;
  }
};

// Database optimization configuration
export const configureDatabaseOptimizations = (): void => {
  // Set mongoose options for better performance
  mongoose.set('bufferCommands', false);
  // Note: bufferMaxEntries is deprecated in newer mongoose versions

  // Connection event handlers
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', error);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    } catch (error) {
      logger.error('Error during MongoDB shutdown', error);
      process.exit(1);
    }
  });
};

export default {
  createDatabaseIndexes,
  optimizedQueries,
  monitorDatabaseHealth,
  cleanupOldData,
  configureDatabaseOptimizations,
};
