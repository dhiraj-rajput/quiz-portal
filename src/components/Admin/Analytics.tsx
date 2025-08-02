import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Award,
  UserCheck,
} from 'lucide-react';
import { adminAPI, testAPI } from '../../utils/api';

interface Answer {
  questionId: string;
  selectedAnswer: number;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent: number;
}

interface TestResult {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  testId: {
    _id: string;
    title: string;
    description: string;
    questions?: Array<{
      _id: string;
      question: string;
      options: Array<{
        _id: string;
        text: string;
        isCorrect?: boolean;
      }>;
      explanation?: string;
      points: number;
    }>;
  };
  answers: Answer[];
  score: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  submittedAt: string;
  timeSpent: number;
}

interface TestAssignment {
  _id: string;
  testId: {
    _id: string;
    title: string;
    description: string;
    totalQuestions: number;
    timeLimit: number;
    questions?: any[];
  };
  assignedTo: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  dueDate: string;
  completedAt?: string;
  createdAt: string;
}

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

interface TestWithResults {
  test: TestAssignment['testId'];
  assignments: TestAssignment[];
  results: TestResult[];
  completionRate: number;
  averageScore: number;
}

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [testAnalytics, setTestAnalytics] = useState<TestWithResults[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'dashboard' | 'tests'>('dashboard');
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load dashboard stats
      const statsResponse = await adminAPI.getDashboardStats();
      setDashboardStats(statsResponse.data);

      // Get all test assignments
      const assignmentsResponse = await adminAPI.getTestAssignments(1, 100);
      const assignments = assignmentsResponse.data?.assignments || [];

      if (assignments.length === 0) {
        // No assignments yet, just set empty analytics
        setTestAnalytics([]);
        return;
      }

      // Group assignments by test ID
      const testGroups = assignments.reduce((acc: any, assignment: TestAssignment) => {
        const testId = assignment.testId._id;
        if (!acc[testId]) {
          acc[testId] = {
            test: assignment.testId,
            assignments: [],
            results: [],
          };
        }
        acc[testId].assignments.push(assignment);
        return acc;
      }, {});

      // Get results for each test
      const testAnalyticsData: TestWithResults[] = [];
      
      for (const testId of Object.keys(testGroups)) {
        try {
          const resultsResponse = await testAPI.getTestResults(testId);
          const results = resultsResponse.data?.results || [];
          
          const completionRate = testGroups[testId].assignments.length > 0 
            ? Math.min((results.length / testGroups[testId].assignments.length) * 100, 100)
            : 0;
          
          const averageScore = results.length > 0 
            ? results.reduce((sum: number, result: TestResult) => sum + result.percentage, 0) / results.length 
            : 0;

          testAnalyticsData.push({
            test: testGroups[testId].test,
            assignments: testGroups[testId].assignments,
            results,
            completionRate,
            averageScore,
          });
        } catch (err) {
          console.error(`Failed to get results for test ${testId}:`, err);
          // Still add the test with empty results
          testAnalyticsData.push({
            test: testGroups[testId].test,
            assignments: testGroups[testId].assignments,
            results: [],
            completionRate: 0,
            averageScore: 0,
          });
        }
      }

      setTestAnalytics(testAnalyticsData);
    } catch (err: any) {
      console.error('Failed to load analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getOverallStats = () => {
    if (!dashboardStats) {
      return {
        totalTests: 0,
        totalAssignments: 0,
        totalResults: 0,
        overallCompletionRate: 0,
        overallAverageScore: 0,
      };
    }

    const totalAssignments = testAnalytics.reduce((sum, ta) => sum + ta.assignments.length, 0);
    const totalResults = testAnalytics.reduce((sum, ta) => sum + ta.results.length, 0);
    const overallCompletionRate = totalAssignments > 0 ? Math.min((totalResults / totalAssignments) * 100, 100) : 0;

    return {
      totalTests: dashboardStats.tests.total,
      totalAssignments,
      totalResults: dashboardStats.tests.completed,
      overallCompletionRate: dashboardStats.tests.completed > 0 ? overallCompletionRate : 0,
      overallAverageScore: dashboardStats.tests.averageScore,
    };
  };

  const filteredTests = testAnalytics.filter(ta => {
    if (selectedTest !== 'all' && ta.test._id !== selectedTest) return false;
    if (searchTerm && !ta.test.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const stats = getOverallStats();

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    change?: string;
  }> = ({ title, value, icon, color, change }) => (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`${color} rounded-md p-3`}>
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {value}
                </div>
                {change && (
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                    <span className="ml-1">{change}</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  const TestAnalyticsCard: React.FC<{ testAnalytics: TestWithResults }> = ({ testAnalytics: ta }) => {
    const [showDetails, setShowDetails] = useState(false);

    // Find which students haven't completed the test
    const completedStudentIds = new Set(ta.results.map(r => r.userId._id));
    const incompleteAssignments = ta.assignments.filter(a => !completedStudentIds.has(a.assignedTo._id));

    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {ta.test.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {ta.test.totalQuestions} questions • {ta.test.timeLimit} minutes
              </p>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showDetails ? 'Hide' : 'View'} Details
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {ta.assignments.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Assigned
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {ta.results.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Completed
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {ta.completionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Completion Rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {ta.averageScore.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Average Score
              </div>
            </div>
          </div>

          {showDetails && (
            <div className="space-y-4">
              {/* Completed Tests */}
              {ta.results.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                    Completed Tests ({ta.results.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Student
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Score
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Completed At
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Time Spent
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {ta.results.map((result) => (
                          <tr key={result._id}>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                              {result.userId.firstName} {result.userId.lastName}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                result.percentage >= 80 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : result.percentage >= 60
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {result.percentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                              {new Date(result.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                              {Math.round(result.timeSpent / 60)} min
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => {
                                  setSelectedResult(result);
                                  setShowResultModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Incomplete Assignments */}
              {incompleteAssignments.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                    Pending Assignments ({incompleteAssignments.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Student
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Assigned Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Due Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {incompleteAssignments.map((assignment) => {
                          const isOverdue = new Date(assignment.dueDate) < new Date();
                          return (
                            <tr key={assignment._id}>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                {assignment.assignedTo.firstName} {assignment.assignedTo.lastName}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                {new Date(assignment.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                {new Date(assignment.dueDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  isOverdue
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                }`}>
                                  {isOverdue ? 'Overdue' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">{error}</p>
          <button 
            onClick={loadAnalyticsData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Monitor system performance and student progress
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  viewMode === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Dashboard Overview
              </button>
              <button
                onClick={() => setViewMode('tests')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  viewMode === 'tests'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Test Analytics
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'dashboard' && dashboardStats ? (
          <>
            {/* Main Dashboard Statistics */}
            <div className="px-4 sm:px-0 mb-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Total Students"
                  value={dashboardStats.users.students}
                  icon={<Users className="h-6 w-6 text-white" />}
                  color="bg-blue-500"
                  change={`+${dashboardStats.users.newThisWeek} this week`}
                />
                <StatCard
                  title="Active Today"
                  value={dashboardStats.users.activeToday}
                  icon={<UserCheck className="h-6 w-6 text-white" />}
                  color="bg-green-500"
                />
                <StatCard
                  title="Total Modules"
                  value={dashboardStats.modules.total}
                  icon={<FileText className="h-6 w-6 text-white" />}
                  color="bg-purple-500"
                />
                <StatCard
                  title="Total Tests"
                  value={dashboardStats.tests.total}
                  icon={<BarChart3 className="h-6 w-6 text-white" />}
                  color="bg-indigo-500"
                />
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="px-4 sm:px-0 mb-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <StatCard
                  title="Tests Completed"
                  value={dashboardStats.tests.completed}
                  icon={<CheckCircle className="h-6 w-6 text-white" />}
                  color="bg-yellow-500"
                />
                <StatCard
                  title="Average Score"
                  value={`${dashboardStats.tests.averageScore}%`}
                  icon={<Award className="h-6 w-6 text-white" />}
                  color="bg-emerald-500"
                />
                <StatCard
                  title="Completion Rate"
                  value={`${dashboardStats.modules.completionRate}%`}
                  icon={<TrendingUp className="h-6 w-6 text-white" />}
                  color="bg-red-500"
                />
              </div>
            </div>

            {/* Top Performers */}
            {dashboardStats.performance.topPerformers.length > 0 && (
              <div className="px-4 sm:px-0">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                      Top Performers
                    </h3>
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Average Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Tests Completed
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {dashboardStats.performance.topPerformers.map((performer, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {performer.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  {performer.averageScore}%
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {performer.testsCompleted}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Test Analytics View */}
            <div className="px-4 sm:px-0 mb-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  title="Total Tests"
                  value={stats.totalTests}
                  icon={<FileText className="h-6 w-6 text-white" />}
                  color="bg-blue-500"
                />
                <StatCard
                  title="Total Assignments"
                  value={stats.totalAssignments}
                  icon={<Users className="h-6 w-6 text-white" />}
                  color="bg-green-500"
                />
                <StatCard
                  title="Tests Completed"
                  value={stats.totalResults}
                  icon={<CheckCircle className="h-6 w-6 text-white" />}
                  color="bg-purple-500"
                />
                <StatCard
                  title="Completion Rate"
                  value={`${stats.overallCompletionRate.toFixed(1)}%`}
                  icon={<BarChart3 className="h-6 w-6 text-white" />}
                  color="bg-indigo-500"
                />
                <StatCard
                  title="Average Score"
                  value={`${stats.overallAverageScore.toFixed(1)}%`}
                  icon={<TrendingUp className="h-6 w-6 text-white" />}
                  color="bg-yellow-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 sm:px-0 mb-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search tests..."
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <select
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      value={selectedTest}
                      onChange={(e) => setSelectedTest(e.target.value)}
                    >
                      <option value="all">All Tests</option>
                      {testAnalytics.map((ta) => (
                        <option key={ta.test._id} value={ta.test._id}>
                          {ta.test.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Analytics Cards */}
            <div className="px-4 sm:px-0">
              {testAnalytics.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No test assignments found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Create some tests and assign them to students to see analytics here.
                  </p>
                </div>
              ) : filteredTests.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No matching tests found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try adjusting your filters to see more results.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredTests.map((ta) => (
                    <TestAnalyticsCard key={ta.test._id} testAnalytics={ta} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Result Detail Modal */}
      {showResultModal && selectedResult && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Test Results - {selectedResult.userId.firstName} {selectedResult.userId.lastName}
              </h3>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedResult.percentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedResult.correctAnswers}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedResult.totalQuestions - selectedResult.correctAnswers}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Incorrect</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(selectedResult.timeSpent / 60)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Minutes</div>
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Question-by-Question Analysis
              </h4>
              <div className="space-y-4">
                {selectedResult.testId?.questions?.map((question, qIndex) => {
                  const answer = selectedResult.answers.find(a => a.questionId === question._id);
                  if (!answer) return null;

                  return (
                    <div key={question._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          Question {qIndex + 1}
                        </h5>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          answer.isCorrect 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {answer.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        {question.question}
                      </p>

                      <div className="space-y-2">
                        {question.options?.map((option, optIndex) => (
                          <div
                            key={option._id}
                            className={`p-2 rounded border ${
                              option._id === answer.correctOptionId
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                                : option._id === answer.selectedOptionId && !answer.isCorrect
                                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                                : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 dark:text-gray-300">
                                {String.fromCharCode(65 + optIndex)}. {option.text}
                              </span>
                              <div className="flex items-center space-x-2">
                                {option._id === answer.selectedOptionId && (
                                  <span className="text-blue-600 text-sm font-medium">
                                    Selected
                                  </span>
                                )}
                                {option._id === answer.correctOptionId && (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                )}
                                {option._id === answer.selectedOptionId && option._id !== answer.correctOptionId && (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {question.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Explanation:</strong> {question.explanation}
                          </p>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Points earned: {answer.pointsEarned} / {question.points}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
