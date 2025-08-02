import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './database';
import User from '../models/User';
import PendingRequest from '../models/PendingRequest';
import Module from '../models/Module';
import MockTest from '../models/MockTest';
import ModuleAssignment from '../models/ModuleAssignment';
import TestAssignment from '../models/TestAssignment';

// Load environment variables
dotenv.config();

const seedData = async (): Promise<void> => {
  console.log('🌱 Starting database seeding...');
  try {
    // Connect to database
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await PendingRequest.deleteMany({});
    await Module.deleteMany({});
    await MockTest.deleteMany({});
    await ModuleAssignment.deleteMany({});
    await TestAssignment.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@quiz.com',
      password: 'Admin123!',
      role: 'admin',
      status: 'active',
      admissionDate: new Date('2024-01-01'),
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create sample students
    const student1 = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'student@quiz.com',
      password: 'Student123!',
      role: 'student',
      status: 'active',
      admissionDate: new Date('2024-01-15'),
    });

    const student2 = await User.create({
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@quiz.com',
      password: 'Student123!',
      role: 'student',
      status: 'active',
      admissionDate: new Date('2024-01-20'),
    });

    console.log('✅ Created student users');

    // Create pending requests
    await PendingRequest.create({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@quiz.com',
      password: 'Password123!',
      admissionDate: new Date('2024-02-01'),
    });

    await PendingRequest.create({
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@quiz.com',
      password: 'Password123!',
      admissionDate: new Date('2024-02-05'),
    });

    console.log('✅ Created pending requests');

    // Create sample modules
    const module1 = await Module.create({
      title: 'Introduction to JavaScript',
      description: 'Learn the basics of JavaScript programming language, including variables, functions, and control structures.',
      files: [
        {
          fileName: 'js-basics.pdf',
          originalName: 'JavaScript Basics.pdf',
          filePath: '/uploads/modules/js-basics.pdf',
          fileType: 'pdf',
          fileSize: 1024000,
        },
        {
          fileName: 'js-examples.docx',
          originalName: 'JavaScript Examples.docx',
          filePath: '/uploads/modules/js-examples.docx',
          fileType: 'docx',
          fileSize: 512000,
        },
      ],
      createdBy: adminUser._id,
    });

    const module2 = await Module.create({
      title: 'React Fundamentals',
      description: 'Understanding React components, state management, and hooks for building modern web applications.',
      files: [
        {
          fileName: 'react-intro.pdf',
          originalName: 'React Introduction.pdf',
          filePath: '/uploads/modules/react-intro.pdf',
          fileType: 'pdf',
          fileSize: 2048000,
        },
      ],
      createdBy: adminUser._id,
    });

    console.log('✅ Created sample modules');

    // Create sample mock tests
    const mockTest1 = await MockTest.create({
      title: 'JavaScript Basics Quiz',
      instructions: 'This is a basic quiz on JavaScript fundamentals. Please read each question carefully and select the best answer.',
      description: 'Test your knowledge of JavaScript variables, functions, and basic syntax.',
      questions: [
        {
          question: 'What is the correct way to declare a variable in JavaScript?',
          options: [
            { text: 'var x = 5;', isCorrect: true },
            { text: 'variable x = 5;', isCorrect: false },
            { text: 'v x = 5;', isCorrect: false },
            { text: 'declare x = 5;', isCorrect: false }
          ],
          explanation: 'The "var" keyword is one of the correct ways to declare variables in JavaScript, along with "let" and "const".',
          points: 2,
        },
        {
          question: 'Which method is used to add an element to the end of an array?',
          options: [
            { text: 'push()', isCorrect: true },
            { text: 'add()', isCorrect: false },
            { text: 'append()', isCorrect: false },
            { text: 'insert()', isCorrect: false }
          ],
          explanation: 'The push() method adds one or more elements to the end of an array and returns the new length of the array.',
          points: 2,
        },
        {
          question: 'What does === operator do in JavaScript?',
          options: [
            { text: 'Assignment', isCorrect: false },
            { text: 'Equality with type coercion', isCorrect: false },
            { text: 'Strict equality', isCorrect: true },
            { text: 'Not equal', isCorrect: false }
          ],
          explanation: 'The === operator performs strict equality comparison without type coercion, checking both value and type.',
          points: 3,
        },
      ],
      timeLimit: 30,
      isPublished: true,
      createdBy: adminUser._id,
    });

    const mockTest2 = await MockTest.create({
      title: 'React Components Quiz',
      instructions: 'Test your understanding of React components and state management.',
      description: 'Quiz covering React component lifecycle, props, and hooks.',
      questions: [
        {
          question: 'What is a React component?',
          options: [
            { text: 'A function or class that returns JSX', isCorrect: true },
            { text: 'A CSS file', isCorrect: false },
            { text: 'A database table', isCorrect: false },
            { text: 'An HTML element', isCorrect: false }
          ],
          explanation: 'React components are reusable pieces of code that return JSX to describe what should appear on the screen.',
          points: 2,
        },
        {
          question: 'Which hook is used for state management in functional components?',
          options: [
            { text: 'useEffect', isCorrect: false },
            { text: 'useState', isCorrect: true },
            { text: 'useContext', isCorrect: false },
            { text: 'useReducer', isCorrect: false }
          ],
          explanation: 'useState is the primary hook for managing local state in React functional components.',
          points: 3,
        },
      ],
      timeLimit: 25,
      isPublished: true,
      createdBy: adminUser._id,
    });

    console.log('✅ Created sample mock tests');

    // Create module assignments
    await ModuleAssignment.create({
      moduleId: module1._id,
      assignedTo: [student1._id, student2._id],
      assignedBy: adminUser._id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    await ModuleAssignment.create({
      moduleId: module2._id,
      assignedTo: [student1._id],
      assignedBy: adminUser._id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    });

    console.log('✅ Created module assignments');

    // Create test assignments
    await TestAssignment.create({
      testId: mockTest1._id,
      assignedTo: [student1._id, student2._id],
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      timeLimit: 30,
      maxAttempts: 2,
      createdBy: adminUser._id,
    });

    await TestAssignment.create({
      testId: mockTest2._id,
      assignedTo: [student1._id],
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      timeLimit: 25,
      maxAttempts: 3,
      createdBy: adminUser._id,
    });

    console.log('✅ Created test assignments');

    console.log('\n🎉 Seed data created successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('Admin: admin@quiz.com / Admin123!');
    console.log('Student 1: student@quiz.com / Student123!');
    console.log('Student 2: alice@quiz.com / Student123!');
    console.log('Pending 1: jane.smith@quiz.com / Password123!');
    console.log('Pending 2: bob.johnson@quiz.com / Password123!');

    console.log('\n📚 Sample Data Created:');
    console.log('- 2 Modules with assignments');
    console.log('- 2 Mock tests with assignments');
    console.log('- 2 Pending registration requests');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

// Run if called directly
if (process.argv[1].includes('seedData')) {
  seedData();
}

export default seedData;
