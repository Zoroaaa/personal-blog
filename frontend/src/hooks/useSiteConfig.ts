/**
 * 网站配置Hook (完善版)
 * 
 * 功能:
 * - 从API获取网站配置
 * - 配置缓存管理
 * - 类型安全的配置访问
 * 
 * 修复内容:
 * 1. 更新SiteConfig接口，与数据库完全对应
 * 2. 移除数据库中不存在的字段
 * 3. 优化默认配置值
 * 4. 改进类型定义
 * 
 * @author 完善版本
 * @version 2.2.0
 */

import { useState, useEffect } from 'react';
import { api } from '../utils/api';

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
  footer_links?: Record<string, string> | string; // JSON字符串或对象
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
  site_logo: '/logo.png',
  site_favicon: '/favicon.ico',
  site_description: '一个分享技术和生活的个人博客',
  site_keywords: 'blog,技术,编程',
  site_author: 'Admin',
  
  // 作者信息
  author_name: 'Admin',
  author_avatar: '/default-avatar.png',
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
  storage_public_url: 'https://storage.blog.neutronx.uk',
  
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

// ============= React Hook =============

/**
 * 使用网站配置的Hook
 * 
 * 自动在组件挂载时获取配置
 * 如果缓存有效则使用缓存
 */
export function useSiteConfig() {
  const [state, setState] = useState<ConfigState>({
    config: null,
    loading: true,
    error: null,
    lastFetch: null
  });
  
  // 从localStorage获取缓存
  const getCachedConfig = (): SiteConfig | null => {
    try {
      const cached = localStorage.getItem('site-config');
      const timestamp = localStorage.getItem('site-config-timestamp');
      
      if (cached && timestamp) {
        const parsed = JSON.parse(cached);
        const time = parseInt(timestamp, 10);
        const now = Date.now();
        
        // 缓存有效期5分钟
        if (now - time < 5 * 60 * 1000) {
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
      localStorage.setItem('site-config', JSON.stringify(config));
      localStorage.setItem('site-config-timestamp', Date.now().toString());
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
  
  // 获取配置
  const fetchConfig = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // 获取基本配置
      const configResponse = await api.getConfig();
      
      let config = { ...DEFAULT_CONFIG };
      
      // 合并基本配置
      if (configResponse.success && configResponse.data) {
        const apiConfig = configResponse.data;
        
        // 处理特殊字段
        if (apiConfig.footer_links) {
          apiConfig.footer_links = processFooterLinks(apiConfig.footer_links);
        }
        
        config = { ...config, ...apiConfig };
      }
      
      setCachedConfig(config);
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
    }
  };
  
  // 更新配置 (管理员使用)
  const updateConfig = async (key: string, value: any) => {
    try {
      // 处理footer_links的JSON格式
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
    // 清除缓存
    localStorage.removeItem('site-config');
    localStorage.removeItem('site-config-timestamp');
    
    // 重新获取
    await fetchConfig();
  };
  
  // 组件挂载时自动获取配置
  useEffect(() => {
    // 先尝试使用缓存
    const cachedConfig = getCachedConfig();
    if (cachedConfig) {
      setState({
        config: cachedConfig,
        loading: false,
        error: null,
        lastFetch: Date.now()
      });
      
      // 后台刷新配置
      fetchConfig();
    } else {
      // 缓存无效，从API获取
      fetchConfig();
    }
  }, []);
  
  return {
    config: state.config || DEFAULT_CONFIG, // 始终返回有效配置
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
    const cached = localStorage.getItem('site-config');
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