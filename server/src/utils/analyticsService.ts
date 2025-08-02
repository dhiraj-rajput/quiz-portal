import User from '../models/User';
import MockTest from '../models/MockTest';
import TestResult from '../models/TestResult';
import Module from '../models/Module';
import TestAssignment from '../models/TestAssignment';
import ModuleAssignment from '../models/ModuleAssignment';
import { Types } from 'mongoose';

interface DashboardStats {
  users: {
    total: number;
    students: number;
    admins: number;
    activeToday: number;
    newThisWeek: number;
  };
  tests: {
    total: number;
    active: number;
    completed: number;
    averageScore: number;
    totalAttempts: number;
  };
  modules: {
    total: number;
    active: number;
    totalAssignments: number;
    completionRate: number;
  };
  performance: {
    topPerformers: Array<{
      userId: string;
      name: string;
      averageScore: number;
      testsCompleted: number;
    }>;
    recentActivity: Array<{
      type: 'test_completed' | 'module_assigned' | 'user_registered';
      description: string;
      timestamp: Date;
      userId?: string;
    }>;
  };
}

interface TestAnalytics {
  testId: string;
  testName: string;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  difficultyAnalysis: {
    easy: number;
    medium: number;
    hard: number;
  };
  scoreDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  questionAnalysis: Array<{
    questionId: string;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number;
  }>;
}

interface StudentPerformance {
  userId: string;
  studentName: string;
  totalTests: number;
  completedTests: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  improvementTrend: 'improving' | 'declining' | 'stable';
  recentScores: number[];
  moduleCompletion: number;
  lastActivity: Date;
}

interface ModuleAnalytics {
  moduleId: string;
  moduleName: string;
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  averageCompletionTime: number; // in days
  studentEngagement: {
    high: number;
    medium: number;
    low: number;
  };
}

export class AnalyticsService {
  
  // Get comprehensive dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const [
      userStats,
      testStats,
      moduleStats,
      topPerformers,
      recentActivity
    ] = await Promise.all([
      this.getUserStats(),
      this.getTestStats(),
      this.getModuleStats(),
      this.getTopPerformers(),
      this.getRecentActivity()
    ]);

    return {
      users: userStats,
      tests: testStats,
      modules: moduleStats,
      performance: {
        topPerformers,
        recentActivity
      }
    };
  }

  // User statistics
  private async getUserStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [total, students, admins, newThisWeek] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'student', status: 'active' }),
      User.countDocuments({ role: 'admin', status: 'active' }),
      User.countDocuments({ 
        status: 'active',
        createdAt: { $gte: weekAgo }
      })
    ]);

    // For activeToday, we would need to track last login times
    // For now, we'll use a mock value or implement login tracking
    const activeToday = Math.floor(students * 0.3); // Mock: 30% daily activity

    return {
      total,
      students,
      admins,
      activeToday,
      newThisWeek
    };
  }

  // Test statistics
  private async getTestStats() {
    const [tests, testResults] = await Promise.all([
      MockTest.find().select('isPublished'),
      TestResult.find().populate('testId', 'totalPoints')
    ]);

    const total = tests.length;
    const active = tests.filter(test => test.isPublished).length;
    const completed = testResults.length;
    
    const totalScore = testResults.reduce((sum, result) => sum + result.score, 0);
    const totalPossibleScore = testResults.reduce((sum, result) => {
      return sum + (result.testId as any)?.totalPoints || 0;
    }, 0);
    
    const averageScore = totalPossibleScore > 0 ? 
      Math.round((totalScore / totalPossibleScore) * 100) : 0;

    return {
      total,
      active,
      completed,
      averageScore,
      totalAttempts: completed
    };
  }

  // Module statistics
  private async getModuleStats() {
    const [modules, assignments] = await Promise.all([
      Module.find(),
      ModuleAssignment.find().populate('moduleId')
    ]);

    const total = modules.length;
    const active = modules.length; // All modules are considered active
    const totalAssignments = assignments.length;
    
    // Get actual completion count from assignments with completed status
    const completedAssignments = assignments.filter(assignment => 
      assignment.completedBy && assignment.completedBy.length > 0
    ).length;
    
    // Calculate realistic completion rate
    const completionRate = totalAssignments > 0 ? 
      Math.min(Math.round((completedAssignments / totalAssignments) * 100), 100) : 0;

    return {
      total,
      active,
      totalAssignments,
      completionRate
    };
  }

  // Get top performing students
  private async getTopPerformers() {
    const topPerformers = await TestResult.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'mocktests',
          localField: 'testId',
          foreignField: '_id',
          as: 'test'
        }
      },
      {
        $unwind: '$student'
      },
      {
        $unwind: '$test'
      },
      {
        $group: {
          _id: '$studentId',
          name: { $first: { $concat: ['$student.firstName', ' ', '$student.lastName'] } },
          totalScore: { $sum: '$score' },
          totalPossible: { $sum: '$test.totalMarks' },
          testsCompleted: { $sum: 1 }
        }
      },
      {
        $addFields: {
          averageScore: {
            $cond: {
              if: { $gt: ['$totalPossible', 0] },
              then: { $round: [{ $multiply: [{ $divide: ['$totalScore', '$totalPossible'] }, 100] }, 2] },
              else: 0
            }
          }
        }
      },
      {
        $match: {
          testsCompleted: { $gte: 2 } // At least 2 tests completed
        }
      },
      {
        $sort: { averageScore: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          userId: '$_id',
          name: 1,
          averageScore: 1,
          testsCompleted: 1
        }
      }
    ]);

    return topPerformers;
  }

  // Get recent activity
  private async getRecentActivity() {
    const recentResults = await TestResult.find()
      .populate('userId', 'firstName lastName')
      .populate('testId', 'title')
      .sort({ submittedAt: -1 })
      .limit(5);

    const recentUsers = await User.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(3);

    const activity: Array<{
      type: 'test_completed' | 'module_assigned' | 'user_registered';
      description: string;
      timestamp: Date;
      userId?: string;
    }> = [];

    // Add test completions
    recentResults.forEach(result => {
      const student = result.userId as any;
      const test = result.testId as any;
      activity.push({
        type: 'test_completed' as const,
        description: `${student.firstName} ${student.lastName} completed ${test.title}`,
        timestamp: result.submittedAt,
        userId: student._id
      });
    });

    // Add new registrations
    recentUsers.forEach(user => {
      activity.push({
        type: 'user_registered' as const,
        description: `${user.firstName} ${user.lastName} registered as ${user.role}`,
        timestamp: user.createdAt,
        userId: user._id.toString()
      });
    });

    // Sort by timestamp and limit
    return activity
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  // Get detailed test analytics
  async getTestAnalytics(testId: string): Promise<TestAnalytics | null> {
    const test = await MockTest.findById(testId);
    if (!test) return null;

    const results = await TestResult.find({ testId: new Types.ObjectId(testId) })
      .populate('userId', 'firstName lastName');

    const totalAttempts = results.length;
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    const averageScore = totalAttempts > 0 ? 
      Math.round((totalScore / (totalAttempts * test.totalPoints)) * 100) : 0;

    const passedCount = results.filter(result => 
      (result.score / test.totalPoints) >= 0.6 // 60% passing
    ).length;
    const passRate = totalAttempts > 0 ? 
      Math.round((passedCount / totalAttempts) * 100) : 0;

    // Score distribution
    const scoreRanges = [
      { range: '0-20%', min: 0, max: 0.2 },
      { range: '21-40%', min: 0.21, max: 0.4 },
      { range: '41-60%', min: 0.41, max: 0.6 },
      { range: '61-80%', min: 0.61, max: 0.8 },
      { range: '81-100%', min: 0.81, max: 1.0 }
    ];

    const scoreDistribution = scoreRanges.map(range => {
      const count = results.filter(result => {
        const percentage = result.score / test.totalPoints;
        return percentage >= range.min && percentage <= range.max;
      }).length;

      return {
        range: range.range,
        count,
        percentage: totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0
      };
    });

    // Question analysis (simplified)
    const questionAnalysis = test.questions.map((_question, index) => {
      // This would require storing individual question responses
      // For now, we'll provide mock data
      const correctAnswers = Math.floor(totalAttempts * (0.6 + Math.random() * 0.3));
      const incorrectAnswers = totalAttempts - correctAnswers;
      
      return {
        questionId: `q${index + 1}`,
        correctAnswers,
        incorrectAnswers,
        accuracy: totalAttempts > 0 ? Math.round((correctAnswers / totalAttempts) * 100) : 0
      };
    });

    return {
      testId,
      testName: test.title,
      totalAttempts,
      averageScore,
      passRate,
      difficultyAnalysis: {
        easy: Math.floor(test.questions.length * 0.4),
        medium: Math.floor(test.questions.length * 0.4),
        hard: Math.floor(test.questions.length * 0.2)
      },
      scoreDistribution,
      questionAnalysis
    };
  }

  // Get student performance analytics
  async getStudentPerformance(studentId: string): Promise<StudentPerformance | null> {
    const student = await User.findById(studentId);
    if (!student) return null;

    const testResults = await TestResult.find({ userId: new Types.ObjectId(studentId) })
      .populate('testId', 'title totalPoints')
      .sort({ submittedAt: -1 });

    const moduleAssignments = await ModuleAssignment.find({ 
      assignedTo: { $in: [new Types.ObjectId(studentId)] }
    });

    const totalTests = await TestAssignment.countDocuments({ 
      assignedTo: { $in: [new Types.ObjectId(studentId)] }
    });

    const completedTests = testResults.length;
    const scores = testResults.map(result => 
      Math.round((result.score / (result.testId as any).totalPoints) * 100)
    );

    const averageScore = scores.length > 0 ? 
      Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;

    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    // Calculate improvement trend
    let improvementTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (scores.length >= 3) {
      const recentScores = scores.slice(0, 3);
      const olderScores = scores.slice(-3);
      const recentAvg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
      const olderAvg = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;

      if (recentAvg > olderAvg + 5) improvementTrend = 'improving';
      else if (recentAvg < olderAvg - 5) improvementTrend = 'declining';
    }

    // For module completion, we'll use a simple metric since we don't have completion tracking
    const moduleCompletion = moduleAssignments.length > 0 ? 75 : 0; // Mock 75% completion

    const lastActivity = testResults.length > 0 ? 
      testResults[0].submittedAt : student.createdAt;

    return {
      userId: studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      totalTests,
      completedTests,
      averageScore,
      highestScore,
      lowestScore,
      improvementTrend,
      recentScores: scores.slice(0, 5),
      moduleCompletion,
      lastActivity
    };
  }

  // Get module analytics
  async getModuleAnalytics(moduleId: string): Promise<ModuleAnalytics | null> {
    const module = await Module.findById(moduleId);
    if (!module) return null;

    const assignments = await ModuleAssignment.find({ 
      moduleId: new Types.ObjectId(moduleId) 
    });

    const totalAssignments = assignments.reduce((sum, assignment) => sum + assignment.assignedTo.length, 0);
    // Mock completion since we don't have completion tracking
    const completedAssignments = Math.floor(totalAssignments * 0.7); // 70% completion rate

    const completionRate = totalAssignments > 0 ? 
      Math.round((completedAssignments / totalAssignments) * 100) : 0;

    // Mock average completion time
    const averageCompletionTime = 5; // 5 days average

    // Student engagement levels (mock calculation)
    const high = Math.floor(totalAssignments * 0.3);
    const medium = Math.floor(totalAssignments * 0.5);
    const low = totalAssignments - high - medium;

    return {
      moduleId,
      moduleName: module.title,
      totalAssignments,
      completedAssignments,
      completionRate,
      averageCompletionTime,
      studentEngagement: {
        high,
        medium,
        low
      }
    };
  }

  // Get performance trends over time
  async getPerformanceTrends(period: 'week' | 'month' | 'quarter' = 'month') {
    const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const trends = await TestResult.aggregate([
      {
        $match: {
          submittedAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'mocktests',
          localField: 'testId',
          foreignField: '_id',
          as: 'test'
        }
      },
      {
        $unwind: '$test'
      },
      {
        $group: {
          _id: {
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' },
            day: { $dayOfMonth: '$submittedAt' }
          },
          averageScore: {
            $avg: {
              $multiply: [
                { $divide: ['$score', '$test.totalMarks'] },
                100
              ]
            }
          },
          testCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    return trends.map(trend => ({
      date: new Date(trend._id.year, trend._id.month - 1, trend._id.day),
      averageScore: Math.round(trend.averageScore),
      testCount: trend.testCount
    }));
  }

  // Export analytics data
  async exportAnalyticsData(type: 'users' | 'tests' | 'modules' | 'performance') {
    switch (type) {
      case 'users':
        return await this.exportUserData();
      case 'tests':
        return await this.exportTestData();
      case 'modules':
        return await this.exportModuleData();
      case 'performance':
        return await this.exportPerformanceData();
      default:
        throw new Error('Invalid export type');
    }
  }

  private async exportUserData() {
    return await User.find({ status: 'active' })
      .select('firstName lastName email role admissionDate createdAt')
      .sort({ createdAt: -1 });
  }

  private async exportTestData() {
    return await TestResult.find()
      .populate('userId', 'firstName lastName email')
      .populate('testId', 'title totalPoints')
      .select('score percentage submittedAt')
      .sort({ submittedAt: -1 });
  }

  private async exportModuleData() {
    return await ModuleAssignment.find()
      .populate('assignedTo', 'firstName lastName email')
      .populate('moduleId', 'title')
      .select('dueDate isActive createdAt')
      .sort({ createdAt: -1 });
  }

  private async exportPerformanceData() {
    return await TestResult.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'mocktests',
          localField: 'testId',
          foreignField: '_id',
          as: 'test'
        }
      },
      {
        $unwind: '$student'
      },
      {
        $unwind: '$test'
      },
      {
        $project: {
          studentName: { $concat: ['$student.firstName', ' ', '$student.lastName'] },
          studentEmail: '$student.email',
          testName: '$test.title',
          score: 1,
          totalPoints: '$test.totalPoints',
          percentage: 1,
          submittedAt: 1
        }
      },
      {
        $sort: { submittedAt: -1 }
      }
    ]);
  }
}

export default AnalyticsService;
