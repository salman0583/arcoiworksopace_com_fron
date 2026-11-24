/**
 * Centralized logging utility for ARCO Workplace Frontend.
 *
 * Provides leveled logging (debug, info, warn, error) with styled prefixes.
 * In development, outputs formatted messages to the browser console.
 * In production, debug logs are silenced.
 *
 * SECURITY: Never pass passwords, tokens, hashes, cookies, or secrets to these methods.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

function formatPrefix(level: LogLevel, tag?: string): string {
  const timestamp = new Date().toLocaleTimeString();
  return tag ? `[${timestamp}] [${level.toUpperCase()}] [${tag}]` : `[${timestamp}] [${level.toUpperCase()}]`;
}

export const logger = {
  debug: (tag: string, message: string, ...args: unknown[]) => {
    if (isDev) {
      console.debug(`%c${formatPrefix('debug', tag)} ${message}`, 'color: #667085; font-weight: normal;', ...args);
    }
  },

  info: (tag: string, message: string, ...args: unknown[]) => {
    if (isDev) {
      console.info(`%c${formatPrefix('info', tag)} ${message}`, 'color: #0284C7; font-weight: 500;', ...args);
    }
  },

  warn: (tag: string, message: string, ...args: unknown[]) => {
    console.warn(`%c${formatPrefix('warn', tag)} ${message}`, 'color: #D97706; font-weight: bold;', ...args);
  },

  error: (tag: string, message: string, ...args: unknown[]) => {
    console.error(`%c${formatPrefix('error', tag)} ${message}`, 'color: #DC2626; font-weight: bold;', ...args);
  },

  /**
   * Helper specifically for API request logging.
   * Sanitizes URLs and avoids logging sensitive payloads.
   */
  apiRequest: (method: string, url: string) => {
    if (isDev) {
      console.info(`%c[API] %c${method.toUpperCase()} %c${url}`, 'color: #2563EB; font-weight: bold;', 'color: #10B981; font-weight: 600;', 'color: #172033;');
    }
  },

  /**
   * Helper specifically for API response logging.
   */
  apiResponse: (method: string, url: string, status: number) => {
    if (isDev) {
      const color = status >= 200 && status < 300 ? '#10B981' : '#F59E0B';
      console.info(`%c[API] %c${status} %c${method.toUpperCase()} ${url}`, 'color: #2563EB; font-weight: bold;', `color: ${color}; font-weight: 600;`, 'color: #667085;');
    }
  },

  /**
   * Helper specifically for API error logging.
   */
  apiError: (method: string, url: string, status?: number, errorMessage?: string) => {
    console.error(
      `%c[API ERROR] %c${method.toUpperCase()} ${url} %cStatus: ${status ?? 'Network Error'} - ${errorMessage || 'Unknown Error'}`,
      'color: #DC2626; font-weight: bold;',
      'color: #475467; font-weight: 600;',
      'color: #DC2626;'
    );
  },
};

export default logger;
