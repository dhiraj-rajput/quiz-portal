import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Clock, Award, FileText, Eye, Target, CheckCircle, XCircle } from 'lucide-react';
import { studentAPI } from '../../utils/api';

interface TestResult {
  _id: string;
  testId: {
    _id: string;
    title: string;
    description: string;
    questions: Array<{
      _id: string;
      question: string;
      options: Array<{
        _id: string;
        text: string;
      }>;
      explanation?: string;
      points: number;
    }>;
  };
  assignmentId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  submittedAt: string;
  timeSpent: number; // in minutes
  attemptNumber: number;
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    selectedOptionId: string;
    correctOptionId: string;
    isCorrect: boolean;
    pointsEarned: number;
    timeSpent: number;
  }>;
}

const StudentResults: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getResults();
      if (response.success && response.data) {
        setResults(response.data.results || []);
      }
    } catch (err) {
      console.error('Error loading test results:', err);
      setError('Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGradeBg = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 dark:bg-green-900/20';
    if (percentage >= 80) return 'bg-blue-100 dark:bg-blue-900/20';
    if (percentage >= 70) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (percentage >= 60) return 'bg-orange-100 dark:bg-orange-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const handleViewAnalysis = (result: TestResult) => {
    setSelectedResult(result);
    setShowAnalysis(true);
  };

  const closeAnalysis = () => {
    setSelectedResult(null);
    setShowAnalysis(false);
  };

  // Calculate statistics
  const stats = {
    totalTests: results.length,
    averageScore: results.length > 0 ? Math.round(results.reduce((sum, result) => sum + result.percentage, 0) / results.length) : 0,
    bestScore: results.length > 0 ? Math.max(...results.map(r => r.percentage)) : 0,
    totalTimeSpent: results.reduce((sum, result) => sum + result.timeSpent, 0)
  };

  const filteredResults = results.filter(result => {
    if (selectedPeriod === 'all') return true;
    const resultDate = new Date(result.submittedAt);
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        return (now.getTime() - resultDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return (now.getTime() - resultDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      case 'semester':
        return (now.getTime() - resultDate.getTime()) <= 120 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Results</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Track your test performance and progress over time
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Tests Completed
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.totalTests}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Average Score
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.averageScore}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Award className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Best Score
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.bestScore}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Time Spent
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {formatDuration(stats.totalTimeSpent)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="block w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Time</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="semester">This Semester</option>
          </select>
        </div>

        {/* Results List */}
        {filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No results available</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedPeriod === 'all' 
                ? "You haven't completed any tests yet." 
                : "No test results found for the selected period."
              }
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredResults.map((result) => (
                <li key={result._id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className={`flex-shrink-0 w-16 h-16 rounded-lg ${getGradeBg(result.percentage)} flex items-center justify-center`}>
                          <span className={`text-2xl font-bold ${getGradeColor(result.percentage)}`}>
                            {getGrade(result.percentage)}
                          </span>
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {result.testId.title}
                            </p>
                            <div className="ml-2 flex-shrink-0 flex">
                              <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getGradeBg(result.percentage)} ${getGradeColor(result.percentage)}`}>
                                {result.percentage}%
                              </p>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                            <p>{formatDate(result.submittedAt)}</p>
                            <Clock className="flex-shrink-0 ml-4 mr-1.5 h-4 w-4" />
                            <p>{formatDuration(result.timeSpent)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {result.score}/{result.totalQuestions}
                          </p>
                          <p>questions correct</p>
                        </div>
                        <button
                          onClick={() => handleViewAnalysis(result)}
                          className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Analysis</span>
                        </button>
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Detailed Analysis Modal */}
      {showAnalysis && selectedResult && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Test Analysis: {selectedResult.testId.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Attempt #{selectedResult.attemptNumber} • {formatDate(selectedResult.submittedAt)}
                  </p>
                </div>
                <button
                  onClick={closeAnalysis}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Score</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedResult.score}/{selectedResult.totalQuestions}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Percentage</p>
                      <p className={`text-lg font-semibold ${getGradeColor(selectedResult.percentage)}`}>
                        {selectedResult.percentage}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Correct</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {selectedResult.correctAnswers}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Time Spent</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatDuration(selectedResult.timeSpent)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Question-by-Question Analysis */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Question-by-Question Analysis
                </h4>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedResult.answers.map((answer, index) => {
                    const question = selectedResult.testId.questions.find(q => q._id === answer.questionId);
                    return (
                      <div
                        key={answer.questionId}
                        className={`p-4 rounded-lg border ${
                          answer.isCorrect
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">
                                Question {index + 1}
                              </span>
                              {answer.isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                              )}
                              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                {answer.pointsEarned} point{answer.pointsEarned !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {question && (
                              <div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                  {question.question}
                                </p>
                                <div className="space-y-1">
                                  {question.options.map((option: any) => (
                                    <div
                                      key={option._id}
                                      className={`text-xs p-2 rounded ${
                                        option._id === answer.correctOptionId
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                          : option._id === answer.selectedOptionId && !answer.isCorrect
                                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                      }`}
                                    >
                                      {option.text}
                                      {option._id === answer.correctOptionId && (
                                        <span className="ml-2 text-green-600 dark:text-green-400">✓ Correct</span>
                                      )}
                                      {option._id === answer.selectedOptionId && option._id !== answer.correctOptionId && (
                                        <span className="ml-2 text-red-600 dark:text-red-400">✗ Your answer</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {question.explanation && (
                                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded-r">
                                    <div className="flex items-start">
                                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                                          Explanation
                                        </p>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                          {question.explanation}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={closeAnalysis}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentResults;
