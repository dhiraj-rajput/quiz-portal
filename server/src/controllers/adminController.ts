import { Response, NextFunction } from 'express';
import User from '../models/User';
import PendingRequest from '../models/PendingRequest';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { NotificationService } from '../utils/notificationService';

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
export const getDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;
    const subAdminFilter = req.query.subAdminId as string; // For super admin filtering

    let pendingRequestsCount, activeUsersCount, totalStudentsCount, totalSubAdminsCount, totalSuperAdminsCount;
    let recentPendingRequests: any[];

    if (userRole === 'super_admin') {
      // Super Admin can see all data, with optional filtering by sub admin
      if (subAdminFilter) {
        // Filter by specific sub admin
        pendingRequestsCount = await PendingRequest.countDocuments({ 
          $or: [
            { status: 'pending' },
            { assignedSubAdmin: subAdminFilter, status: 'assigned_to_sub_admin' }
          ]
        });
        
        totalStudentsCount = await User.countDocuments({ 
          role: 'student', 
          status: 'active',
          assignedSubAdmin: subAdminFilter
        });

        recentPendingRequests = await PendingRequest.find({ 
          $or: [
            { status: 'pending' },
            { assignedSubAdmin: subAdminFilter, status: 'assigned_to_sub_admin' }
          ]
        })
        .populate('assignedSubAdmin', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('firstName lastName email admissionDate createdAt status assignedSubAdmin');
      } else {
        // Show all data
        pendingRequestsCount = await PendingRequest.countDocuments();
        totalStudentsCount = await User.countDocuments({ role: 'student', status: 'active' });
        
        recentPendingRequests = await PendingRequest.find()
          .populate('assignedSubAdmin', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(10)
          .select('firstName lastName email admissionDate createdAt status assignedSubAdmin');
      }

      activeUsersCount = await User.countDocuments({ status: 'active' });
      totalSubAdminsCount = await User.countDocuments({ role: 'sub_admin', status: 'active' });
      totalSuperAdminsCount = await User.countDocuments({ role: 'super_admin', status: 'active' });

    } else if (userRole === 'sub_admin') {
      // Sub Admin can only see assigned students and requests
      pendingRequestsCount = await PendingRequest.countDocuments({ 
        assignedSubAdmin: userId,
        status: 'assigned_to_sub_admin'
      });
      
      totalStudentsCount = await User.countDocuments({ 
        role: 'student', 
        status: 'active',
        assignedSubAdmin: userId
      });

      activeUsersCount = totalStudentsCount;
      totalSubAdminsCount = 0; // Sub admin can't see other sub admins
      totalSuperAdminsCount = 0; // Sub admin can't see super admins

      recentPendingRequests = await PendingRequest.find({ 
        assignedSubAdmin: userId,
        status: 'assigned_to_sub_admin'
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email admissionDate createdAt status');
    } else {
      return next(new AppError('Unauthorized access', 403));
    }

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          pendingRequests: pendingRequestsCount,
          activeUsers: activeUsersCount,
          totalStudents: totalStudentsCount,
          totalSubAdmins: totalSubAdminsCount,
          totalSuperAdmins: totalSuperAdminsCount,
          totalUsers: activeUsersCount,
        },
        recentPendingRequests,
        userRole,
        canFilterBySubAdmin: userRole === 'super_admin',
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
    if (!role || !['super_admin', 'sub_admin', 'student'].includes(role)) {
      return next(new AppError('Valid role (super_admin, sub_admin, or student) is required', 400));
    }

    // Find the pending request (include password field)
    const pendingRequest = await PendingRequest.findById(id).select('+password');
    
    if (!pendingRequest) {
      return next(new AppError('Pending request not found or may have already been processed', 404));
    }

    // Check if user with same email or phone already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: pendingRequest.email },
        { phoneNumber: pendingRequest.phoneNumber }
      ]
    });
    if (existingUser) {
      // Remove the pending request since user already exists
      await PendingRequest.findByIdAndDelete(id);
      return next(new AppError('User with this email or phone number already exists', 400));
    }

    // Create new user from pending request
    const newUser = await User.create({
      firstName: pendingRequest.firstName,
      lastName: pendingRequest.lastName,
      email: pendingRequest.email,
      phoneNumber: pendingRequest.phoneNumber,
      phoneVerified: true, // Already verified during registration
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

    // Send notification to the approved user
    try {
      const adminUser = await User.findById(req.user!.id);
      const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin';
      await NotificationService.notifyUserApproval(newUser._id.toString(), adminName);
    } catch (notificationError) {
      console.error('Failed to send approval notification:', notificationError);
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

    if (role && ['super_admin', 'sub_admin', 'student'].includes(role)) {
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
      .select('firstName lastName email phoneNumber role status admissionDate createdAt');

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

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
export const getUserById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    
    if (!user) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PATCH /api/admin/users/:id
// @access  Private (Admin only)
export const updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phoneNumber, role, status, admissionDate, password } = req.body;

    // Find the user
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent admin from changing their own role or deactivating themselves
    if (user._id.toString() === req.user!.id) {
      if (role && role !== user.role) {
        return next(new AppError('You cannot change your own role', 400));
      }
      if (status && status === 'inactive') {
        return next(new AppError('You cannot deactivate your own account', 400));
      }
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return next(new AppError('Email is already in use', 400));
      }
      user.email = email;
    }

    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    
    if (role && ['super_admin', 'sub_admin', 'student'].includes(role)) {
      user.role = role as 'super_admin' | 'sub_admin' | 'student';
    }

    if (status && ['active', 'inactive'].includes(status)) {
      user.status = status as 'active' | 'inactive';
    }

    if (admissionDate) {
      user.admissionDate = new Date(admissionDate);
    }

    // Update password if provided
    if (password) {
      if (password.length < 8) {
        return next(new AppError('Password must be at least 8 characters long', 400));
      }
      user.password = password; // This will be hashed by the pre-save middleware
      
      // Notify user about password change
      try {
        await NotificationService.notifyPasswordChange(user._id.toString());
      } catch (notificationError) {
        console.error('Failed to send password change notification:', notificationError);
      }
    }

    // Notify about status change if status was updated
    if (status && status !== user.status) {
      try {
        const adminUser = await User.findById(req.user!.id);
        const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin';
        await NotificationService.notifyAccountStatusChange(user._id.toString(), status, adminName);
      } catch (notificationError) {
        console.error('Failed to send status change notification:', notificationError);
      }
    }

    await user.save();

    // Return user data without password
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      admissionDate: user.admissionDate,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: userResponse,
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
    const { firstName, lastName, email, phoneNumber, password, role, admissionDate } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !password || !role) {
      return next(new AppError('All fields are required', 400));
    }

    // Validate role
    if (!['super_admin', 'sub_admin', 'student'].includes(role)) {
      return next(new AppError('Valid role (super_admin, sub_admin, or student) is required', 400));
    }

    // Check if user already exists with email
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Check if user already exists with phone number
    const existingUserPhone = await User.findOne({ phoneNumber });
    if (existingUserPhone) {
      return next(new AppError('User with this phone number already exists', 400));
    }

    // Create new user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password, // Will be hashed by the pre-save middleware
      role,
      status: 'active',
      admissionDate: admissionDate || new Date(),
    });

    // Send welcome notification to the new user
    try {
      const adminUser = await User.findById(req.user!.id);
      const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Admin';
      await NotificationService.notifyUserCreation(newUser._id.toString(), adminName);
    } catch (notificationError) {
      console.error('Failed to send user creation notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
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

// @desc    Assign pending request to Sub Admin (Super Admin only)
// @route   PUT /api/admin/assign-to-sub-admin/:id
// @access  Private (Super Admin only)
export const assignToSubAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { subAdminId } = req.body;

    if (!subAdminId) {
      return next(new AppError('Sub Admin ID is required', 400));
    }

    // Find the pending request
    const pendingRequest = await PendingRequest.findById(id);
    if (!pendingRequest) {
      return next(new AppError('Pending request not found', 404));
    }

    // Verify sub admin exists and has correct role
    const subAdmin = await User.findById(subAdminId);
    if (!subAdmin || subAdmin.role !== 'sub_admin') {
      return next(new AppError('Invalid Sub Admin', 400));
    }

    // Update pending request
    pendingRequest.assignedSubAdmin = subAdminId;
    pendingRequest.assignedBy = req.user!.id as any; // Cast to ObjectId
    pendingRequest.assignedAt = new Date();
    pendingRequest.status = 'assigned_to_sub_admin';
    
    await pendingRequest.save();

    // Send notification to sub admin
    try {
      await NotificationService.notifySubAdminAssignment(subAdminId, pendingRequest._id.toString());
    } catch (notificationError) {
      console.error('Failed to send sub admin assignment notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Request assigned to Sub Admin successfully',
      data: pendingRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Sub Admins (Super Admin only)
// @route   GET /api/admin/sub-admins
// @access  Private (Super Admin only)
export const getSubAdmins = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const search = req.query.search as string || '';
    const status = req.query.status as string || '';

    // Build query
    let query: any = { role: 'sub_admin' };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && ['active', 'inactive'].includes(status)) {
      query.status = status;
    }

    // Get sub admins with pagination
    const subAdmins = await User.find(query)
      .populate('assignedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('firstName lastName email phoneNumber status admissionDate createdAt assignedBy');

    // Get total count for pagination
    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      data: {
        subAdmins,
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

// @desc    Create Sub Admin (Super Admin only)
// @route   POST /api/admin/sub-admins
// @access  Private (Super Admin only)
export const createSubAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstName, lastName, email, phoneNumber, password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      return next(new AppError('All fields are required', 400));
    }

    // Check if user already exists with email
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Check if user already exists with phone number
    const existingUserPhone = await User.findOne({ phoneNumber });
    if (existingUserPhone) {
      return next(new AppError('User with this phone number already exists', 400));
    }

    // Create new sub admin
    const newSubAdmin = await User.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      password, // Will be hashed by the pre-save middleware
      role: 'sub_admin',
      status: 'active',
      admissionDate: new Date(),
      assignedBy: req.user!.id,
    });

    // Send welcome notification to the new sub admin
    try {
      const superAdmin = await User.findById(req.user!.id);
      const superAdminName = superAdmin ? `${superAdmin.firstName} ${superAdmin.lastName}` : 'Super Admin';
      await NotificationService.notifySubAdminCreation(newSubAdmin._id.toString(), superAdminName);
    } catch (notificationError) {
      console.error('Failed to send sub admin creation notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Sub Admin created successfully',
      data: {
        id: newSubAdmin._id,
        firstName: newSubAdmin.firstName,
        lastName: newSubAdmin.lastName,
        email: newSubAdmin.email,
        phoneNumber: newSubAdmin.phoneNumber,
        role: newSubAdmin.role,
        status: newSubAdmin.status,
        admissionDate: newSubAdmin.admissionDate,
        createdAt: newSubAdmin.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
