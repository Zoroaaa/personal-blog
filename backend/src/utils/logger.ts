/**
 * 统一日志工具
 *
 * 功能：
 * - 统一日志格式
 * - 统一日志语言（中文）
 * - 添加模块前缀
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-18
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_PREFIXES: Record<string, string> = {
  auth: '[AuthService]',
  post: '[PostService]',
  comment: '[CommentService]',
  upload: '[UploadService]',
  rateLimit: '[RateLimit]',
  config: '[Config]',
  db: '[Database]',
  cache: '[Cache]',
  notification: '[Notification]',
  email: '[Email]',
  oauth: '[OAuth]',
  refresh: '[RefreshToken]',
  error: '[ErrorHandler]',
};

function formatMessage(module: string, message: string): string {
  const prefix = LOG_PREFIXES[module] || `[${module}]`;
  return `${prefix} ${message}`;
}

export function createModuleLogger(module: string) {
  return {
    info: (message: string, ...args: any[]) => {
      console.log(formatMessage(module, message), ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(formatMessage(module, message), ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(formatMessage(module, message), ...args);
    },
    debug: (message: string, ...args: any[]) => {
      console.debug(formatMessage(module, message), ...args);
    }
  };
}

export const log = {
  info: (module: string, message: string, ...args: any[]) => {
    console.log(formatMessage(module, message), ...args);
  },
  warn: (module: string, message: string, ...args: any[]) => {
    console.warn(formatMessage(module, message), ...args);
  },
  error: (module: string, message: string, ...args: any[]) => {
    console.error(formatMessage(module, message), ...args);
  },
  debug: (module: string, message: string, ...args: any[]) => {
    console.debug(formatMessage(module, message), ...args);
  }
};
