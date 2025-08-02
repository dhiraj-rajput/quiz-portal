import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, BookOpen, FileText, BarChart3, PieChart } from 'lucide-react';

const Analytics: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalModules: 0,
    totalTests: 0,
    testsCompleted: 0,
    averageScore: 0,
    completionRate: 0
  });

  useEffect(() => {
    // For now, we'll use localStorage data
    // In a real app, this would come from the analytics API
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const modules = JSON.parse(localStorage.getItem('modules') || '[]');
    const tests = JSON.parse(localStorage.getItem('mockTests') || '[]');
    const results = JSON.parse(localStorage.getItem('testResults') || '[]');

    const studentCount = users.filter((u: any) => u.role === 'student').length;
    const avgScore = results.length > 0 
      ? results.reduce((sum: number, result: any) => sum + result.score, 0) / results.length 
      : 0;

    setStats({
      totalStudents: studentCount,
      totalModules: modules.length,
      totalTests: tests.length,
      testsCompleted: results.length,
      averageScore: Math.round(avgScore),
      completionRate: Math.round((results.length / (tests.length * studentCount || 1)) * 100)
    });
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Monitor system performance and user engagement
          </p>
        </div>

        {/* Key Metrics */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={<Users className="h-6 w-6 text-white" />}
              color="bg-blue-500"
              change="+12%"
            />
            <StatCard
              title="Total Modules"
              value={stats.totalModules}
              icon={<BookOpen className="h-6 w-6 text-white" />}
              color="bg-green-500"
              change="+5%"
            />
            <StatCard
              title="Total Tests"
              value={stats.totalTests}
              icon={<FileText className="h-6 w-6 text-white" />}
              color="bg-purple-500"
              change="+8%"
            />
            <StatCard
              title="Tests Completed"
              value={stats.testsCompleted}
              icon={<BarChart3 className="h-6 w-6 text-white" />}
              color="bg-indigo-500"
              change="+15%"
            />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <StatCard
              title="Average Score"
              value={`${stats.averageScore}%`}
              icon={<TrendingUp className="h-6 w-6 text-white" />}
              color="bg-yellow-500"
              change="+3%"
            />
            <StatCard
              title="Completion Rate"
              value={`${stats.completionRate}%`}
              icon={<PieChart className="h-6 w-6 text-white" />}
              color="bg-red-500"
              change="+7%"
            />
          </div>
        </div>

        {/* Charts Section */}
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Test Performance Chart */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Test Performance Overview
                </h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Chart visualization would go here
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Integration with charting library needed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Activity Chart */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  User Activity Trends
                </h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Activity chart would go here
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Integration with charting library needed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="px-4 sm:px-0 mt-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Recent Test Results
              </h3>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Test
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        John Doe
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        React Basics Quiz
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          85%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        2 hours ago
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        Alice Smith
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        JavaScript Fundamentals
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          72%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        4 hours ago
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        Bob Wilson
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        React Components
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          91%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        6 hours ago
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
