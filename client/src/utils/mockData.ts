import { User, PendingRequest, Module, MockTest, TestAssignment, TestResult, ModuleAssignment } from '../types';

// Initialize mock data in localStorage if not exists
export const initializeMockData = () => {
  // Admin user
  const adminUser: User = {
    id: '1',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    admissionDate: '2024-01-01',
    createdAt: '2024-01-01T00:00:00Z'
  };

  // Student users
  const studentUsers: User[] = [
    {
      id: '2',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'student',
      status: 'active',
      admissionDate: '2024-01-15',
      createdAt: '2024-01-15T00:00:00Z'
    },
    {
      id: '3',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@student.com',
      role: 'student',
      status: 'active',
      admissionDate: '2024-01-20',
      createdAt: '2024-01-20T00:00:00Z'
    }
  ];

  // Pending requests
  const pendingRequests: PendingRequest[] = [
    {
      id: '4',
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@student.com',
      admissionDate: '2024-02-01',
      status: 'pending',
      createdAt: '2024-02-01T00:00:00Z'
    },
    {
      id: '5',
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob@student.com',
      admissionDate: '2024-02-02',
      status: 'pending',
      createdAt: '2024-02-02T00:00:00Z'
    }
  ];

  // Sample modules
  const modules: Module[] = [
    {
      id: '1',
      title: 'Introduction to React',
      description: 'Learn the basics of React including components, props, and state management.',
      files: [
        {
          _id: '1',
          fileName: 'react-basics.pdf',
          originalName: 'React Basics.pdf',
          filePath: '/uploads/modules/react-basics.pdf',
          fileType: 'pdf',
          fileSize: 2048000,
          uploadedAt: '2024-01-10T00:00:00Z'
        },
        {
          _id: '2',
          fileName: 'react-tutorial-video.mp4',
          originalName: 'React Tutorial Video.mp4',
          filePath: '/uploads/modules/react-tutorial-video.mp4',
          fileType: 'mp4',
          fileSize: 15728640,
          uploadedAt: '2024-01-10T00:00:00Z'
        }
      ],
      createdBy: '1',
      createdAt: '2024-01-10T00:00:00Z'
    },
    {
      id: '2',
      title: 'JavaScript Fundamentals',
      description: 'Master JavaScript concepts including ES6 features, async/await, and more.',
      files: [
        {
          _id: '3',
          fileName: 'js-fundamentals.pdf',
          originalName: 'JS Fundamentals.pdf',
          filePath: '/uploads/modules/js-fundamentals.pdf',
          fileType: 'pdf',
          fileSize: 1536000,
          uploadedAt: '2024-01-08T00:00:00Z'
        }
      ],
      createdBy: '1',
      createdAt: '2024-01-12T00:00:00Z'
    }
  ];

  // Sample mock tests
  const mockTests: MockTest[] = [
    {
      id: '1',
      title: 'React Basics Quiz',
      instructions: 'Answer all questions to the best of your ability. You have 30 minutes to complete this test.',
      description: 'Test your knowledge of React fundamentals including components, props, and state.',
      questions: [
        {
          id: '1',
          text: 'What is JSX?',
          options: [
            'A JavaScript library',
            'A syntax extension for JavaScript',
            'A CSS framework',
            'A database query language'
          ],
          correctAnswer: 1,
          explanation: 'JSX is a syntax extension for JavaScript that allows you to write HTML-like code in your JavaScript files.'
        },
        {
          id: '2',
          text: 'Which hook is used for managing state in functional components?',
          options: [
            'useEffect',
            'useState',
            'useContext',
            'useReducer'
          ],
          correctAnswer: 1,
          explanation: 'useState is the primary hook for managing local state in functional components.'
        },
        {
          id: '3',
          text: 'What is the purpose of the key prop in React lists?',
          options: [
            'To style list items',
            'To help React identify which items have changed',
            'To sort the list',
            'To filter the list'
          ],
          correctAnswer: 1,
          explanation: 'The key prop helps React identify which items have changed, are added, or are removed, improving performance.'
        }
      ],
      createdBy: '1',
      createdAt: '2024-01-15T00:00:00Z'
    },
    {
      id: '2',
      title: 'JavaScript Advanced Concepts',
      instructions: 'This test covers advanced JavaScript topics. Take your time and read each question carefully.',
      description: 'Advanced JavaScript concepts including closures, promises, and async programming.',
      questions: [
        {
          id: '4',
          text: 'What is a closure in JavaScript?',
          options: [
            'A way to close a function',
            'A function that has access to variables in its outer scope',
            'A method to end a loop',
            'A type of error handling'
          ],
          correctAnswer: 1,
          explanation: 'A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned.'
        },
        {
          id: '5',
          text: 'What does async/await do?',
          options: [
            'Makes code run faster',
            'Handles synchronous operations',
            'Provides a cleaner way to work with promises',
            'Creates new threads'
          ],
          correctAnswer: 2,
          explanation: 'async/await provides a cleaner, more readable way to work with promises and asynchronous code.'
        }
      ],
      createdBy: '1',
      createdAt: '2024-01-18T00:00:00Z'
    }
  ];

  // Sample test assignments
  const testAssignments: TestAssignment[] = [
    {
      id: '1',
      testId: '1',
      assignedTo: ['2', '3'],
      dueDate: '2024-12-31T23:59:59Z',
      timeLimit: 30,
      maxAttempts: 2,
      createdBy: '1',
      createdAt: '2024-01-16T00:00:00Z'
    },
    {
      id: '2',
      testId: '2',
      assignedTo: ['2'],
      dueDate: '2024-12-25T23:59:59Z',
      timeLimit: 45,
      maxAttempts: 1,
      createdBy: '1',
      createdAt: '2024-01-19T00:00:00Z'
    }
  ];

  // Sample test results
  const testResults: TestResult[] = [
    {
      id: '1',
      userId: '2',
      testId: '1',
      assignmentId: '1',
      answers: [1, 1, 1],
      score: 100,
      timeSpent: 1200, // 20 minutes
      submittedAt: '2024-01-17T10:30:00Z',
      attemptNumber: 1
    }
  ];

  // Sample module assignments
  const moduleAssignments: ModuleAssignment[] = [
    {
      id: '1',
      moduleId: '1',
      assignedTo: ['2', '3'],
      assignedBy: '1',
      createdAt: '2024-01-11T00:00:00Z'
    },
    {
      id: '2',
      moduleId: '2',
      assignedTo: ['2'],
      assignedBy: '1',
      createdAt: '2024-01-13T00:00:00Z'
    }
  ];

  // Initialize data if not exists
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([adminUser, ...studentUsers]));
  }
  if (!localStorage.getItem('pendingRequests')) {
    localStorage.setItem('pendingRequests', JSON.stringify(pendingRequests));
  }
  if (!localStorage.getItem('modules')) {
    localStorage.setItem('modules', JSON.stringify(modules));
  }
  if (!localStorage.getItem('mockTests')) {
    localStorage.setItem('mockTests', JSON.stringify(mockTests));
  }
  if (!localStorage.getItem('testAssignments')) {
    localStorage.setItem('testAssignments', JSON.stringify(testAssignments));
  }
  if (!localStorage.getItem('testResults')) {
    localStorage.setItem('testResults', JSON.stringify(testResults));
  }
  if (!localStorage.getItem('moduleAssignments')) {
    localStorage.setItem('moduleAssignments', JSON.stringify(moduleAssignments));
  }
};