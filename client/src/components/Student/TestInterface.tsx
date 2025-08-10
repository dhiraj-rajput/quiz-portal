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
  AlertTriangle,
  Maximize,
  FileText,
  RotateCcw,
  Shield,
  Bell,
  Eye,
  Lock,
  CheckCircle,
  ArrowLeft
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
  const [isInFullscreen, setIsInFullscreen] = useState(false);
  const [lastFullscreenExit, setLastFullscreenExit] = useState<number>(0);
  const [isInputBlocked, setIsInputBlocked] = useState(false);
  const [lastOkClick, setLastOkClick] = useState<number>(0); // Track when OK was last clicked
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [isReEnteringFullscreen, setIsReEnteringFullscreen] = useState(false); // Protection flag during fullscreen re-entry
  const [lastOkClickExtended, setLastOkClickExtended] = useState<number>(0); // Extended protection tracking

  const [wakeLock, setWakeLock] = useState<any>(null);
  
  // In-app notification system for fullscreen warnings
  const [fullscreenNotification, setFullscreenNotification] = useState<{
    show: boolean;
    message: string;
    remainingWarnings: number;
    isAutoSubmitting: boolean;
    showOkButton?: boolean;
  }>({
    show: false,
    message: '',
    remainingWarnings: 3,
    isAutoSubmitting: false,
    showOkButton: false
  });

  // Load test data and assignment
  useEffect(() => {
    // Load test data if authentication is complete, user is authenticated, and we need test data
    if (!loading && user && testId && (currentStep === 'loading' || currentStep === 'instructions')) {
      loadTestData();
    } else if (!loading && !user) {
      setError('Authentication required. Please log in again.');
    } else if (!testId) {
      setError('Test ID is required');
    }
  }, [testId, user, loading, currentStep]);

  // Cleanup effect - clear any pending timers and localStorage on unmount
  useEffect(() => {
    return () => {
      // Clear any pending auto-submit timer
      if ((window as any).autoSubmitTimer) {
        clearTimeout((window as any).autoSubmitTimer);
        (window as any).autoSubmitTimer = null;
      }
      
      // Clean up any pending auto-submission data
      localStorage.removeItem('pendingAutoSubmit');
    };
  }, []);

  // Timer effect - runs continuously during test, even during warnings
  useEffect(() => {
    if (currentStep === 'test' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - auto-submit the test
            clearInterval(timer);
            
            // Auto-submit with a slight delay to ensure state is updated
            setTimeout(() => {
              if (submitTestRef.current) {
                submitTestRef.current();
              }
            }, 500);
            
            return 0;
          }
          
          // Show time warnings (but don't stop timer)
          if (prev === 301) { // 5 minutes remaining
            showWarning('5 minutes remaining!');
          } else if (prev === 61) { // 1 minute remaining
            showWarning('1 minute remaining!');
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
        // If input is blocked, only allow F11
        if (isInputBlocked) {
          if (e.key === 'F11') {
            // Allow F11 to re-enter fullscreen
            return;
          }
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }

        // Normal prevention logic when input is not blocked
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
        // If input is blocked, only allow F11
        if (isInputBlocked) {
          if (e.key === 'F11') {
            return;
          }
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }

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

      // Prevent fullscreen exit via keyboard shortcuts
      const preventFullscreenExit = (e: KeyboardEvent) => {
        // If input is blocked, only allow F11
        if (isInputBlocked) {
          if (e.key === 'F11') {
            // Always allow F11 during input blocking - it should trigger fullscreen
            console.log('F11 pressed during input blocking - allowing for fullscreen toggle');
            return;
          }
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }

        // Prevent ESC key if in fullscreen during test
        if (e.key === 'Escape' && isInFullscreen) {
          e.preventDefault();
          e.stopImmediatePropagation();
          showWarning('Please stay in fullscreen mode during the test.');
          return false;
        }
        
        // CRITICAL: ESC ABUSE DETECTION - if ESC pressed soon after OK, immediate escalation
        if (e.key === 'Escape' && lastOkClick > 0) {
          const timeSinceOkClick = Date.now() - lastOkClick;
          if (timeSinceOkClick < 12000) { // ESC within 12 seconds of OK = escalation
            console.log('ESC ABUSE DETECTED in fullscreen exit handler - Escalating');
            e.preventDefault();
            e.stopImmediatePropagation();
            // Log the abuse attempt
            console.log('ESC pressed too soon after OK click - potential abuse');
            return false;
          }
        }
        
        // Allow F11 to toggle fullscreen when not input blocked
        if (e.key === 'F11') {
          // Let F11 work naturally for fullscreen toggle
          return;
        }

        // Block Alt+Tab and other system shortcuts
        if (e.altKey && e.key === 'Tab') {
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }

        // Block Windows key
        if (e.key === 'Meta' || e.metaKey) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      };

      // Block all mouse interactions when input is blocked, except for fullscreen warning dialog
      const preventMouseInteractions = (e: MouseEvent) => {
        if (isInputBlocked) {
          // Allow all clicks within the fullscreen notification dialog
          const target = e.target as HTMLElement;
          const isWithinWarningDialog = target && (
            target.closest('.fullscreen-warning-dialog') ||
            target.classList?.contains('fullscreen-warning-dialog') ||
            target.classList?.contains('fullscreen-ok-button') ||
            target.closest('.fullscreen-ok-button')
          );
          
          if (isWithinWarningDialog) {
            console.log('Allowing click within warning dialog during input blocking', target);
            return; // Allow the click
          }
          
          console.log('Blocking mouse interaction during input blocking:', e.type, target);
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      };

      const preventSelection = (e: Event) => {
        if (isInputBlocked) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
        e.preventDefault();
      };

      // Global keyboard blocker for maximum security during input blocking
      const globalKeyboardBlocker = (e: KeyboardEvent) => {
        // ULTRA-AGGRESSIVE ESC DETECTION: Immediate escalation if ESC pressed soon after OK
        if (e.key === 'Escape' && lastOkClick > 0) {
          const timeSinceOkClick = Date.now() - lastOkClick;
          if (timeSinceOkClick < 10000) { // ESC within 10 seconds of OK = immediate auto-submit
            console.log('ESC ABUSE DETECTED - Immediate auto-submission triggered');
            e.preventDefault();
            e.stopImmediatePropagation();
            setFullscreenExitCount(5); // Force immediate auto-submission
            setIsInputBlocked(true);
            setFullscreenNotification({
              show: true,
              message: 'ABUSE DETECTED: ESC key pressed too soon after OK. Test will be auto-submitted immediately.',
              remainingWarnings: 0,
              isAutoSubmitting: true
            });
            return false;
          }
        }
        
        if (isInputBlocked || isReEnteringFullscreen) {
          // During auto-submission (isAutoSubmitting), block everything including F11
          if (fullscreenNotification.isAutoSubmitting) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
          }
          
          // During re-entry protection, block ESC specifically to prevent abuse
          if (isReEnteringFullscreen && e.key === 'Escape') {
            console.log('ESC blocked during fullscreen re-entry protection');
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
          }
          
          // During regular warnings, ALWAYS allow F11 regardless of current fullscreen state
          // This is because F11 both enters and exits fullscreen, and we want to allow both
          if (e.key === 'F11') {
            console.log('F11 pressed during input blocking - allowing through');
            return; // Allow F11 to work
          }
          
          // Block specific problematic keys that can bypass security
          const blockedKeys = [
            '`', '~', 'Tab', 'Escape', 'Alt', 'Control', 'Meta',
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F12',
            'Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown',
            'PrintScreen', 'ScrollLock', 'Pause'
          ];
          
          if (blockedKeys.includes(e.key) || e.code === 'Backquote' || e.code === 'Tab') {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
          }
          
          // Block Alt+Tab, Ctrl+anything, Windows key combinations
          if (e.altKey || e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
          }
          
          // Block everything else
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      };

      document.addEventListener('contextmenu', preventRightClick);
      
      // Add blocking event listeners when input is blocked OR during fullscreen re-entry protection
      if ((isInputBlocked || isReEnteringFullscreen) && !fullscreenNotification.show) {
        document.addEventListener('keydown', globalKeyboardBlocker, { capture: true, passive: false });
        document.addEventListener('keyup', globalKeyboardBlocker, { capture: true, passive: false });
        document.addEventListener('keypress', globalKeyboardBlocker, { capture: true, passive: false });
        document.addEventListener('click', preventMouseInteractions, true);
        document.addEventListener('mousedown', preventMouseInteractions, true);
        document.addEventListener('mouseup', preventMouseInteractions, true);
        document.addEventListener('dblclick', preventMouseInteractions, true);
        document.addEventListener('contextmenu', preventMouseInteractions, true);
      } else if ((isInputBlocked || isReEnteringFullscreen) && fullscreenNotification.show) {
        // When warning dialog is shown, only block keyboard but allow mouse interactions within dialog
        document.addEventListener('keydown', globalKeyboardBlocker, { capture: true, passive: false });
        document.addEventListener('keyup', globalKeyboardBlocker, { capture: true, passive: false });
        document.addEventListener('keypress', globalKeyboardBlocker, { capture: true, passive: false });
      }
      
      // Always add these regardless of input blocking state
      document.addEventListener('keydown', preventCopyPaste, true);
      document.addEventListener('keydown', preventDevTools, true);
      document.addEventListener('keydown', preventFullscreenExit, true);
      document.addEventListener('keyup', preventFullscreenExit, true);
      document.addEventListener('keypress', preventFullscreenExit, true);
      document.addEventListener('selectstart', preventSelection);

      return () => {
        document.removeEventListener('contextmenu', preventRightClick);
        document.removeEventListener('keydown', globalKeyboardBlocker, { capture: true } as any);
        document.removeEventListener('keyup', globalKeyboardBlocker, { capture: true } as any);
        document.removeEventListener('keypress', globalKeyboardBlocker, { capture: true } as any);
        document.removeEventListener('keydown', preventCopyPaste, true);
        document.removeEventListener('keydown', preventDevTools, true);
        document.removeEventListener('keydown', preventFullscreenExit, true);
        document.removeEventListener('keyup', preventFullscreenExit, true);
        document.removeEventListener('keypress', preventFullscreenExit, true);
        document.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('click', preventMouseInteractions, true);
        document.removeEventListener('mousedown', preventMouseInteractions, true);
        document.removeEventListener('mouseup', preventMouseInteractions, true);
        document.removeEventListener('dblclick', preventMouseInteractions, true);
        document.removeEventListener('contextmenu', preventMouseInteractions, true);
      };
    }
  }, [currentStep, isInFullscreen, isInputBlocked, isReEnteringFullscreen, fullscreenNotification.show]);

  // Fullscreen exit detection and warning
  useEffect(() => {
    if (currentStep === 'test') {
      const handleFullscreenChange = () => {
        const currentTime = Date.now();
        const isCurrentlyFullscreen = !!(
          document.fullscreenElement || 
          (document as any).webkitFullscreenElement || 
          (document as any).msFullscreenElement ||
          (document as any).mozFullScreenElement ||
          window.innerHeight == screen.height  // Additional check for F11 fullscreen
        );
        
        console.log('Fullscreen change detected:', {
          isCurrentlyFullscreen,
          fullscreenElement: document.fullscreenElement,
          webkitFullscreenElement: (document as any).webkitFullscreenElement,
          msFullscreenElement: (document as any).msFullscreenElement,
          windowHeight: window.innerHeight,
          screenHeight: screen.height,
          isInputBlocked,
          fullscreenNotification: fullscreenNotification.show
        });
        
        setIsInFullscreen(isCurrentlyFullscreen);
        
        // If we exited fullscreen and it's been more than 1 second since last exit (prevent rapid counting)
        // Ultra-aggressive logic - detect ANY fullscreen exit immediately
        const timeSinceLastExit = currentTime - lastFullscreenExit;
        const timeSinceOkClick = currentTime - lastOkClick;
        const timeSinceOkClickExtended = currentTime - lastOkClickExtended;
        
        const shouldTriggerWarning = !isCurrentlyFullscreen && !isReEnteringFullscreen && (
          fullscreenExitCount === 0 || // Always allow first warning
          (fullscreenExitCount === 1 && lastOkClick > 0 && timeSinceOkClick > 3000) || // Allow second warning after 3 seconds
          (fullscreenExitCount === 2 && lastOkClick > 0 && timeSinceOkClick > 3000) || // Allow third warning after 3 seconds
          lastOkClick === 0 || // No OK click yet
          timeSinceOkClickExtended > 20000 // Extended protection: 20 seconds
        );
        
        // Only block input immediately if not triggering a warning (to allow warning to show)
        if (!isCurrentlyFullscreen && !isReEnteringFullscreen && !isInputBlocked && !shouldTriggerWarning) {
          console.log('INPUT BLOCK - Fullscreen exit detected but no warning to show');
          setIsInputBlocked(true);
        }
        
        // Detect rapid bypass attempts but don't immediately escalate to max
        if (!isCurrentlyFullscreen && !isReEnteringFullscreen && lastOkClick > 0) {
          if (timeSinceOkClick < 8000) { // Any exit within 8 seconds is suspicious
            // Log rapid attempt for monitoring
            console.log('Rapid bypass attempt detected - but continuing with normal flow');
          }
        }
        
        if (shouldTriggerWarning) {
          console.log('Triggering fullscreen exit warning:', { 
            timeSinceLastExit, 
            timeSinceOkClick, 
            lastOkClick,
            currentWarningShow: fullscreenNotification.show 
          });
          setLastFullscreenExit(currentTime);
          
          setFullscreenExitCount(prev => {
            const newCount = prev + 1;
            console.log('Fullscreen exit count:', newCount);
            
            if (newCount >= 3) {
              // Block all input immediately
              setIsInputBlocked(true);
              
              // Show final warning with auto-submit notification
              setFullscreenNotification({
                show: true,
                message: 'FINAL WARNING: You have exited fullscreen mode 3 times. Your test will be automatically submitted in 5 seconds. ALL INPUTS ARE PERMANENTLY BLOCKED.',
                remainingWarnings: 0,
                isAutoSubmitting: true
              });
              
              // Release wake lock before submission
              if (wakeLock) {
                wakeLock.release();
                setWakeLock(null);
              }
              
              // Auto-submit after 5 seconds with comprehensive error handling
              // Also store auto-submission state for tab close protection
              const autoSubmitData = {
                testId: testId!,
                answers,
                testData,
                timeRemaining,
                timestamp: Date.now(),
                reason: 'fullscreen_violations'
              };
              localStorage.setItem('pendingAutoSubmit', JSON.stringify(autoSubmitData));
              
              const autoSubmitTimer = setTimeout(async () => {
                console.log('Auto-submit triggered after 3 fullscreen exits');
                
                // Use the standard submit function for consistency
                if (submitTestRef.current) {
                  console.log('Calling standard submit function for auto-submission');
                  await submitTestRef.current();
                } else {
                  console.error('Submit function not available for auto-submission');
                  // Fallback navigation
                  await exitFullscreenSafely();
                  setTimeout(() => {
                    navigate('/student/tests');
                  }, 1000);
                }
              }, 5000);
              
              // Store timer ID for cleanup if needed
              (window as any).autoSubmitTimer = autoSubmitTimer;
              
              return newCount;
            } else {
              // Block input during warning
              setIsInputBlocked(true);
              
              // Show warning notification
              const remainingWarnings = 3 - newCount;
              setFullscreenNotification({
                show: true,
                message: `SECURITY WARNING: You exited fullscreen mode. You have ${remainingWarnings} warning${remainingWarnings !== 1 ? 's' : ''} remaining before auto-submission. Click OK to return to fullscreen automatically.`,
                remainingWarnings,
                isAutoSubmitting: false,
                showOkButton: true
              });
              
              // DO NOT automatically restore input - user MUST press F11 to continue
              // The input will only be restored when user successfully re-enters fullscreen
              
              // DO NOT automatically try to re-enter fullscreen - let user click OK button
              // This prevents conflicts and loops
              
              return newCount;
            }
          });
        } else if (isCurrentlyFullscreen && (isInputBlocked || fullscreenNotification.show || isReEnteringFullscreen)) {
          // Successfully re-entered fullscreen, restore input and clear warning
          console.log('Re-entered fullscreen - clearing warnings and restoring input');
          setIsInputBlocked(false);
          setFullscreenNotification(prev => ({ ...prev, show: false }));
          setIsReEnteringFullscreen(false); // Clear protection flag when successfully back in fullscreen
        }
      };

      const handleVisibilityChange = () => {
        // Check if there's a pending auto-submission when tab becomes hidden
        const pendingSubmission = localStorage.getItem('pendingAutoSubmit');
        
        if (document.hidden && pendingSubmission) {
          console.log('Tab hidden during auto-submission window - submitting immediately');
          
          try {
            const autoSubmitData = JSON.parse(pendingSubmission);
            const timeSinceAutoSubmit = Date.now() - autoSubmitData.timestamp;
            
            // If it's within 10 seconds of the auto-submit trigger, submit immediately
            if (timeSinceAutoSubmit < 10000) {
              submitTestViaBeacon(autoSubmitData);
              localStorage.removeItem('pendingAutoSubmit');
              return;
            }
          } catch (error) {
            console.error('Error handling auto-submission during visibility change:', error);
          }
        }
        
        // Detect when user switches tabs/apps during normal test
        if (document.hidden && currentStep === 'test' && !fullscreenNotification.isAutoSubmitting) {
          console.log('User switched tabs/applications during test');
          showWarning('Please stay on the test tab during the exam.');
        }
      };

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // Check if there's a pending auto-submission
        const pendingSubmission = localStorage.getItem('pendingAutoSubmit');
        
        if (pendingSubmission) {
          console.log('Detected tab close during auto-submission window - submitting immediately');
          
          try {
            const autoSubmitData = JSON.parse(pendingSubmission);
            const timeSinceAutoSubmit = Date.now() - autoSubmitData.timestamp;
            
            // If it's within 10 seconds of the auto-submit trigger, submit immediately
            if (timeSinceAutoSubmit < 10000) {
              // Use sendBeacon for reliable submission even if tab is closing
              submitTestViaBeacon(autoSubmitData);
              localStorage.removeItem('pendingAutoSubmit');
              return; // Don't prevent page unload
            }
          } catch (error) {
            console.error('Error handling auto-submission during page unload:', error);
          }
        }
        
        // Prevent accidental page close/refresh during normal test
        if (currentStep === 'test' && !fullscreenNotification.isAutoSubmitting) {
          e.preventDefault();
          e.returnValue = 'Are you sure you want to leave? Your test progress will be lost.';
          return 'Are you sure you want to leave? Your test progress will be lost.';
        }
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('msfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('resize', handleFullscreenChange); // Additional listener for F11

      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('resize', handleFullscreenChange);
      };
    }
  }, [currentStep, wakeLock, lastFullscreenExit, lastOkClick, isInputBlocked, navigate, testData, answers, timeRemaining, testId, setSubmitting, setCurrentStep, setWakeLock, setFullscreenNotification]);

  // Backup fullscreen check (disabled - relying on OK button instead)
  useEffect(() => {
    // Backup monitoring is disabled to prevent conflicts with OK button
    // The OK button is now the primary mechanism for clearing warnings
    console.log('Backup fullscreen monitoring is disabled - using OK button only');
  }, [isInputBlocked, fullscreenNotification.show, fullscreenNotification.showOkButton, fullscreenNotification.isAutoSubmitting]);

  // Helper function to safely exit fullscreen
  const exitFullscreenSafely = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        console.log('Successfully exited fullscreen');
      }
    } catch (e) {
      console.log('Failed to exit fullscreen:', e);
    }
  };

  // Helper function to submit test via beacon API (for tab close scenarios)
  const submitTestViaBeacon = async (autoSubmitData: any) => {
    try {
      console.log('Submitting test via beacon API');
      
      // Prepare the submission data
      const formattedAnswers = autoSubmitData.testData?.questions.map((question: any, index: number) => {
        const selectedAnswerIndex = autoSubmitData.answers[index];
        if (selectedAnswerIndex === undefined) return null;

        const selectedOption = question.options[selectedAnswerIndex];
        if (!selectedOption) return null;

        return {
          questionId: question._id,
          selectedAnswer: selectedAnswerIndex,
          selectedOptionId: selectedOption._id,
          isCorrect: false,
          pointsEarned: 0,
          timeSpent: Math.round(((autoSubmitData.testData?.timeLimit || 60) * 60) / autoSubmitData.testData.questions.length)
        };
      }).filter((answer: any) => answer !== null) || [];

      const startTime = new Date(Date.now() - ((autoSubmitData.testData?.timeLimit || 60) * 60 * 1000 - autoSubmitData.timeRemaining * 1000));
      
      const submitPayload = {
        answers: formattedAnswers,
        timeSpent: Math.round(((autoSubmitData.testData?.timeLimit || 60) * 60 - autoSubmitData.timeRemaining) / 60),
        startedAt: startTime.toISOString(),
        submissionReason: autoSubmitData.reason
      };

      // Get the API endpoint and token
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tests/${autoSubmitData.testId}/submit`;
      
      try {
        // Use sendBeacon for reliable submission
        // Send via beacon (more reliable for tab close)
        if (navigator.sendBeacon) {
          // Note: Beacon API cannot send custom headers like Authorization
          // So we'll include the token in the payload
          const beaconPayload = {
            ...submitPayload,
            authToken: token
          };
          
          const beaconBlob = new Blob([JSON.stringify(beaconPayload)], {
            type: 'application/json'
          });
          
          const success = navigator.sendBeacon(apiUrl, beaconBlob);
          console.log('Beacon submission result:', success);
          
          // Also try a regular fetch as backup if beacon fails
          if (!success) {
            throw new Error('Beacon submission failed');
          }
        } else {
          throw new Error('Beacon API not available');
        }
        
      } catch (beaconError) {
        console.error('Beacon submission failed, trying regular fetch:', beaconError);
        
        // Fallback to regular fetch with keepalive
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(submitPayload),
            keepalive: true // This helps with page unload scenarios
          });
          
          console.log('Fallback fetch submission result:', response.ok);
        } catch (fetchError) {
          console.error('Both beacon and fetch submission failed:', fetchError);
        }
      }
      
    } catch (error) {
      console.error('Error in submitTestViaBeacon:', error);
    }
  };

  const loadTestData = async () => {
    try {
      setTestLoading(true);
      setError('');
      
      // Check if we have a valid token before making the request
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        await exitFullscreenSafely();
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
        // Move to test step immediately since we already have test data loaded
        if (currentStep === 'loading') {
          setCurrentStep('instructions');
        }
      } else {
        setError(response.error?.message || 'Failed to load test data');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
        await exitFullscreenSafely();
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
        setIsInFullscreen(true);
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
          
          setIsInFullscreen(!!isInFullscreen);
          
          if (isInFullscreen) {
            setCurrentStep('test');
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

  // Function to re-enter fullscreen during test
  const handleFullscreenWarningOk = async () => {
    console.log('=== OK BUTTON CLICKED ===');
    console.log('Current state:', {
      isInputBlocked,
      showWarning: fullscreenNotification.show,
      showOkButton: fullscreenNotification.showOkButton,
      fullscreenExitCount
    });
    
    const currentTime = Date.now();
    
    // Prevent rapid clicking (much more aggressive debouncing)
    if (currentTime - lastOkClick < 2000) { // 2 second minimum between clicks
      console.log('Ignoring rapid OK button click - 2 second cooldown');
      return;
    }
    
    setLastOkClick(currentTime);
    setLastOkClickExtended(currentTime); // Set extended protection timestamp
    
    try {
      // Clear warning but DO NOT restore input immediately
      // Input will only be restored when fullscreen is successfully re-entered
      console.log('Clearing warning but keeping input blocked until fullscreen re-entry...');
      setFullscreenNotification(prev => ({ ...prev, show: false }));
      // setIsInputBlocked(false); // REMOVE THIS - keep input blocked until fullscreen re-entry
      setIsReEnteringFullscreen(true); // Set protection flag
      
      // Provide user feedback
      console.log('Warning cleared, attempting fullscreen re-entry...');
      
      // Add a small delay before requesting fullscreen to let the UI settle
      setTimeout(async () => {
        try {
          // Enter fullscreen programmatically
          const element = document.documentElement;
          
          console.log('Requesting fullscreen...');
          if (element.requestFullscreen) {
            await element.requestFullscreen();
          } else if ((element as any).webkitRequestFullscreen) {
            await (element as any).webkitRequestFullscreen();
          } else if ((element as any).msRequestFullscreen) {
            await (element as any).msRequestFullscreen();
          } else if ((element as any).mozRequestFullScreen) {
            await (element as any).mozRequestFullScreen();
          }
          
          console.log('Fullscreen request sent successfully');
          
          // Clear protection flag after a reasonable delay
          setTimeout(() => {
            setIsReEnteringFullscreen(false);
          }, 5000); // Extended to 5 second protection window
          
        } catch (error) {
          console.error('Failed to enter fullscreen:', error);
          // Clear protection flag even if fullscreen fails
          setIsReEnteringFullscreen(false);
          // Show warning again if fullscreen entry failed
          setFullscreenNotification({
            show: true,
            message: 'Failed to enter fullscreen automatically. Please manually enter fullscreen using F11 or try clicking OK again.',
            remainingWarnings: Math.max(0, 3 - fullscreenExitCount),
            isAutoSubmitting: false,
            showOkButton: true
          });
        }
      }, 100);
      
      // Additional failsafe: If still in re-entering state after 10 seconds, restore normal operation
      setTimeout(() => {
        if (isReEnteringFullscreen) {
          console.log('Failsafe: Clearing re-entering state after timeout');
          setIsReEnteringFullscreen(false);
          // If not in fullscreen after timeout, show warning again
          const isFullscreen = !!(
            document.fullscreenElement || 
            (document as any).webkitFullscreenElement || 
            (document as any).msFullscreenElement ||
            window.innerHeight == screen.height
          );
          if (!isFullscreen) {
            setFullscreenNotification({
              show: true,
              message: 'Fullscreen entry timed out. Please manually enter fullscreen using F11 or try clicking OK again.',
              remainingWarnings: Math.max(0, 3 - fullscreenExitCount),
              isAutoSubmitting: false,
              showOkButton: true
            });
          }
        }
      }, 10000); // Extended timeout to 10 seconds
      
    } catch (error) {
      console.error('Error in OK button handler:', error);
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

  const performTestSubmission = async (isAutoSubmit: boolean = false) => {
    if (submitting) return;

    try {
      setSubmitting(true);
      
      // Hide any warnings during submission
      setFullscreenNotification(prev => ({ ...prev, show: false }));
      setIsInputBlocked(false);

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
        // Clear any pending auto-submission since regular submission succeeded
        localStorage.removeItem('pendingAutoSubmit');
        
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
        await exitFullscreenSafely();

        // Show success notification
        showWarning('Test submitted successfully! Results will be available shortly.');

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
      
      // For auto-submit failures, force navigation
      if (isAutoSubmit) {
        await exitFullscreenSafely();
        setTimeout(() => {
          if (window.opener) {
            window.opener.focus();
            window.close();
          } else {
            navigate('/student/tests');
          }
        }, 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTest = useCallback(async () => {
    if (submitting) return;

    // For auto-submit scenarios (time up, fullscreen exits), skip confirmation
    const isAutoSubmit = timeRemaining <= 0 || fullscreenExitCount >= 3;
    
    if (!isAutoSubmit) {
      // Show custom confirmation dialog instead of browser alert
      setShowSubmitConfirmation(true);
      return;
    }

    await performTestSubmission(isAutoSubmit);
  }, [submitting, timeRemaining, fullscreenExitCount]);

  // Set the ref so it can be called from useEffect
  submitTestRef.current = handleSubmitTest;

  const handleConfirmSubmit = async () => {
    setShowSubmitConfirmation(false);
    await performTestSubmission(false);
  };

  const handleCancelSubmit = () => {
    setShowSubmitConfirmation(false);
  };

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

  // Instructions Step - show actual test details
  if (currentStep === 'instructions') {
    if (!testData) {
      return (
        <div className="loading-container">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading test details...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
              <h1 className="text-3xl font-bold mb-2">
                {testData.title}
              </h1>
              <p className="text-blue-100 text-lg">
                {testData.description}
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
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{testData.timeLimit}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">minutes</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 text-center border border-green-200 dark:border-green-700">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Questions</h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{testData.totalQuestions}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">total questions</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 text-center border border-purple-200 dark:border-purple-700">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RotateCcw className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Attempts</h3>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">1</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">maximum</p>
                </div>
              </div>

              {/* Instructions Section */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  Test Instructions
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Important Guidelines:
                    </h3>
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
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Security Requirements:
                    </h3>
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
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel Test
                </button>
                <button
                  onClick={handleStartTest}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Start Test
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-900 dark:to-gray-800 py-4 sm:py-8 px-4 flex items-center justify-center">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 sm:p-8 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Grant Device Permissions
              </h2>
              <p className="text-orange-100 text-sm sm:text-base">
                Required for secure test environment
              </p>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed">
                  This test requires several device permissions for security and optimal performance. 
                  We'll request permissions for cookies, screen wake lock, and other features 
                  to ensure a secure and uninterrupted testing experience.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">Device Permissions:</h3>
                  <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• Cookies for secure session management</li>
                    <li>• Screen wake lock (keep screen on)</li>
                    <li>• Screen orientation lock (mobile)</li>
                    <li>• Storage persistence for test data</li>
                    <li>• Fullscreen mode enforcement</li>
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <Bell className="h-5 w-5 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">Notification Features:</h3>
                  <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• Fullscreen exit warnings</li>
                    <li>• Time remaining alerts (5 min, 1 min)</li>
                    <li>• Auto-submission notifications</li>
                    <li>• Test start/completion alerts</li>
                    <li>• Security violation warnings</li>
                  </ul>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <Shield className="h-5 w-5 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">Security Features:</h3>
                  <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1">
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
                    <AlertCircle className="h-4 w-4 text-white" />
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
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center justify-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Instructions
                </button>
                <button
                  onClick={handleCookiePermission}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Grant Permissions & Continue
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-4 sm:py-8 px-4 flex items-center justify-center">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 sm:p-8 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Maximize className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Ready for Fullscreen Test Mode
              </h2>
              <p className="text-purple-100 text-sm sm:text-base">
                Secure, distraction-free testing environment
              </p>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-8">
              <div className="text-center mb-6 sm:mb-8">
                <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed">
                  Your browser will now request permission to enter fullscreen mode. This creates a secure, 
                  distraction-free environment for taking your test. Click "Allow" when your browser asks for permission.
                </p>
              </div>

              {/* Warning Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 sm:p-6 border border-red-200 dark:border-red-700">
                  <div className="flex items-start">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2 text-sm sm:text-base">Security Notice</h3>
                      <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
                        Exiting fullscreen mode more than <strong>3 times</strong> will automatically submit your test. 
                        This ensures fair testing conditions for all students.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 sm:p-6 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 text-sm sm:text-base">Pro Tip</h3>
                      <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                        Make sure you're ready to take the test without interruptions. 
                        Close other applications and ensure you have stable internet.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Steps */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-center text-sm sm:text-base">What happens next:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <span className="font-bold text-sm sm:text-base">1</span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1 text-xs sm:text-sm">Permission Request</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Browser asks for fullscreen permission</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <span className="font-bold text-sm sm:text-base">2</span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1 text-xs sm:text-sm">Grant Permission</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Click "Allow" to grant permission</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <span className="font-bold text-sm sm:text-base">3</span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1 text-xs sm:text-sm">Fullscreen Mode</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Test begins in secure fullscreen</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <span className="font-bold text-sm sm:text-base">4</span>
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1 text-xs sm:text-sm">Complete Test</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Stay in fullscreen until finished</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setCurrentStep('cookie-permission')}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium flex items-center justify-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Cookies
                </button>
                <button
                  onClick={handleEnterFullscreen}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Request Fullscreen & Start Test
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
        {/* Input blocked overlay */}
        {isInputBlocked && !fullscreenNotification.show && (
          <div className="fixed inset-0 bg-yellow-500 bg-opacity-30 flex items-center justify-center z-40 pointer-events-none">
            <div className="bg-yellow-500 text-black px-6 py-4 rounded-lg shadow-lg flex items-center animate-pulse">
              <Lock className="h-5 w-5 mr-2" />
              <div>
                <p className="font-bold text-lg">🚫 ALL INPUTS BLOCKED</p>
                <p className="font-semibold">
                  {fullscreenNotification.isAutoSubmitting 
                    ? 'Auto-submission in progress - Please wait'
                    : 'Only F11 key works - Press F11 to continue'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header with timer and progress */}
        <div className="test-header">
          <div className="test-header-content">
            <div className="test-header-main flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
              <div className="test-header-info">
                <h1 className="test-title text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">
                  {testData.title}
                </h1>
                <p className="test-question-info text-sm text-gray-600 dark:text-gray-400">
                  Question {currentQuestionIndex + 1} of {testData.questions.length}
                </p>
              </div>
              
              <div className="test-header-controls flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                {/* Focus Mode Toggle */}
                <div className="test-control-group">
                  <button
                    onClick={() => setFocusMode(!focusMode)}
                    className={`test-toggle-btn text-xs px-3 py-1 rounded font-medium transition ${
                      focusMode 
                        ? 'test-toggle-active-green bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                        : 'test-toggle-inactive bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                    title="Toggle focus mode (hides distractions)"
                  >
                    Focus {focusMode ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                  <div className="test-timer-section text-left sm:text-right">
                    <p className="test-timer-label text-xs text-gray-600 dark:text-gray-400">Time Remaining</p>
                    <p className={`test-timer-value text-lg lg:text-xl font-mono font-bold ${getTimerColor()}`}>
                      {formatTime(timeRemaining)}
                    </p>
                  </div>
                  
                  <div className="test-progress-section text-left sm:text-right">
                    <p className="test-progress-label text-xs text-gray-600 dark:text-gray-400">Progress</p>
                    <p className="test-progress-value text-sm lg:text-lg font-semibold text-gray-900 dark:text-white">
                      {answeredQuestions}/{testData.questions.length}
                    </p>
                  </div>
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
        <div className="test-question-container pb-24 lg:pb-20">
          <div className={`test-question-card ${
            focusMode ? 'test-question-card-focus' : ''
          }`}>
            
            <div className="mb-6">
              <h2 className={`font-semibold text-gray-900 dark:text-white mb-4 ${
                focusMode ? 'text-xl lg:text-2xl' : 'text-lg lg:text-xl'
              }`}>
                Question {currentQuestionIndex + 1}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className={`text-gray-800 dark:text-gray-200 leading-relaxed ${
                  focusMode ? 'text-lg lg:text-xl font-medium' : 'text-base lg:text-lg'
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
                    focusMode ? 'p-4 lg:p-6' : 'p-3 lg:p-4'
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
                        focusMode ? 'text-base lg:text-lg' : 'text-sm lg:text-base'
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

        {/* Fullscreen Warning Notification */}
        {fullscreenNotification.show && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4" style={{ pointerEvents: 'auto' }}>
            <div className={`fullscreen-warning-dialog max-w-sm sm:max-w-md mx-auto p-6 sm:p-8 rounded-2xl shadow-2xl ${
              fullscreenNotification.isAutoSubmitting 
                ? 'bg-red-600 text-white' 
                : 'bg-yellow-500 text-black'
            }`} style={{ pointerEvents: 'auto' }}>
              <div className="text-center">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  fullscreenNotification.isAutoSubmitting 
                    ? 'bg-white bg-opacity-20' 
                    : 'bg-black bg-opacity-20'
                }`}>
                  {fullscreenNotification.isAutoSubmitting ? (
                    <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8" />
                  ) : (
                    <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8" />
                  )}
                </div>
                <h3 className={`text-lg sm:text-xl font-bold mb-4 ${
                  fullscreenNotification.isAutoSubmitting ? 'text-white' : 'text-black'
                }`}>
                  {fullscreenNotification.isAutoSubmitting ? 'Auto-Submission Warning' : 'Fullscreen Exit Warning'}
                </h3>
                <p className={`text-sm sm:text-lg mb-4 sm:mb-6 leading-relaxed ${
                  fullscreenNotification.isAutoSubmitting ? 'text-white' : 'text-black'
                }`}>
                  {fullscreenNotification.message}
                </p>
                {!fullscreenNotification.isAutoSubmitting && (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="bg-black bg-opacity-20 rounded-full px-3 sm:px-4 py-2">
                        <span className="font-bold text-sm sm:text-lg">
                          {fullscreenNotification.remainingWarnings} warning{fullscreenNotification.remainingWarnings !== 1 ? 's' : ''} remaining
                        </span>
                      </div>
                    </div>
                    <div className="bg-black bg-opacity-20 rounded-lg p-3 mb-4">
                      {fullscreenNotification.showOkButton ? (
                        <>
                          <p className="text-xs sm:text-sm font-semibold flex items-center justify-center mb-3">
                            <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            All inputs blocked - Click OK to continue
                          </p>
                          <button
                            ref={(el) => {
                              if (el && !el.dataset.listenerAdded) {
                                el.dataset.listenerAdded = 'true';
                                el.addEventListener('click', handleFullscreenWarningOk, { passive: false });
                              }
                            }}
                            onClick={handleFullscreenWarningOk}
                            className="fullscreen-ok-button w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                            style={{ pointerEvents: 'auto' }}
                          >
                            OK - Enter Fullscreen
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-xs sm:text-sm font-semibold flex items-center justify-center">
                            <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            All inputs are blocked for security
                          </p>
                          <p className="text-xs mt-1">
                            Automatic fullscreen mode activation in progress...
                          </p>
                        </>
                      )}
                    </div>
                  </>
                )}
                {fullscreenNotification.isAutoSubmitting && (
                  <div className="space-y-4">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white mr-3"></div>
                      <span className="text-sm sm:text-lg font-semibold">
                        {fullscreenNotification.message.includes('Auto-submitting') ? 'Submitting test...' : 
                         fullscreenNotification.message.includes('failed') ? 'Submission failed...' :
                         fullscreenNotification.message.includes('Redirecting') ? 'Redirecting...' :
                         'Processing...'}
                      </span>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <p className="text-xs sm:text-sm">
                        Please wait while your test is being processed.
                        Do not close this window.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Dialog */}
        {showSubmitConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ pointerEvents: 'auto' }}>
            <div className="bg-white dark:bg-gray-800 max-w-md mx-auto p-6 rounded-2xl shadow-2xl" style={{ pointerEvents: 'auto' }}>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                  Submit Test
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  Are you sure you want to submit your test? Once submitted, you cannot make any changes to your answers.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={handleCancelSubmit}
                    className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Submit Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center px-4 lg:px-6 py-3 lg:py-2 rounded-lg transition text-sm lg:text-base font-medium ${
                  currentQuestionIndex === 0
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>

              <div className="flex items-center space-x-4">
                {currentQuestionIndex === testData.questions.length - 1 ? (
                  <button
                    onClick={handleSubmitTest}
                    disabled={submitting}
                    className="flex items-center px-6 lg:px-8 py-3 lg:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base font-medium"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? (
                      <>
                        <span className="hidden sm:inline">Submitting...</span>
                        <span className="sm:hidden">Submit...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Submit Test</span>
                        <span className="sm:hidden">Submit</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center px-4 lg:px-6 py-3 lg:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm lg:text-base font-medium"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Question overview sidebar - Hidden on mobile, visible on desktop */}
        <div className="hidden lg:block fixed right-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
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

        {/* Mobile Question Navigation - Shown only on mobile */}
        <div className="lg:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Question Navigator</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Object.keys(answers).length} of {testData.questions.length} answered
              </span>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 max-h-24 overflow-y-auto">
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
                  <CheckCircle className="h-8 w-8 text-green-500" />
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
                      <Clock className="h-5 w-5 text-white" />
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
                    <Eye className="h-5 w-5 text-white" />
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
