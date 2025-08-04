import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, FileText, ExternalLink } from 'lucide-react';
import { studentAPI } from '../../utils/api';
import { useNotifications } from '../../hooks/useNotifications';

interface Module {
  _id: string;
  title: string;
  description: string;
  files: any[];
  createdAt: string;
}

interface ModuleAssignment {
  _id: string;
  moduleId: Module;
  dueDate?: string;
  createdAt: string;
  status?: 'assigned' | 'in-progress' | 'completed';
}

const StudentModules: React.FC = () => {
  const [assignments, setAssignments] = useState<ModuleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getAssignedModules(1, 100);
      if (response.success && response.data) {
        setAssignments(response.data.modules || []);
      } else {
        setError('No module assignments found');
      }
    } catch (err) {
      setError('Failed to load module assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (moduleId: string) => {
    // Open document viewer in new tab
    const url = `/student/modules/${moduleId}/view`;
    window.open(url, '_blank');
  };

  const handleMarkComplete = async (assignmentId: string) => {
    try {
      const response = await studentAPI.markModuleComplete(assignmentId);
      if (response.success) {
        showSuccess('Module marked as complete!');
        // Reload assignments to update the UI
        await loadAssignments();
      } else {
        showError('Failed to mark module as complete');
      }
    } catch (error) {
      showError('Error marking module as complete. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Modules</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Access your assigned learning modules and resources
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Modules Grid */}
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No modules assigned</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You don't have any modules assigned yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {assignments.map((assignment) => (
              <div
                key={assignment._id}
                className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Module Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {assignment.moduleId?.title || 'Module'}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assignment.status || 'assigned')}`}>
                          {(assignment.status || 'assigned').replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {assignment.moduleId?.description || 'No description available'}
                  </p>

                  {/* Dates */}
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Due: {assignment.dueDate ? formatDate(assignment.dueDate) : 'No due date'}</span>
                    </div>
                    <span>Assigned: {assignment.createdAt ? formatDate(assignment.createdAt) : 'Recently'}</span>
                  </div>

                  {/* Files */}
                  {assignment.moduleId?.files && assignment.moduleId.files.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Resources ({assignment.moduleId.files.length})
                      </h4>
                      <div className="space-y-2">
                        {assignment.moduleId.files.slice(0, 3).map((file: any, index: number) => (
                          <div key={index} className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0" />
                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                              {file?.originalName || `File ${index + 1}`}
                            </span>
                          </div>
                        ))}
                        {assignment.moduleId.files.length > 3 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            +{assignment.moduleId.files.length - 3} more files
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex justify-between">
                    <button 
                      onClick={() => handleViewDetails(assignment.moduleId?._id || '')}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </button>
                    {(assignment.status || 'assigned') !== 'completed' && (
                      <button 
                        onClick={() => handleMarkComplete(assignment._id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentModules;
