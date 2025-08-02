import { Response, NextFunction } from 'express';
import User from '../models/User';
import PendingRequest from '../models/PendingRequest';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
export const getDashboard = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get statistics
    const pendingRequestsCount = await PendingRequest.countDocuments({ status: 'pending' });
    const activeUsersCount = await User.countDocuments({ status: 'active' });
    const totalStudentsCount = await User.countDocuments({ role: 'student', status: 'active' });
    const totalAdminsCount = await User.countDocuments({ role: 'admin', status: 'active' });

    // Get recent pending requests (last 10)
    const recentPendingRequests = await PendingRequest.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email admissionDate createdAt');

    // Get recent users (last 10)
    const recentUsers = await User.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email role admissionDate createdAt');

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          pendingRequests: pendingRequestsCount,
          activeUsers: activeUsersCount,
          totalStudents: totalStudentsCount,
          totalAdmins: totalAdminsCount,
          totalUsers: activeUsersCount,
        },
        recentActivity: {
          pendingRequests: recentPendingRequests,
          recentUsers: recentUsers,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pending requests with pagination
// @route   GET /api/admin/pending-requests
// @access  Private (Admin only)
export const getPendingRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get search and filter parameters
    const search = req.query.search as string || '';
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    // Build query
    let query: any = { status: 'pending' };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get pending requests with pagination
    const pendingRequests = await PendingRequest.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('firstName lastName email admissionDate createdAt');

    // Get total count for pagination
    const totalCount = await PendingRequest.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        requests: pendingRequests,
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

// @desc    Approve user registration
// @route   PUT /api/admin/approve-user/:id
// @access  Private (Admin only)
export const approveUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!role || !['admin', 'student'].includes(role)) {
      return next(new AppError('Valid role (admin or student) is required', 400));
    }

    // Find the pending request (include password field)
    const pendingRequest = await PendingRequest.findById(id).select('+password');
    if (!pendingRequest) {
      return next(new AppError('Pending request not found', 404));
    }

    // Check if user with same email already exists
    const existingUser = await User.findOne({ email: pendingRequest.email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Create new user from pending request
    const newUser = await User.create({
      firstName: pendingRequest.firstName,
      lastName: pendingRequest.lastName,
      email: pendingRequest.email,
      password: pendingRequest.password, // Password is already hashed in PendingRequest
      role: role,
      status: 'active',
      admissionDate: pendingRequest.admissionDate,
    });

    // Remove the pending request
    await PendingRequest.findByIdAndDelete(id);

    // Send approval email notification
    try {
      const emailService = (req.app as any).emailService;
      const adminUser = await User.findById(req.user!.id);
      const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin';
      
      await emailService.sendApprovalNotification(newUser, adminName);
      console.log(`Approval email sent to ${newUser.email}`);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the request if email fails
    }

    // Send WebSocket notification to admins
    try {
      const webSocketService = (req.app as any).webSocket;
      webSocketService.notifyRole('admin', 'user:approved', {
        userId: newUser._id,
        userName: `${newUser.firstName} ${newUser.lastName}`,
        role: newUser.role,
        timestamp: new Date().toISOString(),
      });
    } catch (wsError) {
      console.error('Failed to send WebSocket notification:', wsError);
    }

    res.status(200).json({
      success: true,
      message: 'User approved successfully',
      data: {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          admissionDate: newUser.admissionDate,
          createdAt: newUser.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject user registration
// @route   DELETE /api/admin/reject-user/:id
// @access  Private (Admin only)
export const rejectUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.query;

    // Find the pending request
    const pendingRequest = await PendingRequest.findById(id);
    if (!pendingRequest) {
      return next(new AppError('Pending request not found', 404));
    }

    // Store data before deletion for email
    const userEmail = pendingRequest.email;
    const userName = `${pendingRequest.firstName} ${pendingRequest.lastName}`;

    // Delete the pending request
    await PendingRequest.findByIdAndDelete(id);

    // Send rejection email notification
    try {
      const emailService = (req.app as any).emailService;
      const adminUser = await User.findById(req.user!.id);
      const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin';
      
      await emailService.sendRejectionNotification(
        userEmail,
        userName,
        (reason as string) || 'Registration requirements not met',
        adminName
      );
      console.log(`Rejection email sent to ${userEmail}`);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: 'User registration rejected successfully',
      data: {
        rejectedUser: {
          email: userEmail,
          reason: reason || 'No reason provided',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Private (Admin only)
export const getUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get search and filter parameters
    const search = req.query.search as string || '';
    const role = req.query.role as string || '';
    const status = req.query.status as string || '';
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    // Build query
    let query: any = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role && ['admin', 'student'].includes(role)) {
      query.role = role;
    }

    if (status && ['active', 'inactive'].includes(status)) {
      query.status = status;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get users with pagination
    const users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('firstName lastName email role status admissionDate createdAt');

    // Get total count for pagination
    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        users,
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

// @desc    Update user role or status
// @route   PATCH /api/admin/users/:id
// @access  Private (Admin only)
export const updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    // Find the user
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent admin from changing their own role or deactivating themselves
    if (user._id.toString() === req.user!.id) {
      return next(new AppError('You cannot modify your own account', 400));
    }

    // Update fields if provided
    if (role && ['admin', 'student'].includes(role)) {
      user.role = role as 'admin' | 'student';
    }

    if (status && ['active', 'inactive'].includes(status)) {
      user.status = status as 'active' | 'inactive';
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          admissionDate: user.admissionDate,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user (Admin only)
// @route   POST /api/admin/users
// @access  Private (Admin only)
export const createUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstName, lastName, email, password, role, admissionDate } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return next(new AppError('All fields are required', 400));
    }

    // Validate role
    if (!['admin', 'student'].includes(role)) {
      return next(new AppError('Valid role (admin or student) is required', 400));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Create new user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password, // Will be hashed by the pre-save middleware
      role,
      status: 'active',
      admissionDate: admissionDate || new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          admissionDate: newUser.admissionDate,
          createdAt: newUser.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
export const deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Don't allow admin to delete themselves
    if (id === req.user!.id) {
      return next(new AppError('You cannot delete your own account', 400));
    }

    // Find and delete user
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
