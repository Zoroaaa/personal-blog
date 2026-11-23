/**
 * jwt.ts 单元测试 — 签发/验签闭环与失败路径
 *
 * 约束：verifyToken 的失败顺序是「格式 → 签名 → 过期」，
 * 鉴权中间件依赖该顺序区分 401 原因；密钥含 '.' 会被显式拒绝（防误配 JWT 串）。
 */

import { describe, it, expect } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  generateToken,
  verifyToken
} from '../jwt';

const SECRET = 'test-secret-0123456789abcdef';
const payload = { userId: 1, username: 'alice', role: 'user' };

describe('签发与验签闭环', () => {
  it('accessToken 签发后可验签，载荷完整', async () => {
    const token = await generateAccessToken(SECRET, payload, 3600);
    const decoded = await verifyToken(token, SECRET);

    expect(decoded).toMatchObject({ userId: 1, username: 'alice', role: 'user', type: 'access' });
    expect((decoded as any).exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('refreshToken 的 type 为 refresh', async () => {
    const token = await generateRefreshToken(SECRET, payload, 86400);
    const decoded = await verifyToken(token, SECRET);
    expect((decoded as any).type).toBe('refresh');
  });

  it('generateToken（兼容旧接口）默认 7 天过期', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await generateToken(SECRET, { userId: 2 });
    const decoded = await verifyToken(token, SECRET);

    // 默认 exp = now + 7 天，允许 5 秒执行误差
    expect((decoded as any).exp).toBeGreaterThanOrEqual(before + 7 * 24 * 3600 - 5);
    expect((decoded as any).exp).toBeLessThanOrEqual(before + 7 * 24 * 3600 + 5);
  });

  it('generateToken 支持 "2h" / "3d" 形式的 expiresIn', async () => {
    const before = Math.floor(Date.now() / 1000);

    const t2h = await generateToken(SECRET, { userId: 3, expiresIn: '2h' });
    const d2h = await verifyToken(t2h, SECRET);
    expect((d2h as any).exp).toBeGreaterThanOrEqual(before + 2 * 3600 - 5);
    // expiresIn 是临时字段，不应进入最终载荷
    expect((d2h as any).expiresIn).toBeUndefined();

    const t3d = await generateToken(SECRET, { userId: 3, expiresIn: '3d' });
    const d3d = await verifyToken(t3d, SECRET);
    expect((d3d as any).exp).toBeGreaterThanOrEqual(before + 3 * 24 * 3600 - 5);
  });
});

describe('失败路径', () => {
  it('过期 token 抛 Token expired', async () => {
    // 签发一个已经过期的 token（exp 在过去）
    const token = await generateAccessToken(SECRET, payload, -10);
    await expect(verifyToken(token, SECRET)).rejects.toThrow('Token expired');
  });

  it('签名被篡改抛 Invalid signature', async () => {
    const token = await generateAccessToken(SECRET, payload, 3600);
    const parts = token.split('.');
    // 翻转签名段最后一个字符（保持 base64url 字符集，模拟截获后伪造）
    const sig = parts[2];
    const flipped = (sig[0] === 'a' ? 'b' : 'a') + sig.slice(1);
    await expect(verifyToken(`${parts[0]}.${parts[1]}.${flipped}`, SECRET)).rejects.toThrow('Invalid signature');
  });

  it('载荷被篡改（未重签）抛 Invalid signature', async () => {
    const token = await generateAccessToken(SECRET, payload, 3600);
    const parts = token.split('.');
    // 翻转载荷段一个字符，模拟截获后篡改（如改 role），保留原签名
    // 不引入 Buffer/base64 工具：验签失败是被测属性，与篡改内容无关
    const p = parts[1];
    const flipped = (p[0] === 'a' ? 'b' : 'a') + p.slice(1);
    await expect(verifyToken(`${parts[0]}.${flipped}.${parts[2]}`, SECRET)).rejects.toThrow('Invalid signature');
  });

  it('用错误密钥验签抛 Invalid signature', async () => {
    const token = await generateAccessToken(SECRET, payload, 3600);
    await expect(verifyToken(token, 'another-secret')).rejects.toThrow('Invalid signature');
  });

  it('格式非法被拒：非 JWT 形态 / 段数不对', async () => {
    await expect(verifyToken('garbage', SECRET)).rejects.toThrow('must be in JWT format');
    await expect(verifyToken('a.b', SECRET)).rejects.toThrow('Invalid token format');
  });

  it('密钥含 "." 被显式拒绝（防把 token 当密钥粘贴）', async () => {
    const token = await generateAccessToken(SECRET, payload, 3600);
    await expect(verifyToken(token, 'xxx.yyy')).rejects.toThrow('Invalid secret');
  });
});
