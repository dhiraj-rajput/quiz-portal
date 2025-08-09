import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getTests,
  getTestById,
  getTestForTaking,
  createTest,
  updateTest,
  deleteTest,
  assignTest,
  getTestAssignments,
  getTestAssignment,
  submitTest,
  getTestResults,
} from '../controllers/testController';
import {
  validateCreateTest,
  validateUpdateTest,
  validateAssignTest,
  validateSubmitTest,
  validateMongoId,
  validatePagination,
} from '../middleware/validation';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// GET /api/tests - Get all tests (with pagination and filtering)
router.get('/', validatePagination, getTests);

// GET /api/tests/assignments - Get all test assignments (Admin only) - MUST BE BEFORE /:id
router.get('/assignments', authorize('super_admin', 'sub_admin'), validatePagination, getTestAssignments);

// GET /api/tests/:id - Get single test details
router.get('/:id', validateMongoId, getTestById);

// GET /api/tests/:id/take - Get test for taking (Student only)
router.get('/:id/take', authorize('student'), validateMongoId, getTestForTaking);

// GET /api/tests/:id/results - Get test results
router.get('/:id/results', validateMongoId, getTestResults);

// GET /api/tests/:id/assignments - Get assignment for specific test (Admin only)
router.get('/:id/assignments', authorize('super_admin', 'sub_admin'), validateMongoId, getTestAssignment);

// POST /api/tests - Create new test (Admin only)
router.post('/', authorize('super_admin', 'sub_admin'), validateCreateTest, createTest);

// PUT /api/tests/:id - Update test (Admin only)
router.put('/:id', authorize('super_admin', 'sub_admin'), validateUpdateTest, updateTest);

// DELETE /api/tests/:id - Delete test (Admin only)
router.delete('/:id', authorize('super_admin', 'sub_admin'), validateMongoId, deleteTest);

// POST /api/tests/:id/assign - Assign test to students (Admin only)
router.post('/:id/assign', authorize('super_admin', 'sub_admin'), validateAssignTest, assignTest);

// POST /api/tests/:id/submit - Submit test answers (Student only)
router.post('/:id/submit', authorize('student'), validateSubmitTest, submitTest);

export default router;
