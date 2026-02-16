/**
 * 账号设置页面
 * 
 * 功能：
 * - 用户信息展示和编辑
 * - 头像上传
 * - 密码修改
 * - 账号删除
 * - 统计信息展示
 * 
 * @author 博客系统
 * @version 2.0.0
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import { useVerificationCountdown } from '../hooks/useVerificationCountdown';
import { transformPostListItem } from '../utils/apiTransformer';
import type { User, PostListItem } from '../types';
import { useToast } from '../components/Toast';
import { SEO } from '../components/SEO';

function getRandomAvatar(username: string): string {
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['blue', 'green', 'red', 'purple', 'orange'];
  const color = colors[hash % colors.length];
  const initial = username.charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${initial}&background=${color}&color=fff&size=128`;
}

export function AccountSettingsPage() {
  const { user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [likedPosts, setLikedPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState({
    user: true,
    update: false,
    delete: false
  });
  
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    password: '',
    newPassword: '',
    confirmPassword: '',
    emailVerificationCode: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [codeSending, setCodeSending] = useState(false);
  const [deleteVerificationCode, setDeleteVerificationCode] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  const { countdown: passwordCountdown, isCounting: isPasswordCounting, startCountdown: startPasswordCountdown } = useVerificationCountdown('password');
  const { countdown: deleteCountdown, isCounting: isDeleteCounting, startCountdown: startDeleteCountdown } = useVerificationCountdown('delete');

  useEffect(() => {
    if (user) {
      loadUserInfo();
      loadLikedPosts();
    }
  }, [user]);

  const loadUserInfo = async () => {
    try {
      setLoading(prev => ({ ...prev, user: true }));
      const response = await api.getMe();
      if (response.success && response.data) {
        setUserInfo(response.data.user);
        setFormData({
          displayName: response.data.user.displayName,
          bio: response.data.user.bio || '',
          password: '',
          newPassword: '',
          confirmPassword: '',
          emailVerificationCode: ''
        });
        setAvatarPreview(response.data.user.avatarUrl || getRandomAvatar(response.data.user.username));
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
      showError('加载用户信息失败');
    } finally {
      setLoading(prev => ({ ...prev, user: false }));
    }
  };

  const loadLikedPosts = async () => {
    try {
      const response = await api.getLikedPosts({ page: '1', limit: '20' });
      if (response.success && response.data) {
        const posts = (response.data.posts || []).map(transformPostListItem);
        setLikedPosts(posts);
      }
    } catch (error) {
      console.error('Failed to load liked posts:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(prev => ({ ...prev, update: true }));
      
      let avatarUrl = userInfo?.avatarUrl;
      if (avatarFile) {
        const uploadResponse = await api.uploadImage(avatarFile);
        if (uploadResponse.success && uploadResponse.data) {
          avatarUrl = uploadResponse.data.url;
        }
      }
      
      const response = await api.updateProfile({
        displayName: formData.displayName,
        bio: formData.bio,
        avatarUrl
      });
      
      if (response.success && response.data) {
        showSuccess('资料更新成功');
        await loadUserInfo();
        if (response.data.user) {
          setUser(response.data.user);
        }
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      showError('更新资料失败');
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  };

  const handleSendCode = async (type: 'password' | 'delete') => {
    if (type === 'password' && isPasswordCounting) {
      showError(`请等待 ${passwordCountdown} 秒后重试`);
      return;
    }
    if (type === 'delete' && isDeleteCounting) {
      showError(`请等待 ${deleteCountdown} 秒后重试`);
      return;
    }

    try {
      setCodeSending(true);
      const response = await api.sendVerificationCode({ type });
      if (response.success) {
        showSuccess('验证码已发送到您的邮箱，请查收');
        if (type === 'password') {
          startPasswordCountdown();
        } else {
          startDeleteCountdown();
        }
      } else {
        showError(response.message || response.error || '发送失败');
      }
    } catch (error: any) {
      showError(error.message || '发送验证码失败');
    } finally {
      setCodeSending(false);
    }
  };

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      showError('两次输入的密码不一致');
      return;
    }

    if (formData.newPassword.length < 6) {
      showError('新密码长度至少为6位');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, update: true }));
      const response = await api.changePassword({
        currentPassword: formData.password,
        newPassword: formData.newPassword,
        emailVerificationCode: formData.emailVerificationCode || undefined
      });

      if (response.success) {
        showSuccess('密码修改成功');
        setFormData(prev => ({
          ...prev,
          password: '',
          newPassword: '',
          confirmPassword: '',
          emailVerificationCode: ''
        }));
      }
    } catch (error: any) {
      showError(error.message || '密码修改失败');
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmation || deleteConfirmation !== 'DELETE') {
      showError('请输入 DELETE 确认删除');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, delete: true }));
      const response = await api.deleteAccount(deletePassword, deleteVerificationCode);
      if (response.success) {
        showSuccess('账号删除成功');
        logout();
        navigate('/');
      }
    } catch (error: any) {
      showError(error.message || '删除账号失败，请检查密码和验证码');
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">请先登录访问账号设置</p>
          <Link to="/login" className="text-primary hover:underline">
            去登录
          </Link>
        </div>
      </div>
    );
  }

  if (loading.user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="账号设置" 
        description="管理您的账号信息和安全设置"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">账号设置</h1>
          <p className="text-muted-foreground">管理您的个人信息和账号安全</p>
        </div>

        {/* 个人资料区域 */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-6">个人资料</h2>
          
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
              <h3 className="text-xl font-bold text-foreground">{formData.displayName || userInfo?.displayName}</h3>
              <p className="text-muted-foreground">@{userInfo?.username}</p>
              <p className="text-muted-foreground text-sm mt-1">{userInfo?.email}</p>
            </div>
            
            {/* 个人资料编辑 */}
            <div className="flex-1 w-full">
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
        </div>

        {/* 用户统计信息 */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">统计信息</h2>
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

        {/* 密码修改 */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">密码修改</h2>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">邮箱验证码</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6 位验证码"
                  value={formData.emailVerificationCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailVerificationCode: e.target.value.replace(/\D/g, '') }))}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSendCode('password')}
                disabled={codeSending || isPasswordCounting}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 whitespace-nowrap min-w-[100px]"
              >
                {codeSending ? '发送中...' : isPasswordCounting ? `${passwordCountdown}秒后重试` : '获取验证码'}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">当前密码</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">新密码</label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">确认新密码</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading.update}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading.update ? '修改中...' : '修改密码'}
            </button>
          </form>
        </div>
        
        {/* 账号删除 */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">账号管理</h2>
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg space-y-4">
            <h4 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">删除账号</h4>
            <p className="text-red-700 dark:text-red-300 text-sm">
              一旦删除账号，所有数据将被永久删除，无法恢复。请先获取邮箱验证码并输入密码确认。
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">邮箱验证码</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6 位验证码"
                  value={deleteVerificationCode}
                  onChange={(e) => setDeleteVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSendCode('delete')}
                disabled={codeSending || isDeleteCounting}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 whitespace-nowrap min-w-[100px]"
              >
                {codeSending ? '发送中...' : isDeleteCounting ? `${deleteCountdown}秒后重试` : '获取验证码'}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">当前密码</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="请输入密码以确认身份"
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">确认删除（输入 DELETE）</label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="输入 DELETE 确认删除"
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={loading.delete || deleteConfirmation !== 'DELETE'}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading.delete ? '删除中...' : '删除账号'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
