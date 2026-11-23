/**
 * errors.ts 单元测试 — 错误类层级与判别函数
 *
 * 约束：AppError 子类的 code / statusCode 是对外契约（前端可能比较），
 * 改动等于改契约，必须先改本测试再改实现。
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
  isError,
  isAppError
} from '../errors';

describe('AppError 子类', () => {
  it('每个子类携带固定的 statusCode 与 code', () => {
    // 这些组合被 app.onError 与前端依赖，属于稳定契约
    expect(new UnauthorizedError()).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
    expect(new ForbiddenError()).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    expect(new NotFoundError()).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(new ValidationError()).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(new ConflictError()).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(new RateLimitError()).toMatchObject({ statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' });
    expect(new InternalError()).toMatchObject({ statusCode: 500, code: 'INTERNAL_ERROR' });
    expect(new ServiceUnavailableError()).toMatchObject({ statusCode: 503, code: 'SERVICE_UNAVAILABLE' });
  });

  it('默认 message 可被自定义 message 覆盖', () => {
    expect(new NotFoundError('文章不存在').message).toBe('文章不存在');
    expect(new NotFoundError().message).toBe('Not found');
  });

  it('isOperational 默认 true，非操作性错误显式标记 false', () => {
    // isOperational=false 的错误不应把细节透出给用户（Internal/ServiceUnavailable）
    expect(new ValidationError().isOperational).toBe(true);
    expect(new InternalError().isOperational).toBe(false);
    expect(new ServiceUnavailableError().isOperational).toBe(false);
  });

  it('自定义 AppError 可指定任意组合', () => {
    const err = new AppError('custom', 418, 'TEAPOT', true);
    expect(err).toMatchObject({ message: 'custom', statusCode: 418, code: 'TEAPOT' });
    expect(err.name).toBe('AppError');
  });
});

describe('判别函数', () => {
  it('isAppError 只对 AppError 实例为真', () => {
    expect(isAppError(new NotFoundError())).toBe(true);
    expect(isAppError(new AppError('x', 500, 'X'))).toBe(true);
    expect(isAppError(new Error('普通错误'))).toBe(false);
    expect(isAppError('字符串')).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('isError 只对 Error 实例为真', () => {
    expect(isError(new Error('x'))).toBe(true);
    expect(isError(new NotFoundError())).toBe(true);
    expect(isError({ message: 'x' })).toBe(false);
  });

  it('AppError 是 Error 的实例（能被 catch (e: Error) 正常捕获）', () => {
    expect(new ValidationError() instanceof Error).toBe(true);
  });
});
