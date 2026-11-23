/**
 * 面包屑导航：为深层页面提供「我在哪 / 如何返回」的可见路径。
 *
 * 约束：
 * - 最后一项为当前页（不可点击），前面的项为链接；
 * - 使用语义化颜色 token，末项用 foreground 强调当前位置；
 * - 纯展示组件，路径由调用方给出（含 label/to）。
 */

import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="面包屑导航" className={`flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground ${className}`}>
      <Link to="/" className="hover:text-primary transition-colors">
        首页
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {isLast || !item.to ? (
              <span className={isLast ? 'text-foreground font-medium' : ''} aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="hover:text-primary transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
