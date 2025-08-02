// API configuration and utilities
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface ApiError {
  message: string;
  status?: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeader(): { Authorization?: string } {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token'); // Legacy compatibility
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async handleResponse<T>(response: Response, originalRequest?: () => Promise<Response>): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401 && originalRequest) {
        // Try to refresh token
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request with new token
          const retryResponse = await originalRequest();
          return this.handleResponse<T>(retryResponse);
        } else {
          // Redirect to login if refresh fails
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token'); // Legacy compatibility  
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentUser');
          window.location.href = '/login';
          throw new Error('Authentication failed');
        }
      }

      const error: ApiError = {
        message: data.error?.message || data.message || 'An error occurred',
        status: response.status,
      };
      throw error;
    }

    return data;
  }

  async get<T>(endpoint: string): Promise<T> {
    const makeRequest = () => fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const makeRequest = () => fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const makeRequest = () => fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
      },
      body: formData,
    });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const makeRequest = () => fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const makeRequest = () => fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    });

    const response = await makeRequest();
    return this.handleResponse<T>(response, makeRequest);
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.data.accessToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }
}

// Create API client instance
export const api = new ApiClient(API_BASE_URL);

// Auth API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ user: any; accessToken: string; refreshToken: string }>>('/auth/login', {
      email,
      password,
    }),

  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    admissionDate: string;
  }) => api.post<ApiResponse>('/auth/register', data),

  logout: () => api.post<ApiResponse>('/auth/logout'),

  getProfile: () => api.get<ApiResponse<any>>('/auth/me'),

  updatePassword: (currentPassword: string, newPassword: string) =>
    api.post<ApiResponse>('/auth/update-password', {
      currentPassword,
      newPassword,
    }),
};

// Admin API endpoints
export const adminAPI = {
  getPendingRequests: (page = 1, limit = 10, search = '') =>
    api.get<ApiResponse<{ requests: any[]; pagination: any }>>
      (`/admin/pending-requests?page=${page}&limit=${limit}&search=${search}`),

  approveUser: (id: string, role: string) =>
    api.put<ApiResponse>(`/admin/approve-user/${id}`, { role }),

  rejectUser: (id: string, reason?: string) =>
    api.delete<ApiResponse>(`/admin/reject-user/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`),

  getUsers: (page = 1, limit = 10, search = '', role = '') =>
    api.get<ApiResponse<{ users: any[]; pagination: any }>>
      (`/admin/users?page=${page}&limit=${limit}&search=${search}&role=${role}`),

  createUser: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    admissionDate: string;
  }) => api.post<ApiResponse>('/admin/users', userData),

  updateUser: (id: string, userData: any) =>
    api.put<ApiResponse>(`/admin/users/${id}`, userData),

  deleteUser: (id: string) =>
    api.delete<ApiResponse>(`/admin/users/${id}`),

  getStats: () => api.get<ApiResponse<any>>('/admin/stats'),

  // Analytics endpoints
  getTestAnalytics: () => api.get<ApiResponse<any>>('/analytics/dashboard'),
  getTestAssignments: (page = 1, limit = 50) =>
    api.get<ApiResponse<{ assignments: any[]; pagination: any }>>(`/tests/assignments?page=${page}&limit=${limit}`),
  getDashboardStats: () => api.get<ApiResponse<any>>('/analytics/dashboard'),
};

// Module API endpoints
export const moduleAPI = {
  getModules: (page = 1, limit = 10, search = '') =>
    api.get<ApiResponse<{ modules: any[]; pagination: any }>>
      (`/modules?page=${page}&limit=${limit}&search=${search}`),

  getModule: (id: string) =>
    api.get<ApiResponse<{ module: any }>>(`/modules/${id}`),

  createModule: (formData: FormData) =>
    api.postFormData<ApiResponse<{ module: any }>>('/modules', formData),

  updateModule: (id: string, formData: FormData) =>
    api.postFormData<ApiResponse<{ module: any }>>(`/modules/${id}`, formData),

  deleteModule: (id: string) =>
    api.delete<ApiResponse>(`/modules/${id}`),

  assignModule: (id: string, studentIds: string[], dueDate?: string) =>
    api.post<ApiResponse>(`/modules/${id}/assign`, { studentIds, dueDate }),

  getModuleAssignments: (page: number = 1, limit: number = 10) =>
    api.get<ApiResponse<{ assignments: any[]; pagination: any }>>(`/modules/assignments?page=${page}&limit=${limit}`),

  getModuleAssignment: (moduleId: string) =>
    api.get<ApiResponse<{ assignment: any }>>(`/modules/${moduleId}/assignments`),

  removeFile: (moduleId: string, fileId: string) =>
    api.delete<ApiResponse>(`/modules/${moduleId}/files/${fileId}`),
};

// Test API endpoints
export const testAPI = {
  getTests: (page = 1, limit = 10, search = '', isPublished?: boolean) => {
    let url = `/tests?page=${page}&limit=${limit}&search=${search}`;
    if (isPublished !== undefined) {
      url += `&isPublished=${isPublished}`;
    }
    return api.get<ApiResponse<{ tests: any[]; pagination: any }>>(url);
  },

  getTest: (id: string) =>
    api.get<ApiResponse<{ test: any }>>(`/tests/${id}`),

  getTestForTaking: (id: string) =>
    api.get<ApiResponse<{ test: any }>>(`/tests/${id}/take`),

  createTest: (data: any) =>
    api.post<ApiResponse<{ test: any }>>('/tests', data),

  updateTest: (id: string, data: any) =>
    api.put<ApiResponse<{ test: any }>>(`/tests/${id}`, data),

  deleteTest: (id: string) =>
    api.delete<ApiResponse>(`/tests/${id}`),

  assignTest: (id: string, data: {
    studentIds: string[];
    dueDate: string;
    timeLimit?: number;
    maxAttempts?: number;
  }) => api.post<ApiResponse>(`/tests/${id}/assign`, data),

  getTestAssignments: (page: number = 1, limit: number = 10) =>
    api.get<ApiResponse<{ assignments: any[]; pagination: any }>>(`/tests/assignments?page=${page}&limit=${limit}`),

  getTestAssignment: (testId: string) =>
    api.get<ApiResponse<{ assignment: any }>>(`/tests/${testId}/assignments`),

  submitTest: (id: string, data: {
    answers: Array<{ questionId: string; selectedOptionId: string }>;
    timeSpent: number;
    startedAt: string;
  }) => api.post<ApiResponse<{ testResult: any }>>(`/tests/${id}/submit`, data),

  getTestResults: (id: string) =>
    api.get<ApiResponse<{ results: any[] }>>(`/tests/${id}/results`),
};

// Student API endpoints
export const studentAPI = {
  getDashboard: () =>
    api.get<ApiResponse<any>>('/student/dashboard'),

  getAssignedModules: (page = 1, limit = 10) =>
    api.get<ApiResponse<any>>(`/student/assigned-modules?page=${page}&limit=${limit}`),

  getAssignedTests: (page = 1, limit = 10) =>
    api.get<ApiResponse<any>>(`/student/assigned-tests?page=${page}&limit=${limit}`),

  getTestForTaking: (testId: string) =>
    api.get<ApiResponse<any>>(`/tests/${testId}/take`),

  markModuleComplete: (assignmentId: string) =>
    api.put<ApiResponse<any>>(`/student/module-assignments/${assignmentId}/complete`, {}),

  getResults: () =>
    api.get<ApiResponse<any>>('/student/results'),
};

// File API endpoints
export const fileAPI = {
  getModuleFile: (moduleId: string, fileName: string) =>
    `${API_BASE_URL}/files/modules/${moduleId}/${fileName}`,

  downloadModuleFile: (moduleId: string, fileName: string) =>
    `${API_BASE_URL}/files/modules/${moduleId}/${fileName}/download`,
};
