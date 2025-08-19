import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  phoneVerified: boolean;
  password: string;
  role: 'super_admin' | 'sub_admin' | 'student';
  status: 'active' | 'inactive';
  admissionDate: Date;
  assignedSubAdmin?: mongoose.Types.ObjectId; // For students - which sub admin they're assigned to
  assignedBy?: mongoose.Types.ObjectId; // For sub admins - which super admin assigned them
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot be more than 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function (value: string) {
          // Remove any non-digit characters for validation
          const cleaned = value.replace(/\D/g, '');
          return cleaned.length >= 10 && cleaned.length <= 15;
        },
        message: 'Please provide a valid phone number',
      },
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: ['super_admin', 'sub_admin', 'student'],
      default: 'student',
    },
    assignedSubAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
      validate: {
        validator: async function(this: IUser, value: mongoose.Types.ObjectId) {
          if (!value || this.role !== 'student') return true;
          // Validate that assigned sub admin actually has sub_admin role
          const User = mongoose.model('User');
          const subAdmin = await User.findById(value);
          return subAdmin && subAdmin.role === 'sub_admin';
        },
        message: 'Assigned sub admin must have sub_admin role'
      }
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
      validate: {
        validator: async function(this: IUser, value: mongoose.Types.ObjectId) {
          if (!value || this.role !== 'sub_admin') return true;
          // Validate that assignedBy user has super_admin role
          const User = mongoose.model('User');
          const superAdmin = await User.findById(value);
          return superAdmin && superAdmin.role === 'super_admin';
        },
        message: 'AssignedBy user must have super_admin role'
      }
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    admissionDate: {
      type: Date,
      required: [true, 'Admission date is required'],
      validate: {
        validator: function (value: Date) {
          return value <= new Date();
        },
        message: 'Admission date cannot be in the future',
      },
    },
    passwordResetToken: {
      type: String,
      default: undefined,
    },
    passwordResetExpires: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      transform: function (_doc: any, ret: any) {
        delete ret.password;
        return ret;
      },
    },
  }
);

// Index for better query performance - email index is already created by unique: true
userSchema.index({ role: 1, status: 1 });
userSchema.index({ assignedSubAdmin: 1 }); // For efficient sub admin filtering
userSchema.index({ assignedBy: 1 }); // For efficient super admin filtering

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  // Only hash if not already a bcrypt hash
  if (typeof this.password === 'string' && this.password.startsWith('$2a$')) {
    return next();
  }
  if (typeof this.password === 'string' && this.password.startsWith('$2b$')) {
    return next();
  }

  try {
    // Hash password with cost of 12
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
