import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

interface ForgotPasswordStep1Props {
  onNext: (email: string, phoneNumber: string) => void;
}

interface ForgotPasswordStep2Props {
  email: string;
  phoneNumber: string;
  onNext: (otp: string) => void;
  onResend: () => void;
}

interface ForgotPasswordStep3Props {
  email: string;
  resetToken: string;
  onComplete: () => void;
}

// Step 1: Email Verification
const Step1EmailVerification: React.FC<ForgotPasswordStep1Props> = ({ onNext }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/forgot-password/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('User found. Please verify your phone number.');
        onNext(email, data.data.phoneNumber);
      } else {
        showError(data.error?.message || 'Failed to find user');
      }
    } catch (error) {
      showError('Failed to verify email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card-content">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Forgot Password
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Enter your email address to reset your password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-form-label">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-form-input pl-10"
                placeholder="Enter your email address"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`auth-submit-btn ${loading ? 'auth-submit-btn-loading' : ''}`}
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link 
            to="/login" 
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

// Step 2: OTP Verification
const Step2OTPVerification: React.FC<ForgotPasswordStep2Props> = ({ 
  email, 
  phoneNumber, 
  onNext, 
  onResend 
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { showSuccess, showError } = useNotifications();

  React.useEffect(() => {
    // Send OTP automatically when component mounts
    handleSendOTP();
  }, []);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async () => {
    setResendLoading(true);
    try {
      const response = await fetch('/api/forgot-password/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('OTP sent to your phone number');
        setCountdown(120); // 2 minutes countdown
      } else {
        showError(data.error?.message || 'Failed to send OTP');
      }
    } catch (error) {
      showError('Failed to send OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) {
      showError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/forgot-password/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('OTP verified successfully');
        onNext(data.data.resetToken);
      } else {
        showError(data.error?.message || 'Invalid OTP');
      }
    } catch (error) {
      showError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown === 0) {
      handleSendOTP();
      onResend();
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card-content">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Verify Your Phone
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            We've sent a 6-digit code to {phoneNumber}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-form-label">
              Verification Code
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="auth-form-input pl-10 text-center text-lg tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className={`auth-submit-btn ${loading ? 'auth-submit-btn-loading' : ''}`}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="text-center mt-4">
          {countdown > 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              Resend OTP in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {resendLoading ? 'Sending...' : 'Resend OTP'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Step 3: Reset Password
const Step3ResetPassword: React.FC<ForgotPasswordStep3Props> = ({ 
  email, 
  resetToken, 
  onComplete 
}) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/forgot-password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          resetToken,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Password reset successfully! You can now login with your new password.');
        onComplete();
      } else {
        showError(data.error?.message || 'Failed to reset password');
      }
    } catch (error) {
      showError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card-content">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reset Your Password
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-form-label">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="auth-form-input pl-10 pr-10"
                placeholder="Enter new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="auth-form-group">
            <label className="auth-form-label">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="auth-form-input pl-10 pr-10"
                placeholder="Confirm new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`auth-submit-btn ${loading ? 'auth-submit-btn-loading' : ''}`}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Success Component
const SuccessStep: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="auth-card">
      <div className="auth-card-content text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Password Reset Complete!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your password has been successfully reset. 
          You will be redirected to the login page shortly.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="auth-submit-btn"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

// Main ForgotPassword Component
const ForgotPassword: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'email' | 'otp' | 'reset' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resetToken, setResetToken] = useState('');

  const handleEmailNext = (userEmail: string, userPhone: string) => {
    setEmail(userEmail);
    setPhoneNumber(userPhone);
    setCurrentStep('otp');
  };

  const handleOTPNext = (token: string) => {
    setResetToken(token);
    setCurrentStep('reset');
  };

  const handleResetComplete = () => {
    setCurrentStep('success');
  };

  const handleResend = () => {
    // Optional: Add any resend logic here
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo-section">
          <div className="auth-logo">
            <span className="text-3xl">📚</span>
          </div>
          <h1 className="auth-title">Quiz Portal</h1>
          <p className="auth-subtitle">
            Reset your password securely
          </p>
        </div>

        {currentStep === 'email' && (
          <Step1EmailVerification onNext={handleEmailNext} />
        )}

        {currentStep === 'otp' && (
          <Step2OTPVerification
            email={email}
            phoneNumber={phoneNumber}
            onNext={handleOTPNext}
            onResend={handleResend}
          />
        )}

        {currentStep === 'reset' && (
          <Step3ResetPassword
            email={email}
            resetToken={resetToken}
            onComplete={handleResetComplete}
          />
        )}

        {currentStep === 'success' && <SuccessStep />}
      </div>
    </div>
  );
};

export default ForgotPassword;
