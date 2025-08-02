import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { adminAPI } from '../../utils/api';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
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
      const [usersResponse, pendingResponse] = await Promise.all([
        adminAPI.getUsers(1, 10).catch(() => ({ success: false, data: null })),
        adminAPI.getPendingRequests(1, 10).catch(() => ({ success: false, data: null }))
      ]);

      // Ensure we have arrays, fallback to localStorage if API fails
      const users = (usersResponse.success && usersResponse.data && usersResponse.data.users)
        ? usersResponse.data.users 
        : JSON.parse(localStorage.getItem('users') || '[]');
      
      const pending = (pendingResponse.success && pendingResponse.data && pendingResponse.data.requests)
        ? pendingResponse.data.requests 
        : JSON.parse(localStorage.getItem('pendingRequests') || '[]');

      const modules = JSON.parse(localStorage.getItem('modules') || '[]');
      const mockTests = JSON.parse(localStorage.getItem('mockTests') || '[]');
      const testAssignments = JSON.parse(localStorage.getItem('testAssignments') || '[]');
      const testResults = JSON.parse(localStorage.getItem('testResults') || '[]');

      setStats({
        totalUsers: Array.isArray(users) ? users.filter((u: any) => u.role === 'student').length : 0,
        pendingRequests: Array.isArray(pending) ? pending.length : 0,
        totalModules: Array.isArray(modules) ? modules.length : 0,
        totalTests: Array.isArray(mockTests) ? mockTests.length : 0,
        activeTests: Array.isArray(testAssignments) ? testAssignments.length : 0,
        completedTests: Array.isArray(testResults) ? testResults.length : 0
      });

      setPendingRequests(Array.isArray(pending) ? pending : []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to localStorage data
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const pending = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
      const modules = JSON.parse(localStorage.getItem('modules') || '[]');
      const mockTests = JSON.parse(localStorage.getItem('mockTests') || '[]');
      const testAssignments = JSON.parse(localStorage.getItem('testAssignments') || '[]');
      const testResults = JSON.parse(localStorage.getItem('testResults') || '[]');

      setStats({
        totalUsers: Array.isArray(users) ? users.filter((u: any) => u.role === 'student').length : 0,
        pendingRequests: Array.isArray(pending) ? pending.length : 0,
        totalModules: Array.isArray(modules) ? modules.length : 0,
        totalTests: Array.isArray(mockTests) ? mockTests.length : 0,
        activeTests: Array.isArray(testAssignments) ? testAssignments.length : 0,
        completedTests: Array.isArray(testResults) ? testResults.length : 0
      });

      setPendingRequests(Array.isArray(pending) ? pending : []);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (id: string) => {
    try {
      await adminAPI.approveUser(id, 'student');
      // Reload data after approval
      await loadDashboardData();
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user. Please check server connection.');
    }
  };

  const handleRejectUser = async (id: string) => {
    try {
      await adminAPI.rejectUser(id, 'Application rejected');
      // Reload data after rejection
      await loadDashboardData();
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user. Please check server connection.');
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
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening with your quiz portal.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>

        {/* Quick Actions */}
        <div className="px-4 sm:px-0 mt-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Quick Actions
              </h3>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <button 
                  onClick={() => navigate('/admin/users')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </button>
                <button 
                  onClick={() => navigate('/admin/modules')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Create Module
                </button>
                <button 
                  onClick={() => navigate('/admin/tests')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Test
                </button>
                <button 
                  onClick={() => navigate('/admin/assign-modules')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Assign Modules
                </button>
                <button 
                  onClick={() => navigate('/admin/assign-tests')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Assign Tests
                </button>
                <button 
                  onClick={() => navigate('/admin/analytics')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Requests */}
        <div className="px-4 sm:px-0 mt-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Pending Requests
              </h3>
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.slice(0, 3).map((request: any) => (
                    <div key={request._id || request.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
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
                          onClick={() => handleApproveUser(request._id || request.id)}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectUser(request._id || request.id)}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingRequests.length > 3 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      +{pendingRequests.length - 3} more pending requests
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No pending requests
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="px-4 sm:px-0 mt-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Recent Activities
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-2 w-2 rounded-full bg-green-400"></div>
                  <div className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                    New test submission received
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    5 min ago
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-400"></div>
                  <div className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                    Module assigned to students
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    1 hour ago
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-2 w-2 rounded-full bg-purple-400"></div>
                  <div className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                    New user registration
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    2 hours ago
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

export default AdminDashboard;