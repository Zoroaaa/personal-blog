/**
 * 管理员配置页面
 * 
 * 功能:
 * - 管理网站配置项
 * - 实时预览配置效果
 * - 批量更新配置
 * 
 * @author 优化版本
 * @version 2.1.0
 */

import React, { useState } from 'react';
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
  type: 'text' | 'number' | 'boolean' | 'color';
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

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
        type: 'text',
        description: 'Logo图片的URL',
        placeholder: '/logo.png'
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
        type: 'text',
        description: '头像图片的URL',
        placeholder: '/default-avatar.png'
      },
      {
        key: 'author_bio',
        label: '作者简介',
        type: 'text',
        description: '作者的简短介绍',
        placeholder: '热爱技术的开发者'
      }
    ]
  },
  {
    title: '主题配置',
    description: '网站的主题设置',
    items: [
      {
        key: 'theme_primary_color',
        label: '主色调',
        type: 'color',
        description: '网站的主要颜色'
      },
      {
        key: 'theme_default_mode',
        label: '默认主题模式',
        type: 'text',
        description: '默认的主题模式 (light, dark, system)',
        placeholder: 'system'
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
        type: 'text',
        description: 'GitHub个人主页链接',
        placeholder: 'https://github.com/username'
      },
      {
        key: 'social_twitter',
        label: 'Twitter',
        type: 'text',
        description: 'Twitter个人主页链接',
        placeholder: 'https://twitter.com/username'
      },
      {
        key: 'social_email',
        label: '邮箱',
        type: 'text',
        description: '联系邮箱',
        placeholder: 'you@example.com'
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
      }
    ]
  },
  {
    title: '其他设置',
    description: '其他网站配置项',
    items: [
      {
        key: 'posts_per_page',
        label: '每页文章数量',
        type: 'number',
        description: '每页显示的文章数量',
        min: 1,
        max: 50
      },
      {
        key: 'footer_text',
        label: '页脚文本',
        type: 'text',
        description: '网站底部显示的文本',
        placeholder: '© 2024 All rights reserved'
      },
      {
        key: 'footer_show_powered_by',
        label: '显示技术支持',
        type: 'boolean',
        description: '是否在页脚显示技术支持信息'
      }
    ]
  }
];

export function ConfigPage() {
  const { config, updateConfig, loading: configLoading } = useSiteConfig();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config);
  const [updating, setUpdating] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 检查权限
  React.useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const handleInputChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (key: string, value: any) => {
    try {
      setUpdating(key);
      await updateConfig(key, value);
      setSuccessMessage(`成功更新 ${getConfigLabel(key)}`);
      
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
      </div>

      {successMessage && (
        <div className="mb-6 px-4 py-3 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
          {successMessage}
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <label className="font-medium">{item.label}</label>
                      {updating === item.key ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                      ) : (
                        <button
                          onClick={() => handleSave(item.key, localConfig[item.key])}
                          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                        >
                          保存
                        </button>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      {item.type === 'text' && (
                        <input
                          type="text"
                          value={localConfig[item.key] || ''}
                          onChange={(e) => handleInputChange(item.key, e.target.value)}
                          placeholder={item.placeholder}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                            className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
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