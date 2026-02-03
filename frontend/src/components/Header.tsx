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
  
  // 调试：打印用户信息
  console.log('Header - User:', user);
  console.log('Header - Is Admin:', user?.role === 'admin');
  
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 左侧：Logo和导航 */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              <svg className="w-8 h-8 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              我的博客
            </Link>
            <div className="hidden md:flex ml-10 items-center space-x-4">
              <Link 
                to="/" 
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                首页
              </Link>
            </div>
          </div>
          
          {/* 中间：搜索表单 - 仅在桌面显示 */}
          <div className="hidden md:flex flex-1 max-w-md mx-8 items-center">
            <form 
              className="w-full"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector('input[name="q"]') as HTMLInputElement;
                const query = input.value.trim();
                if (query) {
                  navigate(`/search?q=${encodeURIComponent(query)}`);
                }
              }}
            >
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  placeholder="搜索文章..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
          
          {/* 右侧：用户菜单和移动端菜单按钮 */}
          <div className="flex items-center space-x-4">
            {/* 移动端搜索按钮 */}
            <button 
              className="md:hidden text-gray-700 hover:text-gray-900"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            {/* 移动端菜单按钮 */}
            <button 
              className="md:hidden text-gray-700 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            
            {/* 桌面端用户菜单 */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated && user ? (
                <>
                  {/* 用户头像和名称 */}
                  <div className="flex items-center space-x-2 px-3 py-2">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.displayName} 
                        className="w-8 h-8 rounded-full border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                        {user.displayName?.[0] || user.username?.[0] || 'U'}
                      </div>
                    )}
                    <span className="text-gray-700 font-medium hidden sm:inline">
                      {user.displayName || user.username}
                    </span>
                    
                    {/* 角色标签 */}
                    {user.role === 'admin' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                        管理员
                      </span>
                    )}
                  </div>
                  
                  {/* 个人中心 */}
                  <Link
                    to="/profile"
                    className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="hidden sm:inline">个人中心</span>
                  </Link>
                  
                  {/* 管理按钮 - 只对管理员显示 */}
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="hidden sm:inline">管理</span>
                    </Link>
                  )}
                  
                  {/* 主题切换 */}
                  <ThemeToggle />
                  
                  {/* 登出按钮 */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:inline">登出</span>
                  </button>
                </>
              ) : (
                /* 未登录状态 */
                <>
                  {/* 主题切换 - 未登录状态也显示 */}
                  <ThemeToggle />
                  <Link
                    to="/login"
                    className="flex items-center space-x-1 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>登录</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* 移动端搜索表单 */}
        {mobileSearchOpen && (
          <div className="md:hidden pb-4">
            <form 
              className="w-full"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector('input[name="q"]') as HTMLInputElement;
                const query = input.value.trim();
                if (query) {
                  navigate(`/search?q=${encodeURIComponent(query)}`);
                  setMobileSearchOpen(false);
                }
              }}
            >
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  placeholder="搜索文章..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="space-y-2">
              {/* 导航链接 */}
              <Link 
                to="/" 
                className="block text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                首页
              </Link>
              
              {isAuthenticated && user ? (
                <>
                  {/* 个人中心 */}
                  <Link
                    to="/profile"
                    className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    个人中心
                  </Link>
                  
                  {/* 管理按钮 - 只对管理员显示 */}
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      管理
                    </Link>
                  )}
                  
                  {/* 主题切换 - 移动端 */}
                  <div className="px-3 py-2">
                    <ThemeToggle />
                  </div>
                  
                  {/* 登出按钮 */}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    登出
                  </button>
                </>
              ) : (
                /* 未登录状态 */
                <>
                  {/* 主题切换 - 移动端 */}
                  <div className="px-3 py-2">
                    <ThemeToggle />
                  </div>
                  
                  <Link
                    to="/login"
                    className="block text-center text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    登录
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
