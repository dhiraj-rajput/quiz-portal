import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, RegisterData } from '../types';
import { authAPI, ApiError } from '../utils/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token'); // Legacy compatibility
      const storedUser = localStorage.getItem('currentUser');

      if (token && storedUser) {
        try {
          // Parse stored user data first
          const storedData = JSON.parse(storedUser);
          // Check if it's a nested structure {user: {...}} or direct user object
          const userData = storedData.user || storedData;
          setUser(userData); // Set user immediately from storage
          setLoading(false); // Set loading to false immediately to prevent blank screens
          
          // Then verify token is still valid by fetching user profile in background
          const response = await authAPI.getProfile();
          if (response.success && response.data) {
            // Check if server returns nested structure {user: {...}} or direct user object
            const serverUserData = response.data.user || response.data;
            // Update with fresh data from server
            setUser(serverUserData);
            localStorage.setItem('currentUser', JSON.stringify(serverUserData));
          } else {
            // Token is invalid, clear stored data
            localStorage.removeItem('accessToken');
            localStorage.removeItem('token'); // Legacy compatibility
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('currentUser');
            setUser(null);
          }
        } catch (error) {
          console.error('AuthContext: Token validation failed:', error);
          // Clear invalid auth data
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token'); // Legacy compatibility
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentUser');
          setUser(null);
        }
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.success && response.data) {
        const { user: userData, accessToken, refreshToken } = response.data;
        
        // Store tokens and user data
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken); // Legacy compatibility
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, error: response.error?.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.message || 'Network error. Please check your connection.' 
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint to invalidate token on server
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if server call fails
    } finally {
      // Clear local storage and state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token'); // Legacy compatibility
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
      setUser(null);
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authAPI.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        confirmPassword: data.confirmPassword,
        admissionDate: data.admissionDate,
      });

      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.error?.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.message || 'Network error. Please check your connection.' 
      };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};