import React, { useState, useEffect } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { moduleAPI, adminAPI } from '../../utils/api';

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
      alert('Please select a module and at least one student');
      return;
    }

    try {
      const response = await moduleAPI.assignModule(
        selectedModule,
        selectedStudents,
        dueDate || undefined
      );

      if (response.success) {
        alert('Module assigned successfully!');
        setShowAssignModal(false);
        setSelectedModule('');
        setSelectedStudents([]);
        setDueDate('');
        await loadData();
      } else {
        alert('Failed to assign module: ' + (response.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error assigning module:', error);
      alert('Failed to assign module');
    }
  };

  const filteredStudents = students.filter(student =>
    `${student.firstName} ${student.lastName} ${student.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Module Assignments</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Assign learning modules to students by clicking "Assign to Students" on any module below
            </p>
          </div>
        </div>

        {/* Modules Overview */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Available Modules
              </h3>
              {modules.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {modules.map((module) => (
                    <div key={module._id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                      <div className="flex items-start">
                        <BookOpen className="h-6 w-6 text-blue-500 mt-1" />
                        <div className="ml-3 flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {module.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {module.description}
                          </p>
                          <button
                            onClick={() => {
                              setSelectedModule(module._id);
                              loadModuleAssignment(module._id);
                              setShowAssignModal(true);
                            }}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          >
                            Assign to Students
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No modules available. Create modules first.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Assign Module to Students
                  {selectedModule && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 block">
                      {modules.find(m => m._id === selectedModule)?.title}
                    </span>
                  )}
                </h3>

                {/* Due Date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Student Search */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Students
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Student Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Students ({selectedStudents.length} selected)
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                    {filteredStudents.map((student) => (
                      <label key={student._id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
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
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {student.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedModule('');
                      setSelectedStudents([]);
                      setDueDate('');
                      setSearchTerm('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignModule}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Assign Module
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
