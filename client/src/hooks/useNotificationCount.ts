import { useState, useEffect } from 'react';
import { notificationAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export const useNotificationCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUnreadCount = async () => {
    // Only fetch if user is authenticated
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications({
        read: false,
        page: 1,
        limit: 1, // We only need the count
      });
      
      if (response.success && response.data) {
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  const decrementCount = () => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const incrementCount = () => {
    setUnreadCount(prev => prev + 1);
  };

  useEffect(() => {
    // Reset count if user logs out
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Fetch initial count when user is authenticated
    fetchUnreadCount();
    
    // Refresh count every 30 seconds only when authenticated
    const interval = setInterval(() => {
      if (user) {
        fetchUnreadCount();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]); // Depend on user state

  return {
    unreadCount,
    loading,
    refreshCount: fetchUnreadCount,
    markAllAsRead,
    decrementCount,
    incrementCount,
  };
};
