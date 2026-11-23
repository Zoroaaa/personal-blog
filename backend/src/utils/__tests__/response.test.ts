/**
 * response.ts 单元测试 — 统一 API 响应结构
 *
 * 约束：{ success, data|error, message?, code?, timestamp } 是前后端契约，
 * 字段名或语义变化会破坏前端 apiRequest 的解包逻辑。
 */

import { describe, it, expect } from 'vitest';
import { successResponse, errorResponse, getStatus } from '../response';

describe('successResponse', () => {
  it('返回 success=true 与 data', () => {
    const res = successResponse({ id: 1 }, 'ok');
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ id: 1 });
    expect(res.message).toBe('ok');
    expect(typeof res.timestamp).toBe('string');
  });

  it('message 可省略', () => {
    const res = successResponse([1, 2]);
    expect(res.success).toBe(true);
    expect(res.message).toBeUndefined();
    expect(res.data).toEqual([1, 2]);
  });
});

describe('errorResponse', () => {
  it('返回 success=false 与 error 字符串', () => {
    const res = errorResponse('Not found', '文章不存在', 'NOT_FOUND');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Not found');
    expect(res.message).toBe('文章不存在');
    expect(res.code).toBe('NOT_FOUND');
  });

  it('message 与 code 均可省略', () => {
    const res = errorResponse('Bad request');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Bad request');
    expect(res.message).toBeUndefined();
    expect(res.code).toBeUndefined();
  });
});

describe('getStatus', () => {
  it('有值时取传入值，无值时取 fallback', () => {
    expect(getStatus(404, 500)).toBe(404);
    expect(getStatus(undefined, 500)).toBe(500);
  });
});
