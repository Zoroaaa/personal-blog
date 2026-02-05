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
 * @author 优化版本
 * @version 2.1.0
 */

import type {
  ApiResponse,
  User,
  Post,
  PostListItem,
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

const API_URL = import.meta.env.VITE_API_URL || '/api';
const isDevelopment = import.meta.env.DEV;

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
   * 修改密码
   */
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiRequest<{ success: boolean }>('/auth/password', {
      method: 'PUT',
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
  getPost: (slug: string) => 
    apiRequest<Post>(`/posts/${slug}`),
  
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
   * 点赞/取消点赞文章
   */
  likePost: (id: number) => 
    apiRequest<{ liked: boolean }>(`/posts/${id}/like`, {
      method: 'POST',
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
   */
  searchPosts: (params: {
    q?: string;
    category?: string;
    tag?: string;
    page?: string;
    limit?: string;
    sort?: string;
  }) => {
    const query = new URLSearchParams(params as any).toString();
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
  getCategories: () => 
    apiRequest<{ categories: Category[] }>('/categories'),
  
  /**
   * 获取所有标签
   */
  getTags: () => 
    apiRequest<{ tags: Tag[] }>('/categories/tags'),

  /**
 * API工具函数扩展
 * 需要添加到现有的 api.ts 文件中
 */

// 在现有的 api 对象中添加以下方法:

// ============= 分类相关 =============

async getCategories(params?: { page?: string; limit?: string }): Promise<ApiResponse> {
  return this.get('/api/categories', params);
},

async createCategory(data: {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}): Promise<ApiResponse> {
  return this.post('/api/categories', data);
},

async updateCategory(id: number, data: {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}): Promise<ApiResponse> {
  return this.put(`/api/categories/${id}`, data);
},

async deleteCategory(id: number): Promise<ApiResponse> {
  return this.delete(`/api/categories/${id}`);
},

// ============= 标签相关 =============

async getTags(params?: { page?: string; limit?: string }): Promise<ApiResponse> {
  return this.get('/api/categories/tags', params);
},

async createTag(data: {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
}): Promise<ApiResponse> {
  return this.post('/api/categories/tags', data);
},

async updateTag(id: number, data: {
  name?: string;
  description?: string;
  color?: string;
}): Promise<ApiResponse> {
  return this.put(`/api/categories/tags/${id}`, data);
},

async deleteTag(id: number): Promise<ApiResponse> {
  return this.delete(`/api/categories/tags/${id}`);
}

// ============= 使用示例 =============

/*
// 获取分类列表
const categoriesResponse = await api.getCategories();
if (categoriesResponse.success) {
  const categories = categoriesResponse.data.categories;
  // 使用分类数据
}

// 创建新分类
const newCategory = await api.createCategory({
  name: '技术',
  slug: 'tech',
  description: '技术相关文章',
  icon: '💻',
  color: '#3B82F6',
  displayOrder: 1
});

// 更新分类
const updateResult = await api.updateCategory(1, {
  name: '前端技术',
  color: '#06B6D4'
});

// 删除分类
const deleteResult = await api.deleteCategory(1);

// 获取标签列表
const tagsResponse = await api.getTags();
if (tagsResponse.success) {
  const tags = tagsResponse.data.tags;
  // 使用标签数据
}

// 创建新标签
const newTag = await api.createTag({
  name: 'React',
  slug: 'react',
  description: 'React框架相关',
  color: '#61DAFB'
});

// 更新标签
const updateTagResult = await api.updateTag(1, {
  name: 'React.js',
  color: '#61DAFB'
});

// 删除标签
const deleteTagResult = await api.deleteTag(1);
*/
  
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
   * 删除账号
   */
  deleteAccount: (password: string) =>
    apiRequest<{ deleted: boolean }>('/auth/delete', {
      method: 'POST',
      body: JSON.stringify({ password, confirmation: 'DELETE' }),
    }),
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
