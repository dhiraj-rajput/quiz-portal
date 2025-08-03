import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  FileText, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  AlertCircle,
  Play
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../utils/api';
import '../../styles/Dashboard.css';
import '../../styles/Common.css';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getDashboard();
      if (response.success && response.data) {
        setDashboardData(response.data);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      // Fallback to empty data
      setDashboardData({
        statistics: {
          assignedModules: 0,
          assignedTests: 0,
          completedTests: 0,
        },
        recentActivity: {
          recentTestResults: [],
          upcomingTests: [],
          recentModules: [],
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewModules = () => {
    navigate('/student/modules');
  };

  const handleViewTests = () => {
    navigate('/student/tests');
  };

  const handleViewResults = () => {
    navigate('/student/results');
  };

  // Get upcoming deadlines from dashboard data
  const upcomingDeadlines = dashboardData?.recentActivity?.upcomingTests || [];

  // Calculate stats from dashboard data
  const stats = dashboardData?.statistics || {
    assignedModules: 0,
    assignedTests: 0,
    completedTests: 0,
  };

  // Use actual completion data from API with safety checks
  const completedModules = stats.completedModules || 0;
  const moduleCompletionPercentage = stats.assignedModules > 0 
    ? Math.min(Math.round((completedModules / stats.assignedModules) * 100), 100)
    : 0;

  const testCompletionPercentage = stats.assignedTests > 0 
    ? Math.min(Math.round((stats.completedTests / stats.assignedTests) * 100), 100)
    : 0;

  // Debug logging
  console.log('Dashboard Stats:', {
    assignedModules: stats.assignedModules,
    completedModules,
    moduleCompletionPercentage,
    assignedTests: stats.assignedTests,
    completedTests: stats.completedTests,
    testCompletionPercentage,
    upcomingDeadlinesCount: upcomingDeadlines.length,
    rawDashboardData: dashboardData
  });

  const averageScore = dashboardData?.recentActivity?.recentTestResults?.length > 0 
    ? Math.round(dashboardData.recentActivity.recentTestResults.reduce((sum: number, result: any) => sum + result.percentage, 0) / dashboardData.recentActivity.recentTestResults.length)
    : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-md ${color}`}>
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
                {subtitle && (
                  <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    {subtitle}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Here's your learning progress and upcoming assignments.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
              title="Assigned Modules"
              value={stats.assignedModules}
              icon={<BookOpen className="h-6 w-6 text-white" />}
              color="bg-blue-500"
            />
            <StatCard
              title="Completed Modules"
              value={completedModules}
              icon={<CheckCircle className="h-6 w-6 text-white" />}
              color="bg-green-500"
              subtitle={`of ${stats.assignedModules}`}
            />
            <StatCard
              title="Tests Completed"
              value={stats.completedTests}
              icon={<FileText className="h-6 w-6 text-white" />}
              color="bg-purple-500"
              subtitle={`of ${stats.assignedTests}`}
            />
            <StatCard
              title="Average Score"
              value={averageScore > 0 ? `${averageScore}%` : 'N/A'}
              icon={<TrendingUp className="h-6 w-6 text-white" />}
              color="bg-yellow-500"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 sm:px-0 mt-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Quick Actions
              </h3>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <button 
                  onClick={handleViewModules}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Modules
                </button>
                <button 
                  onClick={handleViewTests}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Take Test
                </button>
                <button 
                  onClick={handleViewResults}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Results
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Modules and Upcoming Tests */}
        <div className="px-4 sm:px-0 mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Modules */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Recently Assigned Modules
              </h3>
              {dashboardData?.recentActivity?.recentModules?.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentActivity.recentModules.slice(0, 3).map((assignment: any) => (
                    <div key={assignment._id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {assignment.moduleId?.title || 'Module'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Assigned: {new Date(assignment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleViewModules()}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        <Play className="h-3 w-3 inline mr-1" />
                        View
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No modules assigned yet
                </p>
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Upcoming Deadlines
              </h3>
              {upcomingDeadlines.length > 0 ? (
                <div className="space-y-4">
                  {upcomingDeadlines.map((assignment: any) => {
                    const dueDate = new Date(assignment.dueDate);
                    const isUrgent = dueDate.getTime() - Date.now() < 24 * 60 * 60 * 1000; // Less than 24 hours
                    
                    return (
                      <div key={assignment._id} className={`flex items-center justify-between p-3 rounded-lg ${
                        isUrgent ? 'bg-red-50 dark:bg-red-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'
                      }`}>
                        <div className="flex items-center space-x-3">
                          {isUrgent ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {assignment.testId?.title || 'Test'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Due: {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleViewTests()}
                          className={`text-xs text-white px-3 py-1 rounded hover:opacity-90 ${
                          isUrgent ? 'bg-red-600' : 'bg-yellow-600'
                        }`}>
                          Start Test
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No upcoming deadlines
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="px-4 sm:px-0 mt-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Learning Progress
              </h3>
              <div className="space-y-4">
                {/* Module Progress */}
                <div className="progress-section">
                  <div className="flex justify-between progress-text">
                    <span>Module Completion</span>
                    <span>
                      {completedModules}/{stats.assignedModules} ({moduleCompletionPercentage}%)
                      {stats.assignedModules > 0 && completedModules === stats.assignedModules && (
                        <span className="text-green-600 ml-2">✓ All Complete</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 progress-container">
                    <div 
                      className={`progress-bar ${
                        stats.assignedModules > 0 && completedModules === stats.assignedModules 
                          ? 'progress-bar-green' 
                          : 'progress-bar-blue'
                      }`}
                      style={{ 
                        width: `${Math.min(moduleCompletionPercentage, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Test Progress */}
                <div className="progress-section">
                  <div className="flex justify-between progress-text">
                    <span>Test Completion</span>
                    <span>
                      {stats.completedTests}/{stats.assignedTests} ({testCompletionPercentage}%)
                      {stats.assignedTests > 0 && stats.completedTests === stats.assignedTests && (
                        <span className="text-green-600 ml-2">✓ All Complete</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 progress-container">
                    <div 
                      className={`progress-bar ${
                        stats.assignedTests > 0 && stats.completedTests === stats.assignedTests 
                          ? 'progress-bar-green' 
                          : 'progress-bar-purple'
                      }`}
                      style={{ 
                        width: `${Math.min(testCompletionPercentage, 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;