/**
 * TypeScript类型定义文件
 * 
 * 包含前端所有数据模型的类型定义
 * 与后端API响应格式保持一致
 * 
 * @author 优化版本
 * @version 2.0.0
 */

// ============= 基础类型 =============

/**
 * API统一响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * 分页信息
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

// ============= 用户相关类型 =============

/**
 * 用户角色
 */
export type UserRole = 'admin' | 'user' | 'moderator';

/**
 * 用户状态
 */
export type UserStatus = 'active' | 'suspended' | 'deleted';

/**
 * OAuth提供商
 */
export type OAuthProvider = 'github' | 'google';

/**
 * 用户基本信息
 */
export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  status?: UserStatus;
  oauthProvider?: OAuthProvider;
  postCount?: number;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/**
 * 用户公开资料（不包含敏感信息）
 */
export interface UserPublicProfile {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  postCount?: number;
  createdAt: string;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 注册请求
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  emailVerificationCode?: string;
}

/**
 * 阅读历史项（含阅读进度）
 */
export interface ReadingHistoryItem extends PostListItem {
  postId?: number;
  firstReadAt: string;
  lastReadAt: string;
  readDurationSeconds: number;
  readPercentage: number;
}

/**
 * 认证响应
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * 更新用户资料请求
 */
export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

// ============= 文章相关类型 =============

/**
 * 文章状态
 */
export type PostStatus = 'draft' | 'published' | 'archived';

/**
 * 文章可见性
 */
export type PostVisibility = 'public' | 'private' | 'password';

/**
 * 文章
 */
export interface Post {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  coverImage?: string;
  authorId: number;
  categoryId?: number;
  status: PostStatus;
  visibility: PostVisibility;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  readingTime?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // 关联数据
  author?: UserPublicProfile;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string;
  category?: Category;
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
  tags?: Tag[];
  
  // 交互状态
  isLiked?: boolean;
  isFavorited?: boolean;
}

/**
 * 文章列表项（简化版）
 */
export interface PostListItem {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  coverImage?: string;
  authorName: string;
  authorAvatar?: string;
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  readingTime?: number;
  publishedAt: string;
  tags?: Tag[];
}

/**
 * 创建文章请求
 */
export interface CreatePostRequest {
  title: string;
  content: string;
  summary?: string;
  coverImage?: string;
  categoryId?: number;
  tags?: number[];
  status?: PostStatus;
  visibility?: PostVisibility;
  password?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

/**
 * 更新文章请求
 */
export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  // 继承CreatePostRequest的所有字段，但都是可选的
}

/**
 * 文章查询参数
 */
export interface PostQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  author?: string;
  status?: PostStatus;
  search?: string;
  sortBy?: 'published_at' | 'view_count' | 'like_count' | 'comment_count';
  order?: 'asc' | 'desc';
}

// ============= 分类相关类型 =============

/**
 * 分类
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  postCount: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建分类请求
 */
export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}

// ============= 标签相关类型 =============

/**
 * 标签
 */
export interface Tag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建标签请求
 */
export interface CreateTagRequest {
  name: string;
  slug: string;
  description?: string;
}

// ============= 评论相关类型 =============

/**
 * 评论状态
 */
export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'deleted';

/**
 * 评论
 */
export interface Comment {
  id: number;
  postId: number;
  userId: number;
  parentId?: number;
  content: string;
  status: CommentStatus;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  
  // 关联数据
  user?: UserPublicProfile;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  replies?: Comment[];
  
  // 关联文章信息（在某些API响应中返回）
  post?: {
    id: number;
    title: string;
    slug: string;
    coverImage?: string;
    categoryName?: string;
    categorySlug?: string;
    categoryColor?: string;
  };
}

/**
 * 创建评论请求
 */
export interface CreateCommentRequest {
  postId: number;
  content: string;
  parentId?: number;
}

/**
 * 评论查询参数
 */
export interface CommentQueryParams {
  postId?: number | string;
  userId?: string;
  page?: number;
  limit?: number;
  status?: CommentStatus;
}

// ============= 点赞相关类型 =============

/**
 * 点赞
 */
export interface Like {
  id: number;
  userId: number;
  postId?: number;
  commentId?: number;
  createdAt: string;
}

/**
 * 点赞响应
 */
export interface LikeResponse {
  liked: boolean;
  likeCount?: number;
}

// ============= 文件上传相关类型 =============

/**
 * 上传文件响应
 */
export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  type: string;
}

/**
 * 上传进度
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// ============= 统计相关类型 =============

/**
 * 博客统计信息
 */
export interface BlogStats {
  totalPosts: number;
  totalUsers: number;
  totalComments: number;
  totalViews: number;
  totalLikes: number;
}

/**
 * 用户统计信息
 */
export interface UserStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  followerCount?: number;
  followingCount?: number;
}

/**
 * 文章统计信息
 */
export interface PostStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewHistory?: Array<{
    date: string;
    count: number;
  }>;
}

// ============= 搜索相关类型 =============

/**
 * 搜索结果
 */
export interface SearchResult {
  posts: PostListItem[];
  users: UserPublicProfile[];
  tags: Tag[];
  categories: Category[];
  total: number;
}

/**
 * 搜索查询参数
 */
export interface SearchQueryParams {
  q: string;
  type?: 'all' | 'posts' | 'users' | 'tags';
  page?: number;
  limit?: number;
  /**
   * 是否使用FTS5全文搜索（默认true）
   * 设置为false将使用传统LIKE搜索
   */
  useFts?: boolean;
}

// ============= 通知相关类型 =============

/**
 * 通知类型
 */
export type NotificationType = 
  | 'comment'
  | 'reply'
  | 'like'
  | 'follow'
  | 'system';

/**
 * 通知
 */
export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// ============= 表单状态类型 =============

/**
 * 表单字段错误
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * 表单状态
 */
export interface FormState<T = any> {
  data: T;
  errors: FieldError[];
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * 异步操作状态
 */
export interface AsyncState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ============= 配置相关类型 =============

/**
 * 网站配置
 * 对应数据库 site_config 表的配置项
 * 用于管理网站的内容和显示设置
 */
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
  comment_approval_required: boolean;

  // 页脚配置
  footer_text: string;
  footer_links?: Record<string, string> | string;
  footer_tech_stack?: string[];

  // 系统设置
  posts_per_page: number;
  max_upload_size_mb: number;
  allow_html_comments?: boolean;
  max_comment_length?: number;

  // 索引签名，允许动态访问配置项
  [key: string]: any;
}

/**
 * 应用运行时配置
 * 用于前端应用的环境和运行时配置
 * 与 SiteConfig 分离,避免混淆
 */
export interface AppConfig {
  // 基础信息(从SiteConfig读取)
  siteName: string;        // 映射自 SiteConfig.site_name
  siteDescription: string; // 映射自 SiteConfig.site_description
  
  // API和URL配置
  siteUrl: string;
  apiUrl: string;
  cdnUrl?: string;
  
  // 默认值配置
  defaultAvatar: string;
  
  // 文件上传配置
  maxFileSize: number;
  allowedFileTypes: string[];
  
  // 分页配置
  postsPerPage: number;    // 映射自 SiteConfig.posts_per_page
  commentsPerPage: number;
  
  // 功能开关
  enableComments: boolean;      // 映射自 SiteConfig.feature_comments
  enableRegistration: boolean;
  enableGitHubOAuth: boolean;
}

/**
 * 主题配置
 * 用于运行时主题状态管理
 */
export interface ThemeConfig {
  primaryColor: string;  // 对应 SiteConfig.theme_primary_color
  mode: 'light' | 'dark'; // 对应 SiteConfig.theme_default_mode
  fontSize: 'small' | 'medium' | 'large';
}

// ============= 工具类型 =============

/**
 * 可为空的类型
 */
export type Nullable<T> = T | null;

/**
 * 可选的类型
 */
export type Optional<T> = T | undefined;

/**
 * 深度部分类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * ID类型
 */
export type ID = number | string;

/**
 * 时间戳（ISO 8601格式）
 */
export type Timestamp = string;

// ============= React组件Props类型 =============

/**
 * 基础组件Props
 */
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * 带加载状态的组件Props
 */
export interface LoadingComponentProps extends BaseComponentProps {
  loading?: boolean;
  loadingText?: string;
}

/**
 * 带错误状态的组件Props
 */
export interface ErrorComponentProps extends BaseComponentProps {
  error?: string | null;
  onRetry?: () => void;
}

// ============= 类型守卫 =============

/**
 * 检查是否为成功的API响应
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * 检查是否为错误的API响应
 */
export function isErrorResponse(response: ApiResponse): response is ApiResponse & { success: false; error: string } {
  return response.success === false && response.error !== undefined;
}

/**
 * 检查是否为已发布的文章
 */
export function isPublishedPost(post: Post): boolean {
  return post.status === 'published' && post.publishedAt !== null;
}

/**
 * 检查是否为管理员用户
 */
export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}

// ============= 常量 =============

/**
 * 用户角色常量
 */
export const USER_ROLES = {
  ADMIN: 'admin' as UserRole,
  USER: 'user' as UserRole,
  MODERATOR: 'moderator' as UserRole,
};

/**
 * 文章状态常量
 */
export const POST_STATUS = {
  DRAFT: 'draft' as PostStatus,
  PUBLISHED: 'published' as PostStatus,
  ARCHIVED: 'archived' as PostStatus,
};

/**
 * 评论状态常量
 */
export const COMMENT_STATUS = {
  PENDING: 'pending' as CommentStatus,
  APPROVED: 'approved' as CommentStatus,
  REJECTED: 'rejected' as CommentStatus,
  DELETED: 'deleted' as CommentStatus,
};

// ============= 导出默认值 =============

export default {
  USER_ROLES,
  POST_STATUS,
  COMMENT_STATUS,
  isSuccessResponse,
  isErrorResponse,
  isPublishedPost,
  isAdmin,
};