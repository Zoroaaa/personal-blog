/**
 * 归档时间线：按「年-月」聚合文章，提供成熟博客常见的时间维度浏览路径。
 *
 * 约束：
 * - 后端暂无归档聚合接口，复用 GET /posts 的大 limit 拉取后前端按月分组；
 *   个人博客量级下可接受，若未来文章上千篇应改为服务端分组接口。
 * - 请求失败时降级展示错误态与重试；未登录也可访问。
 * - 用语义化 token，适配亮/暗主题。
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { transformPostList } from '../utils/apiTransformer';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ErrorState, LoadingState } from '../components/common/AsyncState';
import { SEO } from '../components/SEO';
import type { PostListItem } from '../types';

// 个人博客量级下，一次拉 500 篇足以覆盖归档需求；后端 D1 单查询参数上限内安全
const ARCHIVE_FETCH_LIMIT = 500;

interface MonthGroup {
  key: string;
  label: string;
  posts: PostListItem[];
}

export function ArchivePage() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getPosts({ page: 1, limit: ARCHIVE_FETCH_LIMIT });
        if (response.success && response.data && !cancelled) {
          setPosts(transformPostList(response.data.posts || []));
        } else {
          throw new Error(response.error || '加载归档失败');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载归档失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // 按年月分组：依赖 publishedAt，缺失时回退 createdAt，再回退「未知时间」
  const groups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, MonthGroup>();
    for (const post of posts) {
      const raw = post.publishedAt || (post as any).createdAt;
      const date = raw ? new Date(raw) : null;
      const valid = date && !isNaN(date.getTime());
      const year = valid ? date!.getFullYear() : 0;
      const month = valid ? date!.getMonth() + 1 : 0;
      const key = valid ? `${year}-${String(month).padStart(2, '0')}` : 'unknown';
      const label = valid ? `${year} 年 ${month} 月` : '时间未知';
      if (!map.has(key)) map.set(key, { key, label, posts: [] });
      map.get(key)!.posts.push(post);
    }
    // key 形如 2026-11，倒序即为最新在前；unknown 置底
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [posts]);

  const totalCount = posts.length;

  return (
    <>
      <SEO title="文章归档" description="按时间浏览全部文章" />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumbs className="mb-6" items={[{ label: '归档' }]} />
        <h1 className="text-3xl font-bold text-foreground mb-2">文章归档</h1>
        <p className="text-muted-foreground mb-8">
          按时间回顾全部文章{totalCount > 0 ? `，共 ${totalCount} 篇` : ''}
        </p>

        {loading ? (
          <LoadingState message="正在整理归档..." />
        ) : error ? (
          <div className="bg-card border border-border rounded-lg">
            <ErrorState message={error} onRetry={() => window.location.reload()} retryLabel="重新加载" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">暂无文章可归档</p>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.key}>
                <div className="flex items-baseline gap-3 mb-4 border-b border-border pb-2">
                  <h2 className="text-xl font-semibold text-foreground">{group.label}</h2>
                  <span className="text-sm text-muted-foreground">{group.posts.length} 篇</span>
                </div>
                <ul className="space-y-1">
                  {group.posts.map((post) => (
                    <li key={post.id}>
                      <Link
                        to={`/posts/${post.slug}`}
                        className="flex items-center justify-between gap-4 py-2 px-2 rounded-md hover:bg-accent transition-colors group"
                      >
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {post.title}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
                            : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
