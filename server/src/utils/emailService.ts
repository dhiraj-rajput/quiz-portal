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

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
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
  async sendRejectionNotification(email: string, userName: string, reason: string, adminName: string): Promise<boolean> {
    const data: NotificationData = {
      userName,
      action: 'rejected',
      reason,
      adminName,
    };

    const html = this.generateRejectionEmailTemplate(data);
    
    return this.sendEmail({
      to: email,
      subject: '❌ Registration Status Update - Quiz Portal',
      html,
      text: `Hi ${userName}, your registration has been rejected by ${adminName}. Reason: ${reason}`,
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

    const html = this.generateTestAssignmentTemplate(data);
    
    return this.sendEmail({
      to: user.email,
      subject: `📝 New Test Assigned: ${testName}`,
      html,
      text: `Hi ${data.userName}, you have been assigned a new test: ${testName}. Deadline: ${deadline.toLocaleDateString()}`,
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

    const html = this.generateModuleAssignmentTemplate(data);
    
    return this.sendEmail({
      to: user.email,
      subject: `📚 New Module Assigned: ${moduleName}`,
      html,
      text: `Hi ${data.userName}, you have been assigned a new module: ${moduleName}. Deadline: ${deadline.toLocaleDateString()}`,
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

    const html = this.generateTestResultTemplate(data);
    const percentage = Math.round((score / totalMarks) * 100);
    
    return this.sendEmail({
      to: user.email,
      subject: `📊 Test Result: ${testName} - ${percentage}%`,
      html,
      text: `Hi ${data.userName}, your test result for ${testName}: ${score}/${totalMarks} (${percentage}%)`,
    });
  }

  // Deadline reminder notification
  async sendDeadlineReminder(user: IUser, itemName: string, itemType: 'test' | 'module', deadline: Date): Promise<boolean> {
    const data: NotificationData = {
      userName: `${user.firstName} ${user.lastName}`,
      action: 'deadline_reminder',
      testName: itemType === 'test' ? itemName : undefined,
      moduleName: itemType === 'module' ? itemName : undefined,
      deadline,
    };

    const html = this.generateDeadlineReminderTemplate(data, itemType);
    const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    return this.sendEmail({
      to: user.email,
      subject: `⏰ Reminder: ${itemName} Due in ${daysLeft} Day(s)`,
      html,
      text: `Hi ${data.userName}, reminder: ${itemName} is due on ${deadline.toLocaleDateString()}`,
    });
  }

  // Email templates
  private generateApprovalEmailTemplate(data: NotificationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Approved</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Quiz Portal!</h1>
          </div>
          <div class="content">
            <div class="success">
              <strong>Great news!</strong> Your registration has been approved.
            </div>
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>We're excited to inform you that your registration for Quiz Portal has been <strong>approved</strong> by ${data.adminName}.</p>
            <p>You can now access your dashboard and start exploring the available modules and tests.</p>
            <p><strong>What you can do now:</strong></p>
            <ul>
              <li>✅ Log in to your student dashboard</li>
              <li>📚 Access assigned learning modules</li>
              <li>📝 Take assigned tests and quizzes</li>
              <li>📊 View your progress and results</li>
            </ul>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/login" class="button">Login to Dashboard</a>
            <p>If you have any questions, feel free to contact our support team.</p>
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Status Update</h1>
          </div>
          <div class="content">
            <div class="warning">
              <strong>Registration Decision:</strong> Not approved at this time.
            </div>
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>Thank you for your interest in Quiz Portal. After careful review, ${data.adminName} has decided not to approve your registration at this time.</p>
            ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
            <p>If you believe this decision was made in error or if you have additional information to provide, please contact our support team.</p>
            <p>We appreciate your understanding.</p>
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

  private generateTestAssignmentTemplate(data: NotificationData): string {
    const formattedDeadline = data.deadline?.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Test Assignment</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3742fa 0%, #2f3542 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 New Test Assignment</h1>
          </div>
          <div class="content">
            <div class="info">
              <strong>You have been assigned a new test!</strong>
            </div>
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>You have been assigned a new test: <strong>${data.testName}</strong></p>
            <p><strong>Important Details:</strong></p>
            <ul>
              <li>📅 <strong>Deadline:</strong> ${formattedDeadline}</li>
              <li>⏰ <strong>Make sure to complete before the deadline</strong></li>
              <li>📊 <strong>Results will be available after submission</strong></li>
            </ul>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/student" class="button">View Test</a>
            <p>Good luck with your test!</p>
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

  private generateModuleAssignmentTemplate(data: NotificationData): string {
    const formattedDeadline = data.deadline?.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Module Assignment</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 New Module Assignment</h1>
          </div>
          <div class="content">
            <div class="info">
              <strong>New learning module available!</strong>
            </div>
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>You have been assigned a new learning module: <strong>${data.moduleName}</strong></p>
            <p><strong>Important Details:</strong></p>
            <ul>
              <li>📅 <strong>Deadline:</strong> ${formattedDeadline}</li>
              <li>📖 <strong>Study materials and resources included</strong></li>
              <li>💡 <strong>Complete before taking related tests</strong></li>
            </ul>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/student" class="button">View Module</a>
            <p>Happy learning!</p>
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

  private generateTestResultTemplate(data: NotificationData): string {
    const percentage = Math.round(((data.score || 0) / (data.totalMarks || 1)) * 100);
    const isPassing = percentage >= 60; // Assuming 60% is passing

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Result Available</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${isPassing ? '#28a745' : '#dc3545'} 0%, ${isPassing ? '#20c997' : '#c82333'} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .result { background: ${isPassing ? '#d4edda' : '#f8d7da'}; border: 1px solid ${isPassing ? '#c3e6cb' : '#f5c6cb'}; color: ${isPassing ? '#155724' : '#721c24'}; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .score { font-size: 2em; font-weight: bold; margin: 10px 0; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Test Result Available</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>Your test result for <strong>${data.testName}</strong> is now available:</p>
            <div class="result">
              <div class="score">${data.score}/${data.totalMarks}</div>
              <div style="font-size: 1.5em; margin: 10px 0;">${percentage}%</div>
              <div>${isPassing ? '🎉 Congratulations! You passed!' : '📚 Keep studying and try again!'}</div>
            </div>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/student" class="button">View Detailed Results</a>
            <p>${isPassing ? 'Great job on your performance!' : 'Don\'t worry, you can improve with more practice!'}</p>
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

  private generateDeadlineReminderTemplate(data: NotificationData, itemType: 'test' | 'module'): string {
    const itemName = itemType === 'test' ? data.testName : data.moduleName;
    const icon = itemType === 'test' ? '📝' : '📚';
    const daysLeft = Math.ceil(((data.deadline?.getTime() || 0) - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deadline Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .reminder { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Deadline Reminder</h1>
          </div>
          <div class="content">
            <div class="reminder">
              <strong>Reminder:</strong> ${icon} ${itemName} is due soon!
            </div>
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>This is a friendly reminder that <strong>${itemName}</strong> is due in <strong>${daysLeft} day(s)</strong>.</p>
            <p><strong>Deadline:</strong> ${data.deadline?.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</p>
            <p>Don't miss out! Make sure to complete it before the deadline.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5174'}/student" class="button">Complete Now</a>
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

  // Test email configuration
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration error:', error);
      return false;
    }
  }
}

export default EmailService;
