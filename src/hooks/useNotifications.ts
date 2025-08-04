import { useNotification } from '../contexts/NotificationContext';

interface NotificationOptions {
  duration?: number;
  persistent?: boolean;
}

export const useNotifications = () => {
  const { addNotification, removeNotification, clearAllNotifications } = useNotification();

  const showSuccess = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification({
      type: 'success',
      title,
      message,
      duration: options?.duration,
      persistent: options?.persistent,
    });
  };

  const showError = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification({
      type: 'error',
      title,
      message,
      duration: options?.duration,
      persistent: options?.persistent,
    });
  };

  const showWarning = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: options?.duration,
      persistent: options?.persistent,
    });
  };

  const showInfo = (title: string, message?: string, options?: NotificationOptions) => {
    addNotification({
      type: 'info',
      title,
      message,
      duration: options?.duration,
      persistent: options?.persistent,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearAllNotifications,
  };
};
