/**
 * API连接测试页面
 * 
 * 功能：
 * - 测试前后端API连接
 * - 验证API功能是否正常
 * - 调试和排查连接问题
 * - 显示当前配置信息
 * - 提供故障排查指南
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useState, useEffect } from 'react';
import { testApiConnection, api } from '../utils/api';
export default function ApiTestPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [postsTest, setPostsTest] = useState<any>(null);

  // 自动测试连接
  useEffect(() => {
    handleTestConnection();
  }, []);

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const result = await testApiConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: '测试失败',
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestPosts = async () => {
    setLoading(true);
    try {
      const result = await api.getPosts({ page: 1, limit: 5 });
      setPostsTest({
        success: true,
        message: '获取文章列表成功',
        data: result
      });
    } catch (error) {
      setPostsTest({
        success: false,
        message: '获取文章列表失败',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestCategories = async () => {
    setLoading(true);
    try {
      const result = await api.getCategories();
      alert(`成功获取 ${result.data?.categories?.length || 0} 个分类`);
    } catch (error) {
      alert(`获取分类失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-foreground mb-6">
            API 连接测试
          </h1>

          <div className="space-y-6">
            {/* 基础连接测试 */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">基础连接测试</h2>
              
              <button
                onClick={handleTestConnection}
                disabled={loading}
                className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90 disabled:bg-muted"
              >
                {loading ? '测试中...' : '测试连接'}
              </button>

              {testResult && (
                <div className={`mt-4 p-4 rounded ${
                  testResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {testResult.success ? (
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        testResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {testResult.message}
                      </h3>
                      {testResult.details && (
                        <div className="mt-2 text-sm text-foreground">
                          <pre className="whitespace-pre-wrap bg-muted p-2 rounded">
                            {JSON.stringify(testResult.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* API功能测试 */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">API 功能测试</h2>
              
              <div className="space-x-4">
                <button
                  onClick={handleTestPosts}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-primary/90 disabled:bg-muted"
                >
                  测试获取文章
                </button>

                <button
                  onClick={handleTestCategories}
                  disabled={loading}
                  className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-primary/90 disabled:bg-muted"
                >
                  测试获取分类
                </button>
              </div>

              {postsTest && (
                <div className={`mt-4 p-4 rounded ${
                  postsTest.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <h3 className="font-semibold mb-2">{postsTest.message}</h3>
                  {postsTest.data && (
                    <div className="text-sm text-foreground">
                      <p>找到 {postsTest.data.posts?.length || 0} 篇文章</p>
                      <pre className="mt-2 whitespace-pre-wrap bg-muted p-2 rounded max-h-96 overflow-auto">
                        {JSON.stringify(postsTest.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {postsTest.error && (
                    <p className="text-sm text-red-700">{postsTest.error}</p>
                  )}
                </div>
              )}
            </div>

            {/* 配置信息 */}
            <div className="border rounded-lg p-6 bg-background">
              <h2 className="text-xl font-semibold mb-4">当前配置</h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-foreground">API URL:</dt>
                  <dd className="mt-1 text-foreground font-mono">
                    {import.meta.env.VITE_API_URL || '/api'}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">环境:</dt>
                  <dd className="mt-1 text-foreground">
                    {import.meta.env.DEV ? '开发环境' : '生产环境'}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">模式:</dt>
                  <dd className="mt-1 text-foreground">
                    {import.meta.env.MODE}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 故障排查指南 */}
            <div className="border rounded-lg p-6 bg-primary/5">
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                🔧 故障排查指南
              </h2>
              <div className="space-y-3 text-sm text-primary">
                <div>
                  <strong>1. 检查环境变量</strong>
                  <p>确保在 Cloudflare Pages 设置中添加了 VITE_API_URL 环境变量</p>
                </div>
                <div>
                  <strong>2. 检查后端部署</strong>
                  <p>访问 https://apiblog.neutronx.uk/health 确认后端是否正常运行</p>
                </div>
                <div>
                  <strong>3. 检查CORS配置</strong>
                  <p>确保后端允许 https://blog.neutronx.uk 的跨域请求</p>
                </div>
                <div>
                  <strong>4. 检查浏览器控制台</strong>
                  <p>打开开发者工具查看是否有错误信息</p>
                </div>
                <div>
                  <strong>5. 检查网络请求</strong>
                  <p>在Network标签中查看请求是否发送成功</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
