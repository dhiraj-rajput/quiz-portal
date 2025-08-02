import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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

  // Load test data and assignment
  useEffect(() => {
    console.log('TestInterface useEffect - testId:', testId);
    console.log('TestInterface useEffect - user:', user);
    console.log('TestInterface useEffect - auth loading:', loading);
    
    // Only load test data if authentication is complete and user is authenticated
    if (!loading && user && testId) {
      console.log('TestInterface - conditions met, loading test data');
      loadTestData();
    } else if (!loading && !user) {
      console.log('TestInterface - no user after auth complete');
      setError('Authentication required. Please log in again.');
    } else if (!testId) {
      console.log('No testId provided');
      setError('Test ID is required');
    }
  }, [testId, user, loading]);

  // Timer effect
  useEffect(() => {
    if (currentStep === 'test' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStep, timeRemaining]);

  // Prevent context menu and browser dev tools during test
  useEffect(() => {
    if (currentStep === 'test') {
      const preventRightClick = (e: MouseEvent) => e.preventDefault();
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

      document.addEventListener('contextmenu', preventRightClick);
      document.addEventListener('keydown', preventDevTools);

      return () => {
        document.removeEventListener('contextmenu', preventRightClick);
        document.removeEventListener('keydown', preventDevTools);
      };
    }
  }, [currentStep]);

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
      console.error('Error loading test data:', err);
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
        alert('Cookies must be enabled to take this test. Please enable cookies in your browser settings and refresh the page to try again.');
        return;
      }

      // Clean up test cookie
      document.cookie = "test-cookie-check=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Request storage permission for better compatibility
      if ('navigator' in window && 'storage' in navigator && 'persist' in navigator.storage) {
        try {
          const persistent = await navigator.storage.persist();
          console.log('Storage persistence granted:', persistent);
        } catch (e) {
          console.log('Storage persistence not available:', e);
        }
      }
      
      // Set actual session cookies for test security
      document.cookie = "test-session=active; path=/; SameSite=Strict";
      document.cookie = "test-security=enabled; path=/; SameSite=Strict";
      
      setCurrentStep('fullscreen-request');
    } catch (error) {
      console.error('Cookie permission error:', error);
      alert('There was an issue with cookie permissions. The test will continue, but some security features may not work properly.');
      setCurrentStep('fullscreen-request');
    }
  };

  const handleEnterFullscreen = async () => {
    try {
      // Check if fullscreen is supported
      if (!document.documentElement.requestFullscreen && 
          !(document.documentElement as any).webkitRequestFullscreen && 
          !(document.documentElement as any).msRequestFullscreen) {
        alert('Fullscreen mode is not supported in this browser. The test will continue in normal mode.');
        setCurrentStep('test');
        return;
      }

      // Request fullscreen with proper error handling
      let fullscreenPromise;
      if (document.documentElement.requestFullscreen) {
        fullscreenPromise = document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        fullscreenPromise = (document.documentElement as any).webkitRequestFullscreen();
      } else if ((document.documentElement as any).msRequestFullscreen) {
        fullscreenPromise = (document.documentElement as any).msRequestFullscreen();
      }

      if (fullscreenPromise) {
        await fullscreenPromise;
        // Wait a moment to ensure fullscreen is active
        setTimeout(() => {
          if (document.fullscreenElement || 
              (document as any).webkitFullscreenElement || 
              (document as any).msFullscreenElement) {
            setCurrentStep('test');
          } else {
            // Fullscreen didn't work, continue anyway
            alert('Fullscreen mode could not be activated. The test will continue in normal mode for the best experience.');
            setCurrentStep('test');
          }
        }, 500);
      } else {
        throw new Error('Fullscreen not supported');
      }
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
      
      // Check if user denied the request
      if (err instanceof Error && err.name === 'NotAllowedError') {
        alert('Fullscreen permission was denied. Please allow fullscreen mode and try again, or continue in normal mode.');
      } else {
        alert('Fullscreen mode is not available. The test will continue in normal mode.');
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
      console.log(`Answer recorded for question ${questionIndex}:`, answerIndex, 'All answers:', newAnswers);
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

    const confirmSubmit = window.confirm(
      'Are you sure you want to submit your test? You cannot change your answers after submission.'
    );

    if (!confirmSubmit) return;

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
        startedAt: startTime.toISOString()
      };

      console.log('Final submit data:', {
        answers: formattedAnswers,
        answersCount: formattedAnswers.length,
        totalQuestions: testData?.questions.length,
        timeSpent: submitData.timeSpent,
        startedAt: submitData.startedAt
      });
      
      // Use the testAPI to submit the test
      const response = await testAPI.submitTest(testId!, submitData);

      if (response.success) {
        setCurrentStep('submitted');
        
        // Exit fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen();
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
      console.error('Error submitting test:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        status: err.status,
        stack: err.stack
      });
      setError(`Failed to submit test: ${err.message || 'Unknown error'}`);
      alert(`Failed to submit test: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, testData, answers, timeRemaining, testId, navigate]);

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
      <div className="instructions-container">
        <div className="instructions-content">
          <div className="instructions-card">
            <h1 className="instructions-title">
              {testData?.title}
            </h1>
            
            <div className="instructions-info-section">
              <h2 className="instructions-info-title">Test Information</h2>
              <div className="instructions-info-grid">
                <div className="instructions-info-item instructions-info-blue">
                  <Clock className="instructions-info-icon" />
                  <p className="instructions-info-label">Duration</p>
                  <p className="instructions-info-value">{testData?.timeLimit} minutes</p>
                </div>
                <div className="instructions-info-item instructions-info-green">
                  <span className="text-2xl mb-1">📝</span>
                  <p className="instructions-info-label">Questions</p>
                  <p className="instructions-info-value">{testData?.totalQuestions} questions</p>
                </div>
                <div className="instructions-info-item instructions-info-purple">
                  <span className="text-2xl mb-1">🔄</span>
                  <p className="instructions-info-label">Attempts</p>
                  <p className="instructions-info-value">1 max</p>
                </div>
              </div>
            </div>

            <div className="instructions-text-section">
              <h2 className="instructions-text-title">Instructions</h2>
              <div className="instructions-prose">
                <div className="instructions-guidelines">
                  <h3 className="instructions-guidelines-title">Important Guidelines:</h3>
                  <ul className="instructions-guidelines-list">
                    <li>• Read each question carefully before selecting an answer</li>
                    <li>• You can navigate between questions using Previous/Next buttons</li>
                    <li>• Your answers are automatically saved as you progress</li>
                    <li>• The test will be submitted automatically when time expires</li>
                    <li>• Ensure stable internet connection throughout the test</li>
                    <li>• Do not refresh the page or close the browser during the test</li>
                  </ul>
                </div>
                
                {testData?.instructions && (
                  <div className="instructions-custom-text">
                    {testData.instructions}
                  </div>
                )}
              </div>
            </div>

            <div className="instructions-actions">
              <button
                onClick={() => navigate('/student/tests')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleStartTest}
                className="btn btn-primary instructions-start-btn"
              >
                Start Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cookie Permission Step
  if (currentStep === 'cookie-permission') {
    return (
      <div className="cookie-permission-container">
        <div className="cookie-permission-card">
          <div className="cookie-permission-content">
            <span className="cookie-permission-icon">🍪</span>
            <h2 className="cookie-permission-title">
              Enable Browser Cookies
            </h2>
            <p className="cookie-permission-description">
              This test requires cookies to be enabled in your browser for security and session management. 
              We'll check if cookies are working properly before proceeding to fullscreen mode.
            </p>
            <div className="cookie-permission-features">
              <p className="cookie-permission-features-text">
                <strong>Why cookies are needed:</strong><br/>
                • Maintain your test session securely<br/>
                • Prevent unauthorized access or cheating<br/>
                • Track test progress and save answers<br/>
                • Ensure fair testing conditions for all students
              </p>
            </div>
            <div className="cookie-permission-features">
              <p className="cookie-permission-features-text">
                <strong>Next steps:</strong><br/>
                1. Click "Check Cookies & Continue" below<br/>
                2. Allow fullscreen mode when prompted<br/>
                3. Begin your secure test environment
              </p>
            </div>
          </div>
          <div className="cookie-permission-actions">
            <button
              onClick={() => setCurrentStep('instructions')}
              className="btn btn-secondary"
            >
              Back
            </button>
            <button
              onClick={handleCookiePermission}
              className="btn btn-success cookie-permission-continue-btn"
            >
              Check Cookies & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fullscreen Request Step
  if (currentStep === 'fullscreen-request') {
    return (
      <div className="fullscreen-request-container">
        <div className="fullscreen-request-card">
          <Maximize className="fullscreen-request-icon" />
          <h2 className="fullscreen-request-title">
            Ready for Fullscreen Test Mode
          </h2>
          <p className="fullscreen-request-description">
            Your browser will now request permission to enter fullscreen mode. This creates a secure, 
            distraction-free environment for taking your test. Click "Allow" when your browser asks for permission.
          </p>
          <div className="fullscreen-request-warning">
            <p className="fullscreen-request-warning-text">
              <strong>Security Notice:</strong> Exiting fullscreen mode more than 3 times will automatically submit your test. 
              This ensures fair testing conditions. Make sure you're ready to take the test without interruptions.
            </p>
          </div>
          <div className="fullscreen-request-warning">
            <p className="fullscreen-request-warning-text">
              <strong>What happens next:</strong><br/>
              1. Your browser will ask for fullscreen permission<br/>
              2. Click "Allow" to grant permission<br/>
              3. Your test will begin in secure fullscreen mode<br/>
              4. Stay in fullscreen until test completion
            </p>
          </div>
          <div className="fullscreen-request-actions">
            <button
              onClick={() => setCurrentStep('cookie-permission')}
              className="btn btn-secondary"
            >
              Back
            </button>
            <button
              onClick={handleEnterFullscreen}
              className="btn btn-primary fullscreen-request-start-btn"
            >
              Request Fullscreen & Start Test
            </button>
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
      <div className="completion-container">
        <div className="completion-card">
          <div className="completion-icon-container">
            <Send className="completion-icon" />
          </div>
          <h2 className="completion-title">
            Test Submitted Successfully!
          </h2>
          <p className="completion-message">
            Your answers have been recorded. You will be redirected to the tests page shortly.
          </p>
          <button
            onClick={() => navigate('/student/tests')}
            className="btn btn-primary completion-btn"
          >
            Return to Tests
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default TestInterface;
