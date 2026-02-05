import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useSiteConfig } from '../hooks/useSiteConfig';

// 定义管理后台的标签页类型
type AdminTab = 'posts' | 'comments' | 'users' | 'analytics' | 'settings';

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
        // 尝试从多个可能的字段中获取封面图片
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
      // 先从本地状态中移除该文章，立即更新UI
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      // 然后发送删除请求
      await api.deletePost(postId);
      alert('文章删除成功');
    } catch (err: any) {
      // 如果删除失败，重新加载列表以恢复正确的状态
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
  
  // 监听配置变化，确保localConfig与服务器配置保持同步
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);
  
  // 当切换到设置标签页时，确保配置已加载
  useEffect(() => {
    if (activeTab === 'settings' && !config) {
      // 配置会通过useSiteConfig自动加载
    }
  }, [activeTab, config]);
  
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
      const response = await api.getAdminUsers({ page: '1', limit: '10' });
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
      setAnalyticsError(err.message || '加载分析数据失败');
    } finally {
      setAnalyticsLoading(false);
    }
  };
  

  
  // 更新评论状态
  const updateCommentStatus = async (id: number, status: CommentStatus) => {
    try {
      await api.updateCommentStatus(id, status);
      loadComments();
    } catch (err: any) {
      setCommentsError(err.message || '更新评论状态失败');
    }
  };
  
  // 更新用户角色
  const updateUserRole = async (id: number, role: UserRole) => {
    try {
      await api.updateUserRole(id, role);
      loadUsers();
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
        // 编辑模式
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
          // 重置表单
          setTitle('');
          setContent('');
          setSummary('');
          setCoverImage('');
          setPostStatus('draft');
          // 重新加载文章列表，确保状态更新
          loadPosts();
        }, 1000);
      } else {
        // 创建模式
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
          // 重置表单
          setTitle('');
          setContent('');
          setSummary('');
          setCoverImage('');
          setPostStatus('draft');
          // 关闭创建表单，返回文章列表
          setShowCreateForm(false);
          // 重新加载文章列表，确保新文章显示
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
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  // 重置表单
                  setTitle('');
                  setContent('');
                  setSummary('');
                  setCoverImage('');
                  setPostStatus('draft');
                  setError('');
                  setSuccess(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                新建文章
              </button>
            </div>
            
            {showCreateForm ? (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4 text-foreground">{title ? '编辑文章' : '创建文章'}</h3>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded">
                    文章创建成功!
                  </div>
                )}
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  await handleSubmit(e);
                  if (success) {
                    setShowCreateForm(false);
                  }
                }} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      标题
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border border-border bg-card rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      摘要
                    </label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full border border-border bg-card rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      rows={2}
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
                                // 保存上传的图片URL到状态中
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
                                  // 将图片URL插入到内容中
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
                      className="w-full border border-border bg-card rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 font-mono"
                      rows={20}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      状态
                    </label>
                    <select
                      value={postStatus}
                      onChange={(e) => setPostStatus(e.target.value as 'draft' | 'published')}
                      className="border border-border bg-card rounded-lg px-3 py-2"
                    >
                      <option value="draft">草稿</option>
                      <option value="published">发布</option>
                    </select>
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? '保存中...' : (title ? '更新文章' : '创建文章')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                {postsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
                {postsError}
              </div>
            )}
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          标题
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          作者
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          状态
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          发布时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {postsLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center">
                            加载中...
                          </td>
                        </tr>
                      ) : posts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center">
                            暂无文章
                          </td>
                        </tr>
                      ) : (
                        posts.map((post) => (
                          <tr key={post.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                              {post.title}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {post.author_name || post.author_username || '未知'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded text-xs ${post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-muted text-foreground'}`}>
                                {post.status === 'published' ? '已发布' : '草稿'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {post.published_at || '未发布'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => loadPostForEdit(post.id)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'comments':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">评论管理</h2>
            
            {commentsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
                {commentsError}
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      内容
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      文章
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {commentsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        加载中...
                      </td>
                    </tr>
                  ) : comments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        暂无评论
                      </td>
                    </tr>
                  ) : (
                    comments.map((comment) => (
                      <tr key={comment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {comment.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {comment.content.substring(0, 50)}{comment.content.length > 50 ? '...' : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {comment.user?.username || comment.username || '未知用户'}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {comment.post_title || comment.post?.title || comment.postTitle || '未知文章'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={comment.status}
                            onChange={(e) => updateCommentStatus(comment.id, e.target.value as CommentStatus)}
                            className="border border-border bg-card rounded px-2 py-1 text-sm"
                          >
                            <option value="approved">已批准</option>
                            <option value="pending">待审核</option>
                            <option value="spam">垃圾评论</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={async () => {
                              try {
                                await api.deleteComment(comment.id);
                                loadComments();
                              } catch (error) {
                                setCommentsError('删除失败');
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      case 'users':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">用户管理</h2>
            
            {usersError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
                {usersError}
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      用户名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      邮箱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      注册时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        加载中...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        暂无用户
                      </td>
                    </tr>
                  ) : (
                    users.map((userItem) => (
                      <tr key={userItem.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {userItem.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {userItem.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {userItem.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={userItem.role}
                            onChange={(e) => updateUserRole(userItem.id, e.target.value as UserRole)}
                            className="border border-border bg-card rounded px-2 py-1 text-sm"
                          >
                            <option value="user">普通用户</option>
                            <option value="admin">管理员</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {userItem.created_at ? new Date(userItem.created_at).toLocaleString() : userItem.createdAt ? new Date(userItem.createdAt).toLocaleString() : '未知'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={async () => {
                              if (!confirm('确定要删除该用户吗？')) return;
                              try {
                                setUsersLoading(true);
                                await api.deleteUser(userItem.id);
                                // 先从本地状态中移除该用户，立即更新UI
                                setUsers(prevUsers => prevUsers.filter(user => user.id !== userItem.id));
                                // 然后重新加载列表以确保数据一致性
                                setTimeout(() => {
                                  loadUsers();
                                }, 500);
                                alert('用户删除成功');
                              } catch (err: any) {
                                setUsersError(err.message || '删除失败');
                              } finally {
                                setUsersLoading(false);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      case 'analytics':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">数据分析</h2>
            
            {analyticsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
                {analyticsError}
              </div>
            )}
            
            {analyticsLoading ? (
              <div className="text-center py-8">
                加载中...
              </div>
            ) : analytics ? (
              <div className="space-y-8">
                {/* 统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
                    <h3 className="text-sm font-medium text-muted-foreground">总文章数</h3>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalPosts}</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
                    <h3 className="text-sm font-medium text-muted-foreground">总评论数</h3>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalComments}</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
                    <h3 className="text-sm font-medium text-muted-foreground">总用户数</h3>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalUsers}</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
                    <h3 className="text-sm font-medium text-muted-foreground">总浏览量</h3>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalViews}</p>
                  </div>
                </div>
                
                {/* 最近文章 */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">最近文章</h3>
                  <div className="space-y-2">
                    {analytics.recentPosts && analytics.recentPosts.map((post: any) => (
                      <div key={post.id} className="flex items-center justify-between p-3 bg-card rounded-lg shadow-sm border border-border">
                        <span className="text-sm font-medium text-foreground">{post.title}</span>
                        <span className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 最近评论 */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">最近评论</h3>
                  <div className="space-y-2">
                    {analytics.recentComments && analytics.recentComments.map((comment: any) => (
                      <div key={comment.id} className="p-3 bg-card rounded-lg shadow-sm border border-border">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-foreground">{comment.user?.username || '匿名用户'}</span>
                          <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {comment.content.substring(0, 100)}{comment.content.length > 100 ? '...' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                暂无分析数据
              </div>
            )}
          </div>
        );
      
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">统一设置</h2>
              <p className="text-muted-foreground">管理网站的各项配置信息</p>
            </div>
            
            {settingsSuccess && (
              <div className="mb-6 px-4 py-3 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
                {settingsSuccess}
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 基本设置 */}
              <div className="border border-border rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-foreground">基本设置</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">网站名称</label>
                    <input
                      type="text"
                      value={localConfig.site_name || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, site_name: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">网站副标题</label>
                    <input
                      type="text"
                      value={localConfig.site_subtitle || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, site_subtitle: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">网站Logo</label>
                    <input
                      type="text"
                      value={localConfig.site_logo || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, site_logo: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">网站描述</label>
                    <textarea
                      value={localConfig.site_description || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, site_description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">网站关键词</label>
                    <input
                      type="text"
                      value={localConfig.site_keywords || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, site_keywords: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">每页文章数量</label>
                    <input
                      type="number"
                      value={localConfig.posts_per_page || 10}
                      onChange={(e) => setLocalConfig({ ...localConfig, posts_per_page: parseInt(e.target.value) || 0 })}
                      min="1"
                      max="50"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                      onChange={(e) => setLocalConfig({ ...localConfig, author_name: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">作者头像</label>
                    <input
                      type="text"
                      value={localConfig.author_avatar || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, author_avatar: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">作者简介</label>
                    <textarea
                      value={localConfig.author_bio || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, author_bio: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                        onChange={(e) => setLocalConfig({ ...localConfig, theme_primary_color: e.target.value })}
                        className="h-10 w-16 rounded border border-border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={localConfig.theme_primary_color || '#3B82F6'}
                        onChange={(e) => setLocalConfig({ ...localConfig, theme_primary_color: e.target.value })}
                        className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">默认主题模式</label>
                    <select
                      value={localConfig.theme_default_mode || 'system'}
                      onChange={(e) => setLocalConfig({ ...localConfig, theme_default_mode: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                      onChange={(e) => setLocalConfig({ ...localConfig, feature_comments: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">启用搜索</label>
                    <input
                      type="checkbox"
                      checked={localConfig.feature_search !== false}
                      onChange={(e) => setLocalConfig({ ...localConfig, feature_search: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">启用点赞</label>
                    <input
                      type="checkbox"
                      checked={localConfig.feature_like !== false}
                      onChange={(e) => setLocalConfig({ ...localConfig, feature_like: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">启用分享</label>
                    <input
                      type="checkbox"
                      checked={localConfig.feature_share !== false}
                      onChange={(e) => setLocalConfig({ ...localConfig, feature_share: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">启用RSS</label>
                    <input
                      type="checkbox"
                      checked={localConfig.feature_rss !== false}
                      onChange={(e) => setLocalConfig({ ...localConfig, feature_rss: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
                      onChange={(e) => setLocalConfig({ ...localConfig, social_github: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Twitter</label>
                    <input
                      type="text"
                      value={localConfig.social_twitter || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, social_twitter: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">邮箱</label>
                    <input
                      type="text"
                      value={localConfig.social_email || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, social_email: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                      onChange={(e) => setLocalConfig({ ...localConfig, footer_brand_name: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">页脚描述</label>
                    <input
                      type="text"
                      value={localConfig.footer_description || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, footer_description: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">页脚文本</label>
                    <input
                      type="text"
                      value={localConfig.footer_text || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, footer_text: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">快速链接 (JSON格式)</label>
                    <textarea
                      value={JSON.stringify(localConfig.footer_quick_links || { "首页": "/", "关于": "/about" }, null, 2)}
                      onChange={(e) => {
                        try {
                          const value = JSON.parse(e.target.value);
                          setLocalConfig({ ...localConfig, footer_quick_links: value });
                        } catch (error) {
                          // 忽略无效的JSON
                        }
                      }}
                      rows={4}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">技术栈 (JSON格式)</label>
                    <textarea
                      value={JSON.stringify(localConfig.footer_tech_stack || ["React + TypeScript", "Cloudflare Workers", "Tailwind CSS"], null, 2)}
                      onChange={(e) => {
                        try {
                          const value = JSON.parse(e.target.value);
                          setLocalConfig({ ...localConfig, footer_tech_stack: value });
                        } catch (error) {
                          // 忽略无效的JSON
                        }
                      }}
                      rows={4}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">显示技术支持</label>
                    <input
                      type="checkbox"
                      checked={localConfig.footer_show_powered_by !== false}
                      onChange={(e) => setLocalConfig({ ...localConfig, footer_show_powered_by: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* 保存按钮 */}
            <div className="flex justify-center mt-8">
              <button
                onClick={async () => {
                  try {
                    setUpdating('all');
                    
                    // 批量更新所有更改的配置项
                    const promises = Object.entries(localConfig).map(async ([key, value]) => {
                      if (value !== config[key]) {
                        await updateConfig(key, value);
                      }
                    });
                    
                    await Promise.all(promises);
                    setSettingsSuccess('所有配置已成功更新');
                    
                    // 3秒后清除成功消息
                    setTimeout(() => {
                      setSettingsSuccess(null);
                    }, 3000);
                  } catch (error) {
                    console.error('更新配置失败:', error);
                    alert('更新配置失败，请重试');
                  } finally {
                    setUpdating(null);
                  }
                }}
                disabled={configLoading || updating}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {configLoading ? '加载中...' : updating ? '保存中...' : '保存所有设置'}
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col space-y-8">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">管理后台</h1>
          <p className="text-muted-foreground mt-2">欢迎回来，{user.displayName || user.username}</p>
        </div>
        
        {/* 导航标签页 */}
        <div className="border-b border-border">
          <nav className="flex space-x-8">
            {
              [
                { id: 'posts' as AdminTab, label: '文章管理' },
                { id: 'comments' as AdminTab, label: '评论管理' },
                { id: 'users' as AdminTab, label: '用户管理' },
                { id: 'analytics' as AdminTab, label: '数据分析' },
                { id: 'settings' as AdminTab, label: '统一设置' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {tab.label}
                </button>
              ))
            }
          </nav>
        </div>
        
        {/* 标签页内容 */}
        <div className="bg-card rounded-lg shadow-sm p-6">
          {renderTabContent()}
        </div>
        
        {/* 底部操作 */}
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
