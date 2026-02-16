/**
 * 404页面组件
 * 
 * 功能：当用户访问不存在的页面时显示的错误页面
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

import { Link } from 'react-router-dom';

/**
 * 404页面组件
 * 
 * 显示一个美观的404错误页面，包含返回首页的链接
 * 
 * @returns 404页面组件
 */
export function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-slate-900 dark:to-slate-800 py-16 px-4">
      <div className="text-center max-w-md mx-auto">
        {/* 404大数字 */}
        <div className="text-9xl font-bold text-gray-300 dark:text-slate-600 mb-4 animate-fade-in">
          404
        </div>
        
        {/* 标题 */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 animate-fade-in animation-delay-100">
          页面未找到
        </h1>
        
        {/* 描述文本 */}
        <p className="text-gray-600 dark:text-gray-400 mb-8 animate-fade-in animation-delay-200">
          抱歉，您访问的页面不存在。可能是链接错误或页面已被删除。
        </p>
        
        {/* 返回首页按钮 */}
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors transform hover:scale-105 duration-300 animate-fade-in animation-delay-300"
        >
          返回首页
        </Link>
        
        {/* 额外提示 */}
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400 animate-fade-in animation-delay-400">
          如果您认为这是一个错误，请联系网站管理员
        </p>
      </div>
    </div>
  );
}

export default NotFoundPage;