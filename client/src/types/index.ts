export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: 'super_admin' | 'sub_admin' | 'student';
  status: 'active' | 'inactive';
  admissionDate: string;
  assignedSubAdmin?: string;
  assignedBy?: string;
  createdAt: string;
}

export interface PendingRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  admissionDate: string;
  status: 'pending' | 'assigned_to_sub_admin';
  assignedSubAdmin?: string;
  assignedBy?: string;
  assignedAt?: string;
  createdAt: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  files: ModuleFile[];
  createdBy: string;
  createdAt: string;
}

export interface ModuleFile {
  _id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  mimeType?: string; // Optional for backward compatibility
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface MockTest {
  id: string;
  title: string;
  instructions: string;
  description: string;
  questions: Question[];
  createdBy: string;
  createdAt: string;
}

export interface TestAssignment {
  id: string;
  testId: string;
  assignedTo: string[];
  dueDate: string;
  timeLimit: number; // in minutes
  maxAttempts: number;
  createdBy: string;
  createdAt: string;
}

export interface TestResult {
  id: string;
  userId: string;
  testId: string;
  assignmentId: string;
  answers: number[];
  score: number;
  timeSpent: number; // in seconds
  submittedAt: string;
  attemptNumber: number;
}

export interface ModuleAssignment {
  id: string;
  moduleId: string;
  assignedTo: string[];
  assignedBy: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  loading?: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  admissionDate: string;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}