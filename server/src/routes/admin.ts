import express from 'express';
import { protect, restrictTo } from '../middleware/auth';
import User from '../models/User';
import {
  getDashboard,
  getPendingRequests,
  approveUser,
  rejectUser,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  assignToSubAdmin,
  getSubAdmins,
  createSubAdmin,
} from '../controllers/adminController';

const router = express.Router();

// All admin routes require authentication and admin/sub_admin role
router.use(protect);
router.use(restrictTo('super_admin', 'sub_admin'));

// Admin dashboard and statistics
router.get('/dashboard', getDashboard);

// User management routes
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Pending requests management
router.get('/pending-requests', getPendingRequests);
router.put('/approve-user/:id', approveUser);
router.delete('/reject-user/:id', rejectUser);

// Super Admin only routes
// Debug route to show sub admin accounts (development only)
router.get('/debug/sub-admins', protect, restrictTo('super_admin'), async (req, res) => {
  try {
    const subAdmins = await User.find({ role: 'sub_admin' }).select('_id firstName lastName email');
    res.json({
      success: true,
      data: subAdmins.map(admin => ({
        id: admin._id,
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug route to search for user by email (development only)
router.get('/debug/search/:email', protect, restrictTo('super_admin'), async (req, res) => {
  try {
    const email = req.params.email;
    
    // Check in Users collection
    const user = await User.findOne({ email }).select('_id firstName lastName email role');
    
    // Check in PendingRequests collection
    const PendingRequest = require('../models/PendingRequest').default;
    const pendingRequest = await PendingRequest.findOne({ email });
    
    res.json({
      success: true,
      data: {
        foundInUsers: user ? {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role
        } : null,
        foundInPendingRequests: pendingRequest ? {
          id: pendingRequest._id,
          name: `${pendingRequest.firstName} ${pendingRequest.lastName}`,
          email: pendingRequest.email,
          status: pendingRequest.status
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/assign-to-sub-admin/:id', restrictTo('super_admin'), assignToSubAdmin);
router.get('/sub-admins', restrictTo('super_admin'), getSubAdmins);
router.post('/sub-admins', restrictTo('super_admin'), createSubAdmin);

export default router;
