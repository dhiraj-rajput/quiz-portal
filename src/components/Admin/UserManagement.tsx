import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Search, Plus, X } from 'lucide-react';
import { adminAPI } from '../../utils/api';
import { useNotifications } from '../../hooks/useNotifications';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: 'admin' | 'student';
  status: 'active' | 'inactive';
  admissionDate: string;
  createdAt: string;
}

interface PendingRequest {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  admissionDate: string;
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'pending'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [passwordEdit, setPasswordEdit] = useState({ newPassword: '', confirmPassword: '', changePassword: false });
  const { showSuccess, showError } = useNotifications();
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'admin' | 'student',
    admissionDate: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, pendingResponse] = await Promise.all([
        adminAPI.getUsers(1, 50).catch(() => ({ success: false, data: null })),
        adminAPI.getPendingRequests(1, 50).catch(() => ({ success: false, data: null }))
      ]);
      
      if (usersResponse.success && usersResponse.data && usersResponse.data.users) {
        setUsers(usersResponse.data.users);
      } else {
        setUsers([]);
      }
      
      if (pendingResponse.success && pendingResponse.data && pendingResponse.data.requests) {
        setPendingRequests(pendingResponse.data.requests);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setUsers([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (id: string) => {
    try {
      await adminAPI.approveUser(id, 'student');
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleRejectUser = async (id: string) => {
    try {
      await adminAPI.rejectUser(id, 'Application rejected');
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newUser.password !== newUser.confirmPassword) {
      showError('Validation Error', 'Passwords do not match');
      return;
    }

    if (newUser.password.length < 8) {
      showError('Validation Error', 'Password must be at least 8 characters long');
      return;
    }

    try {
      // This would need to be implemented in the API
      await adminAPI.createUser({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        password: newUser.password,
        role: newUser.role,
        admissionDate: newUser.admissionDate
      });
      
      setShowCreateModal(false);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        role: 'student',
        admissionDate: ''
      });
      await loadData();
      showSuccess('User Created', 'User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      showError('Creation Failed', 'Failed to create user');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'student') => {
    if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      try {
        await adminAPI.updateUser(userId, { role: newRole });
        await loadData();
        showSuccess('Role Updated', 'User role updated successfully!');
      } catch (error) {
        console.error('Error updating user role:', error);
        showError('Update Failed', 'Failed to update user role');
      }
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await adminAPI.deleteUser(userId);
        await loadData();
        showSuccess('User Deleted', 'User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        showError('Delete Failed', 'Failed to delete user');
      }
    }
  };

  const handleViewUserDetails = (user: User) => {
    setSelectedUser(user);
    setEditingUser({ ...user });
    setPasswordEdit({ newPassword: '', confirmPassword: '', changePassword: false });
    setShowUserDetailModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !editingUser) return;

    // Validate password if changing
    if (passwordEdit.changePassword) {
      if (passwordEdit.newPassword.length < 8) {
        showError('Validation Error', 'Password must be at least 8 characters long');
        return;
      }
      if (passwordEdit.newPassword !== passwordEdit.confirmPassword) {
        showError('Validation Error', 'Passwords do not match');
        return;
      }
    }

    try {
      const updateData: Partial<User & { password?: string }> = { ...editingUser };
      if (passwordEdit.changePassword) {
        updateData.password = passwordEdit.newPassword;
      }
      
      await adminAPI.updateUser(selectedUser._id, updateData);
      setShowUserDetailModal(false);
      setSelectedUser(null);
      setEditingUser({});
      setPasswordEdit({ newPassword: '', confirmPassword: '', changePassword: false });
      await loadData(); // Reload data
      showSuccess('User Updated', 'User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      showError('Update Failed', 'Failed to update user. Please try again.');
    }
  };

  const handleDeleteUserFromModal = async () => {
    if (!selectedUser) return;

    if (window.confirm(`Are you sure you want to delete user: ${selectedUser.email}?`)) {
      try {
        await adminAPI.deleteUser(selectedUser._id);
        setShowUserDetailModal(false);
        setSelectedUser(null);
        setEditingUser({});
        await loadData(); // Reload data
        showSuccess('User Deleted', 'User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        showError('Delete Failed', 'Failed to delete user. Please try again.');
      }
    }
  };

  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    const matchesSearch = `${user.firstName} ${user.lastName} ${user.email} ${user.phoneNumber || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) : [];

  const filteredPendingRequests = Array.isArray(pendingRequests) ? pendingRequests.filter(request =>
    `${request.firstName} ${request.lastName} ${request.email} ${request.phoneNumber || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div className="user-management-loading-container">
        <div className="user-management-loading-content">
          <div className="user-management-loading-spinner"></div>
          <p className="user-management-loading-text">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      <div className="user-management-content">
        <div className="user-management-header">
          <div className="user-management-header-content">
            <div className="user-management-title-section">
              <h1 className="user-management-title">User Management</h1>
              <p className="user-management-subtitle">
                Manage users and pending registration requests
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="create-user-button"
            >
              <Plus className="create-user-button-icon" />
              Create User
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="user-management-tabs">
          <div className="tabs-container">
            <nav className="tabs-nav">
              <button
                onClick={() => setActiveTab('users')}
                className={`tab-button ${
                  activeTab === 'users' ? 'tab-button-active' : 'tab-button-inactive'
                }`}
              >
                <Users className="h-5 w-5 inline mr-2" />
                Active Users ({filteredUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`tab-button ${
                  activeTab === 'pending' ? 'tab-button-active' : 'tab-button-inactive'
                }`}
              >
                <UserCheck className="h-5 w-5 inline mr-2" />
                Pending Requests ({filteredPendingRequests.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-4 sm:px-0 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            {activeTab === 'users' && (
              <div className="sm:w-48">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'student')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="student">Student</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-0">
          {activeTab === 'users' ? (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <li key={user._id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <button
                                onClick={() => handleViewUserDetails(user)}
                                className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                              >
                                {user.firstName} {user.lastName}
                              </button>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {user.role}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                            {user.phoneNumber && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">📱 {user.phoneNumber}</p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {user.status}
                          </span>
                          
                          {/* Role Change Dropdown */}
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user._id, e.target.value as 'admin' | 'student')}
                            className="text-xs rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                          >
                            <option value="admin">Admin</option>
                            <option value="student">Student</option>
                          </select>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteUser(user._id, user.email)}
                            className="inline-flex items-center p-1.5 border border-transparent rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            title="Delete User"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {filteredUsers.length === 0 && (
                <div className="text-center py-6">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    No users match your search criteria.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPendingRequests.map((request) => (
                  <li key={request._id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center">
                              <span className="text-white font-medium">
                                {request.firstName[0]}{request.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {request.firstName} {request.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{request.email}</p>
                            {request.phoneNumber && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">📱 {request.phoneNumber}</p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Requested: {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleApproveUser(request._id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectUser(request._id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {filteredPendingRequests.length === 0 && (
                <div className="text-center py-6">
                  <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No pending requests</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    All registration requests have been processed.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create New User</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newUser.phoneNumber}
                    onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Enter 10-digit mobile number"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'student' })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admission Date
                  </label>
                  <input
                    type="date"
                    value={newUser.admissionDate}
                    onChange={(e) => setNewUser({ ...newUser, admissionDate: e.target.value })}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  User Details
                </h3>
                <button
                  onClick={() => {
                    setShowUserDetailModal(false);
                    setSelectedUser(null);
                    setEditingUser({});
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editingUser.firstName || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editingUser.lastName || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editingUser.phoneNumber || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter 10-digit mobile number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </label>
                  <select
                    value={editingUser.role || 'student'}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'student' })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={editingUser.status || 'active'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as 'active' | 'inactive' })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Password Change Section */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id="changePassword"
                      checked={passwordEdit.changePassword}
                      onChange={(e) => setPasswordEdit({ ...passwordEdit, changePassword: e.target.checked, newPassword: '', confirmPassword: '' })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="changePassword" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Change Password
                    </label>
                  </div>

                  {passwordEdit.changePassword && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordEdit.newPassword}
                          onChange={(e) => setPasswordEdit({ ...passwordEdit, newPassword: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter new password (min 8 characters)"
                          minLength={8}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordEdit.confirmPassword}
                          onChange={(e) => setPasswordEdit({ ...passwordEdit, confirmPassword: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Confirm new password"
                        />
                      </div>
                      {passwordEdit.newPassword && passwordEdit.confirmPassword && passwordEdit.newPassword !== passwordEdit.confirmPassword && (
                        <p className="text-red-600 text-sm">Passwords do not match</p>
                      )}
                      {passwordEdit.newPassword && passwordEdit.newPassword.length < 8 && (
                        <p className="text-red-600 text-sm">Password must be at least 8 characters long</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Admission Date
                  </label>
                  <input
                    type="date"
                    value={editingUser.admissionDate ? new Date(editingUser.admissionDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingUser({ ...editingUser, admissionDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Created:</strong> {new Date(selectedUser.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>User ID:</strong> {selectedUser._id}
                  </p>
                </div>

                <div className="flex justify-between gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleDeleteUserFromModal}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete User
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDetailModal(false);
                        setSelectedUser(null);
                        setEditingUser({});
                        setPasswordEdit({ newPassword: '', confirmPassword: '', changePassword: false });
                      }}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateUser}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Update User
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
