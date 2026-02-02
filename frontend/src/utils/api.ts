const API_URL = import.meta.env.VITE_API_URL || '/api';

// 定义明确的请求头类型
interface RequestHeaders extends Record<string, string> {
  'Content-Type': string;
  Authorization?: string;
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = localStorage.getItem('auth-storage');
  let parsedToken: string | null = null;
  
  if (token) {
    try {
      const parsed = JSON.parse(token);
      parsedToken = parsed.state?.token || null;
    } catch (e) {
      console.warn('Failed to parse auth token:', e);
    }
  }
  
  // 使用明确的类型定义
  const headers: RequestHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (parsedToken) {
    headers['Authorization'] = `Bearer ${parsedToken}`;
  }
  
  const url = `${API_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `Request failed with status ${response.status}` };
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`API request failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred during API request');
  }
}

// 定义 API 请求参数类型
interface AuthData {
  email: string;
  password: string;
  username?: string;
}

interface PostData {
  title: string;
  content: string;
  excerpt?: string;
  categoryId?: number;
  tags?: string[];
  published?: boolean;
}

interface CommentData {
  content: string;
  postId: number;
  parentId?: number;
}

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  tag?: string;
}

export const api = {
  // 认证相关
  register: (data: AuthData) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  login: (data: AuthData) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  
  getMe: () => apiRequest('/auth/me'),
  
  // 文章相关
  getPosts: (params?: PaginationParams) => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return apiRequest(`/posts${queryString ? `?${queryString}` : ''}`);
  },
  
  getPost: (slug: string) => apiRequest(`/posts/${slug}`),
  
  createPost: (data: PostData) => apiRequest('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updatePost: (id: number, data: Partial<PostData>) => apiRequest(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  deletePost: (id: number) => apiRequest(`/posts/${id}`, {
    method: 'DELETE',
  }),
  
  likePost: (id: number) => apiRequest(`/posts/${id}/like`, {
    method: 'POST',
  }),
  
  // 评论相关
  getComments: (postId: number) => apiRequest(`/comments?postId=${postId}`),
  
  createComment: (data: CommentData) => apiRequest('/comments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  deleteComment: (id: number) => apiRequest(`/comments/${id}`, {
    method: 'DELETE',
  }),
  
  // 分类和标签相关
  getCategories: () => apiRequest('/categories'),
  
  getTags: () => apiRequest('/categories/tags'),
  
  // 上传相关
  uploadImage: (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest('/upload', {
      method: 'POST',
      headers: {
        // 上传文件时不需要 Content-Type，浏览器会自动设置
      },
      body: formData,
    });
  },
};

// 导出类型定义，方便在其他地方使用
export type { AuthData, PostData, CommentData, PaginationParams };
