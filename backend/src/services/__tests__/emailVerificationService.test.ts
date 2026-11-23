/**
 * 邮件验证码防爆破与 OAuth state 一次性消费 — 安全回归测试
 *
 * 约束：验证码是 6 位数字（10^6 空间），不限次尝试即可爆破；
 * OAuth state 是防登录 CSRF 的唯一闸门，必须「不存在即拒绝、消费即作废」。
 * 这两个行为一旦回归，对应攻击面立刻重新打开。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EmailVerificationService } from '../emailVerificationService';
import { AuthService } from '../authService';
import { AUTH_CONSTANTS } from '../../config/constants';

// 内存 KV：实现 safeGetCache/safePutCache/safeDeleteCache 用到的 get/put/delete
function createMockEnv() {
  const store = new Map<string, string>();
  const env = {
    CACHE: {
      get: async (key: string) => store.get(key) ?? null,
      put: async (key: string, value: string) => {
        store.set(key, value);
      },
      delete: async (key: string) => {
        store.delete(key);
      },
    },
    _store: store,
  };
  return env as any;
}

describe('EmailVerificationService.verifyCode 防爆破', () => {
  let env: any;

  beforeEach(async () => {
    env = createMockEnv();
    // 预置一个正确验证码（绕过发送逻辑）
    await env.CACHE.put('email_verify:register:user@example.com', '123456');
  });

  it('正确验证码验证通过并一次性作废', async () => {
    const result = await EmailVerificationService.verifyCode(env, 'register', 'user@example.com', '123456');
    expect(result.success).toBe(true);
    // 已消费：再次验证失败
    const again = await EmailVerificationService.verifyCode(env, 'register', 'user@example.com', '123456');
    expect(again.success).toBe(false);
  });

  it('错误验证码消耗一次机会', async () => {
    const result = await EmailVerificationService.verifyCode(env, 'register', 'user@example.com', '000000');
    expect(result.success).toBe(false);
    expect(result.message).toContain('还剩');
    const attempts = await env.CACHE.get('email_verify_attempts:register:user@example.com');
    expect(attempts).toBe('1');
  });

  it('连续失败达到上限后验证码作废，之后正确码也无法通过', async () => {
    for (let i = 0; i < AUTH_CONSTANTS.EMAIL_VERIFY_MAX_ATTEMPTS; i++) {
      await EmailVerificationService.verifyCode(env, 'register', 'user@example.com', '000000');
    }
    // 验证码已被删除
    expect(await env.CACHE.get('email_verify:register:user@example.com')).toBeNull();
    // 即使现在输入正确验证码也必须拒绝（爆破锁定）
    const result = await EmailVerificationService.verifyCode(env, 'register', 'user@example.com', '123456');
    expect(result.success).toBe(false);
    expect(result.message).toContain('尝试次数过多');
  });

  it('验证成功后失败计数清零', async () => {
    await EmailVerificationService.verifyCode(env, 'register', 'user@example.com', '000000');
    const ok = await EmailVerificationService.verifyCode(env, 'register', 'user@example.com', '123456');
    expect(ok.success).toBe(true);
    const attempts = await env.CACHE.get('email_verify_attempts:register:user@example.com');
    expect(attempts).toBeNull();
  });
});

describe('AuthService OAuth state 一次性消费', () => {
  let env: any;

  beforeEach(() => {
    env = createMockEnv();
  });

  it('issueOAuthState 下发的 state 可被消费一次', async () => {
    const state = await AuthService.issueOAuthState(env);
    expect(state).toBeTruthy();
    const first = await AuthService.consumeOAuthState(env, state);
    expect(first).toBe(true);
    // 第二次消费必须失败（一次性）
    const second = await AuthService.consumeOAuthState(env, state);
    expect(second).toBe(false);
  });

  it('未签发的 state 直接拒绝', async () => {
    const ok = await AuthService.consumeOAuthState(env, 'forged-state');
    expect(ok).toBe(false);
  });

  it('空/缺失 state 直接拒绝', async () => {
    expect(await AuthService.consumeOAuthState(env, undefined)).toBe(false);
    expect(await AuthService.consumeOAuthState(env, '')).toBe(false);
  });
});
