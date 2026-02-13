/**
 * 博客系统前端主应用组件
 * 
 * 功能：
 * - 路由配置与管理
 * - 页面过渡效果
 * - 全局状态管理
 * - 动态favicon更新
 * 
 * 路由配置：
 * - 首页、文章详情页、登录页等基础页面
 * - 管理后台相关页面
 * - 搜索、通知等功能页面
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { PostPage } from './pages/PostPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { SearchPage } from './pages/SearchPage';
import { ProfilePage } from './pages/ProfilePage';
import { ConfigPage } from './pages/ConfigPage';
import { AboutPage } from './pages/AboutPage';
import { ColumnPage } from './pages/ColumnPage';
import { CategoryPage } from './pages/CategoryPage';
import { TagPage } from './pages/TagPage';
import { NotFoundPage } from './pages/NotFoundPage';
import NotificationCenter from './pages/NotificationCenter';
import NotificationSettings from './pages/NotificationSettings';
import MessagesPage from './pages/MessagesPage';
import { SystemNotificationPage } from './pages/admin/SystemNotificationPage';
import { useSiteConfig } from './hooks/useSiteConfig';
import { ToastProvider } from './components/Toast';

/**
 * 页面过渡包装组件
 * 
 * 功能：为页面切换添加平滑的过渡动画效果
 * 
 * @param children 子组件内容
 * @returns 带有过渡动画的包装组件
 */
function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  return (
    <div key={location.pathname} className="animate-fade-in">
      {children}
    </div>
  );
}

/**
 * 应用路由配置组件
 * 
 * 功能：定义应用的所有路由配置
 * 
 * 路由列表：
 * - 首页：/
 * - 关于页：/about
 * - 文章详情页：/posts/:slug
 * - 登录页：/login
 * - 管理后台：/admin
 * - 搜索页：/search
 * - 个人资料页：/profile
 * - 专栏页：/columns/:slug
 * - 分类页：/categories/:slug
 * - 标签页：/tags/:slug
 * - 通知中心：/notifications
 * - 通知设置：/notification-settings
 * - 系统通知管理：/admin/notifications
 * 
 * @returns 路由配置组件
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
      <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
      <Route path="/posts/:slug" element={<PageTransition><PostPage /></PageTransition>} />
      <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
      <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />
      <Route path="/admin/config" element={<PageTransition><ConfigPage /></PageTransition>} />
      <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />
      <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
      <Route path="/columns/:slug" element={<PageTransition><ColumnPage /></PageTransition>} />
      <Route path="/categories/:slug" element={<PageTransition><CategoryPage /></PageTransition>} />
      <Route path="/tags/:slug" element={<PageTransition><TagPage /></PageTransition>} />
      <Route path="/notifications" element={<PageTransition><NotificationCenter /></PageTransition>} />
      <Route path="/notification-settings" element={<PageTransition><NotificationSettings /></PageTransition>} />
      <Route path="/messages" element={<PageTransition><MessagesPage /></PageTransition>} />
      <Route path="/admin/notifications" element={<PageTransition><SystemNotificationPage /></PageTransition>} />
      
      {/* 404路由 - 捕获所有未匹配的路径 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

/**
 * 应用主组件
 * 
 * 功能：
 * - 管理应用的整体布局
 * - 处理全局状态和配置
 * - 动态更新favicon
 * - 组织路由结构
 * 
 * 状态管理：
 * - currentFavicon: 当前favicon的URL
 * 
 * 生命周期：
 * - 监听site_favicon变化，动态更新浏览器图标
 * 
 * @returns 应用主组件
 */
function App() {
  const { config } = useSiteConfig();
  const [currentFavicon, setCurrentFavicon] = useState<string>('');

  /**
   * 动态更新favicon
   * 
   * 功能：根据配置的site_favicon URL更新浏览器标签页图标
   * 
   * @param faviconUrl favicon的URL地址
   */
  useEffect(() => {
    const updateFavicon = (faviconUrl: string) => {
      if (!faviconUrl || faviconUrl === currentFavicon) {
        return;
      }

      // 移除现有的favicon
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach(favicon => {
        favicon.remove();
      });

      // 添加新的favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = faviconUrl;
      link.type = 'image/x-icon';
      document.head.appendChild(link);

      // 添加apple-touch-icon
      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = faviconUrl;
      document.head.appendChild(appleLink);

      // 更新当前favicon状态
      setCurrentFavicon(faviconUrl);
    };

    updateFavicon(config.site_favicon);
  }, [config.site_favicon, currentFavicon]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <AppRoutes />
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
