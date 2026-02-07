/**
 * 网站配置Hook (修复缓存版)
 * 
 * 功能:
 * - 从API获取网站配置
 * - 配置缓存管理
 * - 类型安全的配置访问
 * - 主题配置自动同步
 * 
 * 修复内容:
 * 1. 修复 updateConfig 后缓存不同步问题
 * 2. 确保 refreshConfig 真正从服务器获取最新数据
 * 3. 优化缓存更新策略
 * 
 * @version 3.1.0
 */

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useThemeStore } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';

// ============= 类型定义 =============

export interface SiteConfig {
  // 基本信息
  siteName: string;
  siteSubtitle: string;
  siteLogo: string;
  siteFavicon: string;
  siteDescription: string;
  siteKeywords: string;
  siteAuthor: string;
  
  // 作者信息
  authorName: string;
  authorAvatar: string;
  authorBio: string;
  authorEmail: string;
  
  // 主题配置
  themePrimaryColor: string;
  themeDefaultMode: 'light' | 'dark' | 'system';
  themeFontFamily: string;
  themeEnableAnimations: boolean;
  
  // 社交媒体
  socialGithub?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  socialEmail?: string;
  socialWeibo?: string;
  socialWechatQr?: string;
  
  // 功能开关
  featureComments: boolean;
  featureSearch: boolean;
  featureLike: boolean;
  featureShare: boolean;
  featureRss: boolean;
  featureAnalytics: boolean;
  featureNewsletter: boolean;
  
  // 评论设置
  commentApprovalRequired: boolean;
  
  // 页脚配置
  footerText: string;
  footerLinks?: Record<string, string> | string;
  footerShowPoweredBy: boolean;
  
  // 存储配置
  storagePublicUrl?: string;
  
  // 系统设置
  postsPerPage: number;
  maxUploadSizeMb: number;
  enableMaintenanceMode: boolean;
}

// ============= 默认配置 =============

const DEFAULT_CONFIG: SiteConfig = {
  // 基本信息
  siteName: '我的博客',
  siteSubtitle: '分享技术与生活',
  siteLogo: '',
  siteFavicon: '',
  siteDescription: '一个分享技术和生活的个人博客',
  siteKeywords: 'blog,技术,编程',
  siteAuthor: 'Admin',
  
  // 作者信息
  authorName: 'Admin',
  authorAvatar: '',
  authorBio: '热爱技术的开发者',
  authorEmail: 'admin@example.com',
  
  // 主题配置
  themePrimaryColor: '#3B82F6',
  themeDefaultMode: 'system',
  themeFontFamily: 'system-ui, -apple-system, sans-serif',
  themeEnableAnimations: true,
  
  // 社交媒体
  socialGithub: '',
  socialTwitter: '',
  socialLinkedin: '',
  socialEmail: '',
  socialWeibo: '',
  socialWechatQr: '',
  
  // 功能开关
  featureComments: true,
  featureSearch: true,
  featureLike: true,
  featureShare: true,
  featureRss: true,
  featureAnalytics: true,
  featureNewsletter: false,
  
  // 评论设置
  commentApprovalRequired: false,
  
  // 页脚配置
  footerText: '© 2024 All rights reserved',
  footerShowPoweredBy: true,
  footerLinks: '{}',
  
  // 存储配置
  storagePublicUrl: '',
  
  // 系统设置
  postsPerPage: 10,
  maxUploadSizeMb: 5,
  enableMaintenanceMode: false
};

// ============= 配置状态管理 =============

interface ConfigState {
  config: SiteConfig | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

// 缓存键
const CACHE_KEY = 'site-config';
const CACHE_TIMESTAMP_KEY = 'site-config-timestamp';
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

// 全局请求状态，防止重复请求
let isFetching = false;
let fetchPromise: Promise<void> | null = null;

// ============= React Hook =============

/**
 * 使用网站配置的Hook
 */
export function useSiteConfig() {
  const [state, setState] = useState<ConfigState>({
    config: null,
    loading: true,
    error: null,
    lastFetch: null
  });
  
  const syncWithTheme = useThemeStore(state => state.syncWithSiteConfig);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  
  // 从localStorage获取缓存
  const getCachedConfig = (): SiteConfig | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const parsed = JSON.parse(cached);
        const time = parseInt(timestamp, 10);
        const now = Date.now();
        
        if (now - time < CACHE_TTL) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to get cached config:', error);
    }
    return null;
  };
  
  // 缓存配置到localStorage
  const setCachedConfig = (config: SiteConfig) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(config));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to cache config:', error);
    }
  };
  
  // 处理footer_links的JSON格式
  const processFooterLinks = (value: any): Record<string, string> | string => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value || '{}';
  };
  
  // 同步主题配置
  const syncThemeConfig = (config: SiteConfig) => {
    if (config.themePrimaryColor || config.themeDefaultMode) {
      syncWithTheme(config.themePrimaryColor, config.themeDefaultMode);
    }
  };
  
  // 获取配置
  const fetchConfig = async (forceRefresh: boolean = false) => {
    // 如果强制刷新，清除所有请求状态
    if (forceRefresh) {
      isFetching = false;
      fetchPromise = null;
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    }
    
    // 如果已经有请求在进行中，等待其完成
    if (isFetching && fetchPromise) {
      await fetchPromise;
      // 当其他请求完成后，更新当前组件的状态
      const cachedConfig = getCachedConfig();
      if (cachedConfig) {
        syncThemeConfig(cachedConfig);
        setState({
          config: cachedConfig,
          loading: false,
          error: null,
          lastFetch: Date.now()
        });
      }
      return;
    }

    // 标记请求开始
    isFetching = true;
    
    // 创建并缓存Promise，供其他组件等待
    fetchPromise = (async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        let configResponse;
        let apiConfig: Record<string, any> | undefined;
        
        // 根据是否是管理员选择不同的API接口
        if (isAdmin) {
          // 管理员使用管理员接口获取所有配置
          const adminResponse = await api.getAdminConfig();
          if (adminResponse.success && adminResponse.data?.config) {
            // 转换配置格式，从数组转换为对象
            apiConfig = {};
            for (const item of Object.values(adminResponse.data.config)) {
              if (Array.isArray(item)) {
                for (const configItem of item) {
                  if (configItem.key && configItem.value !== undefined) {
                    apiConfig[configItem.key] = configItem.value;
                  }
                }
              }
            }
          }
        } else {
          // 非管理员使用公开接口
          configResponse = await api.getConfig();
          if (configResponse.success && configResponse.data) {
            apiConfig = configResponse.data;
          }
        }
        
        let config = { ...DEFAULT_CONFIG };
        
        if (apiConfig) {
          // 处理特殊字段
          if (apiConfig.footer_links) {
            apiConfig.footer_links = processFooterLinks(apiConfig.footer_links);
          }
          
          config = { ...config, ...apiConfig };
        }
        
        setCachedConfig(config);
        syncThemeConfig(config); // 同步主题配置
        
        setState({
          config,
          loading: false,
          error: null,
          lastFetch: Date.now()
        });
      } catch (error) {
        console.error('Failed to fetch config:', error);
        
        // 尝试使用缓存
        const cachedConfig = getCachedConfig();
        if (cachedConfig) {
          syncThemeConfig(cachedConfig);
          setState({
            config: cachedConfig,
            loading: false,
            error: null,
            lastFetch: Date.now()
          });
        } else {
          // 使用默认配置
          setState({
            config: DEFAULT_CONFIG,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            lastFetch: null
          });
        }
      } finally {
        // 标记请求完成
        isFetching = false;
        fetchPromise = null;
      }
    })();

    // 等待请求完成
    await fetchPromise;
  };
  
  // 更新配置（修复版）
  const updateConfig = async (key: string, value: any) => {
    try {
      // 处理特殊字段
      let processedValue = value;
      if (key === 'footerLinks' && typeof value === 'object') {
        processedValue = JSON.stringify(value);
      }
      
      const response = await api.updateConfig(key, processedValue);
      
      if (response.success) {
        // 立即更新本地状态
        setState(prev => {
          const newConfig = { 
            ...(prev.config || DEFAULT_CONFIG), 
            [key]: key === 'footerLinks' ? processFooterLinks(processedValue) : processedValue 
          };
          
          // 更新缓存
          setCachedConfig(newConfig);
          
          // 如果更新的是主题配置,同步到主题Store
          if (key === 'themePrimaryColor' || key === 'themeDefaultMode') {
            syncThemeConfig(newConfig);
          }
          
          return {
            ...prev,
            config: newConfig,
            lastFetch: Date.now()
          };
        });
        
        return response;
      } else {
        throw new Error(response.error || 'Failed to update config');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      throw error;
    }
  };
  
  // 强制刷新配置（修复版）
  const refreshConfig = async () => {
    console.log('🔄 Refreshing config from server...');
    
    // 清除本地缓存
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    
    // 强制重新获取
    await fetchConfig(true);
    
    console.log('✅ Config refreshed successfully');
  };
  
  // 组件挂载时自动获取配置，或当用户角色变化时重新获取
  useEffect(() => {
    const cachedConfig = getCachedConfig();
    if (cachedConfig) {
      syncThemeConfig(cachedConfig);
      setState({
        config: cachedConfig,
        loading: false,
        error: null,
        lastFetch: Date.now()
      });
      
      // 后台刷新配置
      // 只有在缓存过期或没有缓存时才刷新，避免重复请求
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (!timestamp || Date.now() - parseInt(timestamp, 10) >= CACHE_TTL) {
        fetchConfig();
      }
    } else {
      fetchConfig();
    }
  }, [isAdmin]); // 当用户角色变化时重新获取配置
  
  return {
    config: state.config || DEFAULT_CONFIG,
    loading: state.loading,
    error: state.error,
    updateConfig,
    refreshConfig,
    isReady: !!state.config
  };
}

// ============= 便捷访问函数 =============

/**
 * 获取单个配置值
 */
export function getConfigValue<K extends keyof SiteConfig>(
  key: K
): SiteConfig[K] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const config = JSON.parse(cached);
      return config[key] || DEFAULT_CONFIG[key];
    }
  } catch (error) {
    console.error('Failed to get config value:', error);
  }
  return DEFAULT_CONFIG[key];
}

/**
 * 检查功能是否启用
 */
export function isFeatureEnabled(
  feature: 'comments' | 'search' | 'like' | 'share' | 'rss' | 'analytics' | 'newsletter'
): boolean {
  const keyMap: Record<string, keyof SiteConfig> = {
    comments: 'featureComments',
    search: 'featureSearch',
    like: 'featureLike',
    share: 'featureShare',
    rss: 'featureRss',
    analytics: 'featureAnalytics',
    newsletter: 'featureNewsletter'
  };
  const key = keyMap[feature];
  return getConfigValue(key) as boolean;
}

/**
 * 获取社交媒体链接
 */
export function getSocialLink(
  platform: 'github' | 'twitter' | 'linkedin' | 'email' | 'weibo' | 'wechat_qr'
): string {
  const keyMap: Record<string, keyof SiteConfig> = {
    github: 'socialGithub',
    twitter: 'socialTwitter',
    linkedin: 'socialLinkedin',
    email: 'socialEmail',
    weibo: 'socialWeibo',
    wechat_qr: 'socialWechatQr'
  };
  const key = keyMap[platform];
  return getConfigValue(key) as string || '';
}

/**
 * 获取页脚链接
 */
export function getFooterLinks(): Record<string, string> {
  const links = getConfigValue('footerLinks');
  if (typeof links === 'string') {
    try {
      return JSON.parse(links);
    } catch {
      return {};
    }
  }
  return links || {};
}