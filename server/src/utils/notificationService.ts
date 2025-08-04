import { createNotification } from '../controllers/notificationController';

export class NotificationService {
  
  // Test assignment notifications
  static async notifyTestAssignment(userId: string, testTitle: string, dueDate: Date) {
    await createNotification(userId, 'info', 'New Test Assignment', 
      `You have been assigned a new test: "${testTitle}". Due date: ${dueDate.toLocaleDateString()}`, 'assignment');
  }

  // Module assignment notifications
  static async notifyModuleAssignment(userId: string, moduleTitle: string, dueDate?: Date) {
    const message = dueDate 
      ? `You have been assigned a new module: "${moduleTitle}". Due date: ${dueDate.toLocaleDateString()}`
      : `You have been assigned a new module: "${moduleTitle}"`;
    
    await createNotification(userId, 'info', 'New Module Assignment', message, 'module');
  }

  // Test result notifications
  static async notifyTestResult(userId: string, testTitle: string, score: number, percentage: number) {
    const type = percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'error';
    const message = `Your test "${testTitle}" has been graded. Score: ${score} (${percentage}%)`;
    
    await createNotification(userId, type, 'Test Result Available', message, 'result');
  }

  // Profile update notifications
  static async notifyProfileUpdate(userId: string, updatedBy: string) {
    await createNotification(userId, 'info', 'Profile Updated', 
      `Your profile has been updated by ${updatedBy}`, 'system');
  }

  // User approval notifications
  static async notifyUserApproval(userId: string, approvedBy: string) {
    await createNotification(userId, 'success', 'Registration Approved', 
      `Your registration has been approved by ${approvedBy}. Welcome to Quiz Portal!`, 'system');
  }

  // User creation notifications
  static async notifyUserCreation(userId: string, createdBy: string) {
    await createNotification(userId, 'success', 'Account Created', 
      `Your account has been created by ${createdBy}. Welcome to Quiz Portal!`, 'system');
  }

  // User rejection notifications
  static async notifyUserRejection(email: string, reason: string, rejectedBy: string) {
    // This would typically be sent via email since user doesn't have account yet
    console.log(`User rejection notification for ${email}: ${reason} by ${rejectedBy}`);
  }

  // Test submission notifications
  static async notifyTestSubmission(userId: string, testTitle: string, submissionTime: Date) {
    await createNotification(userId, 'success', 'Test Submitted', 
      `Your test "${testTitle}" has been submitted successfully at ${submissionTime.toLocaleString()}`, 'test');
  }

  // Password change notifications
  static async notifyPasswordChange(userId: string) {
    await createNotification(userId, 'info', 'Password Changed', 
      'Your password has been successfully changed', 'system');
  }

  // Account status notifications
  static async notifyAccountStatusChange(userId: string, newStatus: string, changedBy: string) {
    const type = newStatus === 'active' ? 'success' : 'warning';
    await createNotification(userId, type, 'Account Status Updated', 
      `Your account status has been changed to ${newStatus} by ${changedBy}`, 'system');
  }

  // Bulk notification for all users of a role
  static async notifyAllUsers(userIds: string[], type: 'success' | 'error' | 'warning' | 'info', 
    title: string, message: string, category: 'system' | 'test' | 'module' | 'assignment' | 'result') {
    
    const promises = userIds.map(userId => 
      createNotification(userId, type, title, message, category)
    );
    
    await Promise.allSettled(promises);
  }

  // Test deadline reminders
  static async notifyTestDeadlineReminder(userId: string, testTitle: string, hoursLeft: number) {
    const type = hoursLeft <= 2 ? 'error' : hoursLeft <= 24 ? 'warning' : 'info';
    await createNotification(userId, type, 'Test Deadline Reminder', 
      `Test "${testTitle}" is due in ${hoursLeft} hours`, 'test');
  }

  // Module deadline reminders
  static async notifyModuleDeadlineReminder(userId: string, moduleTitle: string, hoursLeft: number) {
    const type = hoursLeft <= 2 ? 'error' : hoursLeft <= 24 ? 'warning' : 'info';
    await createNotification(userId, type, 'Module Deadline Reminder', 
      `Module "${moduleTitle}" is due in ${hoursLeft} hours`, 'module');
  }

  // System maintenance notifications
  static async notifySystemMaintenance(userIds: string[], startTime: Date, duration: string) {
    await this.notifyAllUsers(userIds, 'warning', 'Scheduled Maintenance', 
      `System maintenance scheduled for ${startTime.toLocaleString()}. Duration: ${duration}`, 'system');
  }

  // New feature announcements
  static async notifyNewFeature(userIds: string[], featureName: string, description: string) {
    await this.notifyAllUsers(userIds, 'info', 'New Feature Available', 
      `${featureName}: ${description}`, 'system');
  }
}
