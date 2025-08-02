import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2, Users, Search, Clock } from 'lucide-react';
import { testAPI } from '../../utils/api';

interface Test {
  _id: string;
  title: string;
  description: string;
  instructions: string;
  questions: Array<{
    _id: string;
    question: string;
    options: Array<{
      text: string;
      isCorrect: boolean;
    }>;
    explanation: string;
    points: number;
  }>;
  totalQuestions: number;
  totalPoints: number;
  timeLimit: number;
  isPublished: boolean;
  createdBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

const TestManagement: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [newTest, setNewTest] = useState({
    title: '',
    description: '',
    instructions: '',
    timeLimit: 30,
    questions: [{
      question: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      explanation: '',
      points: 1
    }]
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const response = await testAPI.getTests(1, 50);
      if (response.success && response.data) {
        setTests(response.data.tests);
      }
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e: React.FormEvent, isPublished: boolean = true) => {
    e.preventDefault();
    try {
      // Validate that each question has exactly one correct answer
      for (const question of newTest.questions) {
        const correctCount = question.options.filter(opt => opt.isCorrect).length;
        if (correctCount !== 1) {
          alert('Each question must have exactly one correct answer');
          return;
        }
      }

      // Create test data with publish status
      const testData = {
        ...newTest,
        isPublished
      };

      await testAPI.createTest(testData);
      
      // Close modal first
      setShowCreateModal(false);
      
      // Reset form completely with a fresh state
      const freshState = {
        title: '',
        description: '',
        instructions: '',
        timeLimit: 30,
        questions: [{
          question: '',
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ],
          explanation: '',
          points: 1
        }]
      };
      setNewTest(freshState);
      
      await loadTests();
      alert(`Test ${isPublished ? 'created and published' : 'saved as draft'} successfully!`);
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Failed to create test. Please try again.');
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      try {
        await testAPI.deleteTest(id);
        await loadTests();
      } catch (error) {
        console.error('Error deleting test:', error);
      }
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? 'unpublish' : 'publish';
    if (window.confirm(`Are you sure you want to ${action} this test?`)) {
      try {
        await testAPI.updateTest(id, { isPublished: !currentStatus });
        await loadTests();
        alert(`Test ${action}ed successfully!`);
      } catch (error) {
        console.error(`Error ${action}ing test:`, error);
        alert(`Failed to ${action} test. Please try again.`);
      }
    }
  };

  const handleEditTest = (test: Test) => {
    setEditingTest(test);
    setNewTest({
      title: test.title,
      description: test.description,
      instructions: test.instructions,
      timeLimit: test.timeLimit,
      questions: test.questions.map(q => ({
        question: q.question,
        options: q.options.map(opt => ({ text: opt.text, isCorrect: opt.isCorrect })),
        explanation: q.explanation || '',
        points: q.points
      }))
    });
    setShowEditModal(true);
  };

  const handleUpdateTest = async (e: React.FormEvent, isPublished: boolean = true) => {
    e.preventDefault();
    if (!editingTest) return;

    try {
      // Validate that each question has exactly one correct answer
      for (const question of newTest.questions) {
        const correctCount = question.options.filter(opt => opt.isCorrect).length;
        if (correctCount !== 1) {
          alert('Each question must have exactly one correct answer');
          return;
        }
      }

      // Update test data with publish status
      const testData = {
        ...newTest,
        isPublished
      };

      await testAPI.updateTest(editingTest._id, testData);
      
      // Close modal first
      setShowEditModal(false);
      setEditingTest(null);
      
      // Reset form completely with a fresh state
      resetForm();
      
      await loadTests();
      alert(`Test updated successfully!`);
    } catch (error) {
      console.error('Error updating test:', error);
      alert('Failed to update test. Please try again.');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTest(null);
    resetForm();
  };

  const addQuestion = () => {
    setNewTest({
      ...newTest,
      questions: [
        ...newTest.questions,
        {
          question: '',
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ],
          explanation: '',
          points: 1
        }
      ]
    });
  };

  const removeQuestion = (index: number) => {
    if (newTest.questions.length > 1) {
      setNewTest({
        ...newTest,
        questions: newTest.questions.filter((_, i) => i !== index)
      });
    }
  };

  const updateQuestion = (questionIndex: number, field: string, value: any) => {
    const updatedQuestions = [...newTest.questions];
    (updatedQuestions[questionIndex] as any)[field] = value;
    setNewTest({ ...newTest, questions: updatedQuestions });
  };

  const updateOption = (questionIndex: number, optionIndex: number, field: string, value: any) => {
    const updatedQuestions = [...newTest.questions];
    (updatedQuestions[questionIndex].options[optionIndex] as any)[field] = value;
    
    // If setting this option as correct, make sure others are not correct
    if (field === 'isCorrect' && value === true) {
      updatedQuestions[questionIndex].options.forEach((opt, idx) => {
        if (idx !== optionIndex) {
          opt.isCorrect = false;
        }
      });
    }
    
    setNewTest({ ...newTest, questions: updatedQuestions });
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...newTest.questions];
    updatedQuestions[questionIndex].options.push({ text: '', isCorrect: false });
    setNewTest({ ...newTest, questions: updatedQuestions });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...newTest.questions];
    if (updatedQuestions[questionIndex].options.length > 2) {
      updatedQuestions[questionIndex].options.splice(optionIndex, 1);
      setNewTest({ ...newTest, questions: updatedQuestions });
    }
  };

  const resetForm = () => {
    setNewTest({
      title: '',
      description: '',
      instructions: '',
      timeLimit: 30,
      questions: [{
        question: '',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ],
        explanation: '',
        points: 1
      }]
    });
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const filteredTests = tests.filter(test =>
    test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Test Management</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Create and manage quiz tests with multiple-choice questions
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-0 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tests Grid */}
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTests.map((test) => (
              <div key={test._id} className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-indigo-600" />
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{test.title}</h3>
                        <div className="flex items-center mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            test.isPublished 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {test.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleTogglePublish(test._id, test.isPublished)}
                        className={`${
                          test.isPublished 
                            ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400' 
                            : 'text-green-600 hover:text-green-900 dark:text-green-400'
                        }`}
                        title={test.isPublished ? 'Unpublish Test' : 'Publish Test'}
                      >
                        {test.isPublished ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                      <button 
                        onClick={() => handleEditTest(test)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                        title="Edit Test"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTest(test._id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{test.description}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <FileText className="h-4 w-4 mr-1" />
                      {test.totalQuestions} questions
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="h-4 w-4 mr-1" />
                      {test.timeLimit} mins
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Users className="h-4 w-4 mr-1" />
                      Created by {test.createdBy.firstName} {test.createdBy.lastName}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(test.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Points:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{test.totalPoints}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTests.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tests found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new test.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create New Test</h3>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateTest}>
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Title
                      </label>
                      <input
                        type="text"
                        required
                        value={newTest.title}
                        onChange={(e) => setNewTest({...newTest, title: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter test title"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Time Limit (minutes)
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="180"
                        required
                        value={newTest.timeLimit}
                        onChange={(e) => setNewTest({...newTest, timeLimit: parseInt(e.target.value)})}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={newTest.description}
                      onChange={(e) => setNewTest({...newTest, description: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter test description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Instructions
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newTest.instructions}
                      onChange={(e) => setNewTest({...newTest, instructions: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter instructions for students"
                    />
                  </div>

                  {/* Questions */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">Questions</h4>
                      <button
                        type="button"
                        onClick={addQuestion}
                        className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                      >
                        + Add Question
                      </button>
                    </div>

                    {newTest.questions.map((question, questionIndex) => (
                      <div key={questionIndex} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium text-gray-900 dark:text-white">Question {questionIndex + 1}</h5>
                          {newTest.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuestion(questionIndex)}
                              className="text-red-600 hover:text-red-500 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <input
                              type="text"
                              required
                              placeholder="Enter question text"
                              value={question.question}
                              onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Options:</label>
                              <button
                                type="button"
                                onClick={() => addOption(questionIndex)}
                                className="text-sm text-indigo-600 hover:text-indigo-500"
                              >
                                + Add Option
                              </button>
                            </div>
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`question-${questionIndex}`}
                                  checked={option.isCorrect}
                                  onChange={() => updateOption(questionIndex, optionIndex, 'isCorrect', true)}
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <input
                                  type="text"
                                  required
                                  placeholder={`Option ${optionIndex + 1}`}
                                  value={option.text}
                                  onChange={(e) => updateOption(questionIndex, optionIndex, 'text', e.target.value)}
                                  className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {question.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(questionIndex, optionIndex)}
                                    className="text-red-600 hover:text-red-500 text-sm"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Answer Explanation:
                            </label>
                            <textarea
                              placeholder="Explain why this answer is correct..."
                              value={question.explanation}
                              onChange={(e) => updateQuestion(questionIndex, 'explanation', e.target.value)}
                              rows={2}
                              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="flex items-center space-x-4">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Points:</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={question.points}
                              onChange={(e) => updateQuestion(questionIndex, 'points', parseInt(e.target.value))}
                              className="w-20 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleCreateTest(e, false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                  >
                    Create & Publish
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Test Modal */}
      {showEditModal && editingTest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Test: {editingTest.title}</h3>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleUpdateTest}>
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Title
                      </label>
                      <input
                        type="text"
                        required
                        value={newTest.title}
                        onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Time Limit (minutes)
                      </label>
                      <input
                        type="number"
                        required
                        min="5"
                        max="180"
                        value={newTest.timeLimit}
                        onChange={(e) => setNewTest({ ...newTest, timeLimit: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newTest.description}
                      onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Brief description of the test"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Instructions
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={newTest.instructions}
                      onChange={(e) => setNewTest({ ...newTest, instructions: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Detailed instructions for taking the test"
                    />
                  </div>

                  {/* Questions */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-medium text-gray-900 dark:text-white">Questions</h4>
                      <button
                        type="button"
                        onClick={addQuestion}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Question
                      </button>
                    </div>

                    {newTest.questions.map((question, questionIndex) => (
                      <div key={questionIndex} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium text-gray-900 dark:text-white">Question {questionIndex + 1}</h5>
                          {newTest.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuestion(questionIndex)}
                              className="text-red-600 hover:text-red-500 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <input
                              type="text"
                              required
                              placeholder="Enter question text"
                              value={question.question}
                              onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Options:</label>
                              <button
                                type="button"
                                onClick={() => addOption(questionIndex)}
                                className="text-sm text-indigo-600 hover:text-indigo-500"
                              >
                                + Add Option
                              </button>
                            </div>
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`question-${questionIndex}`}
                                  checked={option.isCorrect}
                                  onChange={() => updateOption(questionIndex, optionIndex, 'isCorrect', true)}
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <input
                                  type="text"
                                  required
                                  placeholder={`Option ${optionIndex + 1}`}
                                  value={option.text}
                                  onChange={(e) => updateOption(questionIndex, optionIndex, 'text', e.target.value)}
                                  className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {question.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(questionIndex, optionIndex)}
                                    className="text-red-600 hover:text-red-500 text-sm"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Answer Explanation:
                            </label>
                            <textarea
                              placeholder="Explain why this answer is correct..."
                              value={question.explanation}
                              onChange={(e) => updateQuestion(questionIndex, 'explanation', e.target.value)}
                              rows={2}
                              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="flex items-center space-x-4">
                            <label className="text-sm text-gray-700 dark:text-gray-300">Points:</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={question.points}
                              onChange={(e) => updateQuestion(questionIndex, 'points', parseInt(e.target.value))}
                              className="w-20 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleUpdateTest(e, false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                  >
                    Update & Publish
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestManagement;
