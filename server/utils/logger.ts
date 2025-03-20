type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMessage {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: any): LogMessage {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data }),
    };
  }

  private log(level: LogLevel, message: string, data?: any) {
    const logMessage = this.formatMessage(level, message, data);
    
    switch (level) {
      case 'error':
        console.error(JSON.stringify(logMessage));
        break;
      case 'warn':
        console.warn(JSON.stringify(logMessage));
        break;
      case 'info':
        console.log(JSON.stringify(logMessage));
        break;
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(JSON.stringify(logMessage));
        }
        break;
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }
}

export const logger = new Logger();
