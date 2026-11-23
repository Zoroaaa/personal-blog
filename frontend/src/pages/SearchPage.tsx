/**
 * 搜索结果页面
 *
 * 功能：
 * - 页内搜索框（提交后同步到 URL，可分享/后退）
 * - 最近搜索历史（localStorage，最多 8 条）
 * - FTS5 全文搜索 + 结果关键词高亮
 * - 分类/标签筛选、分页加载更多
 * - 无结果 / 空查询时展示热门文章，避免用户走进死胡同
 *
 * @author 博客系统
 * @version 3.0.0
 */

import { useEffect, useState } from 'react';
import { useSearchParams, Link, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '../utils/api';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { transformPostList } from '../utils/apiTransformer';
import { highlightText } from '../utils/highlight';
import { EmptyState } from '../components/common/AsyncState';
import type { PostListItem } from '../types';

// ============= 常量 =============

const HISTORY_KEY = 'blog_search_history';
const HISTORY_LIMIT = 8;

// ============= 辅助函数 =============

/** 安全日期格式化：脏数据不抛异常，降级为「未知时间」 */
function formatDate(date: any, formatStr: string = 'yyyy-MM-dd HH:mm'): string {
  if (!date) return '未知时间';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '未知时间';
    return format(dateObj, formatStr);
  } catch {
    return '未知时间';
  }
}

/** 读取搜索历史；localStorage 不可用时静默降级为空数组 */
function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string').slice(0, HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

/** 写入搜索历史：去重后把最新词置顶；隐私模式下写失败不影响搜索本身 */
function saveHistory(term: string, current: string[]): string[] {
  const next = [term, ...current.filter((item) => item !== term)].slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // 存储不可用时只保留内存态
  }
  return next;
}

// ============= 组件 =============

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [hotPosts, setHotPosts] = useState<PostListItem[]>([]);

  const { config } = useSiteConfig();
  const isSearchEnabled = config?.feature_search !== false;

  const query = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category');
  const tagParam = searchParams.get('tag');

  // URL 是搜索状态的唯一来源：前进/后退、分享链接都能还原输入框内容
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // 热门文章供「空查询」与「无结果」两种状态复用；失败时静默降级，不阻塞主搜索
  useEffect(() => {
    let cancelled = false;
    api.getHotPosts(6)
      .then((response) => {
        if (response.success && response.data && !cancelled) {
          setHotPosts(transformPostList(response.data.posts || []));
        }
      })
      .catch(() => { /* 增强项失败不影响主流程 */ });
    return () => { cancelled = true; };
  }, []);

  const submitSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setHistory((prev) => saveHistory(trimmed, prev));
    setSearchParams({ q: trimmed });
  };

  const loadSearchResults = async (pageNum: number) => {
    try {
      setLoading(pageNum === 1);
      setError(null);

      const response = await api.searchPosts({
        q: query,
        category: categoryParam || undefined,
        tag: tagParam || undefined,
        page: pageNum.toString(),
        limit: '10',
        sort: query ? 'relevance' : 'published_at',
        use_fts: 'true',
      });

      if (response.success && response.data) {
        const transformed = transformPostList(response.data.posts || []);
        // 用函数式更新，避免闭包里的旧 posts 覆盖「加载更多」累积的结果
        setPosts((prev) => (pageNum === 1 ? transformed : [...prev, ...transformed]));
        setTotal(response.data.total || 0);
        setHasMore((pageNum * 10) < (response.data.total || 0));
        setPage(pageNum);
      } else {
        throw new Error(response.error || '搜索失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query || categoryParam || tagParam) {
      loadSearchResults(1);
    } else {
      setPosts([]);
      setLoading(false);
    }
    // loadSearchResults 依赖当次渲染的 query/filters，这里只按查询条件变化触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, categoryParam, tagParam]);

  const loadMore = () => {
    if (!loading && hasMore) loadSearchResults(page + 1);
  };

  /** 无结果/空查询时的热门文章区块 */
  const renderHotPosts = () => hotPosts.length > 0 && (
    <div className="mt-10">
      <h3 className="text-lg font-semibold text-foreground mb-4">热门文章</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hotPosts.map((post) => (
          <Link
            key={post.id}
            to={`/posts/${post.slug}`}
            className="flex gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary transition-colors group"
          >
            {post.coverImage ? (
              <img src={post.coverImage} alt="" loading="lazy" className="w-16 h-12 object-cover rounded flex-shrink-0" />
            ) : (
              <div className="w-16 h-12 bg-muted rounded flex-shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">{post.viewCount || 0} 次阅读</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  // 所有 hooks 调用完毕后再做功能开关守卫：config 异步加载时开关可能变化，
  // 守卫提前 return 会让 hooks 数量改变，触发 React 的 hooks 顺序错误。
  if (!isSearchEnabled) {
    return <Navigate to="/" replace />;
  }

  if (loading && page === 1) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="mt-3 text-sm text-muted-foreground">搜索中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* 页内搜索框：无需回到顶部即可修改关键词 */}
      <form onSubmit={(e) => { e.preventDefault(); submitSearch(inputValue); }} className="mb-6">
        <div className="flex gap-2">
          <input
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="搜索文章..."
            aria-label="搜索文章"
            className="flex-1 px-4 py-3 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            搜索
          </button>
        </div>
      </form>

      {/* 搜索头部：显示当前查询与命中数 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">搜索结果</h1>
        <p className="text-muted-foreground">
          {query ? `关键词: "${query}"` : ''}
          {query && categoryParam ? ' · ' : ''}
          {categoryParam ? `分类: ${categoryParam}` : ''}
          {(query || categoryParam) && tagParam ? ' · ' : ''}
          {tagParam ? `标签: ${tagParam}` : ''}
          {total > 0 && ` · 找到 ${total} 篇文章`}
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-8 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 空查询：搜索历史 + 语法提示 + 热门文章 */}
      {!query && !categoryParam && !tagParam && (
        <div>
          {history.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">最近搜索</h3>
                <button
                  onClick={() => {
                    try { localStorage.removeItem(HISTORY_KEY); } catch { /* 忽略 */ }
                    setHistory([]);
                  }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  清空历史
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((term) => (
                  <button
                    key={term}
                    onClick={() => { setInputValue(term); submitSearch(term); }}
                    className="px-3 py-1.5 bg-muted hover:bg-accent text-foreground rounded-full text-sm transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-center py-10 bg-card rounded-lg border border-border">
            <svg className="mx-auto h-14 w-14 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-foreground">输入关键词开始搜索</h3>
            <p className="mt-2 text-sm text-muted-foreground">支持全文检索，也可使用下方高级语法</p>
            <div className="mt-6 text-left max-w-md mx-auto px-6">
              <p className="text-sm text-muted-foreground mb-2">高级搜索语法：</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 rounded">React AND TypeScript</code> - 同时包含两个词</li>
                <li><code className="bg-muted px-1 rounded">React OR Vue</code> - 包含任一关键词</li>
                <li><code className="bg-muted px-1 rounded">&quot;完整短语&quot;</code> - 精确匹配短语</li>
                <li><code className="bg-muted px-1 rounded">React*</code> - 前缀匹配</li>
                <li><code className="bg-muted px-1 rounded">React -Vue</code> - 包含 React 但不包含 Vue</li>
              </ul>
            </div>
          </div>
          {renderHotPosts()}
        </div>
      )}

      {/* 无结果：引导换词 + 热门文章兜底 */}
      {query && posts.length === 0 && !loading && !error && (
        <div>
          <div className="bg-card rounded-lg border border-border">
            <EmptyState
              title="未找到相关文章"
              description="试试更换关键词、检查拼写，或使用下方的高级搜索语法"
              actionLabel="清空搜索"
              onAction={() => { setInputValue(''); setSearchParams({}); }}
              icon={
                <svg className="mx-auto h-14 w-14 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
          {renderHotPosts()}
        </div>
      )}

      {/* 结果列表 */}
      {posts.length > 0 && (
        <div className="space-y-6">
          {posts.map((post) => (
            <article key={post.id} className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-card">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                      <Link to={`/posts/${post.slug}`} className="hover:text-primary transition-colors">
                        {highlightText(post.title, query)}
                      </Link>
                    </h2>
                    <div className="flex items-center text-sm text-muted-foreground flex-wrap gap-x-4 gap-y-1">
                      <span className="flex items-center">
                        {post.authorAvatar ? (
                          <img src={post.authorAvatar} alt={post.authorName} className="w-5 h-5 rounded-full mr-1" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-border mr-1" />
                        )}
                        {post.authorName || 'Unknown'}
                      </span>
                      <span>{formatDate(post.publishedAt)}</span>
                      <span>{post.viewCount || 0} 次阅读</span>
                      {post.readingTime && <span>{post.readingTime} 分钟</span>}
                    </div>
                  </div>
                </div>

                {post.summary && (
                  <p className="text-muted-foreground mb-4 line-clamp-3">{highlightText(post.summary, query)}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4">
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Link
                          key={tag.id}
                          to={`/search?tag=${tag.slug}`}
                          className="px-2 py-1 bg-muted text-foreground rounded-full text-xs hover:bg-accent transition-colors"
                        >
                          #{tag.name}
                        </Link>
                      ))}
                    </div>
                  )}
                  {post.categoryName && (
                    <Link
                      to={`/search?category=${post.categorySlug}`}
                      className="px-3 py-1 bg-primary/15 text-primary rounded-full text-xs hover:bg-primary/20 transition-colors"
                    >
                      {post.categoryName}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}

          {hasMore && (
            <div className="text-center py-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
          {!hasMore && (
            <div className="text-center py-8 text-muted-foreground text-sm">没有更多结果了</div>
          )}
        </div>
      )}
    </div>
  );
}
