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
 * @version 4.0.0
 */

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useThemeStore } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';

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
  
  // SEO配置
  site_og_image?: string;
  site_twitter_card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  
  // 主题配置
  theme_primary_color: string;
  theme_default_mode: 'light' | 'dark' | 'system';
  theme_font_family: string;
  theme_font_url?: string;
  
  // 社交媒体
  social_github?: string;
  social_twitter?: string;
  social_youtube?: string;
  social_telegram?: string;
  social_email?: string;
  
  // 功能开关
  feature_comments: boolean;
  feature_search: boolean;
  feature_like: boolean;
  feature_share: boolean;
  feature_registration?: boolean;
  feature_oauth_github?: boolean;
  feature_rss?: boolean;
  
  // 评论设置
  comment_approval_required: boolean;
  allow_html_comments?: boolean;
  max_comment_length?: number;
  
  // 页脚配置
  footer_text: string;
  footer_links?: Record<string, string> | string;
  footer_tech_stack?: string[];
  
  // 系统设置
  posts_per_page: number;
  max_upload_size_mb: number;
  
  // 索引签名
  [key: string]: any;
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
  
  // SEO配置
  site_og_image: '',
  site_twitter_card: 'summary_large_image',
  
  // 主题配置
  theme_primary_color: '#3B82F6',
  theme_default_mode: 'system',
  theme_font_family: 'system-ui, -apple-system, sans-serif',
  theme_font_url: '',
  
  // 社交媒体
  social_github: '',
  social_twitter: '',
  social_youtube: '',
  social_telegram: '',
  social_email: '',
  
  // 功能开关
  feature_comments: true,
  feature_search: true,
  feature_like: true,
  feature_share: true,
  feature_registration: true,
  feature_oauth_github: true,
  feature_rss: true,
  
  // 评论设置
  comment_approval_required: false,
  allow_html_comments: false,
  max_comment_length: 1000,
  
  // 页脚配置
  footer_text: '© 2024 All rights reserved',
  footer_links: '{}',
  footer_tech_stack: ['React + TypeScript', 'Cloudflare Workers', 'Tailwind CSS'],
  
  // 系统设置
  posts_per_page: 10,
  max_upload_size_mb: 5
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
  
  // 处理footer_tech_stack的JSON格式
  const processTechStack = (value: any): string[] => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return value ? [value] : [];
      }
    }
    return DEFAULT_CONFIG.footer_tech_stack || [];
  };
  
  // 同步主题配置
  const syncThemeConfig = (config: SiteConfig) => {
    if (config.theme_primary_color || config.theme_default_mode) {
      syncWithTheme(config.theme_primary_color, config.theme_default_mode);
    }
    
    // 同步字体配置
    if (config.theme_font_family || config.theme_font_url) {
      const root = document.documentElement;
      if (config.theme_font_family) {
        root.style.setProperty('--font-family', config.theme_font_family);
        document.body.style.fontFamily = config.theme_font_family;
      }
      
      // 加载自定义字体文件
      if (config.theme_font_url) {
        loadCustomFont(config.theme_font_url);
      }
    }
  };
  
  // 加载自定义字体
  const loadCustomFont = (fontUrl: string): void => {
    if (typeof document === 'undefined') return;
    
    // 检查是否已存在相同的字体链接
    const existingLink = document.querySelector(`link[data-custom-font="${fontUrl}"]`);
    if (existingLink) return;
    
    // 移除旧的自定义字体链接
    const oldLinks = document.querySelectorAll('link[data-custom-font]');
    oldLinks.forEach(link => link.remove());
    
    // 创建新的字体链接
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    link.setAttribute('data-custom-font', fontUrl);
    document.head.appendChild(link);
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
        let apiConfig;
        
        // 根据是否是管理员选择不同的API接口
        if (isAdmin) {
          // 管理员使用管理员接口获取所有配置
          const adminResponse = await api.getAdminConfig();
          if (adminResponse.success && adminResponse.data?.config) {
            // 转换配置格式，从数组转换为对象
            apiConfig = {} as Record<string, any>;
            for (const item of Object.values(adminResponse.data.config)) {
              if (Array.isArray(item)) {
                for (const configItem of item) {
                  if (configItem.key && configItem.value !== undefined) {
                    (apiConfig as Record<string, any>)[configItem.key] = configItem.value;
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
          if (apiConfig.footer_tech_stack) {
            apiConfig.footer_tech_stack = processTechStack(apiConfig.footer_tech_stack);
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
      if (key === 'footer_links' && typeof value === 'object') {
        processedValue = JSON.stringify(value);
      }
      if (key === 'footer_tech_stack' && Array.isArray(value)) {
        processedValue = JSON.stringify(value);
      }
      
      const response = await api.updateConfig(key, processedValue);
      
      if (response.success) {
        // 立即更新本地状态
        setState(prev => {
          let newValue = processedValue;
          if (key === 'footer_links') {
            newValue = processFooterLinks(processedValue);
          } else if (key === 'footer_tech_stack') {
            newValue = processTechStack(processedValue);
          }
          
          const newConfig = { 
            ...(prev.config || DEFAULT_CONFIG), 
            [key]: newValue
          };
          
          // 更新缓存
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
  feature: 'comments' | 'search' | 'like' | 'share'
): boolean {
  const key = `feature_${feature}` as keyof SiteConfig;
  return getConfigValue(key) as boolean;
}

/**
 * 获取社交媒体链接
 */
export function getSocialLink(
  platform: 'github' | 'twitter' | 'youtube' | 'telegram' | 'email'
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

/**
 * 获取技术栈列表
 */
export function getTechStack(): string[] {
  const techStack = getConfigValue('footer_tech_stack');
  if (Array.isArray(techStack)) {
    return techStack;
  }
  if (typeof techStack === 'string') {
    try {
      const parsed = JSON.parse(techStack);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return techStack ? [techStack] : [];
    }
  }
  return DEFAULT_CONFIG.footer_tech_stack || [];
}
