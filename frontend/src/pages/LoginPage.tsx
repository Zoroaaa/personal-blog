/**
 * 登录/注册页面(优化版)
 * 
 * 功能:
 * - 用户登录
 * - 用户注册
 * - 表单验证
 * - GitHub OAuth登录
 * 
 * 优化内容:
 * 1. 修复API响应格式处理
 * 2. 使用完整的TypeScript类型
 * 3. 改进错误处理和提示
 * 4. 添加密码强度提示
 * 5. 优化UI/UX
 * 6. 移除硬编码的GITHUB_CLIENT_ID,通过API获取
 * 
 * @author 优化版本
 * @version 2.1.0
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  
  // 获取重定向路径
  const from = (location.state as any)?.from?.pathname || '/';
  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const redirectPath = redirectParam || from;
  
  // GitHub OAuth配置
  const [githubClientId, setGithubClientId] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  // 获取GitHub配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.getConfig();
        
        if (response.success && response.data) {
          setGithubClientId(response.data.githubClientId);
          console.log('GitHub配置加载成功:', response.data.githubClientId);
        } else {
          console.error('获取配置失败:', response);
          setError('无法获取GitHub配置,请稍后再试');
        }
      } catch (error) {
        console.error('获取配置失败:', error);
        setError('无法连接到服务器,请检查网络连接');
      } finally {
        setLoadingConfig(false);
      }
    };
    
    fetchConfig();
  }, []);
  
  // GitHub OAuth客户端ID和重定向URI
  const GITHUB_REDIRECT_URI = window.location.origin + '/login';
  
  // 处理GitHub OAuth回调
  useEffect(() => {
    const handleGitHubCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const errorParam = params.get('error');
      
      if (errorParam) {
        setError(`GitHub授权失败: ${errorParam}`);
        return;
      }
      
      if (code) {
        setLoading(true);
        setError('');
        
        try {
          // 调用后端API交换代码获取token
          const response = await api.githubLogin(code);
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            
            // 保存到store
            login(user, token);
            
            // 跳转
            navigate(redirectPath, { replace: true });
          } else {
            throw new Error(response.error || 'GitHub登录失败');
          }
        } catch (err: any) {
          console.error('GitHub login error:', err);
          setError(err.message || 'GitHub登录失败');
        } finally {
          setLoading(false);
        }
      }
    };
    
    handleGitHubCallback();
  }, [location.search, navigate, redirectPath, login]);
  
  // 处理GitHub登录
  const handleGitHubLogin = () => {
    if (!githubClientId) {
      setError('GitHub配置未加载,请刷新页面重试');
      return;
    }
    
    const state = Math.random().toString(36).substring(2, 15);
    const scope = 'user:email';
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=${scope}&state=${state}`;
    
    window.location.href = githubAuthUrl;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        // ===== 登录 =====
        console.log('Attempting login...', { username });
        
        const response = await api.login({ username, password });
        
        console.log('Login response:', response);
        
        // 检查响应格式
        if (response.success && response.data) {
          const { user, token } = response.data;
          
          console.log('Login successful:', { user, hasToken: !!token });
          
          // 保存到store
          login(user, token);
          
          // 跳转
          navigate(redirectPath, { replace: true });
        } else {
          throw new Error(response.error || response.message || '登录失败');
        }
      } else {
        // ===== 注册 =====
        console.log('Attempting registration...', { username, email });
        
        const response = await api.register({
          username,
          email,
          password,
          displayName: displayName || username,
        });
        
        console.log('Registration response:', response);
        
        // 检查响应格式
        if (response.success && response.data) {
          const { user, token } = response.data;
          
          console.log('Registration successful:', { user, hasToken: !!token });
          
          // 保存到store
          login(user, token);
          
          // 跳转
          navigate(redirectPath, { replace: true });
        } else {
          throw new Error(response.error || response.message || '注册失败');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || '操作失败,请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 验证密码强度
  const getPasswordStrength = (pwd: string): { level: number; text: string; color: string } => {
    if (pwd.length === 0) return { level: 0, text: '', color: '' };
    if (pwd.length < 6) return { level: 1, text: '太弱', color: 'text-red-600' };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    
    if (strength <= 1) return { level: 1, text: '弱', color: 'text-red-600' };
    if (strength === 2) return { level: 2, text: '中', color: 'text-orange-600' };
    if (strength === 3) return { level: 3, text: '较强', color: 'text-yellow-600' };
    return { level: 4, text: '强', color: 'text-green-600' };
  };
  
  const passwordStrength = !isLogin ? getPasswordStrength(password) : null;
  
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              {isLogin ? '欢迎回来' : '创建账号'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isLogin ? '登录以继续使用' : '注册一个新账号'}
            </p>
          </div>
          
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 用户名 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入用户名"
                required
                autoComplete="username"
              />
              {!isLogin && (
                <p className="mt-1 text-xs text-gray-500">
                  3-20个字符,只能包含字母、数字、下划线和连字符
                </p>
              )}
            </div>
            
            {/* 邮箱(仅注册) */}
            {!isLogin && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入邮箱地址"
                  required
                  autoComplete="email"
                />
              </div>
            )}
            
            {/* 显示名称(仅注册) */}
            {!isLogin && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                  显示名称 <span className="text-gray-400 text-xs">(可选)</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入显示名称"
                  autoComplete="name"
                />
                <p className="mt-1 text-xs text-gray-500">
                  留空则使用用户名
                </p>
              </div>
            )}
            
            {/* 密码 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入密码"
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              
              {/* 密码强度指示器(仅注册) */}
              {!isLogin && password && passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">密码强度:</span>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength.level === 1 ? 'bg-red-500 w-1/4' :
                        passwordStrength.level === 2 ? 'bg-orange-500 w-2/4' :
                        passwordStrength.level === 3 ? 'bg-yellow-500 w-3/4' :
                        'bg-green-500 w-full'
                      }`}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    建议:至少8个字符,包含大小写字母和数字
                  </p>
                </div>
              )}
              
              {isLogin && (
                <p className="mt-1 text-xs text-gray-500">
                  至少6个字符
                </p>
              )}
            </div>
            
            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  处理中...
                </>
              ) : (
                isLogin ? '登录' : '注册'
              )}
            </button>
          </form>
          
          {/* 分割线 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">或使用</span>
            </div>
          </div>
          
          {/* GitHub登录按钮 */}
          <button
            onClick={handleGitHubLogin}
            disabled={loading || loadingConfig || !githubClientId}
            className="w-full flex items-center justify-center space-x-2 bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            <span>{loadingConfig ? '加载配置中...' : '使用GitHub登录'}</span>
          </button>
          
          {/* 切换登录/注册 */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setPassword('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isLogin ? '还没有账号?立即注册' : '已有账号?立即登录'}
            </button>
          </div>
          
          {/* 提示信息 */}
          {redirectParam && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                登录后将跳转回之前的页面
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
