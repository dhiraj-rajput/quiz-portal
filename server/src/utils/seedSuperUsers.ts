import mongoose from 'mongoose';
import User from '../models/User';
import { connectDB } from './database';

const seedSuperUsers = async () => {
  try {
    await connectDB();
    
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ email: 'admin@quiz.com' });
    if (!existingSuperAdmin) {
      const superAdmin = new User({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@quiz.com',
        phoneNumber: '+1234567890',
        password: 'password123',
        role: 'super_admin',
        status: 'active',
        admissionDate: new Date(),
        phoneVerified: true
      });
      
      await superAdmin.save();
      console.log('✅ Super Admin created: admin@quiz.com');
    } else {
      console.log('✅ Super Admin already exists: admin@quiz.com');
    }
    
    // Check if super student already exists
    const existingSuperStudent = await User.findOne({ email: 'student@quiz.com' });
    if (!existingSuperStudent) {
      const superStudent = new User({
        firstName: 'Super',
        lastName: 'Student',
        email: 'student@quiz.com',
        phoneNumber: '+1234567891',
        password: 'password123',
        role: 'student',
        status: 'active',
        admissionDate: new Date(),
        phoneVerified: true
      });
      
      await superStudent.save();
      console.log('✅ Super Student created: student@quiz.com');
    } else {
      console.log('✅ Super Student already exists: student@quiz.com');
    }
    
    console.log('🎉 Seed operation completed successfully');
    
  } catch (error) {
    console.error('❌ Error seeding super users:', error);
    throw error;
  }
};

// If run directly
if (require.main === module) {
  seedSuperUsers()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedSuperUsers;
