/**
 * 关于页面
 * 
 * 功能：
 * - 展示网站基本信息
 * - 展示作者信息
 * - 展示社交媒体链接
 * - 响应式设计
 * 
 * @author 优化版本
 * @version 3.0.0
 */

import { useState, useEffect } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { api } from '../utils/api';

export function AboutPage() {
  const { config } = useSiteConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* 页面标题 */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-4">
            关于我们
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            了解更多关于这个网站和作者的信息
          </p>
        </div>
        
        {/* 内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 左侧: 主要内容 */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 网站基本信息卡片 */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 transition-all duration-300 hover:shadow-xl">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                网站基本信息
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">网站描述</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {config.siteDescription || '暂无描述'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">网站关键词</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {config.siteKeywords || '暂无关键词'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">网站作者</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {config.siteAuthor || '暂无作者信息'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 作者信息卡片 */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 transition-all duration-300 hover:shadow-xl">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                作者信息
              </h2>
              
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-shrink-0">
                  {config.authorAvatar ? (
                    <img 
                      src={config.authorAvatar} 
                      alt={config.authorName || '作者头像'}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-lg">
                      <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">作者名称</h3>
                    <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                    {config.authorName || '暂无作者名称'}
                  </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">作者简介</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                    {config.authorBio || '暂无作者简介'}
                  </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">联系邮箱</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                    {config.authorEmail || '暂无联系邮箱'}
                  </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 右侧: 社交媒体 */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 社交媒体卡片 */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 transition-all duration-300 hover:shadow-xl">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101m.758 4.899L19 14" />
                </svg>
                社交媒体
              </h2>
              
              <div className="space-y-4">
                {config.socialGithub && (
                  <a 
                    href={config.socialGithub} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-800 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      GitHub
                    </span>
                  </a>
                )}
                
                {config.socialTwitter && (
                  <a 
                    href={config.socialTwitter} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Twitter
                    </span>
                  </a>
                )}
                
                {config.socialLinkedin && (
                  <a 
                    href={config.socialLinkedin} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      LinkedIn
                    </span>
                  </a>
                )}
                
                {config.socialWeibo && (
                  <a 
                    href={config.socialWeibo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1.409 19.995c-1.662-.129-3.206-.862-4.338-2.021 1.432-1.316 2.972-2.832 4.489-4.441 1.505 1.599 3.022 3.108 4.43 4.427-1.181 1.197-2.784 2.068-4.581 2.035zm.625-4.101c-1.824-1.942-3.626-3.893-5.359-5.872 1.742-1.96 3.529-3.904 5.324-5.857 1.805 1.963 3.601 3.917 5.366 5.875-1.747 1.963-3.55 3.925-5.331 5.854z"/>
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      微博
                    </span>
                  </a>
                )}
                
                {config.socialEmail && (
                  <a 
                    href={`mailto:${config.socialEmail}`} 
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-800 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      邮箱
                    </span>
                  </a>
                )}
                
                {config.socialWechatQr && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1.409 19.995c-1.662-.129-3.206-.862-4.338-2.021 1.432-1.316 2.972-2.832 4.489-4.441 1.505 1.599 3.022 3.108 4.43 4.427-1.181 1.197-2.784 2.068-4.581 2.035zm.625-4.101c-1.824-1.942-3.626-3.893-5.359-5.872 1.742-1.96 3.529-3.904 5.324-5.857 1.805 1.963 3.601 3.917 5.366 5.875-1.747 1.963-3.55 3.925-5.331 5.854z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">微信二维码</h3>
                      <img 
                        src={config.socialWechatQr} 
                        alt="微信二维码"
                        className="w-32 h-32 rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                    </div>
                  </div>
                )}
                
                {(!config.socialGithub && !config.socialTwitter && !config.socialLinkedin && !config.socialWeibo && !config.socialEmail && !config.socialWechatQr) && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">暂无社交媒体信息</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 添加必要的CSS动画 */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
