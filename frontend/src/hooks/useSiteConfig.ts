/**
 * 网站配置Hook (增强版)
 * 
 * 功能:
 * - 从API获取网站配置
 * - 配置缓存管理
 * - 类型安全的配置访问
 * - 主题配置自动同步
 * 
 * 新增功能:
 * 1. 与themeStore自动联动
 * 2. 配置变更时自动更新主题
 * 3. 优化缓存策略
 * 
 * @version 3.0.0
 */

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useThemeStore } from '../stores/themeStore';

// ============= 类型定义 =============

export interface SiteConfig {
  // 基本信息
  site_name: string;
  site_subtitle: string;
  site_logo: string;
  site_favicon: string;
  site_description: string;
  site_keywords: string;
  site_author: string;
  
  // 作者信息
  author_name: string;
  author_avatar: string;
  author_bio: string;
  author_email: string;
  
  // 主题配置
  theme_primary_color: string;
  theme_default_mode: 'light' | 'dark' | 'system';
  theme_font_family: string;
  theme_enable_animations: boolean;
  
  // 社交媒体
  social_github?: string;
  social_twitter?: string;
  social_linkedin?: string;
  social_email?: string;
  social_weibo?: string;
  social_wechat_qr?: string;
  
  // 功能开关
  feature_comments: boolean;
  feature_search: boolean;
  feature_like: boolean;
  feature_share: boolean;
  feature_rss: boolean;
  feature_analytics: boolean;
  feature_newsletter: boolean;
  
  // 评论设置
  comment_approval_required: boolean;
  
  // 页脚配置
  footer_text: string;
  footer_links?: Record<string, string> | string;
  footer_show_powered_by: boolean;
  
  // 存储配置
  storage_public_url?: string;
  
  // 系统设置
  posts_per_page: number;
  max_upload_size_mb: number;
  enable_maintenance_mode: boolean;
}

// ============= 默认配置 =============

const DEFAULT_CONFIG: SiteConfig = {
  // 基本信息
  site_name: '我的博客',
  site_subtitle: '分享技术与生活',
  site_logo: '',
  site_favicon: '',
  site_description: '一个分享技术和生活的个人博客',
  site_keywords: 'blog,技术,编程',
  site_author: 'Admin',
  
  // 作者信息
  author_name: 'Admin',
  author_avatar: '',
  author_bio: '热爱技术的开发者',
  author_email: 'admin@example.com',
  
  // 主题配置
  theme_primary_color: '#3B82F6',
  theme_default_mode: 'system',
  theme_font_family: 'system-ui, -apple-system, sans-serif',
  theme_enable_animations: true,
  
  // 社交媒体
  social_github: '',
  social_twitter: '',
  social_linkedin: '',
  social_email: '',
  social_weibo: '',
  social_wechat_qr: '',
  
  // 功能开关
  feature_comments: true,
  feature_search: true,
  feature_like: true,
  feature_share: true,
  feature_rss: true,
  feature_analytics: true,
  feature_newsletter: false,
  
  // 评论设置
  comment_approval_required: false,
  
  // 页脚配置
  footer_text: '© 2024 All rights reserved',
  footer_show_powered_by: true,
  footer_links: '{}',
  
  // 存储配置
  storage_public_url: '',
  
  // 系统设置
  posts_per_page: 10,
  max_upload_size_mb: 5,
  enable_maintenance_mode: false
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
    if (config.theme_primary_color || config.theme_default_mode) {
      syncWithTheme(config.theme_primary_color, config.theme_default_mode);
    }
  };
  
  // 获取配置
  const fetchConfig = async () => {
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
        
        const configResponse = await api.getConfig();
        
        let config = { ...DEFAULT_CONFIG };
        
        if (configResponse.success && configResponse.data) {
          const apiConfig = configResponse.data;
          
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
  
  // 更新配置
  const updateConfig = async (key: string, value: any) => {
    try {
      // 处理特殊字段
      let processedValue = value;
      if (key === 'footer_links' && typeof value === 'object') {
        processedValue = JSON.stringify(value);
      }
      
      const response = await api.updateConfig(key, processedValue);
      
      if (response.success) {
        // 更新本地配置
        setState(prev => {
          const newConfig = { 
            ...(prev.config || DEFAULT_CONFIG), 
            [key]: key === 'footer_links' ? processFooterLinks(processedValue) : value 
          };
          
          setCachedConfig(newConfig);
          
          // 如果更新的是主题配置,同步到主题Store
          if (key === 'theme_primary_color' || key === 'theme_default_mode') {
            syncThemeConfig(newConfig);
          }
          
          return {
            ...prev,
            config: newConfig,
            lastFetch: Date.now()
          };
        });
      } else {
        throw new Error(response.error || 'Failed to update config');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      throw error;
    }
  };
  
  // 强制刷新配置
  const refreshConfig = async () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    await fetchConfig();
  };
  
  // 组件挂载时自动获取配置
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
      fetchConfig();
    } else {
      fetchConfig();
    }
  }, []);
  
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
  const key = `feature_${feature}` as keyof SiteConfig;
  return getConfigValue(key) as boolean;
}

/**
 * 获取社交媒体链接
 */
export function getSocialLink(
  platform: 'github' | 'twitter' | 'linkedin' | 'email' | 'weibo' | 'wechat_qr'
): string {
  const key = `social_${platform}` as keyof SiteConfig;
  return getConfigValue(key) as string || '';
}

/**
 * 获取页脚链接
 */
export function getFooterLinks(): Record<string, string> {
  const links = getConfigValue('footer_links');
  if (typeof links === 'string') {
    try {
      return JSON.parse(links);
    } catch {
      return {};
    }
  }
  return links || {};
}
