/**
 * 网站配置页 schema
 *
 * 定义配置分组结构、字段类型、校验函数与全部配置项（与数据库对应）。
 */

export interface ConfigGroup {
  title: string;
  description?: string;
  icon?: string;
  items: ConfigItem[];
}

export interface ConfigItem {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'color' | 'email' | 'url' | 'json' | 'select' | 'textarea' | 'techstack';
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
  validation?: (value: any) => string | null;
  preview?: boolean;
}

// 验证函数
export const validateEmail = (email: string): string | null => {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? null : '邮箱格式不正确';
};

export const validateUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    new URL(url);
    return null;
  } catch {
    return 'URL格式不正确(需包含http://或https://)';
  }
};

export const validateJson = (json: string): string | null => {
  if (!json) return null;
  try {
    JSON.parse(json);
    return null;
  } catch {
    return 'JSON格式不正确';
  }
};

export const validateHexColor = (color: string): string | null => {
  if (!color) return null;
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color) ? null : '颜色格式不正确(如: #3B82F6)';
};

// 配置分组 - 完全对应数据库
export const configGroups: ConfigGroup[] = [
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
        type: 'textarea',
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
    title: 'SEO配置',
    description: '搜索引擎优化相关设置',
    icon: '🔍',
    items: [
      {
        key: 'site_og_image',
        label: 'Open Graph 图片',
        type: 'url',
        description: '社交媒体分享时显示的图片URL (建议尺寸: 1200x630)',
        placeholder: 'https://example.com/og-image.png',
        validation: validateUrl
      },
      {
        key: 'site_twitter_card',
        label: 'Twitter 卡片类型',
        type: 'select',
        description: 'Twitter分享时的卡片样式',
        options: [
          { label: '大图片', value: 'summary_large_image' },
          { label: '小图片', value: 'summary' },
          { label: '应用', value: 'app' },
          { label: '播放器', value: 'player' }
        ]
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
        type: 'select',
        description: '选择网站使用的字体。如需使用自定义字体，请先选择"自定义字体"，然后在下方填写字体文件URL',
        options: [
          { label: '系统默认字体', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
          { label: '思源黑体 (Noto Sans SC)', value: '"Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif' },
          { label: '微软雅黑', value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
          { label: '宋体', value: 'SimSun, "Songti SC", serif' },
          { label: '自定义字体', value: 'custom' }
        ]
      },
      {
        key: 'theme_font_url',
        label: '自定义字体文件URL',
        type: 'url',
        description: '当字体族选择"自定义字体"时，需要填写字体文件URL。支持woff2/woff/ttf格式。推荐从 Google Fonts 或阿里巴巴普惠体获取字体链接',
        placeholder: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap',
        validation: validateUrl
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
        key: 'social_youtube',
        label: 'YouTube',
        type: 'url',
        description: 'YouTube频道链接',
        placeholder: 'https://youtube.com/@username',
        validation: validateUrl
      },
      {
        key: 'social_telegram',
        label: 'Telegram',
        type: 'url',
        description: 'Telegram频道或群组链接',
        placeholder: 'https://t.me/username',
        validation: validateUrl
      },
      {
        key: 'social_email',
        label: '联系邮箱',
        type: 'email',
        description: '公开的联系邮箱地址',
        placeholder: 'contact@example.com',
        validation: validateEmail
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
        key: 'feature_registration',
        label: '启用用户注册',
        type: 'boolean',
        description: '允许新用户注册账户'
      },
      {
        key: 'feature_oauth_github',
        label: '启用GitHub登录',
        type: 'boolean',
        description: '允许使用GitHub账号登录'
      },
      {
        key: 'feature_rss',
        label: '启用RSS订阅 (实现中)',
        type: 'boolean',
        description: '提供RSS订阅功能 (此功能正在开发中，暂不可用)'
      },
      {
        key: 'comment_approval_required',
        label: '评论需要审核',
        type: 'boolean',
        description: '新评论需要管理员审核后才能显示'
      },
      {
        key: 'allow_html_comments',
        label: '允许HTML评论 (实现中)',
        type: 'boolean',
        description: '允许在评论中使用HTML标签 (此功能正在开发中，暂不可用)'
      },
      {
        key: 'max_comment_length',
        label: '评论最大长度',
        type: 'number',
        description: '单条评论的最大字符数',
        min: 100,
        max: 5000,
        placeholder: '1000'
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
        description: '显示在页脚的版权信息，留空则使用默认格式',
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
        key: 'footer_tech_stack',
        label: '技术栈',
        type: 'techstack',
        description: '页脚展示的技术栈列表'
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
        key: 'upload_max_image_size_mb',
        label: '图片上传大小限制 (MB)',
        type: 'number',
        description: '允许上传的最大图片文件大小，单位为 MB。建议范围：1-50MB',
        min: 1,
        max: 50,
        placeholder: '5'
      },
      {
        key: 'upload_max_file_size_mb',
        label: '附件上传大小限制 (MB)',
        type: 'number',
        description: '允许上传的最大附件文件大小，单位为 MB。建议范围：1-100MB',
        min: 1,
        max: 100,
        placeholder: '10'
      }
    ]
  }
];

/**
 * 查找配置项
 */
export function findConfigItem(key: string): ConfigItem | undefined {
  for (const group of configGroups) {
    const item = group.items.find(i => i.key === key);
    if (item) return item;
  }
  return undefined;
}

/**
 * 验证配置项
 */
export function validateConfigItem(item: ConfigItem, value: any): string | null {
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
}