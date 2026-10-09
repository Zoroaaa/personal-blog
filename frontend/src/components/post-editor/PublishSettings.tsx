/**
 * 文章发布设置
 *
 * 包含发布状态、置顶、可见性与访问密码
 *
 * @author 博客系统
 */

export type PostStatus = 'draft' | 'published' | 'archived';
export type PostVisibility = 'public' | 'private' | 'password';

interface PublishSettingsProps {
  status: PostStatus;
  onStatusChange: (status: PostStatus) => void;
  isPinned: boolean;
  onPinnedChange: (checked: boolean) => void;
  pinOrder: number;
  onPinOrderChange: (order: number) => void;
  visibility: PostVisibility;
  onVisibilityChange: (visibility: PostVisibility) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  postId?: number;
}

export function PublishSettings({
  status,
  onStatusChange,
  isPinned,
  onPinnedChange,
  pinOrder,
  onPinOrderChange,
  visibility,
  onVisibilityChange,
  password,
  onPasswordChange,
  showPassword,
  onToggleShowPassword,
  postId,
}: PublishSettingsProps) {
  return (
    <>
      {/* 发布状态 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          发布状态
        </label>
        <div className="flex flex-wrap gap-4 mb-2">
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
            status === 'draft'
              ? 'border-border bg-background dark:bg-muted'
              : 'border-border hover:border-primary/50'
          }`}>
            <input
              type="radio"
              value="draft"
              checked={status === 'draft'}
              onChange={(e) => onStatusChange(e.target.value as PostStatus)}
              className="w-4 h-4 text-muted-foreground"
            />
            <span className="text-foreground font-medium">草稿</span>
          </label>
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
            status === 'published'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
              : 'border-border hover:border-primary/50'
          }`}>
            <input
              type="radio"
              value="published"
              checked={status === 'published'}
              onChange={(e) => onStatusChange(e.target.value as PostStatus)}
              className="w-4 h-4 text-green-600"
            />
            <span className="text-foreground font-medium">发布</span>
          </label>
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
            status === 'archived'
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
              : 'border-border hover:border-primary/50'
          }`}>
            <input
              type="radio"
              value="archived"
              checked={status === 'archived'}
              onChange={(e) => onStatusChange(e.target.value as PostStatus)}
              className="w-4 h-4 text-orange-600"
            />
            <span className="text-foreground font-medium">归档</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          {status === 'draft'
            ? '草稿状态：文章会保存在文章管理中，但前端页面不可见。更新为"发布"状态后前端才能看到。'
            : status === 'published'
              ? '发布状态：文章将立即在前端页面显示。'
              : '归档状态：文章将不再允许接收新评论。选择此状态后，文章将不再允许接收新评论。'}
        </p>
      </div>

      {/* 文章置顶 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          文章置顶
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
            isPinned
              ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
              : 'border-border hover:border-primary/50'
          }`}>
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => onPinnedChange(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
            />
            <svg className={`w-5 h-5 ${isPinned ? 'text-red-500' : 'text-muted-foreground'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
            </svg>
            <span className={`font-medium ${isPinned ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
              置顶此文章
            </span>
          </label>
          {isPinned && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">排序:</label>
              <input
                type="number"
                value={pinOrder}
                onChange={(e) => onPinOrderChange(parseInt(e.target.value) || 0)}
                min="0"
                className="w-20 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-muted dark:text-foreground text-sm"
                placeholder="0"
              />
              <span className="text-xs text-muted-foreground">数字越小越靠前</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {isPinned
            ? '置顶的文章将在文章列表顶部优先显示，可设置排序值控制置顶文章的显示顺序。'
            : '勾选后将此文章置顶，置顶文章会在列表顶部优先显示。'}
        </p>
      </div>

      {/* 文章可见性 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          文章可见性
        </label>
        <div className="flex flex-wrap gap-4 mb-2">
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
            visibility === 'public'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
              : 'border-border hover:border-primary/50'
          }`}>
            <input
              type="radio"
              value="public"
              checked={visibility === 'public'}
              onChange={(e) => onVisibilityChange(e.target.value as PostVisibility)}
              className="w-4 h-4 text-green-600"
            />
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-foreground font-medium">公开</span>
          </label>
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
            visibility === 'private'
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
              : 'border-border hover:border-primary/50'
          }`}>
            <input
              type="radio"
              value="private"
              checked={visibility === 'private'}
              onChange={(e) => onVisibilityChange(e.target.value as PostVisibility)}
              className="w-4 h-4 text-orange-600"
            />
            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-foreground font-medium">私密</span>
          </label>
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
            visibility === 'password'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
              : 'border-border hover:border-primary/50'
          }`}>
            <input
              type="radio"
              value="password"
              checked={visibility === 'password'}
              onChange={(e) => onVisibilityChange(e.target.value as PostVisibility)}
              className="w-4 h-4 text-purple-600"
            />
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span className="text-foreground font-medium">密码保护</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          {visibility === 'public' && '公开：所有人均可查看此文章'}
          {visibility === 'private' && '私密：仅作者和管理员可查看此文章'}
          {visibility === 'password' && '密码保护：访问者需要输入密码才能查看此文章'}
        </p>
      </div>

      {/* 密码输入（仅在密码保护模式下显示） */}
      {visibility === 'password' && (
        <div className="animate-fade-in">
          <label className="block text-sm font-medium text-foreground mb-2">
            访问密码 {postId && <span className="text-muted-foreground text-xs">(留空保持原密码)</span>}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-muted dark:text-foreground"
              placeholder={postId ? "输入新密码或留空保持原密码" : "请输入访问密码"}
            />
            <button
              type="button"
              onClick={onToggleShowPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            密码将被加密存储，访问者需要输入此密码才能查看文章内容
          </p>
        </div>
      )}
    </>
  );
}