/**
 * Frontend logger utility for consistent logging across the application
 * Logs are formatted for better readability and debugging
 */
export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[INFO] ${message}`, data ? data : '');
    }
  },
  
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, data ? data : '');
  },
  
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, data ? data : '');
  },
  
  debug: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, data ? data : '');
    }
  }
};
