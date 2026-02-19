/**
 * 应用全局常量配置
 *
 * 本文件集中管理博客系统后端所有魔术数字和配置常量，提供以下优势：
 * 1. 统一管理：所有配置集中在一处，便于查找和修改
 * 2. 类型安全：使用 as const 确保类型推断准确
 * 3. 可维护性：修改配置只需改一处，自动影响全局
 * 4. 可读性：通过语义化命名和注释提高代码可读性
 *
 * 使用建议：
 * - 导入时按需解构：import { POST_CONSTANTS } from '../config/constants'
 * - 避免在代码中直接使用魔术数字，应引用常量
 * - 新增常量时应添加清晰的注释说明用途
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

/**
 * 认证相关常量
 *
 * 用于用户身份验证、密码加密、Token管理等认证流程
 * 涉及文件：authService.ts, auth.ts, middleware/auth.ts
 */
export const AUTH_CONSTANTS = {
  /**
   * bcrypt 密码加密轮次
   * 值越高安全性越高，但计算时间也越长
   * 推荐值：10-12，生产环境建议 12
   * 注意：修改此值会影响新注册用户和修改密码的用户
   */
  BCRYPT_ROUNDS: 12,

  /**
   * 邮箱验证码有效期（秒）
   * 用户收到验证码后需要在此时长内完成验证
   * 默认 10 分钟，平衡安全性和用户体验
   */
  VERIFICATION_CODE_TTL: 600,

  /**
   * 验证码长度（位数）
   * 6 位数字验证码，提供约 100 万种组合
   */
  VERIFICATION_CODE_LENGTH: 6,

  /**
   * 邮箱验证码发送速率限制 - 时间窗口（秒）
   * 用于防止验证码接口被滥用
   */
  EMAIL_VERIFY_RATE_WINDOW: 3600,

  /**
   * 邮箱验证码发送速率限制 - 最大次数
   * 1 小时内同一邮箱最多发送 10 次验证码
   */
  EMAIL_VERIFY_RATE_MAX: 10,

  /**
   * JWT Access Token 有效期（秒）
   * 用于 API 请求的身份验证
   * 2 小时有效期，平衡安全性和用户体验
   * 过期后需要使用 Refresh Token 获取新的 Access Token
   */
  JWT_ACCESS_TOKEN_EXPIRY: 2 * 60 * 60,

  /**
   * JWT Refresh Token 有效期（秒）
   * 用于刷新 Access Token
   * 7 天有效期，用户可选择"记住我"延长此时间
   */
  JWT_REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60,

  /**
   * Token 黑名单 TTL（秒）
   * 用于用户登出时使 Token 失效
   * 应与 Refresh Token 有效期一致，确保登出的 Token 无法再次使用
   */
  TOKEN_BLACKLIST_TTL: 7 * 24 * 60 * 60,
};

/**
 * 文章相关常量
 *
 * 用于文章的创建、编辑、查询、分页等功能
 * 涉及文件：postService.ts, posts.ts
 */
export const POST_CONSTANTS = {
  /**
   * 文章列表默认每页数量
   * 用于文章列表、搜索结果等分页场景
   */
  DEFAULT_PAGE_SIZE: 10,

  /**
   * 文章列表最大每页数量
   * 防止客户端请求过多数据导致性能问题
   */
  MAX_PAGE_SIZE: 50,

  /**
   * 文章标题最小长度
   * 确保标题有意义，避免过短的标题
   */
  MIN_TITLE_LENGTH: 3,

  /**
   * 文章标题最大长度
   * 数据库字段限制，也便于展示
   */
  MAX_TITLE_LENGTH: 200,

  /**
   * 文章内容最小长度
   * 确保文章有一定内容
   */
  MIN_CONTENT_LENGTH: 10,

  /**
   * 文章内容最大长度（字符数）
   * 约 10 万字符，足够容纳长篇博客文章
   * 注意：Markdown 格式，实际渲染后内容可能更长
   */
  MAX_CONTENT_LENGTH: 100000,

  /**
   * 阅读速度（每分钟字数）
   * 用于计算文章预估阅读时间
   * 中文平均阅读速度约 250-300 字/分钟
   */
  READING_SPEED: 250,
};

/**
 * 评论相关常量
 *
 * 用于评论的创建、审核、分页等功能
 * 涉及文件：commentService.ts, comments.ts
 */
export const COMMENT_CONSTANTS = {
  /**
   * 评论列表默认每页数量
   */
  DEFAULT_PAGE_SIZE: 20,

  /**
   * 评论列表最大每页数量
   */
  MAX_PAGE_SIZE: 100,

  /**
   * 评论内容最小长度
   * 至少 1 个字符，允许简短评论
   */
  MIN_COMMENT_LENGTH: 1,

  /**
   * 评论内容最大长度
   * 1000 字符，足够表达观点但不会过长
   */
  MAX_COMMENT_LENGTH: 1000,

  /**
   * 评论最大嵌套深度
   * 限制评论回复的层级，避免过深的嵌套影响阅读体验
   * 例如：评论 -> 回复 -> 再回复 -> 再再回复 -> 再再再回复（5层）
   */
  MAX_COMMENT_DEPTH: 5,
};

/**
 * 私信相关常量
 *
 * 用于用户间私信功能
 * 涉及文件：messageService.ts, messages.ts
 */
export const MESSAGE_CONSTANTS = {
  /**
   * 私信列表每页消息数量
   */
  MESSAGES_PER_PAGE: 20,

  /**
   * 单条私信最大长度
   * 2000 字符，足够表达较长的内容
   */
  MAX_MESSAGE_LENGTH: 2000,

  /**
   * 消息撤回时间限制（毫秒）
   * 发送后 3 分钟内可撤回
   * 超过此时限后消息无法撤回
   */
  RECALL_TIME_LIMIT: 3 * 60 * 1000,
};

/**
 * 通知相关常量
 *
 * 用于系统通知、互动通知等功能
 * 涉及文件：notificationService.ts, notifications.ts
 */
export const NOTIFICATION_CONSTANTS = {
  /**
   * 通知列表默认页码
   */
  DEFAULT_PAGE: 1,

  /**
   * 通知列表默认每页数量
   */
  DEFAULT_LIMIT: 20,

  /**
   * 通知列表最大每页数量
   */
  MAX_LIMIT: 50,

  /**
   * 通知类型枚举
   * - system: 系统通知（如维护公告、账号安全提醒）
   * - interaction: 互动通知（如评论回复、点赞、@提及）
   * - private_message: 私信通知
   */
  TYPES: ['system', 'interaction', 'private_message'] as const,

  /**
   * 交互通知子类型
   * - reply: 回复评论
   * - like: 点赞
   * - mention: @提及
   */
  INTERACTION_SUBTYPES: ['reply', 'like', 'mention'] as const,
};

/**
 * 缓存相关常量
 *
 * 用于数据缓存策略，减少数据库查询
 * 涉及文件：queryOptimizer.ts, 各种 service 文件
 */
export const CACHE_CONSTANTS = {
  /**
   * 健康检查缓存 TTL（秒）
   * 系统健康状态缓存时间
   */
  HEALTH_CHECK_TTL: 60,

  /**
   * 系统配置缓存 TTL（秒）
   * 系统配置相对稳定，可缓存较长时间
   */
  CONFIG_TTL: 3600,

  /**
   * 用户信息缓存 TTL（秒）
   * 用户信息可能变更，缓存时间适中
   */
  USER_TTL: 1800,

  /**
   * 文章缓存 TTL（秒）
   * 已发布文章相对稳定
   */
  POST_TTL: 3600,

  /**
   * 分类缓存 TTL（秒）
   * 分类结构变化较少
   */
  CATEGORY_TTL: 3600,

  /**
   * 标签缓存 TTL（秒）
   * 标签变化较少
   */
  TAG_TTL: 3600,
};

/**
 * 上传相关常量
 *
 * 用于文件上传功能，限制文件类型和大小
 * 涉及文件：uploadService.ts, upload.ts
 */
export const UPLOAD_CONSTANTS = {
  /**
   * 允许的图片 MIME 类型
   * 仅支持常见 Web 图片格式
   * 注意：不支持 SVG（可能包含恶意脚本）
   */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],

  /**
   * 允许的文档 MIME 类型
   * 仅支持常见文档格式
   */
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],

  /**
   * 图片最大文件大小（字节）
   * 5MB，适合大多数博客图片
   * 注意：前端应在上传前进行压缩
   */
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,

  /**
   * 文档最大文件大小（字节）
   * 10MB，适合大多数文档附件
   */
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024,
};

/**
 * 数据库相关常量
 *
 * 用于数据库字段枚举值、状态等
 * 涉及文件：各种 service 文件、数据库迁移
 */
export const DATABASE_CONSTANTS = {
  /**
   * 用户角色枚举
   * - admin: 管理员，拥有所有权限
   * - user: 普通用户，基础权限
   * - moderator: 版主，可管理内容
   */
  ROLES: ['admin', 'user', 'moderator'] as const,

  /**
   * 用户状态枚举
   * - active: 正常活跃
   * - suspended: 已封禁
   * - deleted: 已删除（软删除）
   */
  USER_STATUSES: ['active', 'suspended', 'deleted'] as const,

  /**
   * 文章状态枚举
   * - draft: 草稿，仅作者可见
   * - published: 已发布，公开可见
   * - archived: 已归档，不再展示在列表中
   */
  POST_STATUSES: ['draft', 'published', 'archived'] as const,

  /**
   * 文章可见性枚举
   * - public: 公开，所有人可见
   * - private: 私有，仅作者可见
   * - password: 密码保护，需输入密码访问
   */
  VISIBILITIES: ['public', 'private', 'password'] as const,

  /**
   * OAuth 提供商枚举
   * 支持的第三方登录平台
   */
  OAUTH_PROVIDERS: ['github', 'google'] as const,
};

/**
 * 分页通用常量
 *
 * 用于列表分页的默认配置
 * 当特定模块没有定义分页常量时使用这些默认值
 */
export const PAGINATION_CONSTANTS = {
  /**
   * 默认页码
   */
  DEFAULT_PAGE: 1,

  /**
   * 默认每页数量
   */
  DEFAULT_PAGE_SIZE: 10,

  /**
   * 默认每页限制（用于通知等场景）
   */
  DEFAULT_LIMIT: 20,

  /**
   * 最大每页数量
   * 防止一次请求过多数据
   */
  MAX_PAGE_SIZE: 50,

  /**
   * 最大限制数量
   */
  MAX_LIMIT: 100,
};

/**
 * 时间工具常量（毫秒）
 *
 * 用于时间计算，提高代码可读性
 * 示例：3 * TIME_CONSTANTS.MS_PER_MINUTE 表示 3 分钟
 */
export const TIME_CONSTANTS = {
  /**
   * 每秒毫秒数
   */
  MS_PER_SECOND: 1000,

  /**
   * 每分钟毫秒数
   */
  MS_PER_MINUTE: 60 * 1000,

  /**
   * 每小时毫秒数
   */
  MS_PER_HOUR: 60 * 60 * 1000,

  /**
   * 每天毫秒数
   */
  MS_PER_DAY: 24 * 60 * 60 * 1000,

  /**
   * 每分钟秒数
   */
  SECONDS_PER_MINUTE: 60,

  /**
   * 每小时分钟数
   */
  MINUTES_PER_HOUR: 60,

  /**
   * 每天分钟数
   */
  MINUTES_PER_DAY: 24 * 60,
};

/**
 * 速率限制相关常量
 *
 * 用于 API 请求频率限制，防止滥用
 * 涉及文件：rateLimit.ts, 各种路由文件
 */
export const RATE_LIMIT_CONSTANTS = {
  /**
   * 时间窗口：1 分钟（毫秒）
   */
  WINDOW_1_MINUTE: 60 * 1000,

  /**
   * 时间窗口：5 分钟（毫秒）
   */
  WINDOW_5_MINUTES: 5 * 60 * 1000,

  /**
   * 时间窗口：15 分钟（毫秒）
   */
  WINDOW_15_MINUTES: 15 * 60 * 1000,

  /**
   * 时间窗口：1 小时（毫秒）
   */
  WINDOW_1_HOUR: 60 * 60 * 1000,

  /**
   * 默认最大请求数
   * 当路由未指定限制时使用此默认值
   */
  DEFAULT_MAX_REQUESTS: 30,

  /**
   * 注册接口限制
   * 1 小时内最多注册 5 次（防止批量注册）
   */
  REGISTER_MAX_REQUESTS: 5,

  /**
   * 登录接口限制
   * 15 分钟内最多尝试 10 次（防止暴力破解）
   */
  LOGIN_MAX_REQUESTS: 10,

  /**
   * GitHub OAuth 接口限制
   * 5 分钟内最多尝试 10 次
   */
  GITHUB_OAUTH_MAX_REQUESTS: 10,

  /**
   * 验证码发送限制
   * 1 小时内最多发送 5 次
   */
  VERIFY_CODE_MAX_REQUESTS: 5,

  /**
   * 私信发送限制
   * 1 分钟内最多发送 10 条（防止垃圾信息）
   */
  MESSAGE_MAX_REQUESTS: 10,

  /**
   * 文件上传限制
   * 1 分钟内最多上传 5 个文件
   */
  UPLOAD_MAX_REQUESTS: 5,

  /**
   * 评论发布限制
   * 1 分钟内最多发布 5 条评论
   */
  COMMENT_MAX_REQUESTS: 5,

  /**
   * Token 刷新限制
   * 1 分钟内最多刷新 30 次
   */
  TOKEN_REFRESH_MAX_REQUESTS: 30,

  /**
   * 评论删除限制
   * 1 分钟内最多删除 10 条评论
   */
  DELETE_COMMENT_MAX_REQUESTS: 10,

  /**
   * 点赞限制
   * 1 分钟内最多点赞 20 次
   */
  LIKE_MAX_REQUESTS: 20,
};

/**
 * 用户资料长度限制
 *
 * 用于用户注册、资料编辑时的输入验证
 * 涉及文件：authService.ts, userService.ts
 */
export const USER_PROFILE_CONSTANTS = {
  /**
   * 用户名最小长度
   */
  MIN_USERNAME_LENGTH: 3,

  /**
   * 用户名最大长度
   * 用于 URL 和展示，不宜过长
   */
  MAX_USERNAME_LENGTH: 20,

  /**
   * 显示名称最大长度
   * 可以比用户名更长，支持中文
   */
  MAX_DISPLAY_NAME_LENGTH: 50,

  /**
   * 邮箱最大长度
   * RFC 5321 标准规定的邮箱最大长度
   */
  MAX_EMAIL_LENGTH: 254,

  /**
   * 密码最小长度
   * 8 位是业界标准，配合复杂度要求
   */
  MIN_PASSWORD_LENGTH: 8,

  /**
   * 密码最大长度
   * 限制最大长度防止 DoS 攻击（bcrypt 计算耗时）
   */
  MAX_PASSWORD_LENGTH: 128,

  /**
   * 个人简介最大长度
   */
  MAX_BIO_LENGTH: 500,

  /**
   * 用户 Slug 最大长度
   * 用于生成用户主页 URL
   */
  MAX_SLUG_LENGTH: 100,
};

/**
 * 验证相关常量
 *
 * 用于输入验证、格式校验等
 * 涉及文件：validation.ts, 各种 service 文件
 */
export const VALIDATION_CONSTANTS = {
  /**
   * 用户名正则表达式
   * 仅允许：字母、数字、下划线、连字符
   * 长度：3-20 字符
   */
  USERNAME_REGEX: /^[a-zA-Z0-9_-]{3,20}$/,

  /**
   * 邮箱正则表达式
   * 基础邮箱格式验证
   */
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /**
   * 强密码正则表达式
   * 要求：至少一个小写字母、一个大写字母、一个数字
   * 最少 8 位
   */
  STRONG_PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,

  /**
   * URL 正则表达式
   * 验证 http/https 开头的 URL
   */
  URL_REGEX: /^https?:\/\/.+/,

  /**
   * Slug 正则表达式
   * 用于生成 URL 友好的标识符
   * 格式：小写字母、数字、连字符组成
   */
  SLUG_REGEX: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

  /**
   * FTS5 全文搜索单词正则
   * 用于 SQLite FTS5 搜索的分词
   */
  FTS5_BAREWORD_REGEX: /^[\w\u0080-\uFFFF]+$/,

  /**
   * Markdown 图片正则
   * 用于提取 Markdown 中的图片链接
   */
  MARKDOWN_IMAGE_REGEX: /!\[([^\]]*)\]\(([^)]+)\)/g,

  /**
   * HTML 图片正则
   * 用于提取 HTML 中的图片 src
   */
  HTML_IMAGE_REGEX: /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,

  /**
   * 中文字符正则
   * 用于检测文本中是否包含中文
   */
  CHINESE_REGEX: /[\u4e00-\u9fa5]/,

  /**
   * 保留用户名列表
   * 这些用户名不允许注册，避免混淆或冒充
   */
  RESERVED_USERNAMES: [
    'admin', 'root', 'system', 'api', 'www', 'mail', 'ftp',
    'support', 'help', 'info', 'contact', 'about', 'blog',
    'news', 'test', 'demo', 'null', 'undefined'
  ] as const,

  /**
   * 一次性邮箱域名黑名单
   * 这些域名提供的临时邮箱不允许注册
   */
  DISPOSABLE_EMAIL_DOMAINS: [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'throwaway.email', 'fakeinbox.com'
  ] as const,

  /**
   * 主流邮箱域名白名单
   * 用于判断邮箱是否来自主流邮箱服务商
   */
  MAINSTREAM_EMAIL_DOMAINS: new Set([
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com',
    'qq.com', '163.com', '126.com', 'sina.com', 'icloud.com',
    'yahoo.com', 'foxmail.com', 'yeah.net', 'live.com'
  ]),

  /**
   * 常见弱密码列表
   * 这些密码不允许使用，提高安全性
   */
  COMMON_PASSWORDS: [
    'password', 'password123', '12345678', 'qwerty123',
    'abc12345', 'password1', '123456789', 'qwertyuiop'
  ] as const,

  /**
   * 允许的 HTML 标签
   * 用于富文本过滤，防止 XSS 攻击
   */
  ALLOWED_HTML_TAGS: [
    'b', 'strong', 'i', 'em', 'a', 'img', 'br', 'p', 'span'
  ] as const,

  /**
   * 搜索查询最大长度
   * 防止过长的搜索查询影响性能
   */
  MAX_SEARCH_QUERY_LENGTH: 100,
};

/**
 * 专栏相关常量
 *
 * 用于专栏功能的创建、管理、文章组织
 * 涉及文件：columnService.ts, columns.ts
 */
export const COLUMN_CONSTANTS = {
  /**
   * 专栏列表默认每页数量
   */
  DEFAULT_PAGE_SIZE: 10,

  /**
   * 专栏列表最大每页数量
   */
  MAX_PAGE_SIZE: 50,

  /**
   * 专栏名称最小长度
   */
  MIN_NAME_LENGTH: 2,

  /**
   * 专栏名称最大长度
   */
  MAX_NAME_LENGTH: 100,

  /**
   * 专栏描述最大长度
   */
  MAX_DESCRIPTION_LENGTH: 500,

  /**
   * 专栏允许的排序字段
   * - created_at: 创建时间
   * - post_count: 文章数量
   * - total_view_count: 总浏览量
   * - total_like_count: 总点赞数
   * - display_order: 显示顺序
   */
  ALLOWED_SORT_FIELDS: [
    'created_at', 'post_count', 'total_view_count',
    'total_like_count', 'display_order'
  ] as const,

  /**
   * 专栏内文章允许的排序字段
   */
  ALLOWED_POST_SORT_FIELDS: [
    'published_at', 'view_count', 'like_count',
    'comment_count', 'created_at'
  ] as const,

  /**
   * 专栏状态枚举
   * - active: 活跃，正常展示
   * - hidden: 隐藏，不展示但保留
   * - archived: 归档，不再更新
   */
  VALID_STATUSES: ['active', 'hidden', 'archived'] as const,
};

/**
 * 应用配置常量
 *
 * 用于应用级别的配置
 * 涉及文件：index.ts, 各种中间件
 */
export const APP_CONSTANTS = {
  /**
   * API 版本号
   * 用于 API 版本管理和兼容性处理
   */
  API_VERSION: '3.1.0',

  /**
   * 跳过环境检查的路径
   * 这些路径不需要检查环境变量配置
   */
  SKIP_ENV_CHECK_PATHS: ['/', '/health', '/api/health'],

  /**
   * 默认缓存 TTL（毫秒）
   * 查询缓存默认过期时间
   */
  DEFAULT_CACHE_TTL: 5 * 60 * 1000,

  /**
   * 查询缓存清理间隔（毫秒）
   * 定期清理过期缓存
   */
  QUERY_CACHE_CLEANUP_INTERVAL: 5 * 60 * 1000,

  /**
   * 批量操作最大数量
   * 限制单次批量操作的数据量
   */
  MAX_BATCH_SIZE: 1000,

  /**
   * 错误信息最大显示数量
   * 防止错误信息过多影响性能
   */
  MAX_ERROR_DISPLAY: 10,
};

/**
 * 通知预览常量
 *
 * 用于通知内容的预览显示
 */
export const NOTIFICATION_PREVIEW_CONSTANTS = {
  /**
   * 通知内容预览长度
   * 在通知列表中显示的内容截断长度
   */
  CONTENT_PREVIEW_LENGTH: 100,

  /**
   * 通知清理天数
   * 超过此天数的通知将被自动清理
   */
  NOTIFICATION_CLEANUP_DAYS: 90,
};

/**
 * URL 常量
 *
 * 用于外部 API 调用和链接生成
 * 涉及文件：resend.ts, authService.ts
 */
export const URL_CONSTANTS = {
  /**
   * GitHub OAuth Token 端点
   * 用于获取 GitHub OAuth 访问令牌
   */
  GITHUB_OAUTH_TOKEN: 'https://github.com/login/oauth/access_token',

  /**
   * GitHub 用户 API
   * 用于获取 GitHub 用户信息
   */
  GITHUB_USER_API: 'https://api.github.com/user',

  /**
   * GitHub 邮箱 API
   * 用于获取 GitHub 用户邮箱列表
   */
  GITHUB_EMAILS_API: 'https://api.github.com/user/emails',

  /**
   * Resend 邮件 API
   * 用于发送邮件
   */
  RESEND_API: 'https://api.resend.com/emails',

  /**
   * 默认前端地址
   * 当环境变量未配置时使用此默认值
   */
  DEFAULT_FRONTEND: 'https://blog.example.com',

  /**
   * OAuth 请求 User-Agent
   * 用于标识 OAuth 请求来源
   */
  USER_AGENT_OAUTH: 'Personal Blog OAuth App',
};

/**
 * OAuth 相关常量
 *
 * 用于第三方登录功能
 * 涉及文件：authService.ts
 */
export const OAUTH_CONSTANTS = {
  /**
   * GitHub OAuth 用户邮箱后缀
   * 用于生成 GitHub 用户的虚拟邮箱地址
   * 当用户未公开邮箱时使用
   */
  GITHUB_EMAIL_SUFFIX: '@github.oauth',

  /**
   * Token 刷新缓冲时间（毫秒）
   * 在 Token 即将过期前提前刷新
   */
  TOKEN_REFRESH_BUFFER_MS: 5 * 60 * 1000,
};

/**
 * 消息类型常量
 *
 * 用于私信消息的类型判断和展示
 * 涉及文件：messageService.ts, messages.ts
 */
export const MESSAGE_TYPE_CONSTANTS = {
  /**
   * 消息类型枚举
   * - text: 纯文本消息
   * - image: 图片消息
   * - attachment: 附件消息
   * - mixed: 混合消息（文本+附件）
   */
  TYPES: ['text', 'image', 'attachment', 'mixed'] as const,

  /**
   * 消息撤回后的占位文本
   */
  RECALL_PLACEHOLDER: '[消息已撤回]',

  /**
   * 图片消息占位文本
   */
  IMAGE_PLACEHOLDER: '[图片]',

  /**
   * 附件消息占位文本
   */
  ATTACHMENT_PLACEHOLDER: '[附件]',

  /**
   * 消息主题最大长度
   */
  MAX_SUBJECT_LENGTH: 100,
};

/**
 * 评论状态常量
 *
 * 用于评论审核功能
 * 涉及文件：adminService.ts, commentService.ts
 */
export const COMMENT_STATUS_CONSTANTS = {
  /**
   * 评论状态枚举
   * - pending: 待审核
   * - approved: 已通过
   * - rejected: 已拒绝
   * - spam: 垃圾评论
   */
  STATUSES: ['pending', 'approved', 'rejected', 'spam'] as const,

  /**
   * 评论默认状态
   * 当不需要审核时，评论默认为已通过
   */
  DEFAULT_STATUS: 'approved',
};

/**
 * 分类相关常量
 *
 * 用于文章分类功能
 * 涉及文件：categoryService.ts, categories.ts
 */
export const CATEGORY_CONSTANTS = {
  /**
   * 分类列表默认每页数量
   */
  DEFAULT_PAGE_SIZE: 10,

  /**
   * 分类列表最大每页数量
   */
  MAX_PAGE_SIZE: 50,

  /**
   * 分类允许的排序字段
   * - created_at: 创建时间
   * - name: 分类名称
   * - post_count: 文章数量
   */
  ALLOWED_SORT_FIELDS: ['created_at', 'name', 'post_count'] as const,
};

/**
 * 分析相关常量
 *
 * 用于数据统计和分析功能
 * 涉及文件：analyticsService.ts, analytics.ts
 */
export const ANALYTICS_CONSTANTS = {
  /**
   * 分析数据默认每页数量
   */
  DEFAULT_PAGE_SIZE: 10,

  /**
   * 分析数据最大每页数量
   */
  MAX_PAGE_SIZE: 50,
};

/**
 * 公开端点列表
 *
 * 这些 API 端点无需认证即可访问
 * 用于 CORS 和权限检查
 */
export const PUBLIC_ENDPOINTS = [
  '/api/posts',      // 文章列表
  '/api/categories', // 分类列表
  '/api/tags',       // 标签列表
  '/api/health',     // 健康检查
] as const;

/**
 * 本地地址列表
 *
 * 用于判断请求是否来自本地
 * 用于开发环境特殊处理
 */
export const LOCALHOST_IPS = ['127.0.0.1', 'localhost', '::1'] as const;

/**
 * 文章密码访问 Token 配置
 *
 * 用于密码保护文章的访问控制
 * 涉及文件：posts.ts
 */
export const POST_PASSWORD_TOKEN_CONSTANTS = {
  /**
   * Token 类型标识
   * 用于区分不同类型的 JWT Token
   */
  TOKEN_TYPE: 'post_password_access',

  /**
   * Token 有效期
   * 输入正确密码后，24 小时内无需再次输入
   */
  TOKEN_EXPIRY: '24h',
};

/**
 * 邮件相关常量
 *
 * 用于邮件发送功能
 * 涉及文件：resend.ts
 */
export const EMAIL_CONSTANTS = {
  /**
   * 默认发件人地址
   * Resend 测试环境的默认发件人
   */
  DEFAULT_FROM: 'onboarding@resend.dev',

  /**
   * 邮件标题配置
   * 不同类型验证邮件的标题
   */
  TITLES: {
    REGISTER: '邮箱验证 - 注册',
    PASSWORD: '邮箱验证 - 修改密码',
    DELETE: '邮箱验证 - 删除账号',
    FORGOT_PASSWORD: '邮箱验证 - 忘记密码',
  },

  /**
   * 邮件主题配置
   * 不同类型验证邮件的主题行
   */
  SUBJECTS: {
    REGISTER: '【注册】邮箱验证码',
    PASSWORD: '【修改密码】邮箱验证码',
    DELETE: '【删除账号】邮箱验证码',
    FORGOT_PASSWORD: '【重置密码】邮箱验证码',
  },

  /**
   * 验证码提示文本
   */
  VERIFICATION_HINT: '验证码 10 分钟内有效，请勿泄露给他人。',

  /**
   * 非本人操作提示
   */
  IGNORE_IF_NOT_YOU: '如非本人操作，请忽略此邮件。',

  /**
   * 邮件页脚
   */
  FOOTER: '此邮件由系统自动发送，请勿直接回复',
};

/**
 * 获取环境变量，支持从多个来源取值
 *
 * @param env - 环境对象（Cloudflare Workers 的 env）
 * @param key - 配置键名
 * @param defaultValue - 默认值（当环境变量未设置时返回）
 * @returns 配置值或默认值
 *
 * @example
 * const db = getEnvConfig(env, 'DB', defaultDb);
 */
export function getEnvConfig<T>(
  env: Record<string, any>,
  key: string,
  defaultValue: T
): T {
  const value = env[key];
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return value as T;
}

/**
 * 获取 CORS 允许的源列表
 *
 * 用于配置跨域请求的允许来源
 * 支持通过环境变量配置多个允许的源
 *
 * @param env - 环境对象
 * @returns 允许的源列表
 *
 * @example
 * // 环境变量: ALLOWED_ORIGINS=https://example.com,https://api.example.com
 * const origins = getAllowedOrigins(env);
 * // 返回: ['https://example.com', 'https://api.example.com']
 */
export function getAllowedOrigins(env: Record<string, any>): string[] {
  const allowedOriginsEnv = getEnvConfig<string>(env, 'ALLOWED_ORIGINS', '');

  if (!allowedOriginsEnv) {
    const frontendUrl = getFrontendUrl(env);
    return [frontendUrl];
  }

  return allowedOriginsEnv.split(',').map((origin: string) => origin.trim());
}

/**
 * 获取前端 URL（博客应用的访问地址）
 *
 * 用于生成邮件中的链接、OAuth 回调地址等
 * 优先从环境变量 FRONTEND_URL 获取
 *
 * @param env - 环境对象
 * @param fallback - 备用 URL（默认: https://blog.example.com）
 * @returns 前端 URL
 *
 * @example
 * const url = getFrontendUrl(env);
 * // 返回: 'https://your-blog.com'
 */
export function getFrontendUrl(env: Record<string, any>, fallback = 'https://blog.example.com'): string {
  return getEnvConfig(env, 'FRONTEND_URL', fallback);
}

/**
 * 获取基础 URL（同 getFrontendUrl）
 *
 * 保持向后兼容性，建议使用 getFrontendUrl
 *
 * @param env - 环境对象
 * @param fallback - 备用 URL
 * @returns 基础 URL
 *
 * @deprecated 请使用 getFrontendUrl
 */
export function getBaseUrl(env: Record<string, any>, fallback = 'https://blog.example.com'): string {
  return getEnvConfig(env, 'FRONTEND_URL', fallback);
}
