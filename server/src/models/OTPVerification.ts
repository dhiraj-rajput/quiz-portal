import mongoose, { Schema, Document } from 'mongoose';

export interface IOTPVerification extends Document {
  phoneNumber: string;
  otp: string;
  purpose?: string;
  email?: string;
  expiresAt: Date;
  verified: boolean;
  isUsed: boolean;
  verifiedAt?: Date;
  attempts: number;
  createdAt: Date;
  isValidOTP(inputOTP: string): boolean;
  markAsVerified(): void;
  incrementAttempts(): void;
}

const otpVerificationSchema = new Schema<IOTPVerification>(
  {
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    otp: {
      type: String,
      required: [true, 'OTP is required'],
      length: 6,
    },
    purpose: {
      type: String,
      enum: ['registration', 'forgot_password', 'phone_verification'],
      default: 'registration',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      index: { expires: 0 }, // Automatically delete expired documents
    },
    verified: {
      type: Boolean,
      default: false,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 3, // Maximum 3 attempts
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
otpVerificationSchema.index({ phoneNumber: 1, createdAt: -1 });

// Method to check if OTP is valid
otpVerificationSchema.methods.isValidOTP = function(inputOTP: string): boolean {
  return this.otp === inputOTP && !this.verified && this.expiresAt > new Date() && this.attempts < 3;
};

// Method to mark as verified
otpVerificationSchema.methods.markAsVerified = function(): void {
  this.verified = true;
  this.save();
};

// Method to increment attempts
otpVerificationSchema.methods.incrementAttempts = function(): void {
  this.attempts += 1;
  this.save();
};

export default mongoose.model<IOTPVerification>('OTPVerification', otpVerificationSchema);
