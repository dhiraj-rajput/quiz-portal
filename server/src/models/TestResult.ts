import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswer {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent: number; // in seconds
}

export interface ITestResult extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;
  assignmentId: mongoose.Types.ObjectId;
  answers: IAnswer[];
  score: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  submittedAt: Date;
  attemptNumber: number;
  isCompleted: boolean;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<IAnswer>({
  questionId: {
    type: String,
    required: [true, 'Question ID is required'],
  },
  selectedAnswer: {
    type: Number,
    required: [true, 'Selected answer is required'],
    min: [0, 'Selected answer index cannot be negative'],
  },
  isCorrect: {
    type: Boolean,
    required: [true, 'Answer correctness is required'],
  },
  pointsEarned: {
    type: Number,
    required: [true, 'Points earned is required'],
    min: [0, 'Points earned cannot be negative'],
  },
  timeSpent: {
    type: Number,
    required: [true, 'Time spent is required'],
    min: [0, 'Time spent cannot be negative'],
  },
});

const testResultSchema = new Schema<ITestResult>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockTest',
      required: [true, 'Test ID is required'],
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestAssignment',
      required: [true, 'Assignment ID is required'],
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    score: {
      type: Number,
      required: [true, 'Score is required'],
      min: [0, 'Score cannot be negative'],
      default: 0,
    },
    percentage: {
      type: Number,
      required: [true, 'Percentage is required'],
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100'],
      default: 0,
    },
    totalQuestions: {
      type: Number,
      required: [true, 'Total questions is required'],
      min: [1, 'Must have at least 1 question'],
    },
    correctAnswers: {
      type: Number,
      required: [true, 'Correct answers count is required'],
      min: [0, 'Correct answers cannot be negative'],
      default: 0,
    },
    timeSpent: {
      type: Number,
      required: [true, 'Time spent is required'],
      min: [0, 'Time spent cannot be negative'],
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    attemptNumber: {
      type: Number,
      required: [true, 'Attempt number is required'],
      min: [1, 'Attempt number must be at least 1'],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      required: [true, 'Start time is required'],
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware - disabled to let controller handle all calculations
testResultSchema.pre('save', function (next) {
  // Let the controller handle all calculations
  next();
});

// Indexes for better query performance
testResultSchema.index({ userId: 1, testId: 1, attemptNumber: 1 }, { unique: true });
testResultSchema.index({ userId: 1, submittedAt: -1 });
testResultSchema.index({ testId: 1, submittedAt: -1 });
testResultSchema.index({ assignmentId: 1, submittedAt: -1 });
testResultSchema.index({ isCompleted: 1, submittedAt: -1 });

const TestResult = mongoose.model<ITestResult>('TestResult', testResultSchema);

export default TestResult;
