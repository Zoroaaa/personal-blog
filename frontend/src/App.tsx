import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { PostPage } from './pages/PostPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { SearchPage } from './pages/SearchPage';
import { ProfilePage } from './pages/ProfilePage';
import { ConfigPage } from './pages/ConfigPage';
import { AboutPage } from './pages/AboutPage';
import { useSiteConfig } from './hooks/useSiteConfig';
import { ToastProvider } from './components/Toast';

// 页面过渡包装组件
function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  return (
    <div key={location.pathname} className="animate-fade-in">
      {children}
    </div>
  );
}

// 路由配置
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
    </Routes>
  );
}

function App() {
  const { config } = useSiteConfig();
  const [currentFavicon, setCurrentFavicon] = useState<string>('');

  // 动态更新favicon
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
  );
}

export default App;
