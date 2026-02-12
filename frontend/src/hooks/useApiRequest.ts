/**
 * API请求自定义Hook
 * 
 * 功能:
 * - 统一的API调用逻辑
 * - 自动处理loading/error状态
 * - 支持依赖项变化时重新请求
 * - 提供refetch功能
 * 
 * @author 博客系统
 * @version 2.1.0
 * @created 2024-01-01
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiRequestOptions {
  // 是否立即执行
  immediate?: boolean;
  // 错误回调
  onError?: (error: Error) => void;
  // 成功回调
  onSuccess?: (data: any) => void;
}

interface UseApiRequestReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: (data: T | null) => void;
}

/**
 * API请求Hook
 * 
 * @param apiCall API调用函数
 * @param deps 依赖项数组
 * @param options 配置选项
 * 
 * @example
 * const { data, loading, error, refetch } = useApiRequest(
 *   () => api.getPosts({ page: '1' }),
 *   []
 * );
 */
export function useApiRequest<T = any>(
  apiCall: () => Promise<any>,
  deps: any[] = [],
  options: UseApiRequestOptions = {}
): UseApiRequestReturn<T> {
  const { immediate = true, onError, onSuccess } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  
  // 使用ref避免闭包问题
  const isMountedRef = useRef(true);
  const apiCallRef = useRef(apiCall);
  
  // 更新apiCall引用
  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);
  
  // 执行请求
  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCallRef.current();
      
      // 检查组件是否已卸载
      if (!isMountedRef.current) return;
      
      // 处理API响应格式
      if (response.success && response.data !== undefined) {
        setData(response.data);
        onSuccess?.(response.data);
      } else {
        throw new Error(response.error || response.message || 'Request failed');
      }
    } catch (err) {
      // 检查组件是否已卸载
      if (!isMountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      onError?.(err as Error);
      
      console.error('API request error:', err);
    } finally {
      // 检查组件是否已卸载
      if (!isMountedRef.current) return;
      
      setLoading(false);
    }
  }, [onError, onSuccess]);
  
  // 依赖项变化时重新请求
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  
  // 组件卸载时设置标志
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // refetch函数
  const refetch = useCallback(async () => {
    await execute();
  }, [execute]);
  
  return {
    data,
    loading,
    error,
    refetch,
    setData
  };
}

/**
 * 带缓存的API请求Hook
 * 
 * 在指定时间内使用缓存数据,避免重复请求
 */
export function useCachedApiRequest<T = any>(
  apiCall: () => Promise<any>,
  cacheKey: string,
  cacheDuration = 5 * 60 * 1000, // 默认5分钟
  deps: any[] = []
): UseApiRequestReturn<T> {
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  
  const cachedApiCall = useCallback(async () => {
    const now = Date.now();
    const cached = cacheRef.current.get(cacheKey);
    
    // 检查缓存是否有效
    if (cached && now - cached.timestamp < cacheDuration) {
      console.log(`Using cached data for ${cacheKey}`);
      return { success: true, data: cached.data };
    }
    
    // 调用API
    const response = await apiCall();
    
    // 缓存结果
    if (response.success) {
      cacheRef.current.set(cacheKey, {
        data: response.data,
        timestamp: now
      });
    }
    
    return response;
  }, [apiCall, cacheKey, cacheDuration]);
  
  return useApiRequest<T>(cachedApiCall, deps);
}

/**
 * 带自动重试的API请求Hook
 */
export function useRetryApiRequest<T = any>(
  apiCall: () => Promise<any>,
  deps: any[] = [],
  maxRetries = 3,
  retryDelay = 1000
): UseApiRequestReturn<T> & { retryCount: number } {
  const [retryCount, setRetryCount] = useState(0);
  
  const retryableApiCall = useCallback(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await apiCall();
        
        // 重置重试计数
        if (i > 0) {
          setRetryCount(0);
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries) {
          console.log(`Request failed, retrying (${i + 1}/${maxRetries})...`);
          setRetryCount(i + 1);
          
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        }
      }
    }
    
    // 所有重试都失败
    throw lastError;
  }, [apiCall, maxRetries, retryDelay]);
  
  const result = useApiRequest<T>(retryableApiCall, deps);
  
  return {
    ...result,
    retryCount
  };
}

/**
 * 批量API请求Hook
 * 
 * 并行执行多个API请求
 */
export function useBatchApiRequest<T = any>(
  apiCalls: Array<() => Promise<any>>,
  deps: any[] = []
): {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const responses = await Promise.all(apiCalls.map(call => call()));
      
      const results = responses.map(response => {
        if (response.success) {
          return response.data;
        } else {
          throw new Error(response.error || 'Request failed');
        }
      });
      
      setData(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Batch API request error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCalls]);
  
  useEffect(() => {
    execute();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    data,
    loading,
    error,
    refetch: execute
  };
}
