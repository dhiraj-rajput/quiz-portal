import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './database';
import User from '../models/User';
import PendingRequest from '../models/PendingRequest';
import Module from '../models/Module';
import MockTest from '../models/MockTest';
import ModuleAssignment from '../models/ModuleAssignment';
import TestAssignment from '../models/TestAssignment';
import TestResult from '../models/TestResult';
import Notification from '../models/Notification';

// Load environment variables
dotenv.config();

const seedData = async (): Promise<void> => {
  console.log('🌱 Starting database seeding...');
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Clear existing collections
    console.log('🗑️ Clearing existing collections...');
    await User.deleteMany({});
    await PendingRequest.deleteMany({});
    await Module.deleteMany({});
    await MockTest.deleteMany({});
    await ModuleAssignment.deleteMany({});
    await TestAssignment.deleteMany({});
    await TestResult.deleteMany({});
    await Notification.deleteMany({});
    console.log('✅ Collections cleared');

    // Create Super Admin
    console.log('👑 Creating Super Admin...');
    const superAdmin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@quiz.com',
      phoneNumber: '+1234567890',
      password: 'Admin123!',
      role: 'super_admin',
      status: 'active',
      admissionDate: new Date('2024-01-01'),
      phoneVerified: true,
    });
    console.log('✅ Super Admin created');

    // Create Super Student
    console.log('👨‍🎓 Creating Super Student...');
    const superStudent = await User.create({
      firstName: 'Super',
      lastName: 'Student',
      email: 'student@quiz.com',
      phoneNumber: '+1234567891',
      password: 'Student123!',
      role: 'student',
      status: 'active',
      admissionDate: new Date('2024-01-01'),
      phoneVerified: true,
    });
    console.log('✅ Super Student created');

    // Create Sub Admins
    console.log('👥 Creating Sub Admins...');
    const subAdmin1 = await User.create({
      firstName: 'John',
      lastName: 'SubAdmin',
      email: 'subadmin1@quiz.com',
      phoneNumber: '+1234567892',
      password: 'John12345!',
      role: 'sub_admin',
      status: 'active',
      admissionDate: new Date('2024-01-15'),
      phoneVerified: true,
      assignedBy: superAdmin._id,
    });

    const subAdmin2 = await User.create({
      firstName: 'Jane',
      lastName: 'SubAdmin',
      email: 'subadmin2@quiz.com',
      phoneNumber: '+1234567893',
      password: 'Jane12345!',
      role: 'sub_admin',
      status: 'active',
      admissionDate: new Date('2024-01-20'),
      phoneVerified: true,
      assignedBy: superAdmin._id,
    });
    console.log('✅ Sub Admins created');

    // Create Students assigned to Sub Admins
    console.log('🎓 Creating Students...');
    const student1 = await User.create({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@quiz.com',
      phoneNumber: '+1234567894',
      password: 'Alice123!',
      role: 'student',
      status: 'active',
      admissionDate: new Date('2024-02-01'),
      phoneVerified: true,
      assignedSubAdmin: subAdmin1._id,
    });

    const student2 = await User.create({
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@quiz.com',
      phoneNumber: '+1234567895',
      password: 'Bob12345!',
      role: 'student',
      status: 'active',
      admissionDate: new Date('2024-02-05'),
      phoneVerified: true,
      assignedSubAdmin: subAdmin1._id,
    });

    const student3 = await User.create({
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie@quiz.com',
      phoneNumber: '+1234567896',
      password: 'Charlie123!',
      role: 'student',
      status: 'active',
      admissionDate: new Date('2024-02-10'),
      phoneVerified: true,
      assignedSubAdmin: subAdmin2._id,
    });
    console.log('✅ Students created');

    // Create Pending Requests
    console.log('⏳ Creating Pending Requests...');
    await PendingRequest.create({
      firstName: 'David',
      lastName: 'Wilson',
      email: 'david@example.com',
      phoneNumber: '+1234567897',
      password: 'password123',
      admissionDate: new Date('2024-03-01'),
      status: 'pending',
    });

    await PendingRequest.create({
      firstName: 'Emma',
      lastName: 'Davis',
      email: 'emma@example.com',
      phoneNumber: '+1234567898',
      password: 'password123',
      admissionDate: new Date('2024-03-05'),
      status: 'assigned_to_sub_admin',
      assignedSubAdmin: subAdmin1._id,
      assignedBy: superAdmin._id,
      assignedAt: new Date(),
    });

    await PendingRequest.create({
      firstName: 'Frank',
      lastName: 'Miller',
      email: 'frank@example.com',
      phoneNumber: '+1234567899',
      password: 'password123',
      admissionDate: new Date('2024-03-10'),
      status: 'assigned_to_sub_admin',
      assignedSubAdmin: subAdmin2._id,
      assignedBy: superAdmin._id,
      assignedAt: new Date(),
    });
    console.log('✅ Pending Requests created');

    // Create Modules
    console.log('📚 Creating Modules...');
    const module1 = await Module.create({
      title: 'Introduction to Mathematics',
      description: 'Basic mathematical concepts and operations',
      files: [{
        fileName: 'math_intro.pdf',
        originalName: 'Introduction to Mathematics.pdf',
        filePath: '/uploads/modules/math_intro.pdf',
        fileType: 'pdf',
        fileSize: 2048000,
        uploadedAt: new Date(),
      }],
      createdBy: subAdmin1._id,
      assignedSubAdmin: subAdmin1._id,
    });

    const module2 = await Module.create({
      title: 'Physics Fundamentals',
      description: 'Basic principles of physics and mechanics',
      files: [{
        fileName: 'physics_basics.pdf',
        originalName: 'Physics Fundamentals.pdf',
        filePath: '/uploads/modules/physics_basics.pdf',
        fileType: 'pdf',
        fileSize: 3072000,
        uploadedAt: new Date(),
      }],
      createdBy: subAdmin2._id,
      assignedSubAdmin: subAdmin2._id,
    });

    const module3 = await Module.create({
      title: 'Chemistry Basics',
      description: 'Introduction to chemical elements and reactions',
      files: [{
        fileName: 'chemistry_intro.pdf',
        originalName: 'Chemistry Basics.pdf',
        filePath: '/uploads/modules/chemistry_intro.pdf',
        fileType: 'pdf',
        fileSize: 2560000,
        uploadedAt: new Date(),
      }],
      createdBy: superAdmin._id,
    });
    console.log('✅ Modules created');

    // Create Mock Tests
    console.log('📝 Creating Mock Tests...');
    const test1 = await MockTest.create({
      title: 'Mathematics Quiz 1',
      instructions: 'Answer all questions within the time limit',
      description: 'Basic math test covering arithmetic operations',
      questions: [
        {
          question: 'What is 2 + 2?',
          options: [
            { text: '3', isCorrect: false },
            { text: '4', isCorrect: true },
            { text: '5', isCorrect: false },
            { text: '6', isCorrect: false },
          ],
          explanation: '2 + 2 equals 4',
          points: 1,
        },
        {
          question: 'What is 5 × 3?',
          options: [
            { text: '8', isCorrect: false },
            { text: '12', isCorrect: false },
            { text: '15', isCorrect: true },
            { text: '18', isCorrect: false },
          ],
          explanation: '5 × 3 equals 15',
          points: 1,
        },
      ],
      timeLimit: 30,
      isPublished: true,
      createdBy: subAdmin1._id,
      assignedSubAdmin: subAdmin1._id,
    });

    const test2 = await MockTest.create({
      title: 'Physics Quiz 1',
      instructions: 'Choose the best answer for each question',
      description: 'Basic physics concepts and formulas',
      questions: [
        {
          question: 'What is the acceleration due to gravity on Earth?',
          options: [
            { text: '9.8 m/s²', isCorrect: true },
            { text: '10 m/s²', isCorrect: false },
            { text: '8.9 m/s²', isCorrect: false },
            { text: '11 m/s²', isCorrect: false },
          ],
          explanation: 'Standard gravity is approximately 9.8 m/s²',
          points: 2,
        },
      ],
      timeLimit: 45,
      isPublished: true,
      createdBy: subAdmin2._id,
      assignedSubAdmin: subAdmin2._id,
    });

    const test3 = await MockTest.create({
      title: 'General Knowledge Quiz',
      instructions: 'Test your general knowledge',
      description: 'Mixed questions from various subjects',
      questions: [
        {
          question: 'What is the capital of France?',
          options: [
            { text: 'London', isCorrect: false },
            { text: 'Berlin', isCorrect: false },
            { text: 'Paris', isCorrect: true },
            { text: 'Madrid', isCorrect: false },
          ],
          explanation: 'Paris is the capital city of France',
          points: 1,
        },
      ],
      timeLimit: 60,
      isPublished: true,
      createdBy: superAdmin._id,
    });
    console.log('✅ Mock Tests created');

    // Create Module Assignments
    console.log('📋 Creating Module Assignments...');
    await ModuleAssignment.create({
      moduleId: module1._id,
      assignedTo: [student1._id, student2._id],
      assignedBy: subAdmin1._id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true,
    });

    await ModuleAssignment.create({
      moduleId: module2._id,
      assignedTo: [student3._id],
      assignedBy: subAdmin2._id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      isActive: true,
    });

    await ModuleAssignment.create({
      moduleId: module3._id,
      assignedTo: [superStudent._id],
      assignedBy: superAdmin._id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      isActive: true,
    });
    console.log('✅ Module Assignments created');

    // Create Test Assignments
    console.log('🎯 Creating Test Assignments...');
    const testAssignment1 = await TestAssignment.create({
      testId: test1._id,
      assignedTo: [student1._id, student2._id],
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      timeLimit: 30, // 30 minutes
      maxAttempts: 1,
      createdBy: subAdmin1._id,
      isActive: true,
    });

    const testAssignment2 = await TestAssignment.create({
      testId: test2._id,
      assignedTo: [student3._id],
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      timeLimit: 45, // 45 minutes
      maxAttempts: 1,
      createdBy: subAdmin2._id,
      isActive: true,
    });

    const testAssignment3 = await TestAssignment.create({
      testId: test3._id,
      assignedTo: [superStudent._id],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      timeLimit: 60, // 60 minutes
      maxAttempts: 1,
      createdBy: superAdmin._id,
      isActive: true,
    });
    console.log('✅ Test Assignments created');

    // Create Sample Test Results
    console.log('📊 Creating Test Results...');
    await TestResult.create({
      testId: test1._id,
      userId: student1._id,
      assignmentId: testAssignment1._id,
      attemptNumber: 1,
      answers: [
        { 
          questionId: 'q1_test1', 
          selectedAnswer: 1, 
          isCorrect: true, 
          pointsEarned: 1,
          timeSpent: 60
        },
        { 
          questionId: 'q2_test1', 
          selectedAnswer: 2, 
          isCorrect: true, 
          pointsEarned: 1,
          timeSpent: 90
        },
      ],
      score: 2,
      totalQuestions: 2,
      correctAnswers: 2,
      percentage: 100,
      startedAt: new Date(Date.now() - 30 * 60 * 1000),
      submittedAt: new Date(Date.now() - 25 * 60 * 1000),
      timeSpent: 5 * 60, // 5 minutes
      isCompleted: true,
    });

    await TestResult.create({
      testId: test2._id,
      userId: student3._id,
      assignmentId: testAssignment2._id,
      attemptNumber: 1,
      answers: [
        { 
          questionId: 'q1_test2', 
          selectedAnswer: 0, 
          isCorrect: true, 
          pointsEarned: 2,
          timeSpent: 180
        },
      ],
      score: 2,
      totalQuestions: 1,
      correctAnswers: 1,
      percentage: 100,
      startedAt: new Date(Date.now() - 45 * 60 * 1000),
      submittedAt: new Date(Date.now() - 35 * 60 * 1000),
      timeSpent: 10 * 60, // 10 minutes
      isCompleted: true,
    });

    await TestResult.create({
      testId: test3._id,
      userId: superStudent._id,
      assignmentId: testAssignment3._id,
      attemptNumber: 1,
      answers: [
        { 
          questionId: 'q1_test3', 
          selectedAnswer: 2, 
          isCorrect: true, 
          pointsEarned: 1,
          timeSpent: 120
        },
      ],
      score: 1,
      totalQuestions: 1,
      correctAnswers: 1,
      percentage: 100,
      startedAt: new Date(Date.now() - 20 * 60 * 1000),
      submittedAt: new Date(Date.now() - 18 * 60 * 1000),
      timeSpent: 2 * 60, // 2 minutes
      isCompleted: true,
    });
    console.log('✅ Test Results created');

    // Create Sample Notifications
    console.log('🔔 Creating Notifications...');
    await Notification.create({
      userId: student1._id,
      type: 'info',
      title: 'Welcome to Quiz Portal',
      message: 'Your account has been approved and activated. Welcome!',
      category: 'system',
      isRead: false,
    });

    await Notification.create({
      userId: student2._id,
      type: 'info',
      title: 'New Module Assignment',
      message: 'You have been assigned a new module: Introduction to Mathematics',
      category: 'module',
      isRead: false,
    });

    await Notification.create({
      userId: student3._id,
      type: 'success',
      title: 'Test Completed',
      message: 'You have successfully completed Physics Quiz 1',
      category: 'test',
      isRead: false,
    });
    console.log('✅ Notifications created');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary of created data:');
    console.log('👑 Super Admin: admin@quiz.com / Admin123!');
    console.log('👨‍🎓 Super Student: student@quiz.com / Student123!');
    console.log('👥 Sub Admins: John (subadmin1@quiz.com / John12345!), Jane (subadmin2@quiz.com / Jane12345!)');
    console.log('🎓 Students: Alice (alice@quiz.com / Alice123!), Bob (bob@quiz.com / Bob12345!), Charlie (charlie@quiz.com / Charlie123!)');
    console.log('⏳ Pending Requests: 3 created');
    console.log('📚 Modules: 3 created');
    console.log('📝 Mock Tests: 3 created');
    console.log('📋 Assignments: 6 created');
    console.log('📊 Test Results: 3 created');
    console.log('🔔 Notifications: 3 created');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run if called directly
if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default seedData;
