/**
 * 前端API工具(优化版)
 * 
 * 功能:
 * - 统一的API请求封装
 * - 完善的错误处理
 * - 使用TypeScript类型
 * - 自动token管理
 * 
 * 优化内容:
 * 1. 使用完整的TypeScript类型定义
 * 2. 改进错误处理和用户提示
 * 3. 添加请求拦截器
 * 4. 添加响应拦截器
 * 5. 统一API响应格式处理
 * 6. 添加githubLogin方法和getConfig方法
 * 
 * @author 博客系统
 * @version 2.1.0
 * @created 2024-01-01
 */

import type {
  ApiResponse,
  User,
  Post,
  PostListItem,
  ReadingHistoryItem,
  Comment,
  Category,
  Tag,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UploadResponse,
  PostQueryParams,
  CommentQueryParams
} from '../types';

// ============= 配置 =============

// 支持Vite环境变量和Node.js环境变量
const API_URL = (import.meta?.env?.VITE_API_URL || process.env.VITE_API_URL) || '/api';
const isDevelopment = (import.meta?.env?.DEV || process.env.NODE_ENV === 'development');


// ============= 核心请求函数 =============

/**
 * 统一的API请求函数
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // 获取token
  const token = getAuthToken();
  
  // 构建headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 构建完整URL
  const url = `${API_URL}${endpoint}`;
  
  // 开发环境日志
  if (isDevelopment) {
    console.log('API Request:', {
      method: options.method || 'GET',
      url,
      hasAuth: !!token
    });
  }
  
  try {
    // 发送请求
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
    
    // 开发环境日志
    if (isDevelopment) {
      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        url
      });
    }
    
    // 处理204 No Content
    if (response.status === 204) {
      return {
        success: true,
        data: null as T
      };
    }
    
    // 解析JSON响应
    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('服务器返回的数据格式不正确');
    }
    
    // 处理HTTP错误
    if (!response.ok) {
      // Token过期,自动登出
      if (response.status === 401) {
        handleUnauthorized();
      }
      
      throw new Error(data.error || data.message || '请求失败');
    }
    
    return data;
    
  } catch (error) {
    // 网络错误
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('无法连接到服务器,请检查网络连接');
    }
    
    // 其他错误
    throw error;
  }
}

/**
 * 获取认证token
 */
function getAuthToken(): string | null {
  try {
    const storage = localStorage.getItem('auth-storage');
    if (!storage) return null;
    
    const parsed = JSON.parse(storage);
    return parsed.state?.token || null;
  } catch (e) {
    console.error('Failed to parse auth token:', e);
    return null;
  }
}

/**
 * 处理未授权错误
 */
function handleUnauthorized(): void {
  // 清除本地存储的认证信息
  localStorage.removeItem('auth-storage');
  
  // 跳转到登录页(如果不在登录页)
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
  }
}

// ============= API方法集合 =============

export const api = {
  // ============= 通用请求方法 =============

  /**
   * 通用GET请求
   */
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint),

  /**
   * 通用POST请求
   */
  post: <T = any>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  /**
   * 通用PUT请求
   */
  put: <T = any>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  /**
   * 通用DELETE请求
   */
  delete: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint, {
      method: 'DELETE',
    }),

  /**
   * 通用PATCH请求
   */
  patch: <T = any>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // ============= 健康检查 =============

  /**
   * 健康检查
   */
  health: () => apiRequest<{ status: string; version: string }>('/health'),
  
  // ============= 认证相关 =============
  
  /**
   * 用户注册
   */
  register: (data: RegisterRequest) => 
    apiRequest<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * 用户登录
   */
  login: (data: LoginRequest) => 
    apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * 用户登出
   */
  logout: () => 
    apiRequest<{ loggedOut: boolean }>('/auth/logout', { 
      method: 'POST' 
    }),
  
  /**
   * 获取当前用户信息
   */
  getMe: () => 
    apiRequest<{ user: User }>('/auth/me'),
  
  /**
   * 更新用户资料
   */
  updateProfile: (data: UpdateProfileRequest) =>
    apiRequest<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  /**
   * 修改密码（可选邮箱验证码，当后端启用 Resend 时必填）
   */
  changePassword: (data: { currentPassword: string; newPassword: string; emailVerificationCode?: string }) =>
    apiRequest<{ success: boolean }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  /**
   * 通过邮箱验证码重置密码（忘记密码）
   */
  resetPassword: (data: { email: string; verificationCode: string; newPassword: string }) =>
    apiRequest<{ reset: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * GitHub OAuth登录
   */
  githubLogin: (code: string) =>
    apiRequest<{ user: User; token: string }>('/auth/github', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  
  /**
   * 获取配置信息
   */
  getConfig: () =>
    apiRequest<Record<string, any>>('/config'),
  
  /**
   * 更新配置项
   */
  updateConfig: (key: string, value: any) =>
    apiRequest<{ key: string; value: any }>(`/config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
  
  /**
   * 批量更新配置
   */
  batchUpdateConfig: (configs: Record<string, any>) =>
    apiRequest<{ updated: number; failed: number }>('/config', {
      method: 'PUT',
      body: JSON.stringify({ configs }),
    }),
  
  /**
   * 获取所有配置(管理员)
   */
  getAdminConfig: () =>
    apiRequest<{ config: Record<string, any[]>; total: number }>('/config/admin'),
  
  /**
   * 获取存储配置信息
   */
  getStorageConfig: () =>
    apiRequest<{ storagePublicUrl: string }>('/config/storage'),
  
  // ============= 文章相关 =============
  
  /**
   * 获取文章列表
   */
  getPosts: (params?: PostQueryParams) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{ 
      posts: PostListItem[]; 
      pagination: { page: number; limit: number; total: number; totalPages: number } 
    }>(`/posts${query}`);
  },
  
  /**
   * 获取文章详情
   */
  getPost: (slug: string, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return apiRequest<Post>(`/posts/${slug}`, { headers });
  },
  
  /**
 * 通过ID获取文章详情(用于编辑)
 */
  getPostById: (id: number) => 
    apiRequest<Post>(`/posts/admin/${id}`),
  
  /**
   * 获取所有文章列表(用于管理后台)
   */
  getAdminPosts: (params?: {
    page?: string;
    limit?: string;
  }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{
      posts: PostListItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/posts/admin${query}`);
  },
  
  /**
   * 创建文章
   */
  createPost: (data: CreatePostRequest) => 
    apiRequest<{ id: number; slug: string }>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * 更新文章
   */
  updatePost: (id: number, data: UpdatePostRequest) => 
    apiRequest<{ updated: boolean }>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  /**
   * 删除文章
   */
  deletePost: (id: number) => 
    apiRequest<{ deleted: boolean }>(`/posts/${id}`, {
      method: 'DELETE',
    }),

  /**
   * 验证文章密码
   */
  verifyPostPassword: (postId: number, password: string) =>
    apiRequest<{ verified: boolean; token: string; post: { id: number; title: string; slug: string } }>(`/posts/${postId}/verify-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  
  /**
   * 点赞/取消点赞文章（返回最新 likeCount 便于前端实时更新）
   */
  likePost: (id: number) => 
    apiRequest<{ liked: boolean; likeCount?: number }>(`/posts/${id}/like`, {
      method: 'POST',
    }),
  
  /**
   * 记录阅读进度（需要认证）
   */
  postReadingProgress: (postId: number, data: { readDurationSeconds?: number; readPercentage?: number }) =>
    apiRequest<{ updated: boolean }>(`/posts/${postId}/reading-progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * 获取阅读历史列表（需要认证）
   */
  getReadingHistory: (params?: { page?: string; limit?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{
      items: ReadingHistoryItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/posts/reading-history${query}`);
  },
  
  /**
   * 收藏/取消收藏文章（需要认证）
   */
  toggleFavorite: (postId: number) =>
    apiRequest<{ favorited: boolean }>(`/posts/${postId}/favorite`, {
      method: 'POST',
    }),
  
  /**
   * 获取用户收藏的文章列表（需要认证）
   */
  getFavorites: (params?: { page?: string; limit?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{
      posts: PostListItem[];
      total: number;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/posts/favorites${query}`);
  },
  
  /**
   * 发送邮箱验证码（注册/忘记密码传 email+type；改密/删号需登录传 type=password 或 delete）
   */
  sendVerificationCode: (data: { email?: string; type: 'register' | 'password' | 'delete' | 'forgot_password' }) =>
    apiRequest<{ sent: boolean }>('/auth/send-verification-code', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * 获取用户点赞的文章列表
   */
  getLikedPosts: (params?: {
    page?: string;
    limit?: string;
  }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{
      posts: PostListItem[];
      total: number;
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/posts/likes${query}`);
  },
  
  /**
   * 搜索文章
   * @param params 搜索参数
   * @param params.q 搜索关键词（支持FTS5语法：AND, OR, "短语", 前缀*）
   * @param params.category 分类slug过滤
   * @param params.tag 标签slug过滤
   * @param params.page 页码
   * @param params.limit 每页数量
   * @param params.sort 排序方式（published_at, view_count, like_count, comment_count, relevance）
   * @param params.use_fts 是否使用FTS5全文搜索（默认true）
   */
  searchPosts: (params: {
    q?: string;
    category?: string;
    tag?: string;
    page?: string;
    limit?: string;
    sort?: string;
    use_fts?: string;
  }) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    );
    const query = new URLSearchParams(filteredParams as any).toString();
    return apiRequest<{
      posts: PostListItem[];
      total: number;
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/posts/search?${query}`);
  },
  
  // ============= 评论相关 =============
  
  /**
   * 获取评论列表
   */
  getComments: (params: CommentQueryParams) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<{ 
      comments: Comment[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/comments?${query}`);
  },
  
  /**
   * 发表评论
   */
  createComment: (data: CreateCommentRequest) => 
    apiRequest<{ id: number }>('/comments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * 删除评论
   */
  deleteComment: (id: number) => 
    apiRequest<{ deleted: boolean }>(`/comments/${id}`, {
      method: 'DELETE',
    }),
  
  /**
   * 点赞/取消点赞评论
   */
  likeComment: (id: number) =>
    apiRequest<{ liked: boolean }>(`/comments/${id}/like`, {
      method: 'POST',
    }),
  
  // ============= 分类和标签 =============
  
  /**
   * 获取所有分类
   */
  getCategories: (params?: { page?: string; limit?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{ categories: Category[] }>(`/categories${query}`);
  },

  /**
   * 获取分类详情
   */
  getCategory: (slug: string) =>
    apiRequest<Category>(`/categories/${slug}`),

  /**
   * 获取分类下的文章列表
   */
  getCategoryPosts: (slug: string, params?: { page?: string; limit?: string; sortBy?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{
      posts: PostListItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/categories/${slug}/posts${query}`);
  },
  
  /**
   * 创建分类
   */
  createCategory: (data: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    color?: string;
    displayOrder?: number;
  }) => 
    apiRequest<{ id: number; slug: string }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * 更新分类
   */
  updateCategory: (id: number, data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    displayOrder?: number;
  }) => 
    apiRequest<{ updated: boolean }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  /**
   * 删除分类
   */
  deleteCategory: (id: number) => 
    apiRequest<{ deleted: boolean }>(`/categories/${id}`, {
      method: 'DELETE',
    }),
  
  /**
   * 获取所有标签
   */
  getTags: (params?: { page?: string; limit?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{ tags: Tag[] }>(`/categories/tags${query}`);
  },

  /**
   * 获取标签详情
   */
  getTag: (slug: string) =>
    apiRequest<Tag>(`/categories/tags/${slug}`),

  /**
   * 获取标签下的文章列表
   */
  getTagPosts: (slug: string, params?: { page?: string; limit?: string; sortBy?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{
      posts: PostListItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/categories/tags/${slug}/posts${query}`);
  },
  
  /**
   * 创建标签
   */
  createTag: (data: {
    name: string;
    slug?: string;
    description?: string;
    color?: string;
  }) => 
    apiRequest<{ id: number; slug: string }>('/categories/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  /**
   * 更新标签
   */
  updateTag: (id: number, data: {
    name?: string;
    description?: string;
    color?: string;
  }) => 
    apiRequest<{ updated: boolean }>(`/categories/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  /**
   * 删除标签
   */
  deleteTag: (id: number) => 
    apiRequest<{ deleted: boolean }>(`/categories/tags/${id}`, {
      method: 'DELETE',
    }),

  // ============= 专栏相关 =============

  /**
   * 获取专栏列表
   */
  getColumns: (params?: { page?: string; limit?: string; author?: string; sortBy?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{
      columns: import('../types').Column[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/columns${query}`);
  },

  /**
   * 获取专栏详情
   */
  getColumn: (slug: string) =>
    apiRequest<import('../types').Column>(`/columns/${slug}`),

  /**
   * 获取专栏下的文章列表
   */
  getColumnPosts: (slug: string, params?: { page?: string; limit?: string; sortBy?: string }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{
      posts: PostListItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/columns/${slug}/posts${query}`);
  },

  /**
   * 创建专栏
   */
  createColumn: (data: import('../types').CreateColumnRequest) =>
    apiRequest<{ id: number; slug: string }>('/columns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 更新专栏
   */
  updateColumn: (id: number, data: import('../types').UpdateColumnRequest) =>
    apiRequest<{ updated: boolean }>(`/columns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * 删除专栏
   */
  deleteColumn: (id: number) =>
    apiRequest<{ deleted: boolean }>(`/columns/${id}`, {
      method: 'DELETE',
    }),

  /**
   * 刷新专栏统计数据
   */
  refreshColumnStats: (id: number) =>
    apiRequest<{
      postCount: number;
      totalViewCount: number;
      totalLikeCount: number;
      totalFavoriteCount: number;
      totalCommentCount: number;
    }>(`/columns/${id}/refresh-stats`, {
      method: 'POST',
    }),

  // ============= 文件上传 =============
  
  /**
   * 上传图片
   */
  uploadImage: async (file: File): Promise<ApiResponse<UploadResponse>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || '上传失败');
      }
      
      return await response.json();
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('上传失败');
    }
  },
  
  /**
   * 上传文件（通用，支持更多文件类型）
   */
  uploadFile: async (file: File): Promise<ApiResponse<UploadResponse>> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAuthToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}/upload/file`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || '上传失败');
      }

      return await response.json();

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('上传失败');
    }
  },

  /**
   * 删除文件
   */
  deleteFile: (filename: string) =>
    apiRequest<{ deleted: boolean }>(`/upload/${filename}`, {
      method: 'DELETE',
    }),
  
  // ============= 管理后台相关 =============
  
  /**
   * 获取评论管理列表
   */
  getAdminComments: (params?: {
    page?: string;
    limit?: string;
    status?: string;
  }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{
      comments: Comment[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/admin/comments${query}`);
  },
  
  /**
   * 更新评论状态
   */
  updateCommentStatus: (id: number, status: 'approved' | 'pending' | 'spam') =>
    apiRequest<{ updated: boolean }>(`/admin/comments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  
  /**
   * 获取用户管理列表
   */
  getAdminUsers: (params?: {
    page?: string;
    limit?: string;
    role?: string;
  }) => {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return apiRequest<{
      users: User[];
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`/admin/users${query}`);
  },
  
  /**
   * 更新用户角色
   */
  updateUserRole: (id: number, role: 'admin' | 'user') =>
    apiRequest<{ updated: boolean }>(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  
  /**
   * 删除用户
   */
  deleteUser: (id: number) =>
    apiRequest<{ deleted: boolean }>(`/admin/users/${id}`, {
      method: 'DELETE',
    }),
  
  /**
   * 获取系统统计数据
   */
  getAnalytics: () =>
    apiRequest<{
      totalPosts: number;
      totalComments: number;
      totalUsers: number;
      totalViews: number;
      recentPosts: PostListItem[];
      recentComments: Comment[];
      viewTrend: Array<{
        date: string;
        views: number;
      }>;
    }>('/analytics'),
  
  /**
   * 获取热门文章
   */
  getHotPosts: (limit?: number) =>
    apiRequest<PostListItem[]>(`/analytics/hot-posts?limit=${limit || 5}`),
  
  /**
   * 获取系统设置
   */
  getSystemSettings: () =>
    apiRequest<Record<string, any>>('/admin/settings'),
  
  /**
   * 更新系统设置
   */
  updateSystemSettings: (settings: Record<string, any>) =>
    apiRequest<{ updated: boolean }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  /**
   * 删除账号（可选邮箱验证码，当后端启用 Resend 时必填）
   */
  deleteAccount: (password: string, emailVerificationCode?: string) =>
    apiRequest<{ deleted: boolean }>('/auth/delete', {
      method: 'POST',
      body: JSON.stringify({
        password,
        confirmation: 'DELETE',
        ...(emailVerificationCode ? { emailVerificationCode } : {}),
      }),
    }),

  searchUser: (username: string) =>
    apiRequest<{ user: { id: number; username: string; displayName: string; avatarUrl?: string; bio?: string } | null }>(`/users/search?username=${encodeURIComponent(username)}`),

  getUserProfile: (userId: number) =>
    apiRequest<{ user: { id: number; username: string; displayName: string; avatarUrl?: string; bio?: string; createdAt: string; postCount: number; commentCount: number } }>(`/users/${userId}`),
};

// ============= 辅助函数 =============

/**
 * 测试API连接
 */
export async function testApiConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const response = await api.health();
    
    return {
      success: response.success,
      message: response.success ? 'API连接成功' : 'API返回错误',
      details: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: '无法连接到API服务器',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * 获取当前用户(从localStorage)
 */
export function getCurrentUser(): User | null {
  try {
    const storage = localStorage.getItem('auth-storage');
    if (!storage) return null;
    
    const parsed = JSON.parse(storage);
    return parsed.state?.user || null;
  } catch (e) {
    return null;
  }
}

// ============= 导出 =============

export default api;