/**
 * 页脚组件
 * 
 * 功能：
 * - 显示网站品牌信息
 * - 提供快速链接导航
 * - 展示技术栈信息
 * - 显示版权声明
 * - 支持配置化内容
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useMemo } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';

/**
 * 页脚组件
 * 
 * 功能：显示网站的页脚信息，包括品牌信息、快速链接、技术栈和版权声明
 * 
 * @returns 页脚组件
 */

export function Footer() {
  const { config } = useSiteConfig();

  // 获取配置值，使用默认值作为后备
  const brandName = config.site_name || '我的博客';
  const brandSubtitle = config.site_subtitle || '分享技术,记录生活';
  
  // 处理 footer_links，支持字符串JSON和对象格式
  const quickLinks = useMemo(() => {
    if (!config.footer_links) return { '首页': '/', '关于': '/about' };
    if (typeof config.footer_links === 'string') {
      try {
        return JSON.parse(config.footer_links);
      } catch {
        return { '首页': '/', '关于': '/about' };
      }
    }
    return config.footer_links;
  }, [config.footer_links]);
  
  const techStack = config.footer_tech_stack || ['React + TypeScript', 'Cloudflare Workers', 'Tailwind CSS'];
  const footerText = config.footer_text || `© ${new Date().getFullYear()} ${brandName}`;

  return (
    <footer className="mt-auto border-t border-border bg-card dark:bg-card transition-theme">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-[18px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 品牌信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground dark:text-foreground">
              {brandName}
            </h3>
            <p className="text-sm text-foreground/70 dark:text-foreground/70">
              {brandSubtitle}
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground dark:text-foreground">快速链接</h4>
            <ul className="space-y-2 text-sm text-foreground/70 dark:text-foreground/70">
              {Object.entries(quickLinks).map(([label, url], index) => (
                <li key={index}>
                  <a
                    href={String(url)}
                    className="hover:text-primary-600 transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 技术栈 */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground dark:text-foreground">技术栈</h4>
            <ul className="space-y-2 text-sm text-foreground/70 dark:text-foreground/70">
              {techStack.map((tech: string, index: number) => (
                <li key={index}>{tech}</li>
              ))}
            </ul>
          </div>

          {/* 版权信息 */}
          <div className="text-sm text-foreground/70 dark:text-foreground/70">
            <p>{footerText}</p>
            <p className="mt-2">All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
