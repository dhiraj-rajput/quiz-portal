import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Navbar from "./components/Layout/Navbar";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import ForgotPassword from './components/Auth/ForgotPassword';
import AdminDashboard from "./components/Admin/Dashboard";
import UserManagement from "./components/Admin/UserManagement";
import ModuleManagement from "./components/Admin/ModuleManagement";
import TestManagement from "./components/Admin/TestManagement";
import Analytics from "./components/Admin/Analytics";
import ModuleAssignment from "./components/Admin/ModuleAssignment";
import TestAssignment from "./components/Admin/TestAssignment";
import StudentDashboard from "./components/Student/Dashboard";
import StudentModules from "./components/Student/Modules";
import StudentTests from "./components/Student/Tests";
import StudentResults from "./components/Student/Results";
import TestInterface from "./components/Student/TestInterface";
import DocumentViewer from "./components/Student/DocumentViewer";
import UserProfile from "./components/User/UserProfile";
import NotificationPage from "./components/Notifications/NotificationPage";

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Component to handle role-based redirects
const RoleBasedRedirect = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  } else if (user.role === 'student') {
    return <Navigate to="/student" replace />;
  }
  
  return <Navigate to="/login" replace />;
};

const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          {/* Test interface route without navbar for secure environment */}
          <Route path="/student/test-interface/:testId" element={<ProtectedRoute requiredRole="student"><TestInterface /></ProtectedRoute>} />
          
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Admin routes with navbar */}
          <Route path="/admin" element={<><Navbar /><ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute></>} />
          <Route path="/admin/users" element={<><Navbar /><ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute></>} />
          <Route path="/admin/modules" element={<><Navbar /><ProtectedRoute requiredRole="admin"><ModuleManagement /></ProtectedRoute></>} />
          <Route path="/admin/tests" element={<><Navbar /><ProtectedRoute requiredRole="admin"><TestManagement /></ProtectedRoute></>} />
          <Route path="/admin/analytics" element={<><Navbar /><ProtectedRoute requiredRole="admin"><Analytics /></ProtectedRoute></>} />
          <Route path="/admin/assign-modules" element={<><Navbar /><ProtectedRoute requiredRole="admin"><ModuleAssignment /></ProtectedRoute></>} />
          <Route path="/admin/assign-tests" element={<><Navbar /><ProtectedRoute requiredRole="admin"><TestAssignment /></ProtectedRoute></>} />
          
          {/* Student routes with navbar */}
          <Route path="/student" element={<><Navbar /><ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute></>} />
          <Route path="/student/modules" element={<><Navbar /><ProtectedRoute requiredRole="student"><StudentModules /></ProtectedRoute></>} />
          <Route path="/student/modules/:moduleId/view" element={<><Navbar /><ProtectedRoute requiredRole="student"><DocumentViewer /></ProtectedRoute></>} />
          <Route path="/student/tests" element={<><Navbar /><ProtectedRoute requiredRole="student"><StudentTests /></ProtectedRoute></>} />
          <Route path="/student/results" element={<><Navbar /><ProtectedRoute requiredRole="student"><StudentResults /></ProtectedRoute></>} />
          
          {/* Other protected routes with navbar */}
          <Route path="/notifications" element={<><Navbar /><ProtectedRoute><NotificationPage /></ProtectedRoute></>} />
          <Route path="/profile/:userId" element={<><Navbar /><ProtectedRoute><UserProfile /></ProtectedRoute></>} />
          
          {/* Root redirect */}
          <Route path="/" element={<RoleBasedRedirect />} />
        </Routes>
      </div>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;