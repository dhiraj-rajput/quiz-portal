import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertCircle,
  Maximize
} from 'lucide-react';
import { studentAPI, testAPI } from '../../utils/api';
import '../../styles/TestInterface.css';
import '../../styles/Common.css';

interface Question {
  _id: string;
  question: string;
  options: Array<{
    _id: string;
    text: string;
  }>;
  points: number;
}

interface TestData {
  _id: string;
  title: string;
  description: string;
  instructions: string;
  timeLimit: number;
  totalQuestions: number;
  questions: Question[];
}

const TestInterface: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { showError, showWarning } = useNotifications();
  
  // Test data
  const [testData, setTestData] = useState<TestData | null>(null);
  
  // Test flow states
  const [currentStep, setCurrentStep] = useState<'loading' | 'instructions' | 'cookie-permission' | 'fullscreen-request' | 'test' | 'submitted'>('loading');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionIndex: number]: number }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Reference to submit test function for timer
  const submitTestRef = useRef<(() => void) | null>(null);
  
  // UI states
  const [testLoading, setTestLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Enhanced test environment
  const [focusMode, setFocusMode] = useState(false);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);

  // Load test data and assignment
  useEffect(() => {
    // Only load test data if authentication is complete and user is authenticated
    if (!loading && user && testId) {
      loadTestData();
    } else if (!loading && !user) {
      setError('Authentication required. Please log in again.');
    } else if (!testId) {
      setError('Test ID is required');
    }
  }, [testId, user, loading]);

  // Timer effect
  useEffect(() => {
    if (currentStep === 'test' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - auto-submit the test
            clearInterval(timer);
            
            // Show notification if permission was granted
            if (Notification.permission === 'granted') {
              new Notification('Time\'s Up!', {
                body: 'Your test time has expired. Submitting automatically.',
                icon: '/favicon.ico'
              });
            }
            
            // Auto-submit with a slight delay to ensure state is updated
            setTimeout(() => {
              if (submitTestRef.current) {
                submitTestRef.current();
              }
            }, 500);
            
            return 0;
          }
          
          // Show time warnings
          if (prev === 301) { // 5 minutes remaining
            showWarning('⏰ 5 minutes remaining!');
            if (Notification.permission === 'granted') {
              new Notification('5 Minutes Remaining', {
                body: 'You have 5 minutes left to complete your test.',
                icon: '/favicon.ico'
              });
            }
          } else if (prev === 61) { // 1 minute remaining
            showWarning('⏰ 1 minute remaining!');
            if (Notification.permission === 'granted') {
              new Notification('1 Minute Remaining', {
                body: 'Only 1 minute left! Please finish your test.',
                icon: '/favicon.ico'
              });
            }
          }
          
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStep, timeRemaining, showWarning]);

  // Prevent context menu and browser dev tools during test
  useEffect(() => {
    if (currentStep === 'test') {
      const preventRightClick = (e: MouseEvent) => e.preventDefault();
      const preventCopyPaste = (e: KeyboardEvent) => {
        // Prevent copy, paste, cut, select all
        if (
          (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) ||
          (e.ctrlKey && e.shiftKey && e.key === 'c') ||
          (e.ctrlKey && e.shiftKey && e.key === 'v')
        ) {
          e.preventDefault();
          showWarning('Copy/paste is disabled during the test for security reasons.');
          return;
        }
      };
      
      const preventDevTools = (e: KeyboardEvent) => {
        // Prevent F12, Ctrl+Shift+I, Ctrl+U, etc.
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.key === 'u') ||
          (e.ctrlKey && e.shiftKey && e.key === 'J')
        ) {
          e.preventDefault();
          return;
        }
      };

      const preventSelection = (e: Event) => {
        e.preventDefault();
      };

      document.addEventListener('contextmenu', preventRightClick);
      document.addEventListener('keydown', preventCopyPaste);
      document.addEventListener('keydown', preventDevTools);
      document.addEventListener('selectstart', preventSelection);

      return () => {
        document.removeEventListener('contextmenu', preventRightClick);
        document.removeEventListener('keydown', preventCopyPaste);
        document.removeEventListener('keydown', preventDevTools);
        document.removeEventListener('selectstart', preventSelection);
      };
    }
  }, [currentStep]);

  // Fullscreen exit detection and warning
  useEffect(() => {
    if (currentStep === 'test') {
      const handleFullscreenChange = () => {
        // Check if we exited fullscreen during the test
        if (!document.fullscreenElement && 
            !(document as any).webkitFullscreenElement && 
            !(document as any).msFullscreenElement) {
          
          setFullscreenExitCount(prev => {
            const newCount = prev + 1;
            
            if (newCount >= 3) {
              // Auto-submit test after 3 exits
              showError('Test will be submitted automatically due to multiple fullscreen exits.');
              
              // Create a notification if permission was granted
              if (Notification.permission === 'granted') {
                new Notification('Test Auto-Submit', {
                  body: 'Your test is being submitted due to multiple fullscreen exits.',
                  icon: '/favicon.ico'
                });
              }
              
              // Release wake lock before submission
              if (wakeLock) {
                wakeLock.release();
                setWakeLock(null);
              }
              
              // Auto-submit after 3 seconds to give user time to see the warning
              setTimeout(() => {
                if (submitTestRef.current) {
                  submitTestRef.current();
                }
              }, 3000);
              
              return newCount;
            } else {
              // Show warning and attempt to re-enter fullscreen
              setShowFullscreenWarning(true);
              showWarning(`Warning: You exited fullscreen mode. ${3 - newCount} exits remaining before auto-submission.`);
              
              // Create a notification if permission was granted
              if (Notification.permission === 'granted') {
                new Notification('Fullscreen Exit Warning', {
                  body: `${3 - newCount} exits remaining before auto-submission.`,
                  icon: '/favicon.ico'
                });
              }
              
              // Try to re-enter fullscreen after a short delay
              setTimeout(() => {
                const enterFullscreen = async () => {
                  try {
                    if (document.documentElement.requestFullscreen) {
                      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
                    } else if ((document.documentElement as any).webkitRequestFullscreen) {
                      await (document.documentElement as any).webkitRequestFullscreen();
                    } else if ((document.documentElement as any).msRequestFullscreen) {
                      await (document.documentElement as any).msRequestFullscreen();
                    }
                  } catch (error) {
                    console.log('Failed to re-enter fullscreen:', error);
                    // If we can't re-enter fullscreen, show a more persistent warning
                    showWarning('Unable to re-enter fullscreen. Please use F11 or your browser\'s fullscreen option.');
                  }
                };
                enterFullscreen();
              }, 1500);
              
              // Hide warning after 10 seconds
              setTimeout(() => {
                setShowFullscreenWarning(false);
              }, 10000);
              
              return newCount;
            }
          });
        }
      };

      const handleVisibilityChange = () => {
        // Detect when user switches tabs/apps
        if (document.hidden) {
          showWarning('Warning: Switching tabs or applications during the test is not recommended.');
        }
      };

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // Prevent accidental page close/refresh
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your test progress will be lost.';
        return 'Are you sure you want to leave? Your test progress will be lost.';
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('msfullscreenchange', handleFullscreenChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [currentStep, wakeLock]);

  const loadTestData = async () => {
    try {
      setTestLoading(true);
      setError('');
      
      // Check if we have a valid token before making the request
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        setTimeout(() => {
          if (window.opener) {
            window.opener.focus();
            window.close();
          } else {
            navigate('/login');
          }
        }, 2000);
        return;
      }
      
      const response = await studentAPI.getTestForTaking(testId!);
      
      if (response.success && response.data) {
        setTestData(response.data.test);
        // Set time limit from test (convert minutes to seconds)
        const timeLimit = response.data.test.timeLimit || 60;
        setTimeRemaining(timeLimit * 60);
        setCurrentStep('instructions');
      } else {
        setError(response.error?.message || 'Failed to load test data');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
        setTimeout(() => {
          if (window.opener) {
            window.opener.focus();
            window.close();
          } else {
            navigate('/login');
          }
        }, 2000);
      } else {
        setError(err.message || 'Failed to load test data');
      }
    } finally {
      setTestLoading(false);
    }
  };

  const handleStartTest = () => {
    setCurrentStep('cookie-permission');
  };

  const handleCookiePermission = async () => {
    try {
      // First, check if cookies are enabled by trying to set and read a test cookie
      document.cookie = "test-cookie-check=1; path=/; SameSite=Lax";
      const cookiesEnabled = document.cookie.indexOf('test-cookie-check=1') !== -1;
      
      if (!cookiesEnabled) {
        showError('Cookies must be enabled to take this test. Please enable cookies in your browser settings and refresh the page to try again.');
        return;
      }

      // Clean up test cookie
      document.cookie = "test-cookie-check=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Request storage permission for better compatibility
      if ('navigator' in window && 'storage' in navigator && 'persist' in navigator.storage) {
        try {
          await navigator.storage.persist();
        } catch (e) {
          console.log('Storage persistence not available');
        }
      }
      
      // Request notification permission for test alerts - make it more explicit
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              console.log('Notification permission granted');
              // Test notification to confirm it works
              new Notification('Test Notifications Enabled', {
                body: 'You will receive alerts for important test events.',
                icon: '/favicon.ico'
              });
            } else {
              console.log('Notification permission denied');
              showWarning('Notifications were denied. You won\'t receive fullscreen exit alerts.');
            }
          } catch (e) {
            console.log('Notification permission request failed:', e);
          }
        } else if (Notification.permission === 'granted') {
          // Test notification to confirm it works
          new Notification('Test Notifications Ready', {
            body: 'Notifications are already enabled for this test.',
            icon: '/favicon.ico'
          });
        }
      } else {
        console.log('Notifications not supported in this browser');
      }

      // Request wake lock to keep screen awake
      if ('wakeLock' in navigator) {
        try {
          const wakeLockObj = await (navigator as any).wakeLock.request('screen');
          setWakeLock(wakeLockObj);
          console.log('Wake lock acquired');
        } catch (e) {
          console.log('Wake lock not available');
        }
      }

      // Request permissions for device orientation lock (mobile)
      if ('screen' in window && 'orientation' in (window as any).screen) {
        try {
          await (window as any).screen.orientation.lock('portrait-primary');
          console.log('Screen orientation locked');
        } catch (e) {
          console.log('Screen orientation lock not available');
        }
      }
      
      // Set actual session cookies for test security
      document.cookie = "test-session=active; path=/; SameSite=Strict";
      document.cookie = "test-security=enabled; path=/; SameSite=Strict";
      
      setCurrentStep('fullscreen-request');
    } catch (error) {
      console.error('Cookie permission error:', error);
      // Continue with test even if some permissions fail
      setCurrentStep('fullscreen-request');
    }
  };

  const handleEnterFullscreen = async () => {
    try {
      // Check if fullscreen is supported
      const isFullscreenSupported = document.documentElement.requestFullscreen || 
                                   (document.documentElement as any).webkitRequestFullscreen || 
                                   (document.documentElement as any).msRequestFullscreen;

      if (!isFullscreenSupported) {
        showWarning('Fullscreen mode is not supported in this browser. The test will continue in normal mode.');
        setCurrentStep('test');
        return;
      }

      // Check if we're already in fullscreen
      if (document.fullscreenElement || 
          (document as any).webkitFullscreenElement || 
          (document as any).msFullscreenElement) {
        setCurrentStep('test');
        return;
      }

      // Request fullscreen with proper error handling
      let fullscreenPromise: Promise<void> | undefined;
      
      if (document.documentElement.requestFullscreen) {
        fullscreenPromise = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        fullscreenPromise = (document.documentElement as any).webkitRequestFullscreen();
      } else if ((document.documentElement as any).msRequestFullscreen) {
        fullscreenPromise = (document.documentElement as any).msRequestFullscreen();
      }

      if (fullscreenPromise) {
        await fullscreenPromise;
        
        // Wait a moment to ensure fullscreen is active
        setTimeout(() => {
          const isInFullscreen = document.fullscreenElement || 
                               (document as any).webkitFullscreenElement || 
                               (document as any).msFullscreenElement;
          
          if (isInFullscreen) {
            setCurrentStep('test');
            if (Notification.permission === 'granted') {
              new Notification('Test Started', {
                body: 'Your test has begun. Stay in fullscreen mode.',
                icon: '/favicon.ico'
              });
            }
          } else {
            // Fullscreen didn't work, continue anyway
            showWarning('Fullscreen mode could not be activated. The test will continue in normal mode for the best experience.');
            setCurrentStep('test');
          }
        }, 500);
      } else {
        throw new Error('Fullscreen not supported');
      }
    } catch (err: any) {
      console.error('Failed to enter fullscreen:', err);
      
      // Check if user denied the request
      if (err.name === 'NotAllowedError') {
        showWarning('Fullscreen permission was denied. Please allow fullscreen mode for the best test experience, or continue in normal mode.');
      } else {
        showWarning('Fullscreen mode is not available. The test will continue in normal mode.');
      }
      
      // Continue with the test anyway
      setCurrentStep('test');
    }
  };

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionIndex]: answerIndex
      };
      return newAnswers;
    });
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (testData?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleSubmitTest = useCallback(async () => {
    if (submitting) return;

    // For auto-submit scenarios (time up, fullscreen exits), skip confirmation
    const isAutoSubmit = timeRemaining <= 0 || fullscreenExitCount >= 3;
    
    if (!isAutoSubmit) {
      const confirmSubmit = window.confirm(
        'Are you sure you want to submit your test? You cannot change your answers after submission.'
      );

      if (!confirmSubmit) return;
    }

    try {
      setSubmitting(true);

      // Prepare answers in the format expected by the backend
      const formattedAnswers = testData?.questions.map((question, index) => {
        const selectedAnswerIndex = answers[index];
        if (selectedAnswerIndex === undefined) return null;

        const selectedOption = question.options[selectedAnswerIndex];
        if (!selectedOption) return null;

        return {
          questionId: question._id,
          selectedAnswer: selectedAnswerIndex,
          selectedOptionId: selectedOption._id, // Include both for compatibility
          isCorrect: false, // Backend will calculate this
          pointsEarned: 0, // Backend will calculate this
          timeSpent: Math.round(((testData?.timeLimit || 60) * 60) / testData.questions.length) // Rough estimate per question
        };
      }).filter(answer => answer !== null) || [];

      const startTime = new Date(Date.now() - ((testData?.timeLimit || 60) * 60 * 1000 - timeRemaining * 1000));
      
      const submitData = {
        answers: formattedAnswers,
        timeSpent: Math.round(((testData?.timeLimit || 60) * 60 - timeRemaining) / 60), // in minutes
        startedAt: startTime.toISOString(),
        submissionReason: isAutoSubmit ? 
          (timeRemaining <= 0 ? 'time_expired' : 'fullscreen_violations') : 
          'manual_submit'
      };
      
      // Use the testAPI to submit the test
      const response = await testAPI.submitTest(testId!, submitData);

      if (response.success) {
        setCurrentStep('submitted');
        
        // Clean up resources
        if (wakeLock) {
          try {
            wakeLock.release();
            setWakeLock(null);
          } catch (e) {
            console.log('Failed to release wake lock:', e);
          }
        }
        
        // Exit fullscreen
        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
          } catch (e) {
            console.log('Failed to exit fullscreen:', e);
          }
        }

        // Show success notification
        if (Notification.permission === 'granted') {
          new Notification('Test Submitted Successfully', {
            body: 'Your test has been submitted. Results will be available shortly.',
            icon: '/favicon.ico'
          });
        }

        // Redirect to results after a short delay
        setTimeout(() => {
          // If opened in new tab, close it and focus parent
          if (window.opener) {
            window.opener.focus();
            window.close();
          } else {
            navigate('/student/results');
          }
        }, 3000);
      } else {
        const errorMessage = response.error?.message || response.message || 'Failed to submit test';
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = `Failed to submit test: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      showError(`${errorMessage}. Please try again.`);
      
      // Show error notification
      if (Notification.permission === 'granted') {
        new Notification('Test Submission Failed', {
          body: 'There was an error submitting your test. Please try again.',
          icon: '/favicon.ico'
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, testData, answers, timeRemaining, testId, navigate, fullscreenExitCount, wakeLock, showError]);

  // Set the ref so it can be called from useEffect
  submitTestRef.current = handleSubmitTest;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 300) return 'text-red-600'; // Last 5 minutes
    if (timeRemaining <= 600) return 'text-yellow-600'; // Last 10 minutes
    return 'text-green-600';
  };

  if (testLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading test...</p>
          {window.opener && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
              Test opened in new tab for secure environment
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <AlertCircle className="error-icon" />
          <h2 className="error-title">Error</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button
              onClick={() => {
                if (window.opener) {
                  window.opener.focus();
                  window.close();
                } else {
                  navigate('/student/tests');
                }
              }}
              className="btn btn-primary mr-2"
            >
              {window.opener ? 'Close Tab' : 'Back to Tests'}
            </button>
            {error.includes('Authentication') && (
              <button
                onClick={() => {
                  if (window.opener) {
                    window.opener.location.href = '/login';
                    window.close();
                  } else {
                    navigate('/login');
                  }
                }}
                className="btn btn-success"
              >
                Login Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Instructions Step
  if (currentStep === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
              <h1 className="text-3xl font-bold mb-2">
                {testData?.title}
              </h1>
              <p className="text-blue-100 text-lg">
                {testData?.description}
              </p>
            </div>

            {/* Test Information Cards */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 text-center border border-blue-200 dark:border-blue-700">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Duration</h3>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{testData?.timeLimit}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">minutes</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 text-center border border-green-200 dark:border-green-700">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl">📝</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Questions</h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{testData?.totalQuestions}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">total questions</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 text-center border border-purple-200 dark:border-purple-700">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl">🔄</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Attempts</h3>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">1</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">maximum</p>
                </div>
              </div>

              {/* Instructions Section */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">📋</span>
                  </span>
                  Test Instructions
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">📋 Important Guidelines:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700 dark:text-gray-300">Read each question carefully before selecting an answer</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700 dark:text-gray-300">Navigate between questions using Previous/Next buttons</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700 dark:text-gray-300">Your answers are automatically saved as you progress</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">⚠️ Security Requirements:</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700 dark:text-gray-300">Test will be submitted automatically when time expires</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700 dark:text-gray-300">Do not refresh the page or close the browser</span>
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700 dark:text-gray-300">Maintain stable internet connection throughout</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {testData?.instructions && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Additional Instructions:</h3>
                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {testData.instructions}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/student/tests')}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  ← Cancel Test
                </button>
                <button
                  onClick={handleStartTest}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  🚀 Start Test
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cookie Permission Step
  if (currentStep === 'cookie-permission') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 flex items-center justify-center">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🍪</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Grant Device Permissions
              </h2>
              <p className="text-orange-100">
                Required for secure test environment
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="text-center mb-8">
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                  This test requires several device permissions for security and optimal performance. 
                  We'll request permissions for cookies, screen wake lock, notifications, and other features 
                  to ensure a secure and uninterrupted testing experience.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                    <span className="text-xl">🔒</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Device Permissions:</h3>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• Cookies for secure session management</li>
                    <li>• Screen wake lock (keep screen on)</li>
                    <li>• Notification permission for alerts</li>
                    <li>• Screen orientation lock (mobile)</li>
                    <li>• Storage persistence for test data</li>
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4">
                    <span className="text-xl">�</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Notification Features:</h3>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• Fullscreen exit warnings</li>
                    <li>• Time remaining alerts (5 min, 1 min)</li>
                    <li>• Auto-submission notifications</li>
                    <li>• Test start/completion alerts</li>
                    <li>• Security violation warnings</li>
                  </ul>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-4">
                    <span className="text-xl">🛡️</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Security Features:</h3>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• Fullscreen mode enforcement</li>
                    <li>• Copy/paste prevention</li>
                    <li>• Tab switching detection</li>
                    <li>• Auto-submission after 3 exits</li>
                    <li>• Developer tools blocking</li>
                  </ul>
                </div>
              </div>

              {/* Remove duplicate security features */}

              {/* Privacy Notice */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-8">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">ℹ️</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Privacy Notice</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Cookies are only used for this test session and will be automatically removed when you complete or exit the test. 
                      No personal browsing data is collected or stored.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setCurrentStep('instructions')}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  ← Back to Instructions
                </button>
                <button
                  onClick={handleCookiePermission}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  🍪 Grant Permissions & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fullscreen Request Step
  if (currentStep === 'fullscreen-request') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 flex items-center justify-center">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Maximize className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Ready for Fullscreen Test Mode
              </h2>
              <p className="text-purple-100">
                Secure, distraction-free testing environment
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="text-center mb-8">
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                  Your browser will now request permission to enter fullscreen mode. This creates a secure, 
                  distraction-free environment for taking your test. Click "Allow" when your browser asks for permission.
                </p>
              </div>

              {/* Warning Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-700">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-white text-xl">⚠️</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Security Notice</h3>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Exiting fullscreen mode more than <strong>3 times</strong> will automatically submit your test. 
                        This ensures fair testing conditions for all students.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-white text-xl">💡</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Pro Tip</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Make sure you're ready to take the test without interruptions. 
                        Close other applications and ensure you have stable internet.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Steps */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">What happens next:</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold">1</span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">Permission Request</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Browser asks for fullscreen permission</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold">2</span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">Grant Permission</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Click "Allow" to grant permission</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold">3</span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">Fullscreen Mode</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Test begins in secure fullscreen</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold">4</span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">Complete Test</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Stay in fullscreen until finished</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setCurrentStep('cookie-permission')}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  ← Back to Cookies
                </button>
                <button
                  onClick={handleEnterFullscreen}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  🖥️ Request Fullscreen & Start Test
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Test Step
  if (currentStep === 'test' && testData) {
    const currentQuestion = testData.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / testData.questions.length) * 100;
    const answeredQuestions = Object.keys(answers).length;

    return (
      <div className="test-interface-container">
        {/* Fullscreen Exit Warning */}
        {showFullscreenWarning && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg border-2 border-red-700">
            <div className="flex items-center space-x-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold">Fullscreen Exit Warning!</p>
                <p className="text-sm">Stay in fullscreen mode to avoid auto-submission. {3 - fullscreenExitCount} exits remaining.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header with timer and progress */}
        <div className="test-header">
          <div className="test-header-content">
            <div className="test-header-main">
              <div className="test-header-info">
                <h1 className="test-title">
                  {testData.title}
                </h1>
                <p className="test-question-info">
                  Question {currentQuestionIndex + 1} of {testData.questions.length}
                </p>
              </div>
              
              <div className="test-header-controls">
                {/* Focus Mode Toggle */}
                <div className="test-control-group">
                  <button
                    onClick={() => setFocusMode(!focusMode)}
                    className={`test-toggle-btn ${
                      focusMode 
                        ? 'test-toggle-active-green' 
                        : 'test-toggle-inactive'
                    }`}
                    title="Toggle focus mode (hides distractions)"
                  >
                    Focus {focusMode ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="test-timer-section">
                  <p className="test-timer-label">Time Remaining</p>
                  <p className={`test-timer-value ${getTimerColor()}`}>
                    {formatTime(timeRemaining)}
                  </p>
                </div>
                
                <div className="test-progress-section">
                  <p className="test-progress-label">Progress</p>
                  <p className="test-progress-value">
                    {answeredQuestions}/{testData.questions.length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="test-progress-bar-container">
              <div className="test-progress-bar">
                <div 
                  className="test-progress-bar-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="test-question-container">
          <div className={`test-question-card ${
            focusMode ? 'test-question-card-focus' : ''
          }`}>
            
            <div className="mb-6">
              <h2 className={`text-xl font-semibold text-gray-900 dark:text-white mb-4 ${
                focusMode ? 'text-2xl' : ''
              }`}>
                Question {currentQuestionIndex + 1}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className={`text-gray-800 dark:text-gray-200 leading-relaxed ${
                  focusMode ? 'text-xl font-medium' : 'text-lg'
                }`}>
                  {currentQuestion.question}
                </p>
              </div>
            </div>

            <div className={`space-y-3 ${focusMode ? 'space-y-4' : ''}`}>
              {currentQuestion.options.map((option, index) => (
                <label
                  key={option._id}
                  className={`block border-2 rounded-lg cursor-pointer transition-all ${
                    focusMode ? 'p-6' : 'p-4'
                  } ${
                    answers[currentQuestionIndex] === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name={`question-${currentQuestionIndex}`}
                        value={index}
                        checked={answers[currentQuestionIndex] === index}
                        onChange={() => handleAnswerChange(currentQuestionIndex, index)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className={`ml-3 text-gray-900 dark:text-white ${
                        focusMode ? 'text-lg' : ''
                      }`}>
                        {String.fromCharCode(65 + index)}. {option.text}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center px-4 py-2 rounded-lg transition ${
                  currentQuestionIndex === 0
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>

              <div className="flex items-center space-x-4">
                {currentQuestionIndex === testData.questions.length - 1 ? (
                  <button
                    onClick={handleSubmitTest}
                    disabled={submitting}
                    className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? 'Submitting...' : 'Submit Test'}
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Question overview sidebar */}
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Questions</h3>
          <div className="grid grid-cols-5 gap-2">
            {testData.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded text-xs font-medium transition ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : answers[index] !== undefined
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Submitted Step
  if (currentStep === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 flex items-center justify-center">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Test Submitted Successfully!
              </h2>
              <p className="text-green-100">
                Your answers have been securely recorded
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
                  Congratulations! Your test has been submitted successfully. Your answers have been 
                  saved and will be reviewed by your instructor.
                </p>
              </div>

              {/* Test Summary */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">Test Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white text-xl">📝</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Test Completed</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{testData?.title}</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white text-xl">⏰</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Submitted At</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white text-xl">📊</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Questions Answered</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {Object.keys(answers).length} / {testData?.totalQuestions || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-8">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white text-xl">💡</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">What's Next?</h3>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Your instructor will review and grade your test</li>
                      <li>• Results will be available in the "Results" section</li>
                      <li>• You'll receive notifications when grades are posted</li>
                      <li>• Check back regularly for feedback and scores</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Auto-redirect notice */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You will be automatically redirected to the tests page in a few seconds...
                </p>
              </div>

              {/* Action Button */}
              <div className="text-center">
                <button
                  onClick={() => navigate('/student/tests')}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  🏠 Return to Tests Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TestInterface;
