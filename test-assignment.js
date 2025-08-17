const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb+srv://alluses1033:dj54phantom@cluster0.pot79.mongodb.net/quiz-portal?retryWrites=true&w=majority');

// Define schemas
const PendingRequestSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phoneNumber: String,
  password: String,
  admissionDate: Date,
  status: { type: String, enum: ['pending', 'assigned_to_sub_admin'], default: 'pending' },
  assignedSubAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: Date,
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  role: String,
  status: String,
}, { timestamps: true });

const PendingRequest = mongoose.model('PendingRequest', PendingRequestSchema);
const User = mongoose.model('User', UserSchema);

async function testAssignment() {
  try {
    console.log('Testing assignment functionality...');
    
    // 1. Check if there are any pending requests
    const pendingRequests = await PendingRequest.find({ status: 'pending' });
    console.log(`Found ${pendingRequests.length} pending requests`);
    
    if (pendingRequests.length > 0) {
      console.log('Sample pending request:', pendingRequests[0]);
    }
    
    // 2. Check if there are any sub admins
    const subAdmins = await User.find({ role: 'sub_admin' });
    console.log(`Found ${subAdmins.length} sub admins`);
    
    if (subAdmins.length > 0) {
      console.log('Sample sub admin:', subAdmins[0]);
    }
    
    // 3. Check assigned requests
    const assignedRequests = await PendingRequest.find({ status: 'assigned_to_sub_admin' })
      .populate('assignedSubAdmin', 'firstName lastName email');
    console.log(`Found ${assignedRequests.length} assigned requests`);
    
    if (assignedRequests.length > 0) {
      console.log('Sample assigned request:', assignedRequests[0]);
    }
    
    // 4. Test a manual assignment if we have both
    if (pendingRequests.length > 0 && subAdmins.length > 0) {
      const request = pendingRequests[0];
      const subAdmin = subAdmins[0];
      
      console.log(`\nTesting assignment of request ${request._id} to sub admin ${subAdmin._id}...`);
      
      request.assignedSubAdmin = subAdmin._id;
      request.assignedBy = subAdmin._id; // Using sub admin as assignedBy for test
      request.assignedAt = new Date();
      request.status = 'assigned_to_sub_admin';
      
      await request.save();
      console.log('Assignment saved successfully!');
      
      // Verify the assignment
      const verifyRequest = await PendingRequest.findById(request._id).populate('assignedSubAdmin');
      console.log('Verified assigned request:', verifyRequest);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

testAssignment();
