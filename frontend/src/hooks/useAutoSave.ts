/**
 * 自动保存 Hook
 * 功能：
 * - 定时自动保存
 * - 本地存储备份
 * - 恢复草稿功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AutoSaveState<T> {
  data: T;
  lastSaved: Date | null;
  isSaving: boolean;
  hasDraft: boolean;
}

export interface UseAutoSaveOptions<T> {
  key: string;
  data: T;
  onSave?: (data: T) => Promise<void>;
  interval?: number;
  enabled?: boolean;
}

export function useAutoSave<T>(options: UseAutoSaveOptions<T>) {
  const { key, data, onSave, interval = 30000, enabled = true } = options;
  
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dataRef = useRef(data);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 更新 ref
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  
  // 检查数据是否为空（所有字段都是空值或默认值）
  const isEmptyData = useCallback((dataToCheck: T): boolean => {
    if (dataToCheck === null || dataToCheck === undefined) return true;
    if (typeof dataToCheck !== 'object') return false;
    
    const values = Object.values(dataToCheck);
    // 如果所有值都是空字符串、null、undefined 或空数组，则认为数据为空
    return values.every(value => {
      if (value === '' || value === null || value === undefined) return true;
      if (Array.isArray(value) && value.length === 0) return true;
      return false;
    });
  }, []);

  // 保存到本地存储
  const saveToLocalStorage = useCallback((dataToSave: T) => {
    try {
      // 如果数据为空，不保存
      if (isEmptyData(dataToSave)) {
        return;
      }
      
      const draft = {
        data: dataToSave,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`draft_${key}`, JSON.stringify(draft));
      setHasDraft(true);
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  }, [key, isEmptyData]);
  
  // 从本地存储恢复
  const restoreFromLocalStorage = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(`draft_${key}`);
      if (saved) {
        const draft = JSON.parse(saved);
        return draft.data;
      }
    } catch (err) {
      console.error('Failed to restore draft:', err);
    }
    return null;
  }, [key]);
  
  // 清除本地存储
  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(`draft_${key}`);
      setHasDraft(false);
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  }, [key]);
  
  // 执行保存
  const doSave = useCallback(async (force: boolean = false) => {
    if (!enabled && !force) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // 先保存到本地存储作为备份
      saveToLocalStorage(dataRef.current);
      
      // 如果有外部保存函数，调用它
      if (onSave) {
        await onSave(dataRef.current);
      }
      
      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      console.error('Auto save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, onSave, saveToLocalStorage]);
  
  // 设置定时保存
  useEffect(() => {
    if (!enabled) return;

    // 延迟首次保存，避免立即覆盖草稿（3秒后）
    const initialDelay = setTimeout(() => {
      saveToLocalStorage(data);
    }, 3000);

    // 设置定时器
    intervalRef.current = setInterval(() => {
      doSave();
    }, interval);

    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, data, doSave, saveToLocalStorage]);
  
  // 页面关闭前保存
  useEffect(() => {
    if (!enabled) return;
    
    const handleBeforeUnload = () => {
      saveToLocalStorage(dataRef.current);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, saveToLocalStorage]);
  
  // 手动保存
  const saveNow = useCallback(async () => {
    await doSave(true);
  }, [doSave]);
  
  // 检查是否有草稿
  useEffect(() => {
    const saved = localStorage.getItem(`draft_${key}`);
    setHasDraft(!!saved);
  }, [key]);
  
  return {
    lastSaved,
    isSaving,
    hasDraft,
    error,
    saveNow,
    restoreFromLocalStorage,
    clearLocalStorage,
  };
}

/**
 * 键盘快捷键 Hook
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const altMatch = !!shortcut.alt === e.altKey;
        const shiftMatch = !!shortcut.shift === e.shiftKey;
        
        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
}

/**
 * 防抖 Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * 节流 Hook
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);
  
  return throttledValue;
}
