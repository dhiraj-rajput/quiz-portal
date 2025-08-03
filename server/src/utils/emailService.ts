import nodemailer from 'nodemailer';
import { IUser } from '../models/User';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface NotificationData {
  userName: string;
  action: string;
  reason?: string;
  adminName?: string;
  testName?: string;
  moduleName?: string;
  deadline?: Date;
  score?: number;
  totalMarks?: number;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private emailEnabled: boolean = false;

  constructor() {
    // Check if email credentials are provided
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (emailUser && emailPass) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      this.emailEnabled = true;
      console.log('📧 Email service initialized');
    } else {
      console.log('⚠️  Email service disabled - credentials not provided');
      this.emailEnabled = false;
    }
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.emailEnabled || !this.transporter) {
      console.log(`Email service disabled - would send: ${options.subject} to ${options.to}`);
      return true; // Return true to not break the flow
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Quiz Portal <noreply@quizportal.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  // Registration approval notification
  async sendApprovalNotification(user: IUser, adminName: string): Promise<boolean> {
    const data: NotificationData = {
      userName: `${user.firstName} ${user.lastName}`,
      action: 'approved',
      adminName,
    };

    const html = this.generateApprovalEmailTemplate(data);
    
    return this.sendEmail({
      to: user.email,
      subject: '🎉 Registration Approved - Welcome to Quiz Portal!',
      html,
      text: `Hi ${data.userName}, your registration has been approved by ${adminName}. You can now log in to access your dashboard.`,
    });
  }

  // Registration rejection notification
  async sendRejectionNotification(user: IUser, reason: string, adminName: string): Promise<boolean> {
    const data: NotificationData = {
      userName: `${user.firstName} ${user.lastName}`,
      action: 'rejected',
      reason,
      adminName,
    };

    const html = this.generateRejectionEmailTemplate(data);
    
    return this.sendEmail({
      to: user.email,
      subject: '❌ Registration Status Update - Quiz Portal',
      html,
      text: `Hi ${data.userName}, unfortunately your registration has been rejected. Reason: ${reason}. You can contact support for more information.`,
    });
  }

  // Test assignment notification
  async sendTestAssignmentNotification(user: IUser, testName: string, deadline: Date): Promise<boolean> {
    const data: NotificationData = {
      userName: `${user.firstName} ${user.lastName}`,
      action: 'test_assigned',
      testName,
      deadline,
    };

    const html = this.generateTestAssignmentEmailTemplate(data);
    
    return this.sendEmail({
      to: user.email,
      subject: `📝 New Test Assignment: ${testName}`,
      html,
      text: `Hi ${data.userName}, you have been assigned a new test: ${testName}. Deadline: ${deadline.toLocaleDateString()}.`,
    });
  }

  // Module assignment notification
  async sendModuleAssignmentNotification(user: IUser, moduleName: string, deadline: Date): Promise<boolean> {
    const data: NotificationData = {
      userName: `${user.firstName} ${user.lastName}`,
      action: 'module_assigned',
      moduleName,
      deadline,
    };

    const html = this.generateModuleAssignmentEmailTemplate(data);
    
    return this.sendEmail({
      to: user.email,
      subject: `📚 New Module Assignment: ${moduleName}`,
      html,
      text: `Hi ${data.userName}, you have been assigned a new module: ${moduleName}. Deadline: ${deadline.toLocaleDateString()}.`,
    });
  }

  // Test result notification
  async sendTestResultNotification(user: IUser, testName: string, score: number, totalMarks: number): Promise<boolean> {
    const data: NotificationData = {
      userName: `${user.firstName} ${user.lastName}`,
      action: 'test_result',
      testName,
      score,
      totalMarks,
    };

    const html = this.generateTestResultEmailTemplate(data);
    const percentage = Math.round((score / totalMarks) * 100);
    
    return this.sendEmail({
      to: user.email,
      subject: `📊 Test Result: ${testName} - ${percentage}%`,
      html,
      text: `Hi ${data.userName}, your test result for ${testName} is available. Score: ${score}/${totalMarks} (${percentage}%).`,
    });
  }

  // Deadline reminder
  async sendDeadlineReminder(user: IUser, itemName: string, itemType: 'test' | 'module', deadline: Date): Promise<boolean> {
    const data: NotificationData = {
      userName: `${user.firstName} ${user.lastName}`,
      action: 'deadline_reminder',
      [itemType === 'test' ? 'testName' : 'moduleName']: itemName,
      deadline,
    };

    const html = this.generateDeadlineReminderEmailTemplate(data, itemType);
    const emoji = itemType === 'test' ? '📝' : '📚';
    
    return this.sendEmail({
      to: user.email,
      subject: `⏰ Reminder: ${emoji} ${itemName} - Due Soon`,
      html,
      text: `Hi ${data.userName}, reminder: ${itemName} (${itemType}) is due on ${deadline.toLocaleDateString()}.`,
    });
  }

  // Email template generators
  private generateApprovalEmailTemplate(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Registration Approved</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Quiz Portal!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName},</h2>
            <p>Great news! Your registration has been approved by ${data.adminName}.</p>
            <p>You can now log in to your account and start exploring the Quiz Portal dashboard.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Login to Dashboard</a>
            <p>Best regards,<br>Quiz Portal Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateRejectionEmailTemplate(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Registration Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Status Update</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.userName},</h2>
            <p>Unfortunately, we cannot approve your registration at this time.</p>
            <p><strong>Reason:</strong> ${data.reason}</p>
            <p>If you believe this is an error, please contact our support team.</p>
            <p>Best regards,<br>Quiz Portal Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateTestAssignmentEmailTemplate(data: NotificationData): string {
    return `<p>Hi ${data.userName}, you have been assigned a new test: ${data.testName}. Deadline: ${data.deadline?.toLocaleDateString()}.</p>`;
  }

  private generateModuleAssignmentEmailTemplate(data: NotificationData): string {
    return `<p>Hi ${data.userName}, you have been assigned a new module: ${data.moduleName}. Deadline: ${data.deadline?.toLocaleDateString()}.</p>`;
  }

  private generateTestResultEmailTemplate(data: NotificationData): string {
    const percentage = Math.round(((data.score || 0) / (data.totalMarks || 1)) * 100);
    return `<p>Hi ${data.userName}, your test result for ${data.testName} is available. Score: ${data.score}/${data.totalMarks} (${percentage}%).</p>`;
  }

  private generateDeadlineReminderEmailTemplate(data: NotificationData, itemType: 'test' | 'module'): string {
    const itemName = itemType === 'test' ? data.testName : data.moduleName;
    return `<p>Hi ${data.userName}, reminder: ${itemName} (${itemType}) is due on ${data.deadline?.toLocaleDateString()}.</p>`;
  }
}

// Export as default
export default EmailService;
