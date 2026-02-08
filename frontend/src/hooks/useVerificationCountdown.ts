import { useState, useEffect, useCallback } from 'react';

interface CountdownState {
  [key: string]: number; // key: `${type}_${email}`, value: 倒计时剩余秒数
}

const STORAGE_KEY = 'verification_countdown';
const COUNTDOWN_DURATION = 60; // 倒计时60秒

/**
 * 获取 localStorage 中存储的倒计时状态
 */
function getStoredCountdown(): CountdownState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      const validState: CountdownState = {};
      
      // 过滤掉已经过期的倒计时
      Object.entries(parsed).forEach(([key, value]) => {
        const { expiresAt } = value as { expiresAt: number; remaining: number };
        if (expiresAt > now) {
          validState[key] = Math.ceil((expiresAt - now) / 1000);
        }
      });
      
      return validState;
    }
  } catch {
    // 解析失败返回空对象
  }
  return {};
}

/**
 * 保存倒计时状态到 localStorage
 */
function saveCountdownState(key: string, remainingSeconds: number) {
  try {
    const expiresAt = Date.now() + remainingSeconds * 1000;
    
    // 获取当前所有状态并更新
    const allState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    allState[key] = { expiresAt, remaining: remainingSeconds };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allState));
  } catch {
    // 保存失败静默处理
  }
}

/**
 * 清除指定类型的倒计时状态
 */
function clearCountdownState(key: string) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const allState = JSON.parse(stored);
      delete allState[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allState));
    }
  } catch {
    // 清除失败静默处理
  }
}

/**
 * 验证码倒计时 Hook
 * 
 * 功能：
 * - 管理验证码发送后的60秒倒计时
 * - 使用 localStorage 持久化，页面刷新或关闭后再打开仍能继续倒计时
 * - 发送成功后开始倒计时，1分钟内不允许重复发送
 * - 发送失败不开始倒计时，允许立即重试
 * 
 * @param type 验证码类型: 'register' | 'password' | 'delete' | 'forgot_password'
 * @param email 邮箱地址（可选，用于区分不同邮箱的倒计时）
 * @returns {
 *   countdown: number - 当前倒计时秒数，0表示可以发送
 *   isCounting: boolean - 是否正在倒计时中
 *   startCountdown: () => void - 开始倒计时
 *   resetCountdown: () => void - 重置倒计时
 * }
 * 
 * 注意：验证码有效期10分钟是后端控制的，与前端倒计时无关
 */
export function useVerificationCountdown(
  type: 'register' | 'password' | 'delete' | 'forgot_password',
  email?: string
) {
  // 生成唯一的存储key
  const storageKey = email ? `${type}_${email}` : type;
  
  // 初始化时从 localStorage 读取状态
  const [countdown, setCountdown] = useState(() => {
    const stored = getStoredCountdown();
    return stored[storageKey] || 0;
  });
  
  const isCounting = countdown > 0;

  /**
   * 开始倒计时
   * 发送验证码成功后调用
   */
  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_DURATION);
    saveCountdownState(storageKey, COUNTDOWN_DURATION);
  }, [storageKey]);

  /**
   * 重置倒计时
   * 用于特殊情况需要重置倒计时
   */
  const resetCountdown = useCallback(() => {
    setCountdown(0);
    clearCountdownState(storageKey);
  }, [storageKey]);

  // 倒计时逻辑
  useEffect(() => {
    if (countdown <= 0) {
      clearCountdownState(storageKey);
      return;
    }

    // 每秒更新一次
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearCountdownState(storageKey);
          return 0;
        }
        // 更新 localStorage
        saveCountdownState(storageKey, next);
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, storageKey]);

  // 页面可见性变化时同步状态（处理用户切换标签页的情况）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const stored = getStoredCountdown();
        const remaining = stored[storageKey] || 0;
        setCountdown(remaining);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [storageKey]);

  return {
    countdown,
    isCounting,
    startCountdown,
    resetCountdown,
  };
}
