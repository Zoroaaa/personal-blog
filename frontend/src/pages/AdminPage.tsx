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
      const response = await api.getUsers({ page: '1', limit: '100' });
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
                  setEditingPostId(null);
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
              // 使用新的PostEditor组件
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
        // 使用新的CategoryManager组件
        return <CategoryManager />;
      
      case 'tags':
        // 使用新的TagManager组件
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
              <div className="space-y-8">
                {/* 基本设置 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">基本设置</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">网站名称</label>
                    <input
                      type="text"
                      value={localConfig.site_name || ''}
                      onChange={(e) => setLocalConfig({...localConfig, site_name: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">网站副标题</label>
                    <input
                      type="text"
                      value={localConfig.site_subtitle || ''}
                      onChange={(e) => setLocalConfig({...localConfig, site_subtitle: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">网站描述</label>
                    <textarea
                      value={localConfig.site_description || ''}
                      onChange={(e) => setLocalConfig({...localConfig, site_description: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                      rows={3}
                    />
                  </div>
                </div>
                
                {/* 作者信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">作者信息</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">作者名称</label>
                    <input
                      type="text"
                      value={localConfig.author_name || ''}
                      onChange={(e) => setLocalConfig({...localConfig, author_name: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">作者简介</label>
                    <textarea
                      value={localConfig.author_bio || ''}
                      onChange={(e) => setLocalConfig({...localConfig, author_bio: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground"
                      rows={3}
                    />
                  </div>
                </div>
                
                {/* 功能开关 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">功能开关</h3>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-foreground">启用评论</span>
                    <input
                      type="checkbox"
                      checked={localConfig.feature_comments === 'true' || localConfig.feature_comments === true}
                      onChange={(e) => setLocalConfig({...localConfig, feature_comments: e.target.checked.toString()})}
                      className="w-4 h-4"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-foreground">启用搜索</span>
                    <input
                      type="checkbox"
                      checked={localConfig.feature_search === 'true' || localConfig.feature_search === true}
                      onChange={(e) => setLocalConfig({...localConfig, feature_search: e.target.checked.toString()})}
                      className="w-4 h-4"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-foreground">启用点赞</span>
                    <input
                      type="checkbox"
                      checked={localConfig.feature_like === 'true' || localConfig.feature_like === true}
                      onChange={(e) => setLocalConfig({...localConfig, feature_like: e.target.checked.toString()})}
                      className="w-4 h-4"
                    />
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
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">管理后台</h1>
          <p className="text-muted-foreground mt-2">欢迎回来，{user.displayName || user.username}</p>
        </div>
        
        {/* 导航标签页 */}
        <div className="border-b border-border overflow-x-auto">
          <nav className="flex space-x-6 min-w-max">
            {
              [
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
