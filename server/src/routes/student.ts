import express from 'express';
import { protect, restrictTo } from '../middleware/auth';
import {
  getStudentDashboard,
  getAssignedModules,
  getAssignedTests,
  getStudentResults,
  markModuleComplete,
} from '../controllers/studentController';

const router = express.Router();

// All student routes require authentication and student role
router.use(protect);
router.use(restrictTo('student'));

// Student dashboard and data
router.get('/dashboard', getStudentDashboard);
router.get('/assigned-modules', getAssignedModules);
router.get('/assigned-tests', getAssignedTests);
router.get('/results', getStudentResults);

// Mark module assignment as complete
router.put('/module-assignments/:id/complete', markModuleComplete);

export default router;
