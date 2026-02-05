/**
 * 管理员配置页面 (完善版)
 * 
 * 功能:
 * - 管理网站配置项
 * - 实时预览配置效果
 * - 批量更新配置
 * - 支持所有数据库配置项
 * 
 * 修复内容:
 * 1. 补充所有缺失的配置项
 * 2. 添加配置验证
 * 3. 优化JSON配置项编辑
 * 4. 添加批量保存功能
 * 5. 改进错误处理
 * 
 * @author 完善版本
 * @version 2.2.0
 */

import React, { useState, useEffect } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface ConfigGroup {
  title: string;
  description?: string;
  items: ConfigItem[];
}

interface ConfigItem {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'color' | 'email' | 'url' | 'json';
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  validation?: (value: any) => string | null; // 返回错误信息或null
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
    return 'URL格式不正确';
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

const configGroups: ConfigGroup[] = [
  {
    title: '基本设置',
    description: '网站的基本信息配置',
    items: [
      {
        key: 'site_name',
        label: '网站名称',
        type: 'text',
        description: '网站的显示名称',
        placeholder: '我的博客'
      },
      {
        key: 'site_subtitle',
        label: '网站副标题',
        type: 'text',
        description: '网站的副标题或描述',
        placeholder: '分享技术与生活'
      },
      {
        key: 'site_logo',
        label: '网站Logo',
        type: 'url',
        description: 'Logo图片的URL',
        placeholder: '/logo.png',
        validation: validateUrl
      },
      {
        key: 'site_favicon',
        label: '网站图标',
        type: 'url',
        description: 'Favicon图片的URL',
        placeholder: '/favicon.ico',
        validation: validateUrl
      },
      {
        key: 'site_description',
        label: '网站描述',
        type: 'text',
        description: '用于SEO的网站描述',
        placeholder: '一个分享技术和生活的个人博客'
      },
      {
        key: 'site_keywords',
        label: '网站关键词',
        type: 'text',
        description: '用于SEO的关键词，用逗号分隔',
        placeholder: 'blog,技术,编程'
      },
      {
        key: 'site_author',
        label: '网站作者',
        type: 'text',
        description: '网站作者名称(用于SEO)',
        placeholder: 'Admin'
      }
    ]
  },
  {
    title: '作者信息',
    description: '网站作者的个人信息',
    items: [
      {
        key: 'author_name',
        label: '作者名称',
        type: 'text',
        description: '显示的作者名称',
        placeholder: 'Admin'
      },
      {
        key: 'author_avatar',
        label: '作者头像',
        type: 'url',
        description: '头像图片的URL',
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
    description: '网站的主题和外观设置',
    items: [
      {
        key: 'theme_primary_color',
        label: '主色调',
        type: 'color',
        description: '网站的主要颜色',
        validation: validateHexColor
      },
      {
        key: 'theme_default_mode',
        label: '默认主题模式',
        type: 'text',
        description: '默认的主题模式 (light, dark, system)',
        placeholder: 'system'
      },
      {
        key: 'theme_font_family',
        label: '字体族',
        type: 'text',
        description: '网站使用的字体',
        placeholder: 'system-ui, -apple-system, sans-serif'
      },
      {
        key: 'theme_enable_animations',
        label: '启用动画效果',
        type: 'boolean',
        description: '是否启用页面过渡动画'
      }
    ]
  },
  {
    title: '社交媒体',
    description: '社交媒体链接配置',
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
        description: '公开的联系邮箱',
        placeholder: 'contact@example.com',
        validation: validateEmail
      },
      {
        key: 'social_wechat_qr',
        label: '微信二维码',
        type: 'url',
        description: '微信二维码图片URL',
        placeholder: '/wechat-qr.png',
        validation: validateUrl
      }
    ]
  },
  {
    title: '功能设置',
    description: '网站功能的开关设置',
    items: [
      {
        key: 'feature_comments',
        label: '启用评论',
        type: 'boolean',
        description: '是否启用文章评论功能'
      },
      {
        key: 'feature_search',
        label: '启用搜索',
        type: 'boolean',
        description: '是否启用网站搜索功能'
      },
      {
        key: 'feature_like',
        label: '启用点赞',
        type: 'boolean',
        description: '是否启用文章点赞功能'
      },
      {
        key: 'feature_share',
        label: '启用分享',
        type: 'boolean',
        description: '是否启用文章分享功能'
      },
      {
        key: 'feature_rss',
        label: '启用RSS',
        type: 'boolean',
        description: '是否启用RSS订阅功能'
      },
      {
        key: 'feature_analytics',
        label: '启用访问统计',
        type: 'boolean',
        description: '是否启用访问数据统计'
      },
      {
        key: 'feature_newsletter',
        label: '启用邮件订阅',
        type: 'boolean',
        description: '是否启用邮件订阅功能'
      },
      {
        key: 'comment_approval_required',
        label: '评论需要审核',
        type: 'boolean',
        description: '新评论是否需要审核后才能显示'
      }
    ]
  },
  {
    title: '页脚配置',
    description: '网站页脚相关设置',
    items: [
      {
        key: 'footer_text',
        label: '页脚文本',
        type: 'text',
        description: '网站底部显示的版权文本',
        placeholder: '© 2024 All rights reserved'
      },
      {
        key: 'footer_links',
        label: '页脚链接',
        type: 'json',
        description: '页脚链接配置(JSON格式)',
        placeholder: '{"友情链接": "https://example.com"}',
        validation: validateJson
      },
      {
        key: 'footer_show_powered_by',
        label: '显示技术支持',
        type: 'boolean',
        description: '是否在页脚显示技术支持信息'
      }
    ]
  },
  {
    title: '系统设置',
    description: '系统级别的配置项',
    items: [
      {
        key: 'posts_per_page',
        label: '每页文章数量',
        type: 'number',
        description: '列表页每页显示的文章数量',
        min: 1,
        max: 50
      },
      {
        key: 'max_upload_size_mb',
        label: '最大上传文件大小',
        type: 'number',
        description: '文件上传的最大大小限制(MB)',
        min: 1,
        max: 100
      },
      {
        key: 'enable_maintenance_mode',
        label: '维护模式',
        type: 'boolean',
        description: '开启后网站将显示维护页面'
      }
    ]
  }
];

export function ConfigPage() {
  const { config, updateConfig, loading: configLoading, refreshConfig } = useSiteConfig();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config);
  const [updating, setUpdating] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // 检查权限
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // 同步config到localConfig
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleInputChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
    
    // 清除该字段的错误信息
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateConfigItem = (item: ConfigItem, value: any): string | null => {
    // 空值检查
    if (item.type === 'text' && !value) {
      return null; // 允许为空
    }
    
    // 数字验证
    if (item.type === 'number') {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) {
        return '请输入有效的数字';
      }
      if (item.min !== undefined && num < item.min) {
        return `最小值为 ${item.min}`;
      }
      if (item.max !== undefined && num > item.max) {
        return `最大值为 ${item.max}`;
      }
    }
    
    // 自定义验证
    if (item.validation && value) {
      return item.validation(value);
    }
    
    return null;
  };

  const handleSave = async (key: string, value: any) => {
    // 查找配置项定义
    let configItem: ConfigItem | undefined;
    for (const group of configGroups) {
      configItem = group.items.find(i => i.key === key);
      if (configItem) break;
    }

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
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('更新配置失败:', error);
      alert('更新配置失败，请重试');
    } finally {
      setUpdating(null);
    }
  };

  const handleBatchSave = async () => {
    // 验证所有更改的配置项
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
      // 这里需要调用批量更新API
      // await api.batchUpdateConfig(changedConfigs);
      
      // 临时方案：逐个更新
      for (const [key, value] of Object.entries(changedConfigs)) {
        await updateConfig(key, value);
      }
      
      setSuccessMessage(`成功更新 ${Object.keys(changedConfigs).length} 项配置`);
      setHasChanges(false);
      
      // 刷新配置
      await refreshConfig();
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('批量更新配置失败:', error);
      alert('批量更新失败，请重试');
    } finally {
      setUpdating(null);
    }
  };

  const handleReset = () => {
    if (confirm('确定要放弃所有未保存的更改吗?')) {
      setLocalConfig(config);
      setHasChanges(false);
      setErrors({});
    }
  };

  const getConfigLabel = (key: string): string => {
    for (const group of configGroups) {
      const item = group.items.find(i => i.key === key);
      if (item) return item.label;
    }
    return key;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">网站配置</h1>
          <p className="text-muted-foreground">管理网站的各项配置信息</p>
        </div>
        
        {hasChanges && (
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              disabled={updating !== null}
            >
              放弃更改
            </button>
            <button
              onClick={handleBatchSave}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              disabled={updating !== null}
            >
              {updating === 'batch' ? '保存中...' : '保存所有更改'}
            </button>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="mb-6 px-4 py-3 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
          ✓ {successMessage}
        </div>
      )}

      {configLoading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载配置中...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {configGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2">{group.title}</h2>
              {group.description && (
                <p className="text-muted-foreground mb-4">{group.description}</p>
              )}
              
              <div className="space-y-4">
                {group.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <label className="font-medium">{item.label}</label>
                      {updating === item.key ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                          <span className="text-sm text-muted-foreground">保存中...</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSave(item.key, localConfig[item.key])}
                          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                          disabled={updating !== null || !localConfig[item.key] && !config[item.key]}
                        >
                          保存
                        </button>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      {(item.type === 'text' || item.type === 'url' || item.type === 'email') && (
                        <input
                          type={item.type === 'email' ? 'email' : item.type === 'url' ? 'url' : 'text'}
                          value={localConfig[item.key] || ''}
                          onChange={(e) => handleInputChange(item.key, e.target.value)}
                          placeholder={item.placeholder}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                            errors[item.key] ? 'border-red-500' : 'border-border'
                          }`}
                        />
                      )}
                      
                      {item.type === 'json' && (
                        <textarea
                          value={localConfig[item.key] || ''}
                          onChange={(e) => handleInputChange(item.key, e.target.value)}
                          placeholder={item.placeholder}
                          rows={4}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm ${
                            errors[item.key] ? 'border-red-500' : 'border-border'
                          }`}
                        />
                      )}
                      
                      {item.type === 'number' && (
                        <input
                          type="number"
                          value={localConfig[item.key] || 0}
                          onChange={(e) => handleInputChange(item.key, parseInt(e.target.value) || 0)}
                          placeholder={item.placeholder}
                          min={item.min}
                          max={item.max}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                            errors[item.key] ? 'border-red-500' : 'border-border'
                          }`}
                        />
                      )}
                      
                      {item.type === 'boolean' && (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={localConfig[item.key] || false}
                            onChange={(e) => handleInputChange(item.key, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="ml-2 text-sm text-muted-foreground">
                            {localConfig[item.key] ? '启用' : '禁用'}
                          </span>
                        </div>
                      )}
                      
                      {item.type === 'color' && (
                        <div className="flex items-center space-x-4">
                          <input
                            type="color"
                            value={localConfig[item.key] || '#3B82F6'}
                            onChange={(e) => handleInputChange(item.key, e.target.value)}
                            className="h-10 w-16 rounded border border-border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={localConfig[item.key] || '#3B82F6'}
                            onChange={(e) => handleInputChange(item.key, e.target.value)}
                            placeholder="#3B82F6"
                            className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                              errors[item.key] ? 'border-red-500' : 'border-border'
                            }`}
                          />
                        </div>
                      )}

                      {errors[item.key] && (
                        <p className="text-sm text-red-600">{errors[item.key]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConfigPage;