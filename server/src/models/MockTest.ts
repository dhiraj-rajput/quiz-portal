import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionOption {
  _id?: mongoose.Types.ObjectId;
  text: string;
  isCorrect: boolean;
}

export interface IQuestion {
  _id?: mongoose.Types.ObjectId;
  question: string;
  options: IQuestionOption[];
  explanation?: string;
  points: number;
}

export interface IMockTest extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  instructions: string;
  description: string;
  questions: IQuestion[];
  totalQuestions: number;
  totalPoints: number;
  timeLimit: number; // in minutes
  isPublished: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const questionOptionSchema = new Schema<IQuestionOption>({
  text: {
    type: String,
    required: [true, 'Option text is required'],
    trim: true,
    maxlength: [200, 'Option text cannot exceed 200 characters'],
  },
  isCorrect: {
    type: Boolean,
    required: [true, 'isCorrect flag is required'],
    default: false,
  },
});

const questionSchema = new Schema<IQuestion>({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [1000, 'Question text cannot exceed 1000 characters'],
  },
  options: {
    type: [questionOptionSchema],
    required: [true, 'Question options are required'],
    validate: {
      validator: function (options: IQuestionOption[]) {
        const correctCount = options.filter(opt => opt.isCorrect).length;
        return options.length >= 2 && options.length <= 6 && correctCount === 1;
      },
      message: 'Question must have between 2 and 6 options with exactly one correct answer',
    },
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: [1000, 'Explanation cannot exceed 1000 characters'],
  },
  points: {
    type: Number,
    required: [true, 'Question points are required'],
    min: [1, 'Question must have at least 1 point'],
    max: [10, 'Question cannot have more than 10 points'],
    default: 1,
  },
});

const mockTestSchema = new Schema<IMockTest>(
  {
    title: {
      type: String,
      required: [true, 'Test title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    instructions: {
      type: String,
      required: [true, 'Test instructions are required'],
      trim: true,
      maxlength: [2000, 'Instructions cannot exceed 2000 characters'],
    },
    description: {
      type: String,
      required: [true, 'Test description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    questions: {
      type: [questionSchema],
      required: [true, 'Test must have at least one question'],
      validate: {
        validator: function (questions: IQuestion[]) {
          return questions.length > 0;
        },
        message: 'Test must have at least one question',
      },
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    timeLimit: {
      type: Number,
      required: [true, 'Time limit is required'],
      min: [15, 'Time limit must be at least 15 minutes'],
      max: [180, 'Time limit cannot exceed 3 hours (180 minutes)'],
    },
    isPublished: {
      type: Boolean,
      default: false,
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

// Pre-save middleware to calculate totals
mockTestSchema.pre('save', function (next) {
  this.totalQuestions = this.questions.length;
  this.totalPoints = this.questions.reduce((total, question) => total + question.points, 0);
  next();
});

// Indexes for better query performance
mockTestSchema.index({ title: 'text', description: 'text' });
mockTestSchema.index({ createdBy: 1, createdAt: -1 });
mockTestSchema.index({ isPublished: 1 });

const MockTest = mongoose.model<IMockTest>('MockTest', mockTestSchema);

export default MockTest;
