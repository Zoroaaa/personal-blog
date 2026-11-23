/**
 * 分享按钮：面向中文读者优先展示微信 / 微博 / 复制链接，
 * 海外平台（Twitter/Facebook/LinkedIn/Telegram）收进「更多」，减少视觉噪音。
 *
 * 约束：
 * - feature_share 关闭时不渲染任何内容；
 * - 微信不能直接调起分享，改用二维码弹窗 + 复制链接（含二维码加载失败的纯文本降级）；
 * - 颜色使用语义 token；二维码服务是外部依赖，失败时不影响其余分享方式。
 */

import { useState } from 'react';
import { useSiteConfig } from '../hooks/useSiteConfig';

interface ShareButtonsProps {
  title: string;
  url: string;
  description?: string;
  className?: string;
}

// 海外平台定义：收进「更多」弹层，避免主操作区被四种小图标占满
const OVERSEAS_PLATFORMS = [
  { name: 'Twitter', url: (u: string, t: string) => `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
  { name: 'Facebook', url: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${u}` },
  { name: 'LinkedIn', url: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
  { name: 'Telegram', url: (u: string, t: string) => `https://t.me/share/url?url=${u}&text=${t}` },
];

export function ShareButtons({ title, url, description = '', className = '' }: ShareButtonsProps) {
  const { config } = useSiteConfig();
  const [copied, setCopied] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showWechat, setShowWechat] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);

  if (!config.feature_share) return null;

  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title);
  // description 预留给未来支持摘要的平台，当前先显式消费避免 lint 警告
  void description;

  const weiboUrl = `https://service.weibo.com/share/share.php?url=${shareUrl}&title=${shareTitle}`;
  // 公共二维码服务：微信内长按识别即可打开文章；外部依赖失败时有纯文本降级
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${shareUrl}`;

  const openShare = (target: string, platform: string) => {
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    window.open(
      target,
      `share-${platform}`,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=yes`
    );
  };

  const handleCopyLink = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        ok = document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch {
      ok = false;
    }
    setCopied(ok);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      <span className="text-sm text-muted-foreground mr-1">分享到:</span>

      {/* 微信：弹出二维码 */}
      <button
        onClick={() => { setShowWechat(true); setQrFailed(false); }}
        className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all hover:scale-110"
        title="微信扫码分享"
        aria-label="微信扫码分享"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07.048.136.117.136l2.006-.811a.59.59 0 01.507-.033c.95.317 1.967.49 3.023.49h.22a5.966 5.966 0 01-.14-1.29c0-3.827 3.161-6.923 7.056-6.923.239 0 .476.012.71.036C15.447 4.302 12.397 2.188 8.691 2.188zM6.06 7.28a.9.9 0 110-1.8.9.9 0 010 1.8zm5.262 0a.9.9 0 110-1.8.9.9 0 010 1.8z" />
          <path d="M23.976 15.24c0-3.324-3.08-6.02-6.88-6.02-3.802 0-6.882 2.696-6.882 6.02 0 3.324 3.08 6.02 6.882 6.02.749 0 1.47-.11 2.147-.313a.42.42 0 01.362.023l1.433.579c.05.02.1-.026.085-.077l-.28-1.057a.42.42 0 01.152-.474c1.36-.99 2.241-2.57 2.241-4.378zm-9.182-2.115a.75.75 0 110-1.5.75.75 0 010 1.5zm4.604 0a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
      </button>

      {/* 微博 */}
      <button
        onClick={() => openShare(weiboUrl, 'weibo')}
        className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all hover:scale-110"
        title="分享到微博"
        aria-label="分享到微博"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.194 14.07c-.24-.06-.42-.1-.18-.36 1.68-1.82 2.47-4.3 2.01-6.86-.52-2.9-2.98-5.06-5.94-5.36-.3-.03-.6-.04-.9-.02.12-.18.24-.36.36-.54.18-.26.16-.48-.1-.62-.26-.14-.48-.08-.66.16-.18.24-.34.5-.48.76-.28-.06-.56-.1-.86-.1-3.98 0-7.2 3.14-7.2 7.02 0 3.88 3.22 7.02 7.2 7.02 3.98 0 7.2-3.14 7.2-7.02 0-.3-.02-.6-.06-.88.24.06.48.12.72.14.32.02.54-.16.58-.42.04-.26-.14-.48-.44-.56zM11.4 16.2c-2.2.22-4.08-.82-4.2-2.32-.12-1.5 1.56-2.88 3.76-3.1 2.2-.22 4.08.82 4.2 2.32.12 1.5-1.56 2.88-3.76 3.1zM12.3 8.5c-.32.1-.66.16-1.02.18-.36.02-.68-.04-.88-.16-.14-.08-.22-.2-.2-.34.02-.14.14-.24.32-.28.32-.08.72-.06 1.16.06.44.12.78.3.96.5.1.12.1.24.02.32-.08.08-.2.1-.36.06v-.34z" />
        </svg>
      </button>

      {/* 复制链接 */}
      <button
        onClick={handleCopyLink}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
          copied ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        }`}
        title={copied ? '已复制!' : '复制链接'}
        aria-label={copied ? '已复制!' : '复制链接'}
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {/* 更多：海外平台 */}
      <div className="relative">
        <button
          onClick={() => setShowMore((v) => !v)}
          className="w-9 h-9 rounded-full bg-muted text-foreground flex items-center justify-center transition-all hover:scale-110"
          title="更多分享方式"
          aria-label="更多分享方式"
          aria-expanded={showMore}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </button>
        {showMore && (
          <div className="absolute right-0 top-11 z-30 bg-card border border-border rounded-lg shadow-lg p-1.5 flex flex-col gap-1 min-w-[120px]">
            {OVERSEAS_PLATFORMS.map((p) => (
              <button
                key={p.name}
                onClick={() => { openShare(p.url(shareUrl, shareTitle), p.name); setShowMore(false); }}
                className="px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent rounded transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 微信二维码弹窗 */}
      {showWechat && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setShowWechat(false)}
          role="dialog"
          aria-modal="true"
          aria-label="微信扫码分享"
        >
          <div
            className="bg-card border border-border rounded-xl p-6 max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-foreground mb-1">微信扫码分享</h3>
            <p className="text-xs text-muted-foreground mb-4">用微信扫一扫，打开后即可分享给好友</p>
            {qrFailed ? (
              <button
                onClick={handleCopyLink}
                className="p-4 bg-muted rounded-lg break-all text-xs text-foreground"
              >
                {url}（点击复制）
              </button>
            ) : (
              <img
                src={qrUrl}
                alt="文章二维码"
                className="mx-auto w-48 h-48 rounded-lg border border-border"
                onError={() => setQrFailed(true)}
              />
            )}
            <button
              onClick={() => setShowWechat(false)}
              className="mt-5 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareButtons;
