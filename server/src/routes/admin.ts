import express from 'express';
import { protect, restrictTo } from '../middleware/auth';
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
router.put('/assign-to-sub-admin/:id', restrictTo('super_admin'), assignToSubAdmin);
router.get('/sub-admins', restrictTo('super_admin'), getSubAdmins);
router.post('/sub-admins', restrictTo('super_admin'), createSubAdmin);

export default router;
