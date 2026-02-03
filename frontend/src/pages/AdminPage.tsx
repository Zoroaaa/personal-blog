import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

// 定义管理后台的标签页类型
type AdminTab = 'posts' | 'comments' | 'users' | 'analytics' | 'settings';

// 定义评论状态类型
type CommentStatus = 'approved' | 'pending' | 'spam';

// 定义用户角色类型
type UserRole = 'admin' | 'user';

export function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // 当前活动的标签页
  const [activeTab, setActiveTab] = useState<AdminTab>('posts');
  
  // 文章创建状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [postStatus, setPostStatus] = useState<'draft' | 'published'>('draft');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
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
  
  // 系统设置状态
  const [settings, setSettings] = useState<any>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  
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
  
  // 加载系统设置
  useEffect(() => {
    if (activeTab === 'settings') {
      loadSettings();
    }
  }, [activeTab]);
  
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
  
  // 加载系统设置
  const loadSettings = async () => {
    setSettingsLoading(true);
    setSettingsError('');
    try {
      const response = await api.getSystemSettings();
      setSettings(response.data);
    } catch (err: any) {
      setSettingsError(err.message || '加载系统设置失败');
    } finally {
      setSettingsLoading(false);
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
  
  // 保存系统设置
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess(false);
    setSettingsLoading(true);
    
    try {
      await api.updateSystemSettings(settings);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setSettingsError(err.message || '保存设置失败');
    } finally {
      setSettingsLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    
    try {
      await api.createPost({
        title,
        content,
        summary,
        status: postStatus,
      });
      
      setSuccess(true);
      setTitle('');
      setContent('');
      setSummary('');
      setPostStatus('draft');
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || '创建失败');
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
            <h2 className="text-2xl font-bold mb-4">创建文章</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                文章创建成功!
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  摘要
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  内容 (支持Markdown)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 font-mono"
                  rows={20}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  状态
                </label>
                <select
                  value={postStatus}
                  onChange={(e) => setPostStatus(e.target.value as 'draft' | 'published')}
                  className="border rounded-lg px-3 py-2"
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
                  {loading ? '创建中...' : '创建文章'}
                </button>
              </div>
            </form>
          </div>
        );
      
      case 'comments':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">评论管理</h2>
            
            {commentsError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {commentsError}
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      内容
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      文章
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {comment.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {comment.content.substring(0, 50)}{comment.content.length > 50 ? '...' : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {comment.user?.username || '未知用户'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {comment.post?.title || '未知文章'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={comment.status}
                            onChange={(e) => updateCommentStatus(comment.id, e.target.value as CommentStatus)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="approved">已批准</option>
                            <option value="pending">待审核</option>
                            <option value="spam">垃圾评论</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {/* 删除评论逻辑 */}}
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
        );
      
      case 'users':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">用户管理</h2>
            
            {usersError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {usersError}
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      邮箱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      注册时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {userItem.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {userItem.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {userItem.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={userItem.role}
                            onChange={(e) => updateUserRole(userItem.id, e.target.value as UserRole)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="user">普通用户</option>
                            <option value="admin">管理员</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(userItem.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {/* 删除用户逻辑 */}}
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
        );
      
      case 'analytics':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">数据分析</h2>
            
            {analyticsError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
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
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="text-sm font-medium text-gray-500">总文章数</h3>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalPosts}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="text-sm font-medium text-gray-500">总评论数</h3>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalComments}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="text-sm font-medium text-gray-500">总用户数</h3>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="text-sm font-medium text-gray-500">总浏览量</h3>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalViews}</p>
                  </div>
                </div>
                
                {/* 最近文章 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">最近文章</h3>
                  <div className="space-y-2">
                    {analytics.recentPosts && analytics.recentPosts.map((post: any) => (
                      <div key={post.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border">
                        <span className="text-sm font-medium">{post.title}</span>
                        <span className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 最近评论 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">最近评论</h3>
                  <div className="space-y-2">
                    {analytics.recentComments && analytics.recentComments.map((comment: any) => (
                      <div key={comment.id} className="p-3 bg-white rounded-lg shadow-sm border">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium">{comment.user?.username || '匿名用户'}</span>
                          <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
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
            <h2 className="text-2xl font-bold mb-4">系统设置</h2>
            
            {settingsError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {settingsError}
              </div>
            )}
            
            {settingsSuccess && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                设置保存成功!
              </div>
            )}
            
            <form onSubmit={saveSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  网站名称
                </label>
                <input
                  type="text"
                  value={settings.siteName || ''}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  网站描述
                </label>
                <textarea
                  value={settings.siteDescription || ''}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  网站关键词
                </label>
                <input
                  type="text"
                  value={settings.siteKeywords || ''}
                  onChange={(e) => setSettings({ ...settings, siteKeywords: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="用逗号分隔"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  每页文章数量
                </label>
                <input
                  type="number"
                  value={settings.postsPerPage || 10}
                  onChange={(e) => setSettings({ ...settings, postsPerPage: parseInt(e.target.value) })}
                  className="border rounded-lg px-3 py-2"
                  min="1"
                  max="50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  允许评论
                </label>
                <input
                  type="checkbox"
                  checked={settings.allowComments !== false}
                  onChange={(e) => setSettings({ ...settings, allowComments: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {settingsLoading ? '保存中...' : '保存设置'}
                </button>
              </div>
            </form>
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
          <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
          <p className="text-gray-600 mt-2">欢迎回来，{user.displayName || user.username}</p>
        </div>
        
        {/* 导航标签页 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'posts' as AdminTab, label: '文章管理' },
              { id: 'comments' as AdminTab, label: '评论管理' },
              { id: 'users' as AdminTab, label: '用户管理' },
              { id: 'analytics' as AdminTab, label: '数据分析' },
              { id: 'settings' as AdminTab, label: '系统设置' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* 标签页内容 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {renderTabContent()}
        </div>
        
        {/* 底部操作 */}
        <div className="flex justify-end">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
