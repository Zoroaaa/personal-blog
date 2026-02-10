import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
// 导入新增的组件
import { CategoryManager } from '../components/CategoryManager';
import { TagManager } from '../components/TagManager';
import { EnhancedPostEditor } from '../components/EnhancedPostEditor';
import { transformPost, transformCommentList, transformUserList } from '../utils/apiTransformer';
import { useToast } from '../components/Toast';

// 定义管理后台的标签页类型 - 添加 categories 和 tags
type AdminTab = 'posts' | 'comments' | 'users' | 'analytics' | 'categories' | 'tags';

// 定义评论状态类型
type CommentStatus = 'approved' | 'pending' | 'spam';

// 定义用户角色类型
type UserRole = 'admin' | 'user';

export function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  
  // 当前活动的标签页
  const [activeTab, setActiveTab] = useState<AdminTab>('posts');
  
  // 文章创建状态 (保留状态但使用下划线前缀表示暂时未使用)
  const [_title, _setTitle] = useState('');
  const [_content, _setContent] = useState('');
  const [_summary, _setSummary] = useState('');
  const [_coverImage, _setCoverImage] = useState('');
  const [_postStatus, _setPostStatus] = useState<'draft' | 'published'>('draft');
  const [_loading, setLoading] = useState(false);
  const [_error, setError] = useState('');
  const [_success, _setSuccess] = useState(false);
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
      // setError('');
      
      const response = await api.getPostById(postId);
      if (response.success && response.data) {
        const post = transformPost(response.data);
        // 这些状态变量暂时未使用，但保留以备将来需要
        _setTitle(post.title);
        _setContent(post.content);
        _setSummary(post.summary || '');
        _setCoverImage(post.coverImage || '');
        _setPostStatus(post.status as 'draft' | 'published');
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
        const transformedPosts = (response.data.posts || []).map((post: any) => transformPost(post));
        setPosts(transformedPosts);
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
      showSuccess('文章删除成功');
    } catch (err: any) {
      // 如果删除失败，重新加载列表以恢复正确的状态
      await loadPosts();
      setError(err.message || '删除失败');
      showError(err.message || '删除失败');
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
  

  
  // 加载评论
  const loadComments = async () => {
    setCommentsLoading(true);
    setCommentsError('');
    try {
      const response = await api.getAdminComments({ page: '1', limit: '10' });
      setComments(transformCommentList(response.data?.comments || []));
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
      setUsers(transformUserList(response.data?.users || []));
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
                  // setError('');
                  // setSuccess(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                新建文章
              </button>
            </div>
            
            {showCreateForm ? (
              // 使用增强的文章编辑器组件
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
                <EnhancedPostEditor
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
                              {post.categoryName && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                  {post.categoryName}
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
                              <span>{post.viewCount || 0} 次浏览</span>
                              <span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '未知日期'}</span>
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
                          {comment.postTitle || comment.post?.title || '未知文章'}
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
                          {userItem.createdAt ? new Date(userItem.createdAt).toLocaleString() : '未知'}
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
                        <span className="text-xs text-muted-foreground">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '未知日期'}</span>
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
                          <span className="text-sm font-medium text-foreground">
                            {comment.displayName || comment.username || '匿名用户'}
                          </span>
                          <span className="text-xs text-muted-foreground">{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : '未知时间'}</span>
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
                { id: 'categories' as AdminTab, label: '分类管理' },
                { id: 'tags' as AdminTab, label: '标签管理' },
                { id: 'comments' as AdminTab, label: '评论管理' },
                { id: 'users' as AdminTab, label: '用户管理' },
                { id: 'analytics' as AdminTab, label: '数据分析' }
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
