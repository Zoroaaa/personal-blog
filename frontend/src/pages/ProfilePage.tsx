/**
 * 个人中心页面
 * 
 * 功能：
 * - 用户信息展示和编辑
 * - 查看和管理自己的评论
 * - 查看自己的点赞文章
 * - 账号设置（密码修改、用户名修改）
 * - 账号删除
 * - 头像上传
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import type { User, Comment, PostListItem } from '../types';
import { format } from 'date-fns';

// ============= 辅助函数 =============

/**
 * 安全的日期格式化函数
 */
function formatDate(date: any, formatStr: string = 'yyyy-MM-dd HH:mm'): string {
  if (!date) return '未知时间';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return '未知时间';
    }
    
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Date format error:', error, 'Date:', date);
    return '未知时间';
  }
}

/**
 * 生成随机头像URL（当用户没有头像时使用）
 */
function getRandomAvatar(username: string): string {
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['blue', 'green', 'red', 'purple', 'orange'];
  const color = colors[hash % colors.length];
  const initial = username.charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${initial}&background=${color}&color=fff&size=128`;
}

// ============= 组件 =============

export function ProfilePage() {
  const { user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  
  // 状态管理
  const [activeTab, setActiveTab] = useState<'info' | 'comments' | 'likes' | 'settings'>('info');
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedPosts, setLikedPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState({
    user: true,
    comments: false,
    likes: false,
    update: false,
    delete: false
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    password: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  
  // 邮箱验证相关状态
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationCode, setShowVerificationCode] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // 更改邮箱相关状态
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  
  // 初始化数据
  useEffect(() => {
    if (user) {
      loadUserInfo();
      loadLikedPosts(); // 同时加载点赞数据，确保统计信息准确
    }
  }, [user]);
  
  // 加载用户信息
  const loadUserInfo = async () => {
    try {
      setLoading(prev => ({ ...prev, user: true }));
      setError(null);
      
      const response = await api.getMe();
      if (response.success && response.data) {
        setUserInfo(response.data.user);
        setFormData({
          displayName: response.data.user.displayName,
          bio: response.data.user.bio || '',
          password: '',
          newPassword: '',
          confirmPassword: ''
        });
        setAvatarPreview(response.data.user.avatarUrl || getRandomAvatar(response.data.user.username));
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
      setError('加载用户信息失败');
    } finally {
      setLoading(prev => ({ ...prev, user: false }));
    }
  };
  
  // 加载用户评论
  const loadUserComments = async () => {
    try {
      setLoading(prev => ({ ...prev, comments: true }));
      setError(null);
      
      const response = await api.getComments({
        userId: user?.id.toString() || '',
        page: 1,
        limit: 20
      });
      
      if (response.success && response.data) {
        const processedComments = (response.data.comments || []).map((comment: any) => ({
          ...comment,
          createdAt: comment.createdAt || comment.created_at,
          updatedAt: comment.updatedAt || comment.updated_at,
          postId: comment.postId || comment.post_id
        }));
        setComments(processedComments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
      setError('加载评论失败');
    } finally {
      setLoading(prev => ({ ...prev, comments: false }));
    }
  };
  
  // 加载用户点赞文章
  const loadLikedPosts = async () => {
    try {
      setLoading(prev => ({ ...prev, likes: true }));
      setError(null);
      
      const response = await api.getLikedPosts({
        page: '1',
        limit: '20'
      });
      
      if (response.success && response.data) {
        setLikedPosts(response.data.posts || []);
      }
    } catch (error) {
      console.error('Failed to load liked posts:', error);
      setError('加载点赞文章失败');
    } finally {
      setLoading(prev => ({ ...prev, likes: false }));
    }
  };
  
  // 切换标签时加载对应数据
  useEffect(() => {
    if (activeTab === 'comments') {
      loadUserComments();
    } else if (activeTab === 'likes') {
      loadLikedPosts();
    }
  }, [activeTab]);
  
  // 倒计时功能
  useEffect(() => {
    let interval: number;
    if (countdown > 0) {
      interval = window.setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [countdown]);
  
  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // 处理头像文件选择
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };
  
  // 更新用户资料
  const handleUpdateProfile = async () => {
    try {
      setLoading(prev => ({ ...prev, update: true }));
      setError(null);
      setSuccessMessage(null);
      
      // 先上传头像（如果有）
      let avatarUrl = userInfo?.avatarUrl;
      if (avatarFile) {
        const uploadResponse = await api.uploadImage(avatarFile);
        if (uploadResponse.success && uploadResponse.data) {
          avatarUrl = uploadResponse.data.url;
        }
      }
      
      // 更新用户资料
      const response = await api.updateProfile({
        displayName: formData.displayName,
        bio: formData.bio,
        avatarUrl
      });
      
      if (response.success && response.data) {
        setSuccessMessage('资料更新成功');
        await loadUserInfo(); // 重新加载用户信息
        // 更新authStore中的用户信息，确保页面上方的头像也能更新
        if (response.data.user) {
          setUser(response.data.user);
        }
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('更新资料失败');
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  };
  
  // 发送验证码
  const handleSendVerificationCode = async (type: 'reset_password' | 'delete_account' | 'change_email') => {
    if (!userInfo?.email) {
      setError('用户邮箱未设置，无法发送验证码');
      return;
    }
    
    setSendingCode(true);
    setError('');
    
    try {
      const emailToSend = type === 'change_email' ? newEmail : userInfo.email;
      
      if (type === 'change_email' && (!newEmail || newEmail === userInfo.email)) {
        setError('请输入新的邮箱地址');
        setSendingCode(false);
        return;
      }
      
      const response = await api.sendVerificationCode({
        email: emailToSend,
        type,
        username: userInfo.username
      });
      
      if (response.success) {
        setCountdown(60); // 60秒倒计时
        setShowVerificationCode(true);
        setError('');
      } else {
        throw new Error(response.error || '发送验证码失败');
      }
    } catch (err: any) {
      setError(err.message || '发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };
  
  // 修改密码
  const handleChangePassword = async () => {
    try {
      setLoading(prev => ({ ...prev, update: true }));
      setError(null);
      setSuccessMessage(null);
      
      if (formData.newPassword !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      
      if (!showVerificationCode || !verificationCode) {
        setError('请先获取并输入验证码');
        return;
      }
      
      // 调用修改密码API（带验证码）
      const response = await api.changePasswordWithCode({
        currentPassword: formData.password,
        newPassword: formData.newPassword,
        verificationCode
      });
      
      if (response.success) {
        setSuccessMessage('密码修改成功');
        setFormData(prev => ({
          ...prev,
          password: '',
          newPassword: '',
          confirmPassword: ''
        }));
        setVerificationCode('');
        setShowVerificationCode(false);
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      setError('修改密码失败');
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  };
  
  // 删除评论
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('确定要删除这条评论吗？')) {
      return;
    }
    
    try {
      const response = await api.deleteComment(commentId);
      if (response.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        setSuccessMessage('评论删除成功');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      setError('删除评论失败');
    }
  };
  
  // 更改邮箱
  const handleChangeEmail = async () => {
    try {
      setLoading(prev => ({ ...prev, update: true }));
      setError(null);
      setSuccessMessage(null);
      
      if (newEmail !== confirmNewEmail) {
        setError('两次输入的邮箱不一致');
        return;
      }
      
      if (!showVerificationCode || !verificationCode) {
        setError('请先获取并输入验证码');
        return;
      }
      
      if (newEmail === userInfo?.email) {
        setError('新邮箱与当前邮箱相同');
        return;
      }
      
      // 调用更改邮箱API（带验证码）
      const response = await api.changeEmailWithCode({
        newEmail,
        verificationCode
      });
      
      if (response.success) {
        setSuccessMessage('邮箱更改成功');
        setNewEmail('');
        setConfirmNewEmail('');
        setVerificationCode('');
        setShowVerificationCode(false);
        // 重新加载用户信息
        await loadUserInfo();
      }
    } catch (error) {
      console.error('Failed to change email:', error);
      setError('更改邮箱失败');
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  };
  
  // 删除账号
  const handleDeleteAccount = async () => {
    if (!confirm('确定要删除您的账号吗？此操作不可恢复！')) {
      return;
    }
    
    try {
      // 弹出密码输入框
      const password = prompt('请输入您的密码以确认删除账号：');
      if (!password) {
        return;
      }
      
      if (!showVerificationCode || !verificationCode) {
        setError('请先获取并输入验证码');
        return;
      }
      
      setLoading(prev => ({ ...prev, delete: true }));
      setError(null);
      
      // 调用删除账号API（带验证码）
      const response = await api.deleteAccountWithCode({
        password,
        verificationCode
      });
      if (response.success) {
        alert('账号删除成功');
        logout();
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      setError('删除账号失败，请检查密码和验证码是否正确');
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };
  
  // 渲染用户信息标签页
  const renderInfoTab = () => {
    if (loading.user) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {/* 头像和基本信息 */}
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
          {/* 头像 */}
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <img 
                src={avatarPreview || userInfo?.avatarUrl || getRandomAvatar(userInfo?.username || '')} 
                alt="用户头像" 
                className="w-32 h-32 rounded-full object-cover border-4 border-card shadow-lg"
              />
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <h2 className="text-2xl font-bold text-foreground">{formData.displayName || userInfo?.displayName}</h2>
            <p className="text-muted-foreground">@{userInfo?.username}</p>
            <p className="text-muted-foreground text-sm mt-1">{userInfo?.email}</p>
          </div>
          
          {/* 个人资料编辑 */}
          <div className="flex-1 w-full">
            <h3 className="text-xl font-semibold text-foreground mb-4">个人资料</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  显示名称
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  个人简介
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="介绍一下自己..."
                />
                <p className="text-xs text-muted-foreground mt-1">个人简介会显示在您的公开资料页面，让其他用户了解您</p>
              </div>
              
              <div>
                <button
                  type="button"
                  onClick={handleUpdateProfile}
                  disabled={loading.update}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading.update ? '更新中...' : '更新资料'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* 用户统计信息 */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">统计信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{userInfo?.postCount || 0}</p>
              <p className="text-muted-foreground text-sm">发布文章</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-green-600">{userInfo?.commentCount || 0}</p>
              <p className="text-muted-foreground text-sm">发表评论</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-red-600">{likedPosts.length}</p>
              <p className="text-muted-foreground text-sm">点赞文章</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{userInfo ? 1 : 0}</p>
              <p className="text-muted-foreground text-sm">账号等级</p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // 渲染评论标签页
  const renderCommentsTab = () => {
    if (loading.comments) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      );
    }
    
    if (comments.length === 0) {
      return (
        <div className="text-center py-16 bg-muted rounded-lg">
          <svg className="mx-auto h-16 w-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-foreground">暂无评论</h3>
          <p className="mt-2 text-muted-foreground">您还没有发表过评论</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-foreground mb-2">{comment.content}</p>
                <div className="flex flex-col sm:flex-row sm:items-center text-sm space-y-2 sm:space-y-0 sm:space-x-4">
                  <Link 
                    to={`/posts/${comment.postId}`} 
                    className="text-blue-600 hover:underline"
                  >
                    查看文章
                  </Link>
                  <span className="text-muted-foreground">{formatDate(comment.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // 渲染点赞标签页
  const renderLikesTab = () => {
    if (loading.likes) {
      return (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      );
    }
    
    if (likedPosts.length === 0) {
      return (
        <div className="text-center py-16 bg-muted rounded-lg">
          <svg className="mx-auto h-16 w-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-foreground">暂无点赞</h3>
          <p className="mt-2 text-muted-foreground">您还没有点赞过文章</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {likedPosts.map((post) => (
          <Link 
            key={post.id} 
            to={`/posts/${post.slug || post.id}`} 
            className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
          >
            {post.coverImage && (
              <div className="h-40 overflow-hidden">
                <img 
                  src={post.coverImage} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                {post.title}
              </h3>
              <div className="flex items-center text-sm text-muted-foreground mt-2">
                <span>{formatDate(post.publishedAt)}</span>
                <span className="mx-2">•</span>
                <span>{post.viewCount} 次阅读</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };
  
  // 渲染设置标签页
  const renderSettingsTab = () => {
    return (
      <div className="space-y-8">
        {/* 密码修改 */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">密码修改</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                当前密码
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                新密码
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                确认新密码
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* 验证码 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                验证码
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入验证码"
                  disabled={!showVerificationCode}
                />
                <button
                  type="button"
                  onClick={() => handleSendVerificationCode('reset_password')}
                  disabled={sendingCode || countdown > 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                >
                  {sendingCode ? '发送中...' : 
                   countdown > 0 ? `${countdown}s后重发` : 
                   '发送验证码'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                验证码将发送到您的邮箱：{userInfo?.email}
              </p>
            </div>
            
            <div>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={loading.update}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading.update ? '修改中...' : '修改密码'}
              </button>
            </div>
          </form>
        </div>
        
        {/* 更改邮箱 */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">更改邮箱</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                当前邮箱
              </label>
              <input
                type="email"
                value={userInfo?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-border rounded-lg bg-muted focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                新邮箱
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入新的邮箱地址"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                确认新邮箱
              </label>
              <input
                type="email"
                value={confirmNewEmail}
                onChange={(e) => setConfirmNewEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="再次输入新的邮箱地址"
              />
            </div>
            
            {/* 验证码 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                验证码
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入验证码"
                  disabled={!showVerificationCode}
                />
                <button
                  type="button"
                  onClick={() => handleSendVerificationCode('change_email')}
                  disabled={sendingCode || countdown > 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                >
                  {sendingCode ? '发送中...' : 
                   countdown > 0 ? `${countdown}s后重发` : 
                   '发送验证码'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                验证码将发送到您的新邮箱：{newEmail}
              </p>
            </div>
            
            <div>
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={loading.update}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading.update ? '修改中...' : '更改邮箱'}
              </button>
            </div>
          </form>
        </div>
        
        {/* 账号删除 */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">账号管理</h3>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-lg font-medium text-red-800 mb-2">删除账号</h4>
              <p className="text-red-700 mb-4">
                一旦删除账号，所有数据将被永久删除，无法恢复。
              </p>
              
              {/* 验证码 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-red-800 mb-1">
                  验证码
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="flex-1 px-4 py-2 border border-red-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="输入验证码"
                    disabled={!showVerificationCode}
                  />
                  <button
                    type="button"
                    onClick={() => handleSendVerificationCode('delete_account')}
                    disabled={sendingCode || countdown > 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                  >
                    {sendingCode ? '发送中...' : 
                     countdown > 0 ? `${countdown}s后重发` : 
                     '发送验证码'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-red-600">
                  验证码将发送到您的邮箱：{userInfo?.email}
                </p>
              </div>
              
              <button
                onClick={handleDeleteAccount}
                disabled={loading.delete}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading.delete ? '删除中...' : '删除账号'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // 渲染主内容
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">个人中心</h1>
        <p className="text-muted-foreground">管理您的个人信息和账号设置</p>
      </div>
      
      {/* 错误和成功消息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}
      
      {/* 标签页导航 */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          >
            个人信息
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'comments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          >
            我的评论
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'likes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          >
            我的点赞
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
          >
            账号设置
          </button>
        </nav>
      </div>
      
      {/* 标签页内容 */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        {activeTab === 'info' && renderInfoTab()}
        {activeTab === 'comments' && renderCommentsTab()}
        {activeTab === 'likes' && renderLikesTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
}
