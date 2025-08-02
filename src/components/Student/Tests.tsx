import React, { useState, useEffect } from 'react';
import { FileText, Clock, Play, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../../utils/api';
import '../../styles/Tests.css';
import '../../styles/Common.css';
interface Test {
  _id: string;
  title: string;
  description: string;
  instructions: string;
  timeLimit: number; // in minutes
  totalQuestions: number;
  isPublished: boolean;
  createdAt: string;
}

interface TestAssignment {
  _id: string;
  testId: Test;
  dueDate: string;
  maxAttempts: number;
  status?: 'assigned' | 'in-progress' | 'completed';
  attemptCount?: number;
  bestResult?: {
    score: number;
    percentage: number;
    submittedAt: string;
  };
  canAttempt?: boolean;
  createdAt: string;
}

interface TestResult {
  _id: string;
  testId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeTaken: number;
}

const StudentTests: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsResponse, resultsResponse] = await Promise.all([
        studentAPI.getAssignedTests(1, 100),
        studentAPI.getResults()
      ]);

      if (assignmentsResponse.success && assignmentsResponse.data) {
        setAssignments(assignmentsResponse.data.tests || []);
      }

      if (resultsResponse.success && resultsResponse.data) {
        setResults(resultsResponse.data.results || []);
      }
    } catch (err) {
      console.error('Error loading test data:', err);
      setError('Failed to load test assignments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes) return 'No time limit';
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getTestResult = (testId: string) => {
    return results.find(result => result.testId === testId);
  };

  const handleStartTest = (testId: string, canAttempt: boolean, attemptCount: number, maxAttempts: number) => {
    if (!canAttempt) {
      if (attemptCount >= maxAttempts) {
        alert('You have reached the maximum number of attempts for this test. Please contact your administrator for additional attempts.');
      } else {
        alert('This test is no longer available for attempts.');
      }
      return;
    }

    // Open test interface in new tab
    const testUrl = `/student/test-interface/${testId}`;
    const newTab = window.open(testUrl, '_blank');
    
    if (!newTab) {
      // If popup blocked, show message to user
      alert('Please allow popups for this site to take the test in a new tab. You can also navigate manually to the test.');
      // Fallback to current tab navigation
      navigate(testUrl);
    } else {
      // Focus the new tab
      newTab.focus();
    }
    
    console.log('Starting test:', testId);
  };

  const handleViewResults = (testId: string) => {
    // Navigate to results with a filter for this specific test
    navigate(`/student/results?testId=${testId}`);
    console.log('Viewing results for test:', testId);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tests-page">
      <div className="tests-container">
        {/* Header */}
        <div className="tests-header">
          <h1 className="tests-title">My Tests</h1>
          <p className="tests-subtitle">
            Take assigned tests and track your progress
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Tests Grid */}
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tests assigned</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You don't have any tests assigned yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {assignments.map((assignment) => {
              const result = getTestResult(assignment.testId?._id);
              const isCompleted = assignment.status === 'completed' || result;
              const canTakeTest = assignment.canAttempt !== false && 
                                !isCompleted && 
                                new Date(assignment.dueDate) > new Date();

              return (
                <div
                  key={assignment._id}
                  className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {/* Test Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {assignment.testId?.title || 'Test Title'}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assignment.status || 'assigned')}`}>
                            {assignment.status?.replace('-', ' ') || 'assigned'}
                          </span>
                        </div>
                      </div>
                      {isCompleted && (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      )}
                    </div>

                    {/* Description */}
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {assignment.testId?.description || 'No description available'}
                    </p>

                    {/* Test Info */}
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{formatDuration(assignment.testId?.timeLimit)}</span>
                      </div>
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <FileText className="h-4 w-4 mr-1" />
                        <span>{assignment.testId?.totalQuestions || 0} questions</span>
                      </div>
                    </div>

                    {/* Dates and Attempts */}
                    <div className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Due: {formatDate(assignment.dueDate)}</span>
                        {assignment.maxAttempts && (
                          <span>Attempts: {assignment.attemptCount || 0}/{assignment.maxAttempts}</span>
                        )}
                      </div>
                    </div>

                    {/* Results */}
                    {result && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Score: {result.score}/{result.totalQuestions}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {Math.round((result.score / result.totalQuestions) * 100)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Completed: {formatDate(result.completedAt)}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-6 flex justify-between space-x-3">
                      {canTakeTest ? (
                        <button 
                          onClick={() => handleStartTest(
                            assignment.testId?._id, 
                            assignment.canAttempt ?? true,
                            assignment.attemptCount ?? 0,
                            assignment.maxAttempts
                          )}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {assignment.status === 'in-progress' ? 'Continue Test' : 'Start Test'}
                        </button>
                      ) : (
                        <div className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
                          {assignment.maxAttempts && (assignment.attemptCount || 0) >= assignment.maxAttempts 
                            ? 'Max attempts reached' 
                            : 'Test completed'
                          }
                        </div>
                      )}
                      
                      {result && (
                        <button 
                          onClick={() => handleViewResults(assignment.testId?._id)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          View Results
                        </button>
                      )}
                    </div>

                    {/* Warning for overdue tests */}
                    {new Date(assignment.dueDate) < new Date() && !isCompleted && (
                      <div className="mt-3 flex items-center text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span>This test is overdue</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTests;
