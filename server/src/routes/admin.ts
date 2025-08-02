import express from 'express';
import { protect, restrictTo } from '../middleware/auth';
import {
  getDashboard,
  getPendingRequests,
  approveUser,
  rejectUser,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/adminController';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Admin dashboard and statistics
router.get('/dashboard', getDashboard);

// User management routes
router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Pending requests management
router.get('/pending-requests', getPendingRequests);
router.put('/approve-user/:id', approveUser);
router.delete('/reject-user/:id', rejectUser);

export default router;
