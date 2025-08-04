import { Request, Response, NextFunction } from 'express';
import Module from '../models/Module';
import ModuleAssignment from '../models/ModuleAssignment';
import User from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { NotificationService } from '../utils/notificationService';

// Temporary mock for express-validator - TO BE REPLACED
const validationResult = (_req: any) => ({
  isEmpty: () => true,
  array: () => []
});

// Helper function to handle validation errors
const handleValidationErrors = (req: Request): string | null => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errors.array().map((err: any) => err.msg).join(', ');
  }
  return null;
};

// @desc    Get all modules with pagination and filtering
// @route   GET /api/modules
// @access  Private
export const getModules = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get search and filter parameters
    const search = req.query.search as string || '';
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    // Build query
    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // If user is student, only show modules assigned to them
    if (req.user!.role === 'student') {
      const assignments = await ModuleAssignment.find({
        assignedTo: req.user!.id,
        isActive: true,
      }).select('moduleId');
      
      const moduleIds = assignments.map(assignment => assignment.moduleId);
      query._id = { $in: moduleIds };
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get modules with pagination
    const modules = await Module.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalCount = await Module.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        modules,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single module by ID
// @route   GET /api/modules/:id
// @access  Private
export const getModuleById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const module = await Module.findById(id)
      .populate('createdBy', 'firstName lastName email');

    if (!module) {
      return next(new AppError('Module not found', 404));
    }

    // If user is student, check if module is assigned to them
    if (req.user!.role === 'student') {
      const assignment = await ModuleAssignment.findOne({
        moduleId: id,
        assignedTo: req.user!.id,
        isActive: true,
      });

      if (!assignment) {
        return next(new AppError('You are not assigned to this module', 403));
      }
    }

    res.status(200).json({
      success: true,
      data: {
        module,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new module
// @route   POST /api/modules
// @access  Private (Admin only)
export const createModule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check for validation errors
    const validationError = handleValidationErrors(req);
    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    const { title, description } = req.body;
    const files = req.files as any[] || [];

    // Process uploaded files
    const moduleFiles = files.map(file => ({
      fileName: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileType: file.mimetype.split('/')[1], // Extract extension from mimetype
      fileSize: file.size,
      uploadedAt: new Date(),
    }));

    // Create module
    const module = await Module.create({
      title,
      description,
      files: moduleFiles,
      createdBy: req.user!.id,
    });

    // Populate creator info
    await module.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: {
        module,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update module
// @route   PUT /api/modules/:id
// @access  Private (Admin only)
export const updateModule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    // Find module
    const module = await Module.findById(id);
    if (!module) {
      return next(new AppError('Module not found', 404));
    }

    // Check if user is the creator or admin
    if (req.user!.role !== 'admin' && module.createdBy.toString() !== req.user!.id) {
      return next(new AppError('You can only update modules you created', 403));
    }

    // Update fields
    if (title) module.title = title;
    if (description) module.description = description;

    // Handle new file uploads
    const files = req.files as any[] || [];
    if (files.length > 0) {
      const newFiles = files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileType: file.mimetype.split('/')[1],
        fileSize: file.size,
        uploadedAt: new Date(),
      }));
      
      // Add new files to existing ones
      module.files.push(...newFiles);
    }

    await module.save();
    await module.populate('createdBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      data: {
        module,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete module
// @route   DELETE /api/modules/:id
// @access  Private (Admin only)
export const deleteModule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Find module
    const module = await Module.findById(id);
    if (!module) {
      return next(new AppError('Module not found', 404));
    }

    // Check if user is the creator or admin
    if (req.user!.role !== 'admin' && module.createdBy.toString() !== req.user!.id) {
      return next(new AppError('You can only delete modules you created', 403));
    }

    // Delete related assignments
    await ModuleAssignment.deleteMany({ moduleId: id });

    // Delete module
    await Module.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Module deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get module assignments
// @route   GET /api/modules/assignments
// @access  Private (Admin only)
export const getModuleAssignments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get module assignments with populated module and student data
    const assignments = await ModuleAssignment.find()
      .populate('moduleId', 'title description')
      .populate('assignedTo', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ModuleAssignment.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        assignments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assignment for a specific module
// @route   GET /api/modules/:id/assignments
// @access  Private (Admin only)
export const getModuleAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Find all assignments for the specific module and merge students
    const assignments = await ModuleAssignment.find({ moduleId: id, isActive: true })
      .populate('moduleId', 'title description')
      .populate('assignedTo', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName');

    if (assignments.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          assignment: null,
        },
      });
      return;
    }

    // Merge all assigned students from multiple assignments
    const allAssignedStudents: any[] = [];
    const studentIds = new Set();
    let latestDueDate = null;
    let latestAssignment = assignments[0];

    assignments.forEach(assignment => {
      assignment.assignedTo.forEach((student: any) => {
        if (!studentIds.has(student._id.toString())) {
          studentIds.add(student._id.toString());
          allAssignedStudents.push(student);
        }
      });
      
      // Get the latest due date
      if (assignment.dueDate && (!latestDueDate || assignment.dueDate > latestDueDate)) {
        latestDueDate = assignment.dueDate;
        latestAssignment = assignment;
      }
    });

    // Return a consolidated assignment object
    const consolidatedAssignment = {
      _id: latestAssignment._id,
      moduleId: latestAssignment.moduleId,
      assignedTo: allAssignedStudents,
      assignedBy: latestAssignment.assignedBy,
      dueDate: latestDueDate,
      isActive: true,
      createdAt: latestAssignment.createdAt,
      updatedAt: latestAssignment.updatedAt
    };

    res.status(200).json({
      success: true,
      data: {
        assignment: consolidatedAssignment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign module to students
// @route   POST /api/modules/:id/assign
// @access  Private (Admin only)
export const assignModule = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { studentIds, dueDate } = req.body;

    // Validate input
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return next(new AppError('At least one student ID is required', 400));
    }

    // Check if module exists
    const module = await Module.findById(id);
    if (!module) {
      return next(new AppError('Module not found', 404));
    }

    // Validate student IDs
    const students = await User.find({
      _id: { $in: studentIds },
      role: 'student',
      status: 'active',
    });

    if (students.length !== studentIds.length) {
      return next(new AppError('One or more invalid student IDs provided', 400));
    }

    // Create or update assignment
    // First, clean up any duplicate assignments for this module
    const existingAssignments = await ModuleAssignment.find({ moduleId: id, isActive: true });
    
    if (existingAssignments.length > 1) {
      // If there are multiple assignments, delete all but the most recent one
      const sortedAssignments = existingAssignments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const assignmentsToDelete = sortedAssignments.slice(1);
      await ModuleAssignment.deleteMany({
        _id: { $in: assignmentsToDelete.map(a => a._id) }
      });
    }
    
    const existingAssignment = existingAssignments.length > 0 ? existingAssignments[0] : null;
    
    if (existingAssignment) {
      // Replace the assigned students entirely (not append)
      existingAssignment.assignedTo = studentIds;
      if (dueDate) existingAssignment.dueDate = new Date(dueDate);
      await existingAssignment.save();
    } else {
      // Create new assignment
      await ModuleAssignment.create({
        moduleId: id,
        assignedTo: studentIds,
        assignedBy: req.user!.id,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
    }

    // Send notifications to assigned students
    try {
      const dueDateObj = dueDate ? new Date(dueDate) : undefined;
      for (const student of students) {
        await NotificationService.notifyModuleAssignment(student._id.toString(), module.title, dueDateObj);
      }
    } catch (notificationError) {
      console.error('Failed to send module assignment notifications:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Module assigned successfully',
      data: {
        moduleId: id,
        assignedStudents: students.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove file from module
// @route   DELETE /api/modules/:id/files/:fileId
// @access  Private (Admin only)
export const removeModuleFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, fileId } = req.params;

    // Find module
    const module = await Module.findById(id);
    if (!module) {
      return next(new AppError('Module not found', 404));
    }

    // Check if user is the creator or admin
    if (req.user!.role !== 'admin' && module.createdBy.toString() !== req.user!.id) {
      return next(new AppError('You can only modify modules you created', 403));
    }

    // Remove file from module
    module.files = module.files.filter(file => file._id!.toString() !== fileId);
    await module.save();

    res.status(200).json({
      success: true,
      message: 'File removed successfully',
    });
  } catch (error) {
    next(error);
  }
};
