import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { 
  Users, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { adminAPI, moduleAPI, testAPI } from '../../utils/api';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingRequests: 0,
    totalModules: 0,
    totalTests: 0,
    activeTests: 0,
    completedTests: 0
  });
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load data from API
      const [usersResponse, pendingResponse, modulesResponse, testsResponse] = await Promise.all([
        adminAPI.getUsers(1, 100).catch(() => ({ success: false, data: null })),
        adminAPI.getPendingRequests(1, 100).catch(() => ({ success: false, data: null })),
        moduleAPI.getModules(1, 100).catch(() => ({ success: false, data: null })),
        testAPI.getTests(1, 100).catch(() => ({ success: false, data: null }))
      ]);

      // Extract data from responses
      const users = (usersResponse.success && usersResponse.data && usersResponse.data.users)
        ? usersResponse.data.users 
        : [];
      
      const pending = (pendingResponse.success && pendingResponse.data && pendingResponse.data.requests)
        ? pendingResponse.data.requests 
        : [];

      const modules = (modulesResponse.success && modulesResponse.data && modulesResponse.data.modules)
        ? modulesResponse.data.modules 
        : [];

      const tests = (testsResponse.success && testsResponse.data && testsResponse.data.tests)
        ? testsResponse.data.tests 
        : [];

      setStats({
        totalUsers: Array.isArray(users) ? users.filter((u: any) => u.role === 'student').length : 0,
        pendingRequests: Array.isArray(pending) ? pending.length : 0,
        totalModules: Array.isArray(modules) ? modules.length : 0,
        totalTests: Array.isArray(tests) ? tests.length : 0,
        activeTests: 0, // TODO: Get from test assignments API
        completedTests: 0 // TODO: Get from test results API
      });

      setPendingRequests(Array.isArray(pending) ? pending : []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set empty stats on error
      setStats({
        totalUsers: 0,
        pendingRequests: 0,
        totalModules: 0,
        totalTests: 0,
        activeTests: 0,
        completedTests: 0
      });
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (id: string) => {
    try {
      await adminAPI.approveUser(id, 'student');
      showSuccess('User approved successfully!');
      // Reload data after approval
      await loadDashboardData();
    } catch (error: any) {
      console.error('Error approving user:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error?.message || error?.error?.message || 'Failed to approve user. Please check server connection.';
      showError(errorMessage);
    }
  };

  const handleRejectUser = async (id: string) => {
    try {
      await adminAPI.rejectUser(id, 'Application rejected');
      showSuccess('User rejected successfully.');
      // Reload data after rejection
      await loadDashboardData();
    } catch (error) {
      console.error('Error rejecting user:', error);
      showError('Failed to reject user. Please check server connection.');
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }> = ({ title, value, icon, color, trend }) => (
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
                {trend && (
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                    <span className="ml-1">{trend}</span>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening with your quiz portal.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              title="Total Students"
              value={stats.totalUsers}
              icon={<Users className="h-6 w-6 text-white" />}
              color="bg-blue-500"
              trend="+12%"
            />
            <StatCard
              title="Pending Requests"
              value={stats.pendingRequests}
              icon={<UserCheck className="h-6 w-6 text-white" />}
              color="bg-yellow-500"
            />
            <StatCard
              title="Total Modules"
              value={stats.totalModules}
              icon={<BookOpen className="h-6 w-6 text-white" />}
              color="bg-green-500"
              trend="+5%"
            />
            <StatCard
              title="Total Tests"
              value={stats.totalTests}
              icon={<FileText className="h-6 w-6 text-white" />}
              color="bg-purple-500"
            />
          </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button 
                onClick={() => navigate('/admin/users')}
                className="inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </button>
              <button 
                onClick={() => navigate('/admin/modules')}
                className="inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Create Module
              </button>
              <button 
                onClick={() => navigate('/admin/tests')}
                className="inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Test
              </button>
              <button 
                onClick={() => navigate('/admin/assign-modules')}
                className="inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Assign Modules
              </button>
              <button 
                onClick={() => navigate('/admin/assign-tests')}
                className="inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                Assign Tests
              </button>
              <button 
                onClick={() => navigate('/admin/analytics')}
                className="inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="mt-8 bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Pending Requests
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            ) : pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.slice(0, 3).map((request: any) => (
                  <div key={request._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-center space-x-3 mb-3 sm:mb-0">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {request.firstName} {request.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {request.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleApproveUser(request._id)}
                        className="flex-1 sm:flex-none px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleRejectUser(request._id)}
                        className="flex-1 sm:flex-none px-3 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {pendingRequests.length > 3 && (
                  <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      +{pendingRequests.length - 3} more pending requests
                    </p>
                    <button 
                      onClick={() => navigate('/admin/users')}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                    >
                      View all requests →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No pending requests</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All user registrations are up to date!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;