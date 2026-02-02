// API基础URL配置
const API_URL = import.meta.env.VITE_API_URL || '/api';

// 开发模式日志
const isDevelopment = import.meta.env.DEV;

/**
 * 统一的API请求函数，包含完善的错误处理
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = localStorage.getItem('auth-storage');
  let parsedToken = null;
  
  if (token) {
    try {
      const parsed = JSON.parse(token);
      parsedToken = parsed.state?.token;
    } catch (e) {
      console.error('Failed to parse token:', e);
    }
  }
  
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (parsedToken) {
    headers['Authorization'] = `Bearer ${parsedToken}`;
  }

  const url = `${API_URL}${endpoint}`;
  
  if (isDevelopment) {
    console.log('API Request:', {
      method: options.method || 'GET',
      url,
      headers: { ...headers, Authorization: parsedToken ? 'Bearer [TOKEN]' : undefined }
    });
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // 重要：允许携带cookies
    });
    
    if (isDevelopment) {
      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        url
      });
    }
    
    // 处理204 No Content
    if (response.status === 204) {
      return null;
    }
    
    // 尝试解析JSON
    let data;
    try {
      data = await response.json();
    } catch (e) {
      // 如果不是JSON，尝试获取文本
      const text = await response.text();
      if (isDevelopment) {
        console.error('Failed to parse JSON response:', text);
      }
      throw new Error('Invalid JSON response from server');
    }
    
    // 检查HTTP状态
    if (!response.ok) {
      const error = data?.error || data?.message || 'Request failed';
      if (isDevelopment) {
        console.error('API Error:', {
          status: response.status,
          error,
          data
        });
      }
      throw new Error(error);
    }
    
    return data;
  } catch (error) {
    // 网络错误或其他错误
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('Network error - cannot reach backend:', url);
      throw new Error('无法连接到服务器，请检查网络连接或后端服务是否正常运行');
    }
    
    if (isDevelopment) {
      console.error('API Request Failed:', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    throw error;
  }
}

/**
 * API方法集合
 */
export const api = {
  // 健康检查
  health: () => apiRequest('/health'),
  
  // 认证相关
  register: (data: any) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  login: (data: any) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  logout: () => apiRequest('/auth/logout', { 
    method: 'POST' 
  }),
  
  getMe: () => apiRequest('/auth/me'),
  
  // 文章相关
  getPosts: (params?: any) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiRequest(`/posts${query}`);
  },
  
  getPost: (slug: string) => apiRequest(`/posts/${slug}`),
  
  createPost: (data: any) => apiRequest('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updatePost: (id: number, data: any) => apiRequest(`/posts/${id}`, {
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
  
  createComment: (data: any) => apiRequest('/comments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  deleteComment: (id: number) => apiRequest(`/comments/${id}`, {
    method: 'DELETE',
  }),
  
  // 分类和标签
  getCategories: () => apiRequest('/categories'),
  
  getTags: () => apiRequest('/categories/tags'),
};

/**
 * 测试API连接
 */
export async function testApiConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    return {
      success: response.ok,
      message: response.ok ? 'API连接成功' : 'API返回错误',
      details: data
    };
  } catch (error) {
    return {
      success: false,
      message: '无法连接到API服务器',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
