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
      <div className="module-assignment-loading-container">
        <div className="module-assignment-loading-content">
          <div className="module-assignment-loading-spinner"></div>
          <p className="module-assignment-loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-assignment-container">
      <div className="module-assignment-content">
        {/* Header */}
        <div className="module-assignment-header">
          <div>
            <h1 className="module-assignment-title">Module Assignments</h1>
            <p className="module-assignment-subtitle">
              Assign learning modules to students by clicking "Assign to Students" on any module below
            </p>
          </div>
        </div>

        {/* Modules Overview */}
        <div className="modules-overview">
          <div className="modules-overview-card">
            <div className="modules-overview-content">
              <h3 className="modules-overview-title">
                Available Modules
              </h3>
              {modules.length > 0 ? (
                <div className="modules-grid">
                  {modules.map((module) => (
                    <div key={module._id} className="module-card">
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
                <p className="modules-empty-state">
                  No modules available. Create modules first.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Modal */}
        {showAssignModal && (
          <div className="assignment-modal-overlay">
            <div className="assignment-modal-container">
              <div className="assignment-modal-content">
                <h3 className="assignment-modal-title">
                  Assign Module to Students
                  {selectedModule && (
                    <span className="assignment-modal-module-info">
                      {modules.find(m => m._id === selectedModule)?.title}
                    </span>
                  )}
                </h3>

                {/* Due Date */}
                <div className="due-date-section">
                  <label className="due-date-label">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="due-date-input"
                  />
                </div>

                {/* Student Search */}
                <div className="student-search-section">
                  <label className="student-search-label">
                    Search Students
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="student-search-input"
                    />
                  </div>
                </div>

                {/* Student Selection */}
                <div className="student-selection-section">
                  <div className="student-selection-header">
                    <label className="student-selection-label">
                      Select Students
                    </label>
                    <span className="student-selection-count">({selectedStudents.length} selected)</span>
                  </div>
                  <div className="student-list-container">
                    {filteredStudents.map((student) => (
                      <label key={student._id} className="student-list-item">
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
                          className="student-checkbox"
                        />
                        <div className="student-info">
                          <p className="student-name">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="student-email">
                            {student.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="modal-actions">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedModule('');
                      setSelectedStudents([]);
                      setDueDate('');
                      setSearchTerm('');
                    }}
                    className="modal-cancel-button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignModule}
                    className="modal-assign-button"
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
