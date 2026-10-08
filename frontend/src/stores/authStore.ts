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
  refreshToken: string | null;
  /** access token 过期时间戳（毫秒），由后端 expiresIn（秒）换算 */
  expiresAt: number | null;
  isAuthenticated: boolean;
  
  /**
   * 登录方法
   * @param user 用户信息
   * @param token 认证token
   * @param refreshToken 刷新token
   * @param expiresIn access token 有效期（秒）
   */
  login: (user: User, token: string, refreshToken?: string | null, expiresIn?: number) => void;
  
  /**
   * 静默刷新成功后更新 token
   * @param token 新的 access token
   * @param refreshToken 新的 refresh token
   * @param expiresIn access token 有效期（秒）
   */
  setTokens: (token: string, refreshToken?: string | null, expiresIn?: number) => void;
  
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
      refreshToken: null,
      expiresAt: null,
      isAuthenticated: false,
      
      login: (user, token, refreshToken, expiresIn) => {
        set({
          user,
          token,
          refreshToken: refreshToken ?? null,
          expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
          isAuthenticated: true,
        });
      },

      setTokens: (token, refreshToken, expiresIn) => {
        set({
          token,
          refreshToken: refreshToken ?? null,
          expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
        });
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          expiresAt: null,
          isAuthenticated: false,
        });
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
