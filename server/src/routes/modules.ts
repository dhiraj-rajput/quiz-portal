import express from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  assignModule,
  getModuleAssignments,
  getModuleAssignment,
  removeModuleFile,
} from '../controllers/moduleController';
import {
  validateCreateModule,
  validateUpdateModule,
  validateAssignModule,
  validateMongoId,
  validateFileId,
  validatePagination,
} from '../middleware/validation';
import { uploadModuleFiles, handleMulterError } from '../middleware/upload';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// GET /api/modules - Get all modules (with pagination and filtering)
router.get('/', validatePagination, getModules);

// GET /api/modules/:id - Get single module
router.get('/:id', validateMongoId, getModuleById);

// POST /api/modules - Create new module (Admin only)
router.post(
  '/',
  authorize('super_admin', 'sub_admin'),
  uploadModuleFiles,
  handleMulterError,
  validateCreateModule,
  createModule
);

// PUT /api/modules/:id - Update module (Admin only)
router.put(
  '/:id',
  authorize('super_admin', 'sub_admin'),
  uploadModuleFiles,
  handleMulterError,
  validateUpdateModule,
  updateModule
);

// DELETE /api/modules/:id - Delete module (Admin only)
router.delete('/:id', authorize('super_admin', 'sub_admin'), validateMongoId, deleteModule);

// GET /api/modules/assignments - Get all module assignments (Admin only)
router.get('/assignments', authorize('super_admin', 'sub_admin'), validatePagination, getModuleAssignments);

// GET /api/modules/:id/assignments - Get assignment for specific module (Admin only)
router.get('/:id/assignments', authorize('super_admin', 'sub_admin'), validateMongoId, getModuleAssignment);

// POST /api/modules/:id/assign - Assign module to students (Admin only)
router.post('/:id/assign', authorize('super_admin', 'sub_admin'), validateAssignModule, assignModule);

// DELETE /api/modules/:id/files/:fileId - Remove file from module (Admin only)
router.delete('/:id/files/:fileId', authorize('super_admin', 'sub_admin'), validateFileId, removeModuleFile);

export default router;
