/**
 * 文章密码保护表单
 *
 * 未验证密码时展示的阅读门禁页面。
 */

import { SEO } from '../SEO';
import { formatDate } from '../../utils/formatDate';
import type { Post } from '../../types';

interface PostPasswordFormProps {
  post: Post;
  passwordInput: string;
  onPasswordInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  passwordVerifying: boolean;
  passwordError: string | null;
}

export function PostPasswordForm({
  post,
  passwordInput,
  onPasswordInputChange,
  onSubmit,
  passwordVerifying,
  passwordError,
}: PostPasswordFormProps) {
  return (
    <>
      <SEO
        title={post.title}
        description={post.summary || '这是一篇受密码保护的文章'}
      />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
          {post.coverImage && (
            <div className="relative h-48 overflow-hidden">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover blur-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <h1 className="text-2xl font-bold text-white mb-2">{post.title}</h1>
                {post.summary && (
                  <p className="text-white/80 text-sm line-clamp-2">{post.summary}</p>
                )}
              </div>
            </div>
          )}

          <div className="p-8">
            {!post.coverImage && (
              <h1 className="text-2xl font-bold text-foreground mb-2">{post.title}</h1>
            )}

            <div className="flex items-center gap-3 mb-6 text-muted-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm">这是一篇受密码保护的文章</span>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  请输入访问密码
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => onPasswordInputChange(e.target.value)}
                  placeholder="输入文章密码"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 bg-background text-foreground"
                  autoFocus
                />
              </div>

              {passwordError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                disabled={passwordVerifying || !passwordInput.trim()}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {passwordVerifying ? '验证中...' : '验证密码'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  {post.authorAvatar && (
                    <img src={post.authorAvatar} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span>{post.authorName || '作者'}</span>
                </div>
                {post.publishedAt && (
                  <span>{formatDate(post.publishedAt, 'yyyy-MM-dd')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}