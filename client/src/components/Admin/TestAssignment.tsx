import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import { testAPI, adminAPI } from '../../utils/api';
import { useNotifications } from '../../hooks/useNotifications';

interface Test {
  _id: string;
  title: string;
  description: string;
  questions: any[];
  timeLimit: number;
  createdAt: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface TestAssignment {
  _id: string;
  test: Test;
  assignedTo: User[];
  dueDate: string;
  startDate: string;
  createdAt: string;
}

const TestAssignment: React.FC = () => {
  const { showSuccess, showError } = useNotifications();
  const [tests, setTests] = useState<Test[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [isCustomAttempts, setIsCustomAttempts] = useState(false);
  const [customAttempts, setCustomAttempts] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [testsResponse, studentsResponse] = await Promise.all([
        testAPI.getTests(1, 100),
        adminAPI.getUsers(1, 100, '', 'student')
      ]);

      if (testsResponse.success && testsResponse.data) {
        setTests(testsResponse.data.tests || []);
      }

      if (studentsResponse.success && studentsResponse.data) {
        setStudents(studentsResponse.data.users || []);
      }
    } catch (error) {
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadTestAssignment = async (testId: string) => {
    try {
      const response = await testAPI.getTestAssignment(testId);
      if (response.success && response.data && response.data.assignment) {
        setCurrentAssignment(response.data.assignment);
        // Pre-select students who are already assigned
        const assignedStudentIds = response.data.assignment.assignedTo.map((student: any) => student._id);
        setSelectedStudents(assignedStudentIds);
        
        // Set dates if they exist
        if (response.data.assignment.dueDate) {
          setDueDate(new Date(response.data.assignment.dueDate).toISOString().slice(0, 16));
        }
      } else {
        // No assignment exists for this test, reset selections
        setCurrentAssignment(null);
        setSelectedStudents([]);
        setDueDate('');
        setStartDate('');
      }
    } catch (error) {
      showError('Failed to load test assignment');
      setCurrentAssignment(null);
      setSelectedStudents([]);
    }
  };

  const handleTestChange = (testId: string) => {
    setSelectedTest(testId);
    if (testId) {
      loadTestAssignment(testId);
    } else {
      setSelectedStudents([]);
      setCurrentAssignment(null);
    }
  };

  const handleAssignTest = async () => {
    if (!selectedTest || selectedStudents.length === 0) {
      showError('Please select a test and at least one student');
      return;
    }

    if (!dueDate) {
      showError('Please set a due date');
      return;
    }

    try {
      await testAPI.assignTest(selectedTest, {
        studentIds: selectedStudents,
        dueDate: dueDate,
        timeLimit: tests.find(t => t._id === selectedTest)?.timeLimit || 30,
        maxAttempts: maxAttempts
      });

      showSuccess('Test assigned successfully!');
      setShowAssignModal(false);
      setSelectedTest('');
      setSelectedStudents([]);
      setStartDate('');
      setDueDate('');
      setMaxAttempts(3);
      setIsCustomAttempts(false);
      setCustomAttempts('');
      setCurrentAssignment(null);
      await loadData();
    } catch (error) {
      showError('Failed to assign test. Please try again.');
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Test Assignments</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Assign mock tests to students with scheduled dates
              </p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign Test
            </button>
          </div>
        </div>

        {/* Tests Overview */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Available Tests
              </h3>
              {tests.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tests.map((test) => (
                    <div key={test._id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                      <div className="flex items-start">
                        <FileText className="h-6 w-6 text-purple-500 mt-1" />
                        <div className="ml-3 flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {test.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {test.description}
                          </p>
                          <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>{test.questions?.length || 0} questions</span>
                            <span className="mx-2">•</span>
                            <span>{test.timeLimit} minutes</span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedTest(test._id);
                              loadTestAssignment(test._id);
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
                  No tests available. Create tests first.
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
                  Assign Test to Students
                </h3>

                {/* Test Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Test
                  </label>
                  <select
                    value={selectedTest}
                    onChange={(e) => handleTestChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Choose a test...</option>
                    {tests.map((test) => (
                      <option key={test._id} value={test._id}>
                        {test.title} ({test.questions?.length || 0} questions, {test.timeLimit} min)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Maximum Attempts
                    </label>
                    <div className="space-y-2">
                      <select
                        value={isCustomAttempts ? 'custom' : maxAttempts}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'custom') {
                            setIsCustomAttempts(true);
                            setCustomAttempts(maxAttempts.toString());
                          } else if (value === 'unlimited') {
                            setIsCustomAttempts(false);
                            setMaxAttempts(-1);
                          } else {
                            setIsCustomAttempts(false);
                            setMaxAttempts(Number(value));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value={1}>1 Attempt</option>
                        <option value={2}>2 Attempts</option>
                        <option value={3}>3 Attempts</option>
                        <option value={4}>4 Attempts</option>
                        <option value={5}>5 Attempts</option>
                        <option value={6}>6 Attempts</option>
                        <option value="unlimited">Unlimited</option>
                        <option value="custom">Custom (Manual Input)</option>
                      </select>
                      
                      {isCustomAttempts && (
                        <div className="mt-2">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="Enter number of attempts"
                            value={customAttempts}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCustomAttempts(value);
                              if (value && !isNaN(Number(value))) {
                                setMaxAttempts(Number(value));
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">Enter any number between 1-100</p>
                        </div>
                      )}
                    </div>
                  </div>
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
                    {currentAssignment && (
                      <span className="text-sm text-blue-600 dark:text-blue-400 ml-2">
                        (Some students are already assigned to this test)
                      </span>
                    )}
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
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
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No students found
                      </p>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedTest('');
                      setSelectedStudents([]);
                      setStartDate('');
                      setDueDate('');
                      setSearchTerm('');
                      setMaxAttempts(3);
                      setIsCustomAttempts(false);
                      setCustomAttempts('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignTest}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Assign Test
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

export default TestAssignment;
