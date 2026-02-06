/**
 * 管理员配置页面 (完全修复版)
 * 
 * 功能:
 * - 管理网站配置项
 * - 与数据库完全对应
 * - 实时预览配置效果
 * - 主题配置联动
 * - 批量更新配置
 * - 暗色模式完美兼容
 * 
 * 修复内容:
 * 1. 所有配置项与数据库完全对应
 * 2. 主题配置与themeStore联动
 * 3. 暗色模式样式完全兼容
 * 4. UI美观度优化
 * 5. 添加实时预览功能
 * 
 * @version 3.0.0
 */

import React, { useState, useEffect } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../stores/themeStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

interface ConfigGroup {
  title: string;
  description?: string;
  icon?: string;
  items: ConfigItem[];
}

interface ConfigItem {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'color' | 'email' | 'url' | 'json' | 'select';
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
  validation?: (value: any) => string | null;
  preview?: boolean; // 是否支持实时预览
}

// 验证函数
const validateEmail = (email: string): string | null => {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? null : '邮箱格式不正确';
};

const validateUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    new URL(url);
    return null;
  } catch {
    return 'URL格式不正确(需包含http://或https://)';
  }
};

const validateJson = (json: string): string | null => {
  if (!json) return null;
  try {
    JSON.parse(json);
    return null;
  } catch {
    return 'JSON格式不正确';
  }
};

const validateHexColor = (color: string): string | null => {
  if (!color) return null;
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color) ? null : '颜色格式不正确(如: #3B82F6)';
};

// 配置分组 - 完全对应数据库
const configGroups: ConfigGroup[] = [
  {
    title: '基本设置',
    description: '网站的基本信息配置',
    icon: '⚙️',
    items: [
      {
        key: 'site_name',
        label: '网站名称',
        type: 'text',
        description: '网站的显示名称',
        placeholder: '我的博客',
        preview: true
      },
      {
        key: 'site_subtitle',
        label: '网站副标题',
        type: 'text',
        description: '网站的副标题或标语',
        placeholder: '分享技术与生活'
      },
      {
        key: 'site_logo',
        label: '网站Logo URL',
        type: 'url',
        description: 'Logo图片的URL地址',
        placeholder: '/logo.png',
        validation: validateUrl
      },
      {
        key: 'site_favicon',
        label: '网站图标 URL',
        type: 'url',
        description: 'Favicon图片的URL地址',
        placeholder: '/favicon.ico',
        validation: validateUrl
      },
      {
        key: 'site_description',
        label: '网站描述 (SEO)',
        type: 'text',
        description: '用于搜索引擎优化的网站描述',
        placeholder: '一个分享技术和生活的个人博客'
      },
      {
        key: 'site_keywords',
        label: '网站关键词 (SEO)',
        type: 'text',
        description: '用于SEO的关键词,用逗号分隔',
        placeholder: 'blog,技术,编程,生活'
      },
      {
        key: 'site_author',
        label: '网站作者',
        type: 'text',
        description: '网站作者名称(用于SEO元数据)',
        placeholder: 'Admin'
      }
    ]
  },
  {
    title: '作者信息',
    description: '网站作者的个人信息展示',
    icon: '👤',
    items: [
      {
        key: 'author_name',
        label: '作者名称',
        type: 'text',
        description: '显示在博客中的作者名称',
        placeholder: 'Admin'
      },
      {
        key: 'author_avatar',
        label: '作者头像 URL',
        type: 'url',
        description: '作者头像图片的URL地址',
        placeholder: '/default-avatar.png',
        validation: validateUrl
      },
      {
        key: 'author_bio',
        label: '作者简介',
        type: 'text',
        description: '作者的简短介绍',
        placeholder: '热爱技术的开发者'
      },
      {
        key: 'author_email',
        label: '作者邮箱',
        type: 'email',
        description: '作者联系邮箱',
        placeholder: 'author@example.com',
        validation: validateEmail
      }
    ]
  },
  {
    title: '主题配置',
    description: '网站的主题和外观设置 (会同步到前端主题)',
    icon: '🎨',
    items: [
      {
        key: 'theme_primary_color',
        label: '主色调',
        type: 'color',
        description: '网站的主要品牌颜色,会实时应用到整个网站',
        validation: validateHexColor,
        preview: true
      },
      {
        key: 'theme_default_mode',
        label: '默认主题模式',
        type: 'select',
        description: '新访客默认看到的主题模式',
        options: [
          { label: '亮色模式', value: 'light' },
          { label: '暗色模式', value: 'dark' },
          { label: '跟随系统', value: 'system' }
        ],
        preview: true
      },
      {
        key: 'theme_font_family',
        label: '字体族',
        type: 'text',
        description: '网站使用的字体,支持系统字体和Web字体',
        placeholder: 'system-ui, -apple-system, sans-serif'
      },
      {
        key: 'theme_enable_animations',
        label: '启用动画效果',
        type: 'boolean',
        description: '是否启用页面过渡和交互动画'
      }
    ]
  },
  {
    title: '社交媒体',
    description: '社交媒体链接配置',
    icon: '🔗',
    items: [
      {
        key: 'social_github',
        label: 'GitHub',
        type: 'url',
        description: 'GitHub个人主页链接',
        placeholder: 'https://github.com/username',
        validation: validateUrl
      },
      {
        key: 'social_twitter',
        label: 'Twitter',
        type: 'url',
        description: 'Twitter个人主页链接',
        placeholder: 'https://twitter.com/username',
        validation: validateUrl
      },
      {
        key: 'social_linkedin',
        label: 'LinkedIn',
        type: 'url',
        description: 'LinkedIn个人主页链接',
        placeholder: 'https://linkedin.com/in/username',
        validation: validateUrl
      },
      {
        key: 'social_weibo',
        label: '微博',
        type: 'url',
        description: '微博个人主页链接',
        placeholder: 'https://weibo.com/username',
        validation: validateUrl
      },
      {
        key: 'social_email',
        label: '联系邮箱',
        type: 'email',
        description: '公开的联系邮箱地址',
        placeholder: 'contact@example.com',
        validation: validateEmail
      },
      {
        key: 'social_wechat_qr',
        label: '微信二维码 URL',
        type: 'url',
        description: '微信二维码图片的URL地址',
        placeholder: '/wechat-qr.png',
        validation: validateUrl
      }
    ]
  },
  {
    title: '功能设置',
    description: '网站功能的开关控制',
    icon: '🔧',
    items: [
      {
        key: 'feature_comments',
        label: '启用评论功能',
        type: 'boolean',
        description: '允许用户对文章发表评论'
      },
      {
        key: 'feature_search',
        label: '启用搜索功能',
        type: 'boolean',
        description: '启用全站搜索功能'
      },
      {
        key: 'feature_like',
        label: '启用点赞功能',
        type: 'boolean',
        description: '允许用户对文章和评论点赞'
      },
      {
        key: 'feature_share',
        label: '启用分享功能',
        type: 'boolean',
        description: '显示社交媒体分享按钮'
      },
      {
        key: 'feature_rss',
        label: '启用RSS订阅',
        type: 'boolean',
        description: '提供RSS订阅功能'
      },
      {
        key: 'feature_analytics',
        label: '启用访问统计',
        type: 'boolean',
        description: '统计网站访问数据'
      },
      {
        key: 'feature_newsletter',
        label: '启用邮件订阅',
        type: 'boolean',
        description: '允许用户订阅邮件通知'
      },
      {
        key: 'comment_approval_required',
        label: '评论需要审核',
        type: 'boolean',
        description: '新评论需要管理员审核后才能显示'
      }
    ]
  },
  {
    title: '页脚配置',
    description: '网站页脚相关设置',
    icon: '📄',
    items: [
      {
        key: 'footer_text',
        label: '页脚版权文字',
        type: 'text',
        description: '显示在页脚的版权信息',
        placeholder: '© 2024 我的博客. All rights reserved.'
      },
      {
        key: 'footer_links',
        label: '页脚链接 (JSON)',
        type: 'json',
        description: 'JSON格式的链接对象,如: {"友情链接": "https://example.com"}',
        placeholder: '{"友情链接": "https://example.com"}',
        validation: validateJson
      },
      {
        key: 'footer_show_powered_by',
        label: '显示"Powered by"',
        type: 'boolean',
        description: '在页脚显示技术支持信息'
      }
    ]
  },
  {
    title: '系统设置',
    description: '系统级别的配置',
    icon: '⚡',
    items: [
      {
        key: 'posts_per_page',
        label: '每页文章数',
        type: 'number',
        description: '列表页每页显示的文章数量',
        min: 5,
        max: 50,
        placeholder: '10'
      },
      {
        key: 'max_upload_size_mb',
        label: '最大上传文件大小(MB)',
        type: 'number',
        description: '允许上传的最大文件大小',
        min: 1,
        max: 100,
        placeholder: '5'
      },
      {
        key: 'enable_maintenance_mode',
        label: '维护模式',
        type: 'boolean',
        description: '启用后网站将显示维护页面(管理员仍可访问)'
      }
    ]
  }
];

function ConfigPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { config, loading: configLoading, updateConfig, refreshConfig } = useSiteConfig();
  const { setPrimaryColor, setThemeMode, config: themeConfig } = useTheme();
  
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // 验证权限
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  // 初始化本地配置
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // 处理输入变化
  const handleInputChange = (key: string, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    // 清除该字段的错误
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
    
    // 实时预览主题配置
    const item = findConfigItem(key);
    if (item?.preview) {
      if (key === 'theme_primary_color') {
        setPrimaryColor(value);
      } else if (key === 'theme_default_mode') {
        setThemeMode(value);
      }
    }
  };

  // 查找配置项
  const findConfigItem = (key: string): ConfigItem | undefined => {
    for (const group of configGroups) {
      const item = group.items.find(i => i.key === key);
      if (item) return item;
    }
    return undefined;
  };

  // 验证配置项
  const validateConfigItem = (item: ConfigItem, value: any): string | null => {
    if (item.validation) {
      return item.validation(value);
    }
    
    if (item.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) return '必须是数字';
      if (item.min !== undefined && num < item.min) return `最小值为 ${item.min}`;
      if (item.max !== undefined && num > item.max) return `最大值为 ${item.max}`;
    }
    
    return null;
  };

  // 保存单个配置
  const handleSave = async (key: string, value: any) => {
    const configItem = findConfigItem(key);
    if (!configItem) {
      alert('配置项不存在');
      return;
    }

    // 验证
    const validationError = validateConfigItem(configItem, value);
    if (validationError) {
      setErrors(prev => ({ ...prev, [key]: validationError }));
      return;
    }

    try {
      setUpdating(key);
      await updateConfig(key, value);
      setSuccessMessage(`成功更新 ${configItem.label}`);
      setHasChanges(false);
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('更新配置失败:', error);
      alert('更新配置失败,请重试');
    } finally {
      setUpdating(null);
    }
  };

  // 批量保存
  const handleBatchSave = async () => {
    // 验证所有更改
    const validationErrors: Record<string, string> = {};
    
    for (const group of configGroups) {
      for (const item of group.items) {
        if (localConfig[item.key] !== config[item.key]) {
          const error = validateConfigItem(item, localConfig[item.key]);
          if (error) {
            validationErrors[item.key] = error;
          }
        }
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      alert('请修正表单中的错误后再保存');
      return;
    }

    // 准备要更新的配置
    const changedConfigs: Record<string, any> = {};
    for (const key in localConfig) {
      if (localConfig[key] !== config[key]) {
        changedConfigs[key] = localConfig[key];
      }
    }

    if (Object.keys(changedConfigs).length === 0) {
      alert('没有需要保存的更改');
      return;
    }

    try {
      setUpdating('batch');
      const response = await api.batchUpdateConfig(changedConfigs);
      
      setSuccessMessage(`成功更新 ${response.data?.updated || 0} 项配置`);
      setHasChanges(false);
      
      await refreshConfig();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('批量更新配置失败:', error);
      alert('批量更新失败,请重试');
    } finally {
      setUpdating(null);
    }
  };

  // 重置更改
  const handleReset = () => {
    if (confirm('确定要放弃所有未保存的更改吗?')) {
      setLocalConfig(config);
      setHasChanges(false);
      setErrors({});
      
      // 重置主题预览
      if (config.theme_primary_color) {
        setPrimaryColor(config.theme_primary_color);
      }
      if (config.theme_default_mode) {
        setThemeMode(config.theme_default_mode);
      }
    }
  };

  // 渲染配置输入
  const renderConfigInput = (item: ConfigItem) => {
    const value = localConfig[item.key];
    const error = errors[item.key];

    switch (item.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleInputChange(item.key, !value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-muted-foreground">
              {value ? '已启用' : '已禁用'}
            </span>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleInputChange(item.key, e.target.value)}
            min={item.min}
            max={item.max}
            placeholder={item.placeholder}
            className={`input ${error ? 'border-red-500 dark:border-red-500' : ''}`}
          />
        );

      case 'color':
        return (
          <div className="flex items-center space-x-4">
            <input
              type="color"
              value={value || '#3B82F6'}
              onChange={(e) => handleInputChange(item.key, e.target.value)}
              className="h-12 w-20 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={value || '#3B82F6'}
              onChange={(e) => handleInputChange(item.key, e.target.value)}
              placeholder="#3B82F6"
              className={`input flex-1 ${error ? 'border-red-500 dark:border-red-500' : ''}`}
            />
          </div>
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleInputChange(item.key, e.target.value)}
            className={`input ${error ? 'border-red-500 dark:border-red-500' : ''}`}
          >
            {item.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => handleInputChange(item.key, e.target.value)}
            placeholder={item.placeholder}
            rows={4}
            className={`input font-mono text-sm ${error ? 'border-red-500 dark:border-red-500' : ''}`}
          />
        );

      default:
        return (
          <input
            type={item.type === 'email' ? 'email' : item.type === 'url' ? 'url' : 'text'}
            value={value || ''}
            onChange={(e) => handleInputChange(item.key, e.target.value)}
            placeholder={item.placeholder}
            className={`input ${error ? 'border-red-500 dark:border-red-500' : ''}`}
          />
        );
    }
  };

  if (configLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">加载配置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">网站配置</h1>
          <p className="text-muted-foreground">管理网站的各项配置信息</p>
        </div>
        
        {hasChanges && (
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="btn btn-outline px-4 py-2"
              disabled={updating !== null}
            >
              放弃更改
            </button>
            <button
              onClick={handleBatchSave}
              className="btn btn-primary px-4 py-2"
              disabled={updating !== null}
            >
              {updating === 'batch' ? '保存中...' : '保存所有更改'}
            </button>
          </div>
        )}
      </div>

      {/* 成功消息 */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* 标签页导航 */}
      <div className="mb-6 border-b border-border">
        <div className="flex flex-wrap gap-2">
          {configGroups.map((group, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === index
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="mr-2">{group.icon}</span>
              {group.title}
            </button>
          ))}
        </div>
      </div>

      {/* 配置内容 */}
      <div className="space-y-6">
        {configGroups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className={`card p-6 ${activeTab === groupIndex ? 'block' : 'hidden'}`}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">{group.title}</h2>
              {group.description && (
                <p className="text-muted-foreground">{group.description}</p>
              )}
            </div>
            
            <div className="space-y-6">
              {group.items.map((item, itemIndex) => (
                <div key={itemIndex} className="border-b border-border pb-6 last:border-0 last:pb-0">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <label className="font-medium text-foreground flex items-center gap-2">
                        {item.label}
                        {item.preview && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            实时预览
                          </span>
                        )}
                      </label>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </div>
                    
                    {!item.preview && (
                      <button
                        onClick={() => handleSave(item.key, localConfig[item.key])}
                        className="btn btn-primary px-4 py-2 shrink-0"
                        disabled={updating === item.key || updating === 'batch'}
                      >
                        {updating === item.key ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            保存中...
                          </span>
                        ) : (
                          '保存'
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {renderConfigInput(item)}
                    {errors[item.key] && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors[item.key]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConfigPage;
