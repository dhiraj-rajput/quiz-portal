import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from './errorHandler';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
const moduleUploadDir = path.join(uploadDir, 'modules');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(moduleUploadDir)) {
  fs.mkdirSync(moduleUploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, moduleUploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter function
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types for modules
  const allowedMimeTypes = [
    'application/pdf',           // PDF
    'video/mp4',                // MP4
    'application/msword',       // DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.ms-powerpoint', // PPT
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
    'text/plain',               // TXT
    'application/vnd.ms-excel', // XLS
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  ];

  const allowedExtensions = ['.pdf', '.mp4', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.xls', '.xlsx'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only PDF, MP4, DOC, DOCX, PPT, PPTX, TXT, XLS, and XLSX files are allowed.', 400));
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10, // Maximum 10 files at once
  },
});

// Middleware for uploading module files
export const uploadModuleFiles = upload.array('files', 10);

// Error handler for multer
export const handleMulterError = (error: any, _req: Request, _res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return next(new AppError('File size too large. Maximum size is 50MB per file.', 400));
      case 'LIMIT_FILE_COUNT':
        return next(new AppError('Too many files. Maximum 10 files allowed.', 400));
      case 'LIMIT_UNEXPECTED_FILE':
        return next(new AppError('Unexpected field name for file upload.', 400));
      default:
        return next(new AppError('File upload error: ' + error.message, 400));
    }
  }
  next(error);
};

// Helper function to delete file
export const deleteFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Helper function to get file info
export const getFileInfo = (file: Express.Multer.File) => {
  return {
    fileName: file.filename,
    originalName: file.originalname,
    filePath: file.path,
    fileType: path.extname(file.originalname).substring(1), // Remove the dot
    fileSize: file.size,
    mimeType: file.mimetype,
  };
};

// Helper function to validate file types for modules
export const validateModuleFiles = (files: Express.Multer.File[]): string | null => {
  const allowedExtensions = ['.pdf', '.mp4', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.xls', '.xlsx'];
  
  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return `Invalid file type: ${file.originalname}. Only PDF, MP4, DOC, DOCX, PPT, PPTX, TXT, XLS, and XLSX files are allowed.`;
    }
  }
  
  return null;
};
