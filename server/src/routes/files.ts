import express from 'express';
import path from 'path';
import fs from 'fs';
import { protect, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import Module from '../models/Module';
import ModuleAssignment from '../models/ModuleAssignment';

// Helper function to get MIME type from file extension
const getMimeType = (fileType: string): string => {
  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream';
};

const router = express.Router();

// Apply authentication to all file routes
router.use(protect);

// Serve module files
router.get('/modules/:moduleId/:fileName', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { moduleId, fileName } = req.params;

    // Check if module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      return next(new AppError('Module not found', 404));
    }

    // Find the requested file in the module
    const moduleFile = module.files.find(file => file.fileName === fileName);
    if (!moduleFile) {
      return next(new AppError('File not found', 404));
    }

    // If user is student, check if module is assigned to them
    if (req.user!.role === 'student') {
      const assignment = await ModuleAssignment.findOne({
        moduleId: moduleId,
        assignedTo: req.user!.id,
        isActive: true,
      });

      if (!assignment) {
        return next(new AppError('You are not assigned to this module', 403));
      }
    }

    // Construct file path
    const filePath = path.join(process.cwd(), 'uploads', 'modules', fileName);

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found on server', 404));
    }

    // Set appropriate headers
    res.setHeader('Content-Type', getMimeType(moduleFile.fileType));
    res.setHeader('Content-Disposition', `inline; filename="${moduleFile.originalName}"`);
    res.setHeader('Content-Length', moduleFile.fileSize.toString());

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File streaming error:', error);
      return next(new AppError('Error serving file', 500));
    });

  } catch (error) {
    next(error);
  }
});

// Download module file (force download)
router.get('/modules/:moduleId/:fileName/download', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { moduleId, fileName } = req.params;

    // Check if module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      return next(new AppError('Module not found', 404));
    }

    // Find the requested file in the module
    const moduleFile = module.files.find(file => file.fileName === fileName);
    if (!moduleFile) {
      return next(new AppError('File not found', 404));
    }

    // If user is student, check if module is assigned to them
    if (req.user!.role === 'student') {
      const assignment = await ModuleAssignment.findOne({
        moduleId: moduleId,
        assignedTo: req.user!.id,
        isActive: true,
      });

      if (!assignment) {
        return next(new AppError('You are not assigned to this module', 403));
      }
    }

    // Construct file path
    const filePath = path.join(process.cwd(), 'uploads', 'modules', fileName);

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found on server', 404));
    }

    // Set download headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${moduleFile.originalName}"`);
    res.setHeader('Content-Length', moduleFile.fileSize.toString());

    // Stream the file for download
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File download error:', error);
      return next(new AppError('Error downloading file', 500));
    });

  } catch (error) {
    next(error);
  }
});

export default router;
