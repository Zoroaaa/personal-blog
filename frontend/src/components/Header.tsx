/**
 * 头部导航组件（优化版）
 * 
 * 功能：
 * - 导航菜单
 * - 用户认证状态显示
 * - 管理员入口
 * 
 * 优化内容：
 * 1. 修复管理员按钮不显示的问题
 * 2. 改进登出逻辑（使用优化的api）
 * 3. 添加用户头像显示
 * 4. 优化响应式设计
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      // 调用后端登出API
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 无论API调用是否成功，都清除本地状态
      logout();
      navigate('/');
    }
  };
  
  return (
    <header className="sticky top-0 z-50 bg-background/95 dark:bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border transition-colors">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              我的博客
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-foreground/70 hover:text-foreground transition-colors">
              首页
            </Link>
            
            {/* 用户菜单 */}
            {isAuthenticated && user ? (
              <>
                {/* 用户头像和名称 */}
                <div className="flex items-center space-x-2 px-3 py-2">
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.displayName} 
                      className="w-8 h-8 rounded-full border-2 border-border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                      {user.displayName?.[0] || user.username?.[0] || 'U'}
                    </div>
                  )}
                  <span className="text-foreground font-medium hidden sm:inline">
                    {user.displayName || user.username}
                  </span>
                  
                  {/* 角色标签 */}
                  {user.role === 'admin' && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs font-medium rounded">
                      管理员
                    </span>
                  )}
                </div>
                
                {/* 个人中心 */}
                <Link
                  to="/profile"
                  className="text-foreground/70 hover:text-foreground transition-colors"
                >
                  个人中心
                </Link>
                
                {/* 管理按钮 - 只对管理员显示 */}
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-foreground/70 hover:text-foreground transition-colors"
                  >
                    管理
                  </Link>
                )}
              </>
            ) : null}
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* 登录/登出 */}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-foreground/70 hover:text-red-600 transition-colors"
              >
                登出
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                登录
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="菜单"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-border animate-fade-in">
            <Link 
              to="/" 
              className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              首页
            </Link>
            
            {isAuthenticated && user ? (
              <>
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  个人中心
                </Link>
                
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    管理
                  </Link>
                )}
                
                <div className="px-3 py-2">
                  <ThemeToggle />
                </div>
                
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  登出
                </button>
              </>
            ) : (
              <>
                <div className="px-3 py-2">
                  <ThemeToggle />
                </div>
                <Link
                  to="/login"
                  className="block px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  登录
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
