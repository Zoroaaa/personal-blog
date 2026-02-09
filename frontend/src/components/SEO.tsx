/**
 * SEO 组件
 * 
 * 功能:
 * - 动态管理页面SEO meta标签
 * - 支持Open Graph和Twitter Card
 * - 根据配置自动生成meta信息
 * - 支持自定义覆盖
 * 
 * @version 1.0.0
 */

import { useEffect } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  children?: React.ReactNode;
}

export function SEO({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  noindex = false,
  children
}: SEOProps) {
  const { config } = useSiteConfig();

  // 构建完整的SEO信息
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  
  const seoTitle = title 
    ? `${title} | ${config.site_name}` 
    : config.site_name;
  
  const seoDescription = description || config.site_description || '';
  const seoKeywords = keywords || config.site_keywords || '';
  const seoImage = image || config.site_og_image || `${siteUrl}/default-og-image.png`;
  const seoAuthor = author || config.site_author || '';

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 更新标题
    document.title = seoTitle;

    // 辅助函数：更新或创建meta标签
    const setMetaTag = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      
      meta.content = content;
      return meta;
    };

    // 基础SEO
    setMetaTag('description', seoDescription);
    if (seoKeywords) {
      setMetaTag('keywords', seoKeywords);
    }
    if (seoAuthor) {
      setMetaTag('author', seoAuthor);
    }

    // Robots
    if (noindex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow');
    }

    // Open Graph
    setMetaTag('og:title', title || config.site_name, true);
    setMetaTag('og:description', seoDescription, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:url', currentUrl, true);
    setMetaTag('og:image', seoImage, true);
    setMetaTag('og:site_name', config.site_name, true);
    
    if (publishedTime) {
      setMetaTag('article:published_time', publishedTime, true);
    }
    if (modifiedTime) {
      setMetaTag('article:modified_time', modifiedTime, true);
    }
    if (seoAuthor) {
      setMetaTag('article:author', seoAuthor, true);
    }

    // Twitter Card
    setMetaTag('twitter:card', config.site_twitter_card || 'summary_large_image');
    setMetaTag('twitter:title', title || config.site_name);
    setMetaTag('twitter:description', seoDescription);
    setMetaTag('twitter:image', seoImage);
    
    if (config.social_twitter) {
      const twitterHandle = config.social_twitter.split('/').pop();
      if (twitterHandle) {
        setMetaTag('twitter:site', `@${twitterHandle}`);
        setMetaTag('twitter:creator', `@${twitterHandle}`);
      }
    }

    // 视口设置
    setMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // 字符编码
    let charset = document.querySelector('meta[charset]') as HTMLMetaElement;
    if (!charset) {
      charset = document.createElement('meta');
      charset.setAttribute('charset', 'utf-8');
      document.head.insertBefore(charset, document.head.firstChild);
    }

    // 清理函数
    return () => {
      // 可选：清理动态添加的meta标签
      // 注意：通常保留meta标签，因为它们会被下一个页面覆盖
    };
  }, [
    seoTitle,
    seoDescription,
    seoKeywords,
    seoImage,
    currentUrl,
    type,
    seoAuthor,
    publishedTime,
    modifiedTime,
    noindex,
    config.site_name,
    config.site_description,
    config.site_keywords,
    config.site_author,
    config.site_og_image,
    config.site_twitter_card,
    config.social_twitter,
    title
  ]);

  return <>{children}</>;
}

// 预设的SEO配置
export const seoPresets = {
  // 首页SEO
  home: (siteConfig: any): SEOProps => ({
    title: siteConfig.site_subtitle || '首页',
    description: siteConfig.site_description,
    keywords: siteConfig.site_keywords,
    type: 'website'
  }),

  // 文章页SEO
  post: (post: any): SEOProps => ({
    title: post.title,
    description: post.summary || post.content?.substring(0, 200),
    keywords: post.tags?.map((t: any) => t.name).join(', '),
    image: post.coverImage,
    type: 'article',
    author: post.authorName || post.author?.displayName,
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt
  }),

  // 关于页面SEO
  about: (siteConfig: any): SEOProps => ({
    title: '关于我们',
    description: `了解${siteConfig.site_name}的更多信息`,
    type: 'website'
  }),

  // 搜索页面SEO
  search: (query: string): SEOProps => ({
    title: `搜索: ${query}`,
    description: `搜索关于"${query}"的文章`,
    noindex: true // 搜索结果页不索引
  }),

  // 登录页面SEO
  login: (): SEOProps => ({
    title: '登录',
    description: '登录到您的账户',
    noindex: true
  }),

  // 管理后台SEO
  admin: (): SEOProps => ({
    title: '管理后台',
    description: '网站管理后台',
    noindex: true
  })
};

export default SEO;
