import mongoose, { Schema, Document } from 'mongoose';

export interface IModuleAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId[];
  assignedBy: mongoose.Types.ObjectId;
  dueDate?: Date;
  isActive: boolean;
  completedBy: {
    studentId: mongoose.Types.ObjectId;
    completedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const moduleAssignmentSchema = new Schema<IModuleAssignment>(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module ID is required'],
    },
    assignedTo: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      required: [true, 'At least one student must be assigned'],
      validate: {
        validator: function (assignedTo: mongoose.Types.ObjectId[]) {
          return assignedTo.length > 0;
        },
        message: 'At least one student must be assigned to the module',
      },
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned by is required'],
    },
    dueDate: {
      type: Date,
      validate: {
        validator: function (value: Date) {
          return !value || value > new Date();
        },
        message: 'Due date must be in the future',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    completedBy: [{
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      completedAt: {
        type: Date,
        default: Date.now,
      }
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
moduleAssignmentSchema.index({ moduleId: 1 });
moduleAssignmentSchema.index({ assignedTo: 1, isActive: 1 });
moduleAssignmentSchema.index({ assignedBy: 1, createdAt: -1 });

// Compound index for student queries
moduleAssignmentSchema.index({ assignedTo: 1, isActive: 1, dueDate: 1 });

const ModuleAssignment = mongoose.model<IModuleAssignment>('ModuleAssignment', moduleAssignmentSchema);

export default ModuleAssignment;
