export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card dark:bg-card transition-theme">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 品牌信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground dark:text-foreground">
              我的博客
            </h3>
            <p className="text-sm text-foreground/70 dark:text-foreground/70">
              分享技术,记录生活
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground dark:text-foreground">快速链接</h4>
            <ul className="space-y-2 text-sm text-foreground/70 dark:text-foreground/70">
              <li><a href="/" className="hover:text-primary-600 transition-colors">首页</a></li>
              <li><a href="/about" className="hover:text-primary-600 transition-colors">关于</a></li>
            </ul>
          </div>

          {/* 技术栈 */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground dark:text-foreground">技术栈</h4>
            <ul className="space-y-2 text-sm text-foreground/70 dark:text-foreground/70">
              <li>React + TypeScript</li>
              <li>Cloudflare Workers</li>
              <li>Tailwind CSS</li>
            </ul>
          </div>

          {/* 版权信息 */}
          <div className="text-sm text-foreground/70 dark:text-foreground/70">
            <p>&copy; {new Date().getFullYear()} 我的博客</p>
            <p className="mt-2">All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
