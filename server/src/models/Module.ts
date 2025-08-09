import mongoose, { Schema, Document } from 'mongoose';

export interface IModuleFile {
  _id?: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface IModule extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  files: IModuleFile[];
  createdBy: mongoose.Types.ObjectId;
  assignedSubAdmin?: mongoose.Types.ObjectId; // For partitioning by sub admin
  createdAt: Date;
  updatedAt: Date;
}

const moduleFileSchema = new Schema<IModuleFile>({
  fileName: {
    type: String,
    required: [true, 'File name is required'],
  },
  originalName: {
    type: String,
    required: [true, 'Original file name is required'],
  },
  filePath: {
    type: String,
    required: [true, 'File path is required'],
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['pdf', 'mp4', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'xls', 'xlsx'],
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    max: [52428800, 'File size cannot exceed 50MB'], // 50MB in bytes
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const moduleSchema = new Schema<IModule>(
  {
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Module description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    files: [moduleFileSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    assignedSubAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
      validate: {
        validator: async function(value: mongoose.Types.ObjectId) {
          if (!value) return true;
          const User = mongoose.model('User');
          const subAdmin = await User.findById(value);
          return subAdmin && (subAdmin.role === 'sub_admin' || subAdmin.role === 'super_admin');
        },
        message: 'Assigned sub admin must have sub_admin or super_admin role'
      }
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
moduleSchema.index({ title: 'text', description: 'text' });
moduleSchema.index({ createdBy: 1, createdAt: -1 });
moduleSchema.index({ assignedSubAdmin: 1, createdAt: -1 }); // For sub admin filtering

const Module = mongoose.model<IModule>('Module', moduleSchema);

export default Module;
