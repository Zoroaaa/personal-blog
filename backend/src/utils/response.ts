/**
 * 响应工具函数
 * 
 * 包含API响应格式化工具函数
 * 
 * @author 优化版本
 * @version 1.0.0
 */

import type { ApiResponse } from '../types';

/**
 * 工具函数：创建成功响应
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * 工具函数：创建错误响应
 */
export function errorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString()
  };
}
