export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'student';
  status: 'active' | 'inactive';
  admissionDate: string;
  createdAt: string;
}

export interface PendingRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  admissionDate: string;
  status: 'pending';
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
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
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
  password: string;
  confirmPassword: string;
  admissionDate: string;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}