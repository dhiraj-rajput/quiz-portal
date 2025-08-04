import React, { useState, useEffect } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { moduleAPI, adminAPI } from '../../utils/api';
import { useNotifications } from '../../hooks/useNotifications';

interface Module {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const ModuleAssignment: React.FC = () => {
  const { showSuccess, showError, showWarning } = useNotifications();
  const [modules, setModules] = useState<Module[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [modulesResponse, studentsResponse] = await Promise.all([
        moduleAPI.getModules(1, 100),
        adminAPI.getUsers(1, 100, '', 'student')
      ]);

      if (modulesResponse.success && modulesResponse.data) {
        setModules(modulesResponse.data.modules || []);
      }

      if (studentsResponse.success && studentsResponse.data) {
        setStudents(studentsResponse.data.users || []);
      }

      // Load assignments - this would need to be implemented in the API
      // setAssignments([]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModuleAssignment = async (moduleId: string) => {
    try {
      const response = await moduleAPI.getModuleAssignment(moduleId);
      if (response.success && response.data && response.data.assignment) {
        // Pre-select students who are already assigned
        const assignedStudentIds = response.data.assignment.assignedTo?.map((student: User) => student._id) || [];
        setSelectedStudents(assignedStudentIds);
        if (response.data.assignment.dueDate) {
          setDueDate(new Date(response.data.assignment.dueDate).toISOString().split('T')[0]);
        }
      } else {
        // No assignment found for this module
        setSelectedStudents([]);
        setDueDate('');
      }
    } catch (error) {
      console.error('Error loading module assignment:', error);
      setSelectedStudents([]);
      setDueDate('');
    }
  };

  const handleAssignModule = async () => {
    if (!selectedModule || selectedStudents.length === 0) {
      showWarning('Please select a module and at least one student');
      return;
    }

    try {
      const response = await moduleAPI.assignModule(
        selectedModule,
        selectedStudents,
        dueDate || undefined
      );

      if (response.success) {
        showSuccess('Module assigned successfully!');
        setShowAssignModal(false);
        setSelectedModule('');
        setSelectedStudents([]);
        setDueDate('');
        await loadData();
      } else {
        showError('Failed to assign module: ' + (response.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error assigning module:', error);
      showError('Failed to assign module');
    }
  };

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName} ${student.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading modules and students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Module Assignments
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Assign learning modules to students by clicking "Assign to Students" on any module below
          </p>
        </div>

        {/* Modules Overview */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Available Modules ({modules.length})
            </h3>
            {modules.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {modules.map((module) => (
                  <div key={module._id} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-500">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                          {module.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {module.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                          Created: {new Date(module.createdAt).toLocaleDateString()}
                        </p>
                        <button
                          onClick={() => {
                            setSelectedModule(module._id);
                            loadModuleAssignment(module._id);
                            setShowAssignModal(true);
                          }}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                          Assign to Students
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No modules available</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Create modules first before assigning them to students. You can create modules from the Module Management page.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Assignment Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
              <div className="flex flex-col h-full">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Assign Module to Students
                    </h3>
                    {selectedModule && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Module: {modules.find(m => m._id === selectedModule)?.title}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedModule('');
                      setSelectedStudents([]);
                      setDueDate('');
                      setSearchTerm('');
                    }}
                    className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  {/* Student Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search Students
                    </label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>

                  {/* Student Selection */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Students
                      </label>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedStudents.length} of {filteredStudents.length} selected
                        </span>
                        {filteredStudents.length > 0 && (
                          <button
                            onClick={() => {
                              if (selectedStudents.length === filteredStudents.length) {
                                setSelectedStudents([]);
                              } else {
                                setSelectedStudents(filteredStudents.map(s => s._id));
                              }
                            }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                          >
                            {selectedStudents.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student, index) => (
                          <label key={student._id} className={`flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${index !== filteredStudents.length - 1 ? 'border-b border-gray-200 dark:border-gray-600' : ''}`}>
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudents([...selectedStudents, student._id]);
                                } else {
                                  setSelectedStudents(selectedStudents.filter(id => id !== student._id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="ml-4 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {student.email}
                              </p>
                            </div>
                          </label>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="h-6 w-6 text-gray-400" />
                          </div>
                          <p className="font-medium">
                            {students.length === 0 ? 'No students found' : 'No students match your search'}
                          </p>
                          <p className="text-sm mt-1">
                            {students.length === 0 ? 'Add students to your system first.' : 'Try adjusting your search terms.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedModule('');
                      setSelectedStudents([]);
                      setDueDate('');
                      setSearchTerm('');
                    }}
                    className="w-full sm:w-auto px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignModule}
                    disabled={!selectedModule || selectedStudents.length === 0}
                    className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Assign Module ({selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleAssignment;
