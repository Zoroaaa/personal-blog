/**
 * validation.ts 单元测试 — 用户名/邮箱/密码校验规则
 *
 * 约束：错误文案直接透出给用户；RESERVED_USERNAMES / 一次性邮箱黑名单 /
 * 弱密码表的判定顺序（长度 → 正则 → 黑名单）被注册流程依赖，不要调换。
 */

import { describe, it, expect } from 'vitest';
import {
  validateUsername,
  validateEmail,
  validateMainstreamEmail,
  validatePassword
} from '../validation';

describe('validateUsername', () => {
  it('合法用户名通过', () => {
    expect(validateUsername('good_user-1')).toBeNull();
    expect(validateUsername('abc')).toBeNull();
    expect(validateUsername('A'.repeat(20))).toBeNull(); // 恰好 20 位
  });

  it('空与长度越界被拒', () => {
    expect(validateUsername('')).toBe('Username is required');
    expect(validateUsername('ab')).toContain('at least 3');
    expect(validateUsername('a'.repeat(21))).toContain('less than 20');
  });

  it('非法字符被拒', () => {
    expect(validateUsername('bad name')).toContain('letters, numbers');
    // 用 ≥3 字符的非 ASCII 名，保证先过长度检查、再命中国际字符正则
    expect(validateUsername('用户名abc')).toContain('letters, numbers');
  });

  it('保留名（含大小写变体）被拒', () => {
    // 实现里 toLowerCase 后比对，所以 Admin / ADMIN 同样命中
    expect(validateUsername('admin')).toBe('This username is reserved');
    expect(validateUsername('ADMIN')).toBe('This username is reserved');
    expect(validateUsername('root')).toBe('This username is reserved');
    expect(validateUsername('administrator')).toBeNull(); // 不在名单里
  });
});

describe('validateEmail', () => {
  it('合法邮箱通过', () => {
    expect(validateEmail('user@example.com')).toBeNull();
    expect(validateEmail('a.b+c@sub.domain.co')).toBeNull();
  });

  it('空与格式错误被拒', () => {
    expect(validateEmail('')).toBe('Email is required');
    expect(validateEmail('not-an-email')).toContain('Invalid email format');
    expect(validateEmail('a@b')).toContain('Invalid email format'); // 缺顶级域
    expect(validateEmail('a b@example.com')).toContain('Invalid email format');
  });

  it('超长邮箱被拒（254 上限，DoS 防护）', () => {
    const long = `${'a'.repeat(250)}@x.com`; // 255 字符
    expect(validateEmail(long)).toContain('too long');
  });

  it('一次性邮箱域名被拒', () => {
    expect(validateEmail('x@tempmail.com')).toContain('Disposable');
    expect(validateEmail('x@Mailinator.com')).toContain('Disposable'); // 域名大小写不敏感
    expect(validateEmail('x@gmail.com')).toBeNull();
  });
});

describe('validateMainstreamEmail', () => {
  it('主流邮箱域名通过', () => {
    expect(validateMainstreamEmail('x@gmail.com')).toBeNull();
    expect(validateMainstreamEmail('x@qq.com')).toBeNull();
    expect(validateMainstreamEmail('x@163.com')).toBeNull();
  });

  it('非主流域名被拒且文案为中文提示', () => {
    // 该文案直接展示在验证码发送场景
    expect(validateMainstreamEmail('x@example.com')).toBe('请使用主流邮箱（如 Gmail、QQ、163、Outlook 等）以接收验证码');
  });

  it('先走通用邮箱校验，格式错误原样透传', () => {
    expect(validateMainstreamEmail('bad')).toContain('Invalid email format');
  });
});

describe('validatePassword', () => {
  it('强密码通过', () => {
    expect(validatePassword('Str0ngPass')).toBeNull();
    expect(validatePassword('Aa1' + 'x'.repeat(5))).toBeNull();
  });

  it('空与长度越界被拒', () => {
    expect(validatePassword('')).toBe('Password is required');
    expect(validatePassword('Ab1xxxx')).toContain('at least 8'); // 7 位
    expect(validatePassword('Ab1' + 'x'.repeat(126))).toContain('too long'); // 129 位
  });

  it('缺少大小写或数字被拒', () => {
    expect(validatePassword('alllowercase1')).toContain('uppercase');
    expect(validatePassword('ALLUPPERCASE1')).toContain('uppercase');
    expect(validatePassword('NoNumbersHere')).toContain('uppercase');
  });

  it('通过复杂度但命中常见弱密码表被拒（大小写不敏感）', () => {
    // Password123 满足强密码正则，但小写化后命中 COMMON_PASSWORDS
    expect(validatePassword('Password123')).toContain('too common');
    expect(validatePassword('Abc12345')).toContain('too common');
  });
});
