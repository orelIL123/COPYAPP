// Global error handlers to prevent app crashes
import { ErrorUtils } from 'react-native';

// Set up global error handler
const originalHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
  console.error('Global Error Handler:', {
    message: error.message,
    stack: error.stack,
    isFatal,
  });
  
  // Log to crash analytics if available
  if (global.__DEV__) {
    console.warn('Development Mode - Error Details:', error);
  }
  
  // Call original handler for production crash reporting
  if (originalHandler) {
    originalHandler(error, isFatal);
  } else {
    // Prevent complete app shutdown in production
    if (!isFatal || !global.__DEV__) {
      console.log('Non-fatal error handled gracefully');
      return;
    }
  }
});

// Handle unhandled promise rejections
const handleUnhandledRejection = (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
  });
  
  // Don't crash the app for promise rejections
  return true;
};

// Set up unhandled rejection handler
if (global.process?.on) {
  global.process.on('unhandledRejection', handleUnhandledRejection);
}

// Add window error handler for web compatibility
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Window Error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Rejection (Window):', event.reason);
    event.preventDefault(); // Prevent default browser behavior
  });
}

export const crashHandler = {
  handleError: (error: Error, context?: string) => {
    console.error(`Error in ${context || 'Unknown Context'}:`, {
      message: error.message,
      stack: error.stack,
    });
  },
  
  safeAsync: async <T>(
    fn: () => Promise<T>,
    fallback?: T,
    context?: string
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      crashHandler.handleError(error as Error, context);
      return fallback;
    }
  },
  
  safe: <T>(
    fn: () => T,
    fallback?: T,
    context?: string
  ): T | undefined => {
    try {
      return fn();
    } catch (error) {
      crashHandler.handleError(error as Error, context);
      return fallback;
    }
  }
};