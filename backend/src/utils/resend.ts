/**
 * Resend 邮件发送工具
 * 用于发送邮箱验证码和通知邮件
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import type { Env } from '../types';
import type { Notification } from '../types/notifications';

const RESEND_API = 'https://api.resend.com/emails';

/** 验证码邮件类型 */
export type VerificationEmailType = 'register' | 'password' | 'delete' | 'forgot_password';

/**
 * 生成验证码邮件 HTML 模板（美观、响应式）
 */
function getVerificationEmailHtml(code: string, type: string): string {
  const titles: Record<string, string> = {
    register: '邮箱验证 - 注册',
    password: '邮箱验证 - 修改密码',
    delete: '邮箱验证 - 删除账号',
    forgot_password: '邮箱验证 - 重置密码'
  };
  const title = titles[type] || '邮箱验证';
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">${title}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">您正在执行需要验证身份的操作</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">您好，</p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">您的验证码为：</p>
              <div style="background:#f1f5f9;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                <span style="font-size:28px;font-weight:700;letter-spacing:6px;color:#1e293b;font-family:ui-monospace,monospace;">${code}</span>
              </div>
              <p style="margin:0 0 8px;color:#64748b;font-size:13px;">验证码 10 分钟内有效，请勿泄露给他人。</p>
              <p style="margin:0;color:#64748b;font-size:13px;">如非本人操作，请忽略此邮件。</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">此邮件由系统自动发送，请勿直接回复</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 生成通知邮件 HTML 模板
 */
function getNotificationEmailHtml(
  notification: Notification,
  user: { name: string, email: string },
  baseUrl: string = 'https://blog.example.com'  // 从参数传入，支持动态配置
): string {
  const typeColors: Record<string, string> = {
    system: '#ef4444',
    interaction: '#3b82f6',
    private_message: '#8b5cf6'
  };

  const typeLabels: Record<string, string> = {
    system: '系统通知',
    interaction: '互动通知',
    private_message: '私信通知'
  };

  const typeColor = typeColors[notification.type] || '#64748b';
  const typeLabel = typeLabels[notification.type] || '通知';

  // 构建详情链接：优先使用notification中的link，否则使用baseUrl
  const detailLink = (notification.relatedData as any)?.link || baseUrl;

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notification.title}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);overflow:hidden;">
          <tr>
            <td style="background:${typeColor};padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">${notification.title}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${typeLabel}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">您好 ${user.name}，</p>
              ${notification.content ? `<p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">${notification.content}</p>` : ''}
              ${notification.relatedData ? `
              <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:24px;">
                ${Object.entries(notification.relatedData).map(([key, value]) =>
                  `<p style="margin:0 0 8px;color:#64748b;font-size:14px;"><strong>${key}:</strong> ${String(value)}</p>`
                ).join('')}
              </div>
              ` : ''}
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;">此通知发送时间：${notification.createdAt}</p>
              <a href="${detailLink}" style="display:inline-block;background:${typeColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;">查看详情</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">此邮件由系统自动发送，请勿直接回复</p>
              <p style="margin:0;color:#94a3b8;font-size:12px;">您可以在个人中心的通知设置中调整通知偏好</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 通过 Resend 发送验证码邮件
 * @returns 成功返回 true，失败抛出或返回 false
 */
export async function sendVerificationEmail(
  env: Env,
  to: string,
  code: string,
  type: VerificationEmailType
): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return false;
  }

  const from = (env as any).RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const subjects: Record<string, string> = {
    register: '【注册】邮箱验证码',
    password: '【修改密码】邮箱验证码',
    delete: '【删除账号】邮箱验证码',
    forgot_password: '【重置密码】邮箱验证码'
  };
  const subject = subjects[type] || '【邮箱验证】验证码';
  const html = getVerificationEmailHtml(code, type);

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend API error:', res.status, err);
    throw new Error('发送验证码邮件失败，请稍后重试');
  }
  return true;
}

/**
 * 通过 Resend 发送通知邮件
 * @returns 成功返回 true，失败返回 false
 */
export async function sendNotificationEmail(
  env: Env,
  notification: Notification,
  user: { name: string, email: string }
): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return false;
  }

  const from = (env as any).RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const subject = `【${notification.type === 'system' ? '系统' : notification.type === 'interaction' ? '互动' : '私信'}通知】${notification.title}`;

  // 从 FRONTEND_URL 环境变量获取基础URL，支持灵活配置
  // 这是用户访问博客的地址（前端域名）
  const baseUrl = env.FRONTEND_URL || 'https://blog.example.com';
  const html = getNotificationEmailHtml(notification, user, baseUrl);

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend API error for notification:', res.status, err);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send notification email:', error);
    return false;
  }
}
