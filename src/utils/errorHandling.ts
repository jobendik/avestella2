// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Error Handling Utilities
// Consistent error handling across the application
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Application error categories
 */
export type ErrorCategory = 
  | 'storage' 
  | 'network' 
  | 'audio' 
  | 'rendering' 
  | 'gameplay' 
  | 'ui' 
  | 'system';

/**
 * Structured error information
 */
export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  timestamp: number;
  context?: Record<string, unknown>;
  stack?: string;
}

/**
 * Error handlers storage
 */
const errorHandlers: Array<(error: AppError) => void> = [];
const errorLog: AppError[] = [];
const MAX_ERROR_LOG = 100;

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a structured application error
 */
export function createAppError(
  category: ErrorCategory,
  message: string,
  options: {
    severity?: ErrorSeverity;
    details?: string;
    context?: Record<string, unknown>;
    originalError?: Error;
  } = {}
): AppError {
  return {
    id: generateErrorId(),
    category,
    severity: options.severity ?? 'medium',
    message,
    details: options.details,
    timestamp: Date.now(),
    context: options.context,
    stack: options.originalError?.stack
  };
}

/**
 * Log an error and notify handlers
 */
export function logError(error: AppError): void {
  // Add to error log
  errorLog.unshift(error);
  if (errorLog.length > MAX_ERROR_LOG) {
    errorLog.pop();
  }

  // Console output based on severity
  const prefix = `[AVESTELLA ${error.severity.toUpperCase()}]`;
  
  switch (error.severity) {
    case 'critical':
      console.error(prefix, error.message, error);
      break;
    case 'high':
      console.error(prefix, error.message, error.context);
      break;
    case 'medium':
      console.warn(prefix, error.message, error.context);
      break;
    case 'low':
      console.log(prefix, error.message);
      break;
  }

  // Notify all registered handlers
  errorHandlers.forEach(handler => {
    try {
      handler(error);
    } catch (e) {
      console.error('Error handler threw:', e);
    }
  });
}

/**
 * Register an error handler
 */
export function onError(handler: (error: AppError) => void): () => void {
  errorHandlers.push(handler);
  return () => {
    const idx = errorHandlers.indexOf(handler);
    if (idx !== -1) errorHandlers.splice(idx, 1);
  };
}

/**
 * Get error log
 */
export function getErrorLog(): readonly AppError[] {
  return errorLog;
}

/**
 * Clear error log
 */
export function clearErrorLog(): void {
  errorLog.length = 0;
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  category: ErrorCategory,
  options: { severity?: ErrorSeverity; context?: Record<string, unknown> } = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (e) {
      const error = createAppError(category, e instanceof Error ? e.message : String(e), {
        severity: options.severity ?? 'medium',
        context: { ...options.context, args },
        originalError: e instanceof Error ? e : undefined
      });
      logError(error);
      throw e;
    }
  }) as T;
}

/**
 * Wrap a sync function with error handling
 */
export function withErrorHandlingSync<T extends (...args: any[]) => any>(
  fn: T,
  category: ErrorCategory,
  options: { severity?: ErrorSeverity; context?: Record<string, unknown> } = {}
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      return fn(...args);
    } catch (e) {
      const error = createAppError(category, e instanceof Error ? e.message : String(e), {
        severity: options.severity ?? 'medium',
        context: { ...options.context, args },
        originalError: e instanceof Error ? e : undefined
      });
      logError(error);
      throw e;
    }
  }) as T;
}

/**
 * Safe async execution with fallback
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  category: ErrorCategory
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const error = createAppError(category, e instanceof Error ? e.message : String(e), {
      severity: 'low',
      originalError: e instanceof Error ? e : undefined
    });
    logError(error);
    return fallback;
  }
}

/**
 * Safe sync execution with fallback
 */
export function safeSync<T>(
  fn: () => T,
  fallback: T,
  category: ErrorCategory
): T {
  try {
    return fn();
  } catch (e) {
    const error = createAppError(category, e instanceof Error ? e.message : String(e), {
      severity: 'low',
      originalError: e instanceof Error ? e : undefined
    });
    logError(error);
    return fallback;
  }
}

/**
 * Storage-specific safe operations
 */
export const safeStorage = {
  getItem(key: string, fallback: string | null = null): string | null {
    return safeSync(
      () => localStorage.getItem(key),
      fallback,
      'storage'
    );
  },

  setItem(key: string, value: string): boolean {
    return safeSync(
      () => { localStorage.setItem(key, value); return true; },
      false,
      'storage'
    );
  },

  getJSON<T>(key: string, fallback: T): T {
    return safeSync(
      () => {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      },
      fallback,
      'storage'
    );
  },

  setJSON(key: string, value: unknown): boolean {
    return safeSync(
      () => { localStorage.setItem(key, JSON.stringify(value)); return true; },
      false,
      'storage'
    );
  },

  removeItem(key: string): boolean {
    return safeSync(
      () => { localStorage.removeItem(key); return true; },
      false,
      'storage'
    );
  }
};

/**
 * Assert a condition, throwing if false
 */
export function assert(
  condition: boolean,
  message: string,
  category: ErrorCategory = 'system'
): asserts condition {
  if (!condition) {
    const error = createAppError(category, `Assertion failed: ${message}`, {
      severity: 'high'
    });
    logError(error);
    throw new Error(error.message);
  }
}

/**
 * Assert non-null value
 */
export function assertDefined<T>(
  value: T | null | undefined,
  name: string,
  category: ErrorCategory = 'system'
): T {
  if (value === null || value === undefined) {
    const error = createAppError(category, `Expected ${name} to be defined`, {
      severity: 'high'
    });
    logError(error);
    throw new Error(error.message);
  }
  return value;
}

/**
 * Report error to external service (placeholder)
 */
export function reportToService(error: AppError): void {
  // In production, this would send to an error tracking service
  // For now, just log that we would report it
  if (error.severity === 'critical' || error.severity === 'high') {
    console.log('[ERROR REPORTING]', 'Would report to service:', error.id);
  }
}

// Auto-register service reporter for high-severity errors
onError(error => {
  if (error.severity === 'critical' || error.severity === 'high') {
    reportToService(error);
  }
});
