/**
 * 响应工具函数
 * 
 * 功能：包含API响应格式化工具函数，统一API响应格式
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import type { ApiResponse } from '../types';

/**
 * 创建成功响应
 * 
 * 功能：生成标准化的成功响应对象
 * 
 * @param data 响应数据
 * @param message 响应消息
 * @returns 标准化的成功响应对象
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
 * 创建错误响应
 * 
 * 功能：生成标准化的错误响应对象
 * 
 * @param error 错误信息
 * @param message 错误描述
 * @returns 标准化的错误响应对象
 */
export function errorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString()
  };
}
