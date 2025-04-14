// Logger utility for controlled console output
const isDevelopment = process.env.NODE_ENV === 'development';

interface LoggerOptions {
  level?: 'info' | 'warn' | 'error';
  context?: string;
}

export const logger = {
  info: (message: string, data?: any, options: LoggerOptions = {}) => {
    if (isDevelopment) {
      const context = options.context ? `[${options.context}]` : '';
      console.info(`${context} ${message}`, data || '');
    }
  },

  warn: (message: string, data?: any, options: LoggerOptions = {}) => {
    if (isDevelopment) {
      const context = options.context ? `[${options.context}]` : '';
      console.warn(`${context} ${message}`, data || '');
    }
  },

  error: (message: string, error?: any, options: LoggerOptions = {}) => {
    // Always log errors, even in production
    const context = options.context ? `[${options.context}]` : '';
    console.error(`${context} ${message}`, error || '');
  }
}; 
