import React, { useState, useEffect } from 'react';
import {
  FileText,
  TrendingUp,
  CheckCircle,
  XCircle,
  Search,
  Eye,
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
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

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

  const filteredTests = testAnalytics.filter(ta => {
    if (selectedTest !== 'all' && ta.test._id !== selectedTest) return false;
    if (searchTerm && !ta.test.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const TestAnalyticsCard: React.FC<{ testAnalytics: TestWithResults }> = ({ testAnalytics: ta }) => {
    const [showDetails, setShowDetails] = useState(false);

    // Find which students haven't completed the test
    const completedStudentIds = new Set(ta.results.map(r => r.userId._id));
    const incompleteAssignments = ta.assignments.filter(a => !completedStudentIds.has(a.assignedTo._id));

    return (
      <div className="test-card">
        <div className="test-card-header">
          <div className="test-card-header-row">
            <div>
              <h3 className="test-card-title">
                {ta.test.title}
              </h3>
              <p className="test-card-description">
                {ta.test.totalQuestions} questions • {ta.test.timeLimit} minutes
              </p>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="test-card-toggle-button"
            >
              <Eye className="test-card-toggle-icon" />
              {showDetails ? 'Hide' : 'View'} Details
            </button>
          </div>
        </div>

        <div className="test-card-body">
          <div className="test-stats-grid">
            <div className="test-stat-item">
              <div className="test-stat-value">
                {ta.assignments.length}
              </div>
              <div className="test-stat-label">
                Assigned
              </div>
            </div>
            <div className="test-stat-item">
              <div className="test-stat-value text-green-600">
                {ta.results.length}
              </div>
              <div className="test-stat-label">
                Completed
              </div>
            </div>
            <div className="test-stat-item">
              <div className="test-stat-value text-blue-600">
                {ta.completionRate.toFixed(1)}%
              </div>
              <div className="test-stat-label">
                Completion Rate
              </div>
            </div>
            <div className="test-stat-item">
              <div className="test-stat-value text-purple-600">
                {ta.averageScore.toFixed(1)}%
              </div>
              <div className="test-stat-label">
                Average Score
              </div>
            </div>
          </div>

          {showDetails && (
            <div className="results-table-container">
              {/* Completed Tests */}
              {ta.results.length > 0 && (
                <div>
                  <h4 className="results-section-title">
                    Completed Tests ({ta.results.length})
                  </h4>
                  <div className="results-table-wrapper">
                    <table className="results-table">
                      <thead className="results-table-header">
                        <tr>
                          <th className="results-table-header-cell">
                            Student
                          </th>
                          <th className="results-table-header-cell">
                            Score
                          </th>
                          <th className="results-table-header-cell">
                            Completed At
                          </th>
                          <th className="results-table-header-cell">
                            Time Spent
                          </th>
                          <th className="results-table-header-cell">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="results-table-body">
                        {ta.results.map((result) => (
                          <tr key={result._id} className="results-table-row">
                            <td className="results-table-cell">
                              {result.userId.firstName} {result.userId.lastName}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`score-badge ${
                                result.percentage >= 80 
                                  ? 'score-badge-excellent'
                                  : result.percentage >= 60
                                  ? 'score-badge-good'
                                  : 'score-badge-poor'
                              }`}>
                                {result.percentage.toFixed(1)}%
                              </span>
                            </td>
                            <td className="results-table-cell-secondary">
                              {new Date(result.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="results-table-cell-secondary">
                              {Math.round(result.timeSpent / 60)} min
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => {
                                  setSelectedResult(result);
                                  setShowResultModal(true);
                                }}
                                className="action-button"
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
                  <h4 className="results-section-title">
                    Pending Assignments ({incompleteAssignments.length})
                  </h4>
                  <div className="results-table-wrapper">
                    <table className="results-table">
                      <thead className="results-table-header">
                        <tr>
                          <th className="results-table-header-cell">
                            Student
                          </th>
                          <th className="results-table-header-cell">
                            Assigned Date
                          </th>
                          <th className="results-table-header-cell">
                            Due Date
                          </th>
                          <th className="results-table-header-cell">
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
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <XCircle className="error-icon" />
          <p className="loading-text">{error}</p>
          <button 
            onClick={loadAnalyticsData}
            className="error-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
        <div className="analytics-content">
          <div className="analytics-header">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="analytics-title">Test Analytics</h1>
                <p className="analytics-subtitle">
                  Monitor test performance and student progress
                </p>
              </div>
            </div>
          </div>

        {/* Filters */}
        <div className="analytics-controls">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <div className="analytics-controls-grid">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tests..."
                    className="search-input pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <select
                  className="filter-select"
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
        <div className="test-analytics-grid">
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
            <div className="test-analytics-grid-layout">
              {filteredTests.map((ta) => (
                <TestAnalyticsCard key={ta.test._id} testAnalytics={ta} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result Detail Modal */}
      {showResultModal && selectedResult && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">
                Test Results - {selectedResult!.userId.firstName} {selectedResult!.userId.lastName}
              </h3>
              <button
                onClick={() => setShowResultModal(false)}
                className="modal-close-button"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="test-stat-item">
                  <div className="test-stat-value text-blue-600">
                    {selectedResult!.percentage.toFixed(1)}%
                  </div>
                  <div className="test-stat-label">Score</div>
                </div>
                <div className="test-stat-item">
                  <div className="test-stat-value text-green-600">
                    {selectedResult!.correctAnswers}
                  </div>
                  <div className="test-stat-label">Correct</div>
                </div>
                <div className="test-stat-item">
                  <div className="test-stat-value text-red-600">
                    {selectedResult!.totalQuestions - selectedResult!.correctAnswers}
                  </div>
                  <div className="test-stat-label">Incorrect</div>
                </div>
                <div className="test-stat-item">
                  <div className="test-stat-value text-purple-600">
                    {Math.round(selectedResult!.timeSpent / 60)}
                  </div>
                  <div className="test-stat-label">Minutes</div>
                </div>
              </div>
            </div>

            <div className="modal-content max-h-96 overflow-y-auto">
              <h4 className="results-section-title">
                Question-by-Question Analysis
              </h4>
              <div className="space-y-4">
                {selectedResult!.testId?.questions?.map((question, qIndex) => {
                  const answer = selectedResult!.answers.find(a => a.questionId === question._id);
                  if (!answer) return null;

                  return (
                    <div key={question._id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          Question {qIndex + 1}
                        </h5>
                        <span className={`score-badge ${
                          answer.isCorrect 
                            ? 'score-badge-excellent'
                            : 'score-badge-poor'
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
