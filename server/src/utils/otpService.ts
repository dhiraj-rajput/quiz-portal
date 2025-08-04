// OTP Service for SMS verification using DataGenIT API
import axios from 'axios';

interface OTPResponse {
  status: string;
  validcnt?: number;
  campg_id?: number;
  code: string;
  ts: string;
  desc?: string;
}

class OTPService {
  private authKey: string;
  private senderId: string;
  private baseUrl: string;

  constructor() {
    this.authKey = process.env.OTP_AUTH_KEY || '';
    this.senderId = process.env.OTP_SENDER_ID || 'QUIZAPP';
    this.baseUrl = process.env.OTP_BASE_URL || 'https://global.datagenit.com/API/sms-api.php';
  }

  // Generate a 6-digit OTP
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP via SMS
  async sendOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Ensure phone number is in the correct format
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const message = `Your Quiz Portal verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;

      const params = {
        auth: this.authKey,
        msisdn: formattedNumber,
        senderid: this.senderId,
        message: message,
        countrycode: '91' // Default to India, can be made configurable
      };

      const response = await axios.get(this.baseUrl, { params });
      const data: OTPResponse = response.data;

      if (data.status === 'success') {
        return {
          success: true,
          message: 'OTP sent successfully',
          data: {
            campaignId: data.campg_id,
            timestamp: data.ts
          }
        };
      } else {
        return {
          success: false,
          message: this.getErrorMessage(data.code),
          data: data
        };
      }
    } catch (error: any) {
      console.error('OTP Send Error:', error);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
        data: null
      };
    }
  }

  // Format phone number to include country code
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If number starts with 0, remove it (for Indian numbers)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // If number doesn't start with country code, add 91 for India
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  // Get user-friendly error message based on error code
  private getErrorMessage(code: string): string {
    const errorMessages: { [key: string]: string } = {
      '401': 'Authentication failed',
      '402': 'Invalid authentication key',
      '405': 'Missing required parameters',
      '406': 'Message content is missing',
      '407': 'HTTP API permission denied',
      '408': 'Invalid sender ID',
      '410': 'Phone number is required',
      '411': 'Too many phone numbers provided',
      '412': 'Insufficient balance in SMS account',
      '413': 'Sender ID not approved',
      '414': 'Country not active for your account'
    };

    return errorMessages[code] || 'Failed to send OTP. Please try again.';
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber: string): { valid: boolean; message: string } {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length < 10) {
      return { valid: false, message: 'Phone number must be at least 10 digits' };
    }
    
    if (cleaned.length > 15) {
      return { valid: false, message: 'Phone number is too long' };
    }
    
    // Indian phone number validation
    const indianPattern = /^[6-9]\d{9}$/;
    if (cleaned.length === 10 && !indianPattern.test(cleaned)) {
      return { valid: false, message: 'Please enter a valid Indian mobile number' };
    }
    
    return { valid: true, message: 'Valid phone number' };
  }
}

export default new OTPService();
