import { useSiteConfig } from '../hooks/useSiteConfig';

export function Footer() {
  const { config } = useSiteConfig();
  
  // 获取配置值，使用默认值作为后备
  const brandName = config.footer_brand_name || config.site_name || '我的博客';
  const footerDescription = config.footer_description || '分享技术,记录生活';
  const quickLinks = config.footer_links || { '首页': '/', '关于': '/about' };
  const techStack = config.footer_tech_stack || ['React + TypeScript', 'Cloudflare Workers', 'Tailwind CSS'];
  const footerText = config.footer_text || `© ${new Date().getFullYear()} ${brandName}`;
  
  return (
    <footer className="mt-auto border-t border-border bg-card dark:bg-card transition-theme">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 品牌信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground dark:text-foreground">
              {brandName}
            </h3>
            <p className="text-sm text-foreground/70 dark:text-foreground/70">
              {footerDescription}
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground dark:text-foreground">快速链接</h4>
            <ul className="space-y-2 text-sm text-foreground/70 dark:text-foreground/70">
              {Object.entries(quickLinks).map(([label, url], index) => (
                <li key={index}>
                  <a 
                    href={url} 
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
              {techStack.map((tech, index) => (
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
