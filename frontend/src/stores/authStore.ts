/**
 * 认证状态管理Store
 * 
 * 功能：
 * - 管理用户登录状态
 * - 存储认证token
 * - 提供登录、登出、更新用户信息等方法
 * - 持久化存储认证状态
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 用户信息接口
 */
export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
}

/**
 * 认证状态接口
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  /**
   * 登录方法
   * @param user 用户信息
   * @param token 认证token
   */
  login: (user: User, token: string) => void;
  
  /**
   * 登出方法
   */
  logout: () => void;
  
  /**
   * 更新用户信息方法
   * @param user 更新后的用户信息
   */
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      setUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
