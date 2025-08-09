import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/Common.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'sub_admin' | 'admin' | 'student';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  // Show loading while authentication is being checked
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    let hasAccess = false;

    // Check role-based access
    if (requiredRole === 'admin') {
      // Legacy 'admin' role - allow both super_admin and sub_admin
      hasAccess = user.role === 'super_admin' || user.role === 'sub_admin';
    } else {
      // Specific role required
      hasAccess = user.role === requiredRole;
    }

    if (!hasAccess) {
      // Redirect to appropriate dashboard based on user role
      const redirectPath = ['super_admin', 'sub_admin'].includes(user.role) ? '/admin' : '/student';
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;