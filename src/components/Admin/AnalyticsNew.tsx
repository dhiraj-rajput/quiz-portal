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
} from 'lucide-react';
import { adminAPI, testAPI } from '../../utils/api';

interface TestResult {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  testId: string;
  score: number;
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
  const [testAnalytics, setTestAnalytics] = useState<TestWithResults[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState<string>('all');

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all test assignments
      const assignmentsResponse = await adminAPI.getTestAssignments(1, 100);
      const assignments = assignmentsResponse.data?.assignments || [];

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
            ? (results.length / testGroups[testId].assignments.length) * 100 
            : 0;
          
          const averageScore = results.length > 0 
            ? results.reduce((sum: number, result: TestResult) => sum + result.score, 0) / results.length 
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
    const totalTests = testAnalytics.length;
    const totalAssignments = testAnalytics.reduce((sum, ta) => sum + ta.assignments.length, 0);
    const totalResults = testAnalytics.reduce((sum, ta) => sum + ta.results.length, 0);
    const overallCompletionRate = totalAssignments > 0 ? (totalResults / totalAssignments) * 100 : 0;
    const overallAverageScore = totalResults > 0 
      ? testAnalytics.reduce((sum, ta) => sum + (ta.averageScore * ta.results.length), 0) / totalResults 
      : 0;

    return {
      totalTests,
      totalAssignments,
      totalResults,
      overallCompletionRate,
      overallAverageScore,
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
                                result.score >= 80 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : result.score >= 60
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {result.score}%
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                              {new Date(result.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                              {Math.round(result.timeSpent / 60)} min
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Test Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Monitor test performance and student progress
          </p>
        </div>

        {/* Overall Statistics */}
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
          {filteredTests.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No test data found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || selectedTest !== 'all' 
                  ? 'Try adjusting your filters to see more results.'
                  : 'No tests have been assigned yet.'}
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
      </div>
    </div>
  );
};

export default Analytics;
