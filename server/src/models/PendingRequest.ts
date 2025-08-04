import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPendingRequest extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  admissionDate: Date;
  status: 'pending';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const pendingRequestSchema = new Schema<IPendingRequest>(
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
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
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
    status: {
      type: String,
      enum: ['pending'],
      default: 'pending',
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
  }
);

// Index for better query performance (email index is already created by unique: true)
pendingRequestSchema.index({ status: 1, createdAt: -1 });

// Hash password before saving
pendingRequestSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
pendingRequestSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const PendingRequest = mongoose.model<IPendingRequest>('PendingRequest', pendingRequestSchema);

export default PendingRequest;
