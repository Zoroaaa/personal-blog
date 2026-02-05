import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useSiteConfig } from '../hooks/useSiteConfig';
// 导入新增的组件
import { CategoryManager } from '../components/CategoryManager';
import { TagManager } from '../components/TagManager';
import { PostEditor } from '../components/PostEditor';

// 定义管理后台的标签页类型 - 添加 categories 和 tags
type AdminTab = 'posts' | 'comments' | 'users' | 'analytics' | 'settings' | 'categories' | 'tags';

// 定义评论状态类型
type CommentStatus = 'approved' | 'pending' | 'spam';

// 定义用户角色类型
type UserRole = 'admin' | 'user';

export function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // 当前活动的标签页
  const [activeTab, setActiveTab] = useState<AdminTab>('posts');
  
  // 文章创建状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [postStatus, setPostStatus] = useState<'draft' | 'published'>('draft');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  
  // 文章列表状态
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  // 控制是否使用旧版表单（用于保留图片上传功能）
  const [useOldEditor, setUseOldEditor] = useState(false);
  
  // 评论管理状态
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState('');
  
  // 用户管理状态
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  
  // 数据分析状态
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  
  // 统一设置状态
  const { config, updateConfig, loading: configLoading } = useSiteConfig();
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(config);
  const [updating, setUpdating] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  
  // 检查权限
  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">无权限访问</h1>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }
  
  // 处理编辑文章
  useEffect(() => {
    const editPostId = searchParams.get('edit');
    if (editPostId) {
      loadPostForEdit(parseInt(editPostId));
    }
  }, [searchParams]);
  
  // 加载文章列表
  useEffect(() => {
    if (activeTab === 'posts' && !showCreateForm) {
      loadPosts();
    }
  }, [activeTab, showCreateForm]);
  
  // 加载文章详情用于编辑
  const loadPostForEdit = async (postId: number) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.getPostById(postId);
      if (response.success && response.data) {
        setTitle(response.data.title);
        setContent(response.data.content);
        setSummary(response.data.summary || '');
        setCoverImage(response.data.coverImage || response.data.cover_image || '');
        setPostStatus(response.data.status as 'draft' | 'published');
        setEditingPostId(postId);
        setShowCreateForm(true);
      }
    } catch (err: any) {
      setError(err.message || '加载文章失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 加载文章列表
  const loadPosts = async () => {
    try {
      setPostsLoading(true);
      setPostsError('');
      
      const response = await api.getAdminPosts({ limit: '100' });
      if (response.success && response.data) {
        setPosts(response.data.posts || []);
      }
    } catch (err: any) {
      setPostsError(err.message || '加载文章列表失败');
    } finally {
      setPostsLoading(false);
    }
  };
  
  // 删除文章
  const handleDeletePost = async (postId: number) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    
    try {
      setLoading(true);
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      await api.deletePost(postId);
      alert('文章删除成功');
    } catch (err: any) {
      await loadPosts();
      setError(err.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 加载评论数据
  useEffect(() => {
    if (activeTab === 'comments') {
      loadComments();
    }
  }, [activeTab]);
  
  // 加载用户数据
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);
  
  // 加载分析数据
  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab]);
  
  // 监听配置变化
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);
  
  // 加载评论
  const loadComments = async () => {
    setCommentsLoading(true);
    setCommentsError('');
    try {
      const response = await api.getAdminComments({ page: '1', limit: '10' });
      setComments(response.data.comments || []);
    } catch (err: any) {
      setCommentsError(err.message || '加载评论失败');
    } finally {
      setCommentsLoading(false);
    }
  };
  
  // 加载用户
  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const response = await api.getAdminUsers({ page: '1', limit: '100' });
      setUsers(response.data.users || []);
    } catch (err: any) {
      setUsersError(err.message || '加载用户失败');
    } finally {
      setUsersLoading(false);
    }
  };
  
  // 加载分析数据
  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const response = await api.getAnalytics();
      setAnalytics(response.data);
    } catch (err: any) {
      setAnalyticsError(err.message || '加载数据失败');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // 更新评论状态
  const handleUpdateCommentStatus = async (commentId: number, status: CommentStatus) => {
    try {
      await api.updateCommentStatus(commentId, status);
      await loadComments();
    } catch (err: any) {
      setCommentsError(err.message || '更新评论状态失败');
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    
    try {
      await api.deleteComment(commentId);
      await loadComments();
    } catch (err: any) {
      setCommentsError(err.message || '删除评论失败');
    }
  };

  // 更新用户角色
  const handleUpdateUserRole = async (userId: number, role: UserRole) => {
    try {
      await api.updateUserRole(userId, role);
      await loadUsers();
    } catch (err: any) {
      setUsersError(err.message || '更新用户角色失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    
    try {
      if (editingPostId) {
        await api.updatePost(editingPostId, {
          title,
          content,
          summary,
          coverImage,
          status: postStatus,
        });
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setShowCreateForm(false);
          setEditingPostId(null);
          setTitle('');
          setContent('');
          setSummary('');
          setCoverImage('');
          setPostStatus('draft');
          loadPosts();
        }, 1000);
      } else {
        await api.createPost({
          title,
          content,
          summary,
          coverImage,
          status: postStatus,
        });
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setTitle('');
          setContent('');
          setSummary('');
          setCoverImage('');
          setPostStatus('draft');
          setShowCreateForm(false);
          loadPosts();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 渲染不同的标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-foreground">文章管理</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCreateForm(true);
                    setUseOldEditor(true);
                    setEditingPostId(null);
                    setTitle('');
                    setContent('');
                    setSummary('');
                    setCoverImage('');
                    setPostStatus('draft');
                    setError('');
                    setSuccess(false);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  传统编辑器(支持上传)
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(true);
                    setUseOldEditor(false);
                    setEditingPostId(null);
                    setError('');
                    setSuccess(false);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  新建文章
                </button>
              </div>
            </div>
            
            {showCreateForm ? (
              useOldEditor ? (
                // 原有的表单编辑器（支持图片上传）
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-foreground">
                      {editingPostId ? '编辑文章' : '创建文章'}（传统编辑器）
                    </h3>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingPostId(null);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕ 关闭
                    </button>
                  </div>
                  
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded">
                      {error}
                    </div>
                  )}
                  
                  {success && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded">
                      操作成功！
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">标题</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border border-border bg-card rounded-lg px-3 py-2"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">摘要</label>
                      <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full border border-border bg-card rounded-lg px-3 py-2"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        封面图片
                      </label>
                      <div className="flex space-x-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                setLoading(true);
                                const response = await api.uploadImage(file);
                                if (response.success && response.data) {
                                  setCoverImage(response.data.url);
                                  alert('图片上传成功: ' + response.data.url);
                                }
                              } catch (error) {
                                setError('上传失败: ' + (error instanceof Error ? error.message : '未知错误'));
                              } finally {
                                setLoading(false);
                              }
                            }
                          }}
                          className="border border-border bg-card rounded-lg px-3 py-2"
                        />
                      </div>
                      {coverImage && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground mb-1">当前封面图片:</p>
                          <img src={coverImage} alt="当前封面" className="max-w-xs h-auto rounded" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        内容 (支持Markdown)
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onPaste={async (e) => {
                          const items = e.clipboardData.items;
                          for (let i = 0; i < items.length; i++) {
                            if (items[i].type.indexOf('image') === 0) {
                              e.preventDefault();
                              const file = items[i].getAsFile();
                              if (file) {
                                try {
                                  setLoading(true);
                                  const response = await api.uploadImage(file);
                                  if (response.success && response.data) {
                                    const imageUrl = response.data.url;
                                    const markdownImage = `![图片](${imageUrl})`;
                                    setContent(prev => prev + markdownImage);
                                    alert('图片粘贴成功');
                                  }
                                } catch (error) {
                                  setError('图片粘贴失败: ' + (error instanceof Error ? error.message : '未知错误'));
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }
                          }
                        }}
                        className="w-full border border-border bg-card rounded-lg px-3 py-2 font-mono"
                        rows={20}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">状态</label>
                      <select
                        value={postStatus}
                        onChange={(e) => setPostStatus(e.target.value as 'draft' | 'published')}
                        className="w-full border border-border bg-card rounded-lg px-3 py-2"
                      >
                        <option value="draft">草稿</option>
                        <option value="published">发布</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? '提交中...' : (editingPostId ? '更新' : '创建')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          setEditingPostId(null);
                        }}
                        className="px-6 py-2 border border-border rounded-lg hover:bg-muted"
                      >
                        取消
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // 新的PostEditor组件（带分类和标签选择）
                <div>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingPostId(null);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕ 关闭
                    </button>
                  </div>
                  <PostEditor
                    postId={editingPostId || undefined}
                    onSave={() => {
                      setShowCreateForm(false);
                      setEditingPostId(null);
                      loadPosts();
                    }}
                    onCancel={() => {
                      setShowCreateForm(false);
                      setEditingPostId(null);
                    }}
                  />
                </div>
              )
            ) : (
              // 文章列表
              <div>
                {postsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-muted-foreground">加载中...</p>
                  </div>
                ) : postsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    {postsError}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="text-center py-12 bg-muted rounded-lg">
                    <p className="text-muted-foreground">还没有任何文章</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              {post.title}
                            </h3>
                            {post.summary && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {post.summary}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className={`px-2 py-1 rounded ${
                                post.status === 'published' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {post.status === 'published' ? '已发布' : '草稿'}
                              </span>
                              {post.category_name && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  {post.category_name}
                                </span>
                              )}
                              {post.tags && post.tags.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                  </svg>
                                  {post.tags.map((tag: any) => tag.name).join(', ')}
                                </span>
                              )}
                              <span>{post.view_count || 0} 次浏览</span>
                              <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => loadPostForEdit(post.id)}
                              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
      case 'categories':
        return <CategoryManager />;
      
      case 'tags':
        return <TagManager />;
      
      case 'comments':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">评论管理</h2>
            
            {commentsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-muted-foreground">加载中...</p>
              </div>
            ) : commentsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {commentsError}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12 bg-muted rounded-lg">
                <p className="text-muted-foreground">还没有任何评论</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border border-border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-foreground">
                        {comment.display_name || comment.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(comment.created_at).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-foreground mb-3">{comment.content}</p>
                    <div className="flex gap-2">
                      {comment.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateCommentStatus(comment.id, 'approved')}
                          className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                        >
                          批准
                        </button>
                      )}
                      {comment.status !== 'spam' && (
                        <button
                          onClick={() => handleUpdateCommentStatus(comment.id, 'spam')}
                          className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                        >
                          标记垃圾
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'users':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">用户管理</h2>
            
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-muted-foreground">加载中...</p>
              </div>
            ) : usersError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {usersError}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 bg-muted rounded-lg">
                <p className="text-muted-foreground">还没有任何用户</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">用户名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">邮箱</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">角色</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">注册时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-4 py-3 text-sm text-foreground">{u.username}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{u.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            u.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {u.role === 'admin' ? '管理员' : '用户'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {u.id !== user.userId && (
                            <button
                              onClick={() => handleUpdateUserRole(
                                u.id, 
                                u.role === 'admin' ? 'user' : 'admin'
                              )}
                              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                            >
                              {u.role === 'admin' ? '设为用户' : '设为管理员'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      
      case 'analytics':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">数据分析</h2>
            
            {analyticsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-muted-foreground">加载中...</p>
              </div>
            ) : analyticsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {analyticsError}
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="text-sm text-muted-foreground mb-2">总文章数</div>
                  <div className="text-3xl font-bold text-foreground">
                    {analytics.totalPosts || 0}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="text-sm text-muted-foreground mb-2">总浏览量</div>
                  <div className="text-3xl font-bold text-foreground">
                    {analytics.totalViews || 0}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="text-sm text-muted-foreground mb-2">总评论数</div>
                  <div className="text-3xl font-bold text-foreground">
                    {analytics.totalComments || 0}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="text-sm text-muted-foreground mb-2">总用户数</div>
                  <div className="text-3xl font-bold text-foreground">
                    {analytics.totalUsers || 0}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-muted rounded-lg">
                <p className="text-muted-foreground">暂无数据</p>
              </div>
            )}
          </div>
        );
      
      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground mb-6">统一设置</h2>
            
            {settingsSuccess && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 rounded-lg">
                {settingsSuccess}
              </div>
            )}
            
            {configLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-muted-foreground">加载配置中...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 基本设置 */}
                <div className="border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-foreground">基本设置</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">网站名称</label>
                      <input
                        type="text"
                        value={localConfig.site_name || ''}
                        onChange={(e) => setLocalConfig({...localConfig, site_name: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">网站副标题</label>
                      <input
                        type="text"
                        value={localConfig.site_subtitle || ''}
                        onChange={(e) => setLocalConfig({...localConfig, site_subtitle: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">网站Logo</label>
                      <input
                        type="text"
                        value={localConfig.site_logo || ''}
                        onChange={(e) => setLocalConfig({...localConfig, site_logo: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">网站描述</label>
                      <textarea
                        value={localConfig.site_description || ''}
                        onChange={(e) => setLocalConfig({...localConfig, site_description: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">网站关键词</label>
                      <input
                        type="text"
                        value={localConfig.site_keywords || ''}
                        onChange={(e) => setLocalConfig({...localConfig, site_keywords: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">每页文章数量</label>
                      <input
                        type="number"
                        value={localConfig.posts_per_page || 10}
                        onChange={(e) => setLocalConfig({...localConfig, posts_per_page: parseInt(e.target.value) || 0})}
                        min="1"
                        max="50"
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                  </div>
                </div>
                
                {/* 作者信息 */}
                <div className="border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-foreground">作者信息</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">作者名称</label>
                      <input
                        type="text"
                        value={localConfig.author_name || ''}
                        onChange={(e) => setLocalConfig({...localConfig, author_name: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">作者头像</label>
                      <input
                        type="text"
                        value={localConfig.author_avatar || ''}
                        onChange={(e) => setLocalConfig({...localConfig, author_avatar: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">作者简介</label>
                      <textarea
                        value={localConfig.author_bio || ''}
                        onChange={(e) => setLocalConfig({...localConfig, author_bio: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                  </div>
                </div>
                
                {/* 主题配置 */}
                <div className="border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-foreground">主题配置</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">主色调</label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="color"
                          value={localConfig.theme_primary_color || '#3B82F6'}
                          onChange={(e) => setLocalConfig({...localConfig, theme_primary_color: e.target.value})}
                          className="h-10 w-16 rounded border border-border cursor-pointer"
                        />
                        <input
                          type="text"
                          value={localConfig.theme_primary_color || '#3B82F6'}
                          onChange={(e) => setLocalConfig({...localConfig, theme_primary_color: e.target.value})}
                          className="flex-1 px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">默认主题模式</label>
                      <select
                        value={localConfig.theme_default_mode || 'system'}
                        onChange={(e) => setLocalConfig({...localConfig, theme_default_mode: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      >
                        <option value="light">浅色</option>
                        <option value="dark">深色</option>
                        <option value="system">跟随系统</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* 功能设置 */}
                <div className="border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-foreground">功能设置</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">启用评论</label>
                      <input
                        type="checkbox"
                        checked={localConfig.feature_comments !== false}
                        onChange={(e) => setLocalConfig({...localConfig, feature_comments: e.target.checked})}
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">启用搜索</label>
                      <input
                        type="checkbox"
                        checked={localConfig.feature_search !== false}
                        onChange={(e) => setLocalConfig({...localConfig, feature_search: e.target.checked})}
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">启用点赞</label>
                      <input
                        type="checkbox"
                        checked={localConfig.feature_like !== false}
                        onChange={(e) => setLocalConfig({...localConfig, feature_like: e.target.checked})}
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">启用分享</label>
                      <input
                        type="checkbox"
                        checked={localConfig.feature_share !== false}
                        onChange={(e) => setLocalConfig({...localConfig, feature_share: e.target.checked})}
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">启用RSS</label>
                      <input
                        type="checkbox"
                        checked={localConfig.feature_rss !== false}
                        onChange={(e) => setLocalConfig({...localConfig, feature_rss: e.target.checked})}
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                    </div>
                  </div>
                </div>
                
                {/* 社交媒体 */}
                <div className="border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-foreground">社交媒体</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">GitHub</label>
                      <input
                        type="text"
                        value={localConfig.social_github || ''}
                        onChange={(e) => setLocalConfig({...localConfig, social_github: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Twitter</label>
                      <input
                        type="text"
                        value={localConfig.social_twitter || ''}
                        onChange={(e) => setLocalConfig({...localConfig, social_twitter: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">邮箱</label>
                      <input
                        type="text"
                        value={localConfig.social_email || ''}
                        onChange={(e) => setLocalConfig({...localConfig, social_email: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                  </div>
                </div>
                
                {/* 页脚设置 */}
                <div className="border border-border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-foreground">页脚设置</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">品牌名称</label>
                      <input
                        type="text"
                        value={localConfig.footer_brand_name || ''}
                        onChange={(e) => setLocalConfig({...localConfig, footer_brand_name: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">页脚描述</label>
                      <input
                        type="text"
                        value={localConfig.footer_description || ''}
                        onChange={(e) => setLocalConfig({...localConfig, footer_description: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">页脚文本</label>
                      <input
                        type="text"
                        value={localConfig.footer_text || ''}
                        onChange={(e) => setLocalConfig({...localConfig, footer_text: e.target.value})}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">快速链接 (JSON格式)</label>
                      <textarea
                        value={JSON.stringify(localConfig.footer_links || {"首页": "/", "关于": "/about"}, null, 2)}
                        onChange={(e) => {
                          try {
                            const value = JSON.parse(e.target.value);
                            setLocalConfig({...localConfig, footer_links: value});
                          } catch (error) {
                            // 忽略无效JSON
                          }
                        }}
                        rows={4}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground font-mono text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">技术栈 (JSON格式)</label>
                      <textarea
                        value={JSON.stringify(localConfig.footer_tech_stack || ["React + TypeScript", "Cloudflare Workers", "Tailwind CSS"], null, 2)}
                        onChange={(e) => {
                          try {
                            const value = JSON.parse(e.target.value);
                            setLocalConfig({...localConfig, footer_tech_stack: value});
                          } catch (error) {
                            // 忽略无效JSON
                          }
                        }}
                        rows={4}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground font-mono text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">显示技术支持</label>
                      <input
                        type="checkbox"
                        checked={localConfig.footer_show_powered_by !== false}
                        onChange={(e) => setLocalConfig({...localConfig, footer_show_powered_by: e.target.checked})}
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                    </div>
                  </div>
                </div>
                
                {/* 保存按钮 */}
                <div className="flex justify-center mt-8">
                  <button
                    onClick={async () => {
                      try {
                        setUpdating('all');
                        const promises = Object.entries(localConfig).map(async ([key, value]) => {
                          if (value !== config[key]) {
                            await updateConfig(key, value);
                          }
                        });
                        await Promise.all(promises);
                        setSettingsSuccess('所有配置已成功更新');
                        setTimeout(() => setSettingsSuccess(null), 3000);
                      } catch (error) {
                        console.error('更新配置失败:', error);
                        alert('更新配置失败，请重试');
                      } finally {
                        setUpdating(null);
                      }
                    }}
                    disabled={configLoading || updating !== null}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {configLoading ? '加载中...' : updating ? '保存中...' : '保存所有设置'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">管理后台</h1>
          <p className="text-muted-foreground mt-2">欢迎回来，{user.displayName || user.username}</p>
        </div>
        
        <div className="border-b border-border overflow-x-auto">
          <nav className="flex space-x-6 min-w-max">
            {[
              { id: 'posts' as AdminTab, label: '文章管理', icon: '📝' },
              { id: 'categories' as AdminTab, label: '分类管理', icon: '🏷️' },
              { id: 'tags' as AdminTab, label: '标签管理', icon: '#️⃣' },
              { id: 'comments' as AdminTab, label: '评论管理', icon: '💬' },
              { id: 'users' as AdminTab, label: '用户管理', icon: '👥' },
              { id: 'analytics' as AdminTab, label: '数据分析', icon: '📊' },
              { id: 'settings' as AdminTab, label: '统一设置', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <div className="bg-card rounded-lg shadow-sm p-6">
          {renderTabContent()}
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-border rounded-lg hover:bg-muted"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
