import mongoose, { Schema, Document } from 'mongoose';

export interface ITestAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId[];
  dueDate: Date;
  timeLimit: number; // in minutes
  maxAttempts: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const testAssignmentSchema = new Schema<ITestAssignment>(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockTest',
      required: [true, 'Test ID is required'],
    },
    assignedTo: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      required: [true, 'At least one student must be assigned'],
      validate: {
        validator: function (assignedTo: mongoose.Types.ObjectId[]) {
          return assignedTo.length > 0;
        },
        message: 'At least one student must be assigned to the test',
      },
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      validate: {
        validator: function (value: Date) {
          return value > new Date();
        },
        message: 'Due date must be in the future',
      },
    },
    timeLimit: {
      type: Number,
      required: [true, 'Time limit is required'],
      min: [0, 'Time limit must be 0 (unlimited) or at least 1 minute'],
      validate: {
        validator: function(value: number) {
          return value === 0 || value >= 1;
        },
        message: 'Time limit must be 0 (unlimited) or at least 1 minute'
      }
    },
    maxAttempts: {
      type: Number,
      required: [true, 'Maximum attempts is required'],
      min: [-1, 'Must be -1 (unlimited) or at least 1 attempt'],
      validate: {
        validator: function(value: number) {
          return value === -1 || value >= 1;
        },
        message: 'Maximum attempts must be -1 (unlimited) or at least 1'
      },
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
testAssignmentSchema.index({ testId: 1 });
testAssignmentSchema.index({ assignedTo: 1, dueDate: 1 });
testAssignmentSchema.index({ createdBy: 1, createdAt: -1 });
testAssignmentSchema.index({ isActive: 1, dueDate: 1 });

// Compound index for student queries
testAssignmentSchema.index({ assignedTo: 1, isActive: 1, dueDate: 1 });

const TestAssignment = mongoose.model<ITestAssignment>('TestAssignment', testAssignmentSchema);

export default TestAssignment;
