/**
 * 关于页面
 *
 * 功能：
 * - 展示网站基本信息
 * - 展示社交媒体链接
 * - 响应式设计
 *
 * @author 博客系统
 * @version 4.0.0
 * @created 2024-01-01
 */

import { useSiteConfig } from '../hooks/useSiteConfig';
import { SEO } from '../components/SEO';

export function AboutPage() {
  const { config } = useSiteConfig();

  return (
    <>
      <SEO title="关于我们" />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* 页面标题 */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-4">
              关于我们
            </h1>
            <p className="text-lg text-muted-foreground">
              了解更多关于这个网站的信息
            </p>
          </div>

        {/* 内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* 左侧: 主要内容 */}
          <div className="lg:col-span-8 space-y-8">

            {/* 网站基本信息卡片 */}
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-lg border border-border p-6 transition-all duration-300 hover:shadow-xl">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                网站基本信息
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">网站名称</h3>
                  <p className="text-xl font-bold text-foreground">
                    {config.site_name || '暂无名称'}
                  </p>
                </div>

                {config.site_subtitle && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">网站副标题</h3>
                    <p className="text-foreground">
                      {config.site_subtitle}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">网站描述</h3>
                  <p className="text-foreground">
                    {config.site_description || '暂无描述'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">网站关键词</h3>
                  <p className="text-foreground">
                    {config.site_keywords || '暂无关键词'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">网站作者</h3>
                  <p className="text-foreground">
                    {config.site_author || '暂无作者信息'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧: 社交媒体 */}
          <div className="lg:col-span-4 space-y-6">

            {/* 社交媒体卡片 */}
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-lg border border-border p-6 transition-all duration-300 hover:shadow-xl">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101m.758 4.899L19 14" />
                </svg>
                社交媒体
              </h2>

              <div className="space-y-4">
                {config.social_github && (
                  <a
                    href={config.social_github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-foreground" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <span className="text-foreground font-medium group-hover:text-primary transition-colors">
                      GitHub
                    </span>
                  </a>
                )}

                {config.social_twitter && (
                  <a
                    href={config.social_twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                      </svg>
                    </div>
                    <span className="text-foreground font-medium group-hover:text-primary transition-colors">
                      Twitter
                    </span>
                  </a>
                )}

                {config.social_youtube && (
                  <a
                    href={config.social_youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    <span className="text-foreground font-medium group-hover:text-primary transition-colors">
                      YouTube
                    </span>
                  </a>
                )}

                {config.social_telegram && (
                  <a
                    href={config.social_telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                    </div>
                    <span className="text-foreground font-medium group-hover:text-primary transition-colors">
                      Telegram
                    </span>
                  </a>
                )}

                {config.social_email && (
                  <a
                    href={`mailto:${config.social_email}`}
                    className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-foreground font-medium group-hover:text-primary transition-colors">
                      邮箱
                    </span>
                  </a>
                )}

                {(!config.social_github && !config.social_twitter && !config.social_youtube && !config.social_telegram && !config.social_email) && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">暂无社交媒体信息</p>
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
    </>
  );
}
