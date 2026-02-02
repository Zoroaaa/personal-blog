const API_URL = import.meta.env.VITE_API_URL || '/api';

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
      // ignore
    }
  }
  
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (parsedToken) {
    headers['Authorization'] = `Bearer ${parsedToken}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

export const api = {
  // 保持原有实现，使用 any 类型避免类型冲突
  register: (data: any) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  login: (data: any) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  
  getMe: () => apiRequest('/auth/me'),
  
  getPosts: (params?: any) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/posts${query ? '?' + query : ''}`);
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
  
  getComments: (postId: number) => apiRequest(`/comments?postId=${postId}`),
  
  createComment: (data: any) => apiRequest('/comments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  deleteComment: (id: number) => apiRequest(`/comments/${id}`, {
    method: 'DELETE',
  }),
  
  getCategories: () => apiRequest('/categories'),
  
  getTags: () => apiRequest('/categories/tags'),
};
