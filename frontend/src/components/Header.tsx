/**
 * 头部导航组件（配置化优化版）
 * 
 * 功能：
 * - 显示网站标题和导航链接
 * - 响应式设计，适配移动端和桌面端
 * - 支持登录/注册按钮和用户信息显示
 * - 集成主题切换功能
 * - 支持网站名称和Logo的可配置化
 * 
 * 优化内容：
 * 1. 集成配置系统 - 网站名称、Logo可配置
 * 2. React.memo优化性能
 * 3. useCallback包装事件处理
 * 4. 拆分子组件减少重渲染
 * 
 * @author 优化版本
 * @version 2.1.0
 */

import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { ThemeToggle } from './ThemeToggle';
import { api } from '../utils/api';

// ============= 子组件 =============

/**
 * Logo组件 - 独立渲染
 */
const Logo = React.memo(({ name, logo }: { name: string; logo?: string }) => {
  return (
    <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
      {logo && (
        <img 
          src={logo} 
          alt={name}
          className="h-8 w-8 object-contain"
          loading="lazy"
        />
      )}
      <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
        {name}
      </span>
    </Link>
  );
});

Logo.displayName = 'Logo';

/**
 * 用户信息组件 - 独立渲染
 */
const UserInfo = React.memo(({ user }: { user: any }) => {
  return (
    <div className="flex items-center space-x-2 px-3 py-2">
      {user.avatarUrl ? (
        <img 
          src={user.avatarUrl} 
          alt={user.displayName} 
          className="w-8 h-8 rounded-full border-2 border-border"
          loading="lazy"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
          {user.displayName?.[0] || user.username?.[0] || 'U'}
        </div>
      )}
      <span className="text-foreground font-medium hidden sm:inline">
        {user.displayName || user.username}
      </span>
      
      {user.role === 'admin' && (
        <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs font-medium rounded">
          管理员
        </span>
      )}
    </div>
  );
});

UserInfo.displayName = 'UserInfo';

/**
 * 导航链接组件
 */
const NavLinks = React.memo(({ 
  isAuthenticated, 
  user, 
  onLogout 
}: { 
  isAuthenticated: boolean; 
  user: any;
  onLogout: () => void;
}) => {
  return (
    <div className="hidden md:flex items-center space-x-6">
      <Link to="/" className="text-foreground/70 hover:text-foreground transition-colors">
        首页
      </Link>
      
      {isAuthenticated && user && (
        <>
          <UserInfo user={user} />
          
          <Link
            to="/profile"
            className="text-foreground/70 hover:text-foreground transition-colors"
          >
            个人中心
          </Link>
          
          {user.role === 'admin' && (
            <Link
              to="/admin"
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              管理
            </Link>
          )}
        </>
      )}
      
      <ThemeToggle />
      
      {isAuthenticated ? (
        <button
          onClick={onLogout}
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
  );
});

NavLinks.displayName = 'NavLinks';

/**
 * 移动端菜单组件
 */
const MobileMenu = React.memo(({ 
  isOpen,
  isAuthenticated, 
  user, 
  onClose,
  onLogout 
}: { 
  isOpen: boolean;
  isAuthenticated: boolean; 
  user: any;
  onClose: () => void;
  onLogout: () => void;
}) => {
  if (!isOpen) return null;
  
  const handleLogout = () => {
    onLogout();
    onClose();
  };
  
  return (
    <div className="md:hidden py-4 space-y-2 border-t border-border animate-fade-in">
      <Link 
        to="/" 
        className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors"
        onClick={onClose}
      >
        首页
      </Link>
      
      {isAuthenticated && user ? (
        <>
          <Link
            to="/profile"
            className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors"
            onClick={onClose}
          >
            个人中心
          </Link>
          
          {user.role === 'admin' && (
            <Link
              to="/admin"
              className="block px-3 py-2 rounded-lg hover:bg-muted transition-colors"
              onClick={onClose}
            >
              管理
            </Link>
          )}
          
          <div className="px-3 py-2">
            <ThemeToggle />
          </div>
          
          <button
            onClick={handleLogout}
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
            onClick={onClose}
          >
            登录
          </Link>
        </>
      )}
    </div>
  );
});

MobileMenu.displayName = 'MobileMenu';

// ============= 主组件 =============

export const Header = React.memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { config } = useSiteConfig();
  const navigate = useNavigate();
  
  // 使用useCallback缓存函数,避免子组件重渲染
  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/');
    }
  }, [logout, navigate]);
  
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);
  
  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);
  
  return (
    <header className="sticky top-0 z-50 bg-background/95 dark:bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border transition-colors">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - 使用配置 */}
          <Logo 
            name={config.site_name} 
            logo={config.site_logo}
          />

          {/* Desktop Nav */}
          <NavLinks 
            isAuthenticated={isAuthenticated}
            user={user}
            onLogout={handleLogout}
          />

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={toggleMobileMenu}
            aria-label="菜单"
            aria-expanded={mobileMenuOpen}
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
        <MobileMenu 
          isOpen={mobileMenuOpen}
          isAuthenticated={isAuthenticated}
          user={user}
          onClose={closeMobileMenu}
          onLogout={handleLogout}
        />
      </nav>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
