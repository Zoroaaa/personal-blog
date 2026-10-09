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
import { lazy, Suspense, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ErrorBoundary, PageErrorBoundary } from './components/ErrorBoundary';
import { useSiteConfig } from './hooks/useSiteConfig';
import { ToastProvider } from './components/Toast';

// 路由级代码分割：页面组件按需加载，避免全部打进首屏 bundle
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const PostPage = lazy(() => import('./pages/PostPage').then((m) => ({ default: m.PostPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ConfigPage = lazy(() => import('./pages/ConfigPage').then((m) => ({ default: m.ConfigPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ColumnPage = lazy(() => import('./pages/ColumnPage').then((m) => ({ default: m.ColumnPage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then((m) => ({ default: m.CategoryPage })));
const TagPage = lazy(() => import('./pages/TagPage').then((m) => ({ default: m.TagPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const ThreadPage = lazy(() => import('./pages/ThreadPage'));
const NewMessagePage = lazy(() => import('./pages/NewMessagePage'));
const SystemNotificationPage = lazy(() => import('./pages/admin/SystemNotificationPage').then((m) => ({ default: m.SystemNotificationPage })));
const ReadingHistoryPage = lazy(() => import('./pages/ReadingHistoryPage').then((m) => ({ default: m.ReadingHistoryPage })));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage').then((m) => ({ default: m.AccountSettingsPage })));

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
 * 路由懒加载占位组件
 * 
 * 功能：页面 chunk 按需加载期间的过渡占位
 * 
 * @returns 加载中占位组件
 */
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-muted-foreground">加载中...</p>
      </div>
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
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
        <Route path="/posts/:slug" element={<PageTransition><PageErrorBoundary pageName="文章页面"><PostPage /></PageErrorBoundary></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><PageErrorBoundary pageName="管理后台"><AdminPage /></PageErrorBoundary></PageTransition>} />
        <Route path="/admin/config" element={<PageTransition><PageErrorBoundary pageName="配置页面"><ConfigPage /></PageErrorBoundary></PageTransition>} />
        <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><PageErrorBoundary pageName="个人资料"><ProfilePage /></PageErrorBoundary></PageTransition>} />
        <Route path="/reading-history" element={<PageTransition><PageErrorBoundary pageName="阅读历史"><ReadingHistoryPage /></PageErrorBoundary></PageTransition>} />
        <Route path="/account-settings" element={<PageTransition><PageErrorBoundary pageName="账号设置"><AccountSettingsPage /></PageErrorBoundary></PageTransition>} />
        <Route path="/columns/:slug" element={<PageTransition><ColumnPage /></PageTransition>} />
        <Route path="/categories/:slug" element={<PageTransition><CategoryPage /></PageTransition>} />
        <Route path="/tags/:slug" element={<PageTransition><TagPage /></PageTransition>} />
        <Route path="/notifications" element={<PageTransition><PageErrorBoundary pageName="通知中心"><NotificationCenter /></PageErrorBoundary></PageTransition>} />
        <Route path="/notification-settings" element={<PageTransition><NotificationSettings /></PageTransition>} />
        <Route path="/messages" element={<PageTransition><PageErrorBoundary pageName="私信"><MessagesPage /></PageErrorBoundary></PageTransition>} />
        <Route path="/messages/new" element={<PageTransition><NewMessagePage /></PageTransition>} />
        <Route path="/messages/:threadId" element={<PageTransition><ThreadPage /></PageTransition>} />
        <Route path="/admin/notifications" element={<PageTransition><PageErrorBoundary pageName="系统通知"><SystemNotificationPage /></PageErrorBoundary></PageTransition>} />
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
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
