/**
 * 账号设置页面
 * 
 * 功能：
 * - 用户信息编辑
 * - 密码修改
 * - 账号删除
 * - 头像上传
 * 
 * @author 博客系统
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import { useVerificationCountdown } from '../hooks/useVerificationCountdown';
import type { User } from '../types';
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
      const response = await api.sendVerificationCode(userInfo?.email || '', 'password');
      if (response.success) {
        showSuccess('验证码已发送到您的邮箱');
        if (type === 'password') {
          startPasswordCountdown();
        } else {
          startDeleteCountdown();
        }
      }
    } catch (error) {
      console.error('Failed to send code:', error);
      showError('发送验证码失败');
    } finally {
      setCodeSending(false);
    }
  };

  const handleChangePassword = async () => {
    if (!formData.password || !formData.newPassword || !formData.confirmPassword) {
      showError('请填写完整的密码信息');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showError('两次输入的新密码不一致');
      return;
    }

    if (formData.newPassword.length < 6) {
      showError('新密码长度至少为6位');
      return;
    }

    if (!formData.emailVerificationCode) {
      showError('请输入邮箱验证码');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, update: true }));
      const response = await api.changePassword({
        currentPassword: formData.password,
        newPassword: formData.newPassword,
        verificationCode: formData.emailVerificationCode
      });

      if (response.success) {
        showSuccess('密码修改成功，请重新登录');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      showError('密码修改失败');
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteVerificationCode) {
      showError('请输入邮箱验证码');
      return;
    }

    if (!deletePassword) {
      showError('请输入当前密码');
      return;
    }

    if (deleteConfirmation !== 'DELETE') {
      showError('请输入 DELETE 确认删除');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, delete: true }));
      const response = await api.deleteAccount({
        password: deletePassword,
        verificationCode: deleteVerificationCode
      });

      if (response.success) {
        showSuccess('账号已删除');
        logout();
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      showError('删除账号失败');
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="账号设置" 
        description="管理您的账号信息和安全设置"
      />
      
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">账号设置</h1>
            <p className="text-muted-foreground mt-1">管理您的个人信息和安全设置</p>
          </div>

          {/* 个人资料设置 */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">个人资料</h2>
            
            {/* 头像 */}
            <div className="flex items-center gap-4 mb-6">
              <img
                src={avatarPreview}
                alt="头像"
                className="w-20 h-20 rounded-full object-cover"
              />
              <div>
                <label className="cursor-pointer px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity inline-block">
                  更换头像
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG 格式</p>
              </div>
            </div>

            {/* 显示名称 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1">显示名称</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* 个人简介 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1">个人简介</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="介绍一下自己..."
              />
            </div>

            {/* 邮箱（只读） */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1">邮箱地址</label>
              <input
                type="email"
                value={userInfo?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">邮箱地址不可修改</p>
            </div>

            {/* 保存按钮 */}
            <button
              onClick={handleUpdateProfile}
              disabled={loading.update}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading.update ? '保存中...' : '保存修改'}
            </button>
          </div>

          {/* 密码修改 */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">密码修改</h2>
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
                    className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">新密码</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">确认新密码</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading.update}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading.update ? '修改中...' : '修改密码'}
              </button>
            </form>
          </div>

          {/* 危险区域 */}
          <div className="bg-card border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">危险区域</h2>
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg space-y-4">
              <h4 className="text-lg font-medium text-red-800 dark:text-red-200">删除账号</h4>
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
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">输入 DELETE 确认</label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="输入 DELETE"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={loading.delete}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading.delete ? '删除中...' : '永久删除账号'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
