/**
 * 重定向目标安全化
 *
 * 为什么需要：登录后跳转地址来自 URL query（?redirect=），属于用户可控输入。
 * 直接交给 navigate() 会造成开放重定向（react-router CVE-2025-68470：
 * `/\evil.com`、`//evil.com` 等写法可跳出站外）。即使路由库修复后，
 * 站内跳转目标也应当白名单化——这是消费方的职责，不依赖库的行为。
 *
 * 规则：只放行同站绝对路径（单个 `/` 开头），拒绝协议相对（//）、
 * 反斜杠变体（/\）与空值；不放行完整 URL。
 */

/**
 * 校验并归一化站内跳转路径
 * @param raw 未经校验的跳转目标（通常来自 query / state）
 * @param fallback 校验失败时的回退路径，默认 '/'
 * @returns 保证是同站路径的跳转目标
 */
export function safeRedirectPath(raw: string | null | undefined, fallback: string = '/'): string {
  if (!raw) return fallback;

  // 解码一次后仍需按原字符串判断，防止 %2f%2fevil.com 之类的编码绕过
  let candidate = raw.trim();

  // 必须是单个 / 开头的绝对路径：拒绝 //、/\、\ 开头与任何形式的完整 URL
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;

  // 去掉可能存在的查询串/哈希后再查一次反斜杠变体（如 /path\@evil.com）
  const pathOnly = candidate.split(/[?#]/)[0];
  if (pathOnly.includes('\\')) return fallback;

  return candidate;
}
