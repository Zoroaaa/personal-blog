/**
 * 速率限制 Durable Object
 *
 * 功能：
 * - 提供原子化的固定窗口（fixed window）计数
 * - 同一计数 key（idFromName）对应同一 DO 实例，请求被串行处理
 * - 借助 DO 的输入门（input gate）保证 get→put 之间不被其它事件插入，
 *   从而在并发下也不会丢失计数（替代原 KV 的「读-改-写」非原子方案）
 *
 * 约定：
 * - 每个 DO 实例只服务一个计数 key，storage 中仅保存一份窗口状态，不会泄漏存储
 * - 调用方通过 POST body 传入 { limit, windowMs }
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-10-08
 */

import type { Env } from '../types';

/**
 * 固定窗口状态
 */
interface RateLimitRecord {
  /** 当前窗口内已累计的请求数 */
  count: number;
  /** 当前窗口的结束时间戳（毫秒） */
  resetAt: number;
}

/**
 * 调用方传入的限流参数
 */
interface RateLimitRequest {
  /** 窗口内允许的最大请求数 */
  limit: number;
  /** 窗口时长（毫秒） */
  windowMs: number;
}

/**
 * DO 返回给中间件的限流结果
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60 * 1000;

export class RateLimiter implements DurableObject {
  private readonly storage: DurableObjectStorage;

  constructor(state: DurableObjectState, _env: Env) {
    this.storage = state.storage;
  }

  async fetch(request: Request): Promise<Response> {
    let payload: RateLimitRequest;
    try {
      payload = (await request.json()) as RateLimitRequest;
    } catch {
      return jsonResponse({ error: 'invalid body' }, 400);
    }

    const limit =
      Number.isFinite(payload?.limit) && payload.limit > 0
        ? Math.floor(payload.limit)
        : 1;
    const windowMs =
      Number.isFinite(payload?.windowMs) && payload.windowMs > 0
        ? Math.floor(payload.windowMs)
        : DEFAULT_WINDOW_MS;

    const now = Date.now();

    // 读取当前窗口状态。DO 串行处理请求，且 get 与 put 之间无其它 await，
    // 因此「读取 → 计数 → 写回」整体是原子的。
    const record = await this.storage.get<RateLimitRecord>('window');

    let count: number;
    let resetAt: number;

    if (record && record.resetAt > now) {
      count = record.count + 1;
      resetAt = record.resetAt;
    } else {
      // 窗口已过期（或首次请求）：开启新窗口
      count = 1;
      resetAt = now + windowMs;
    }

    await this.storage.put('window', { count, resetAt });

    const result: RateLimitResult = {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };

    return jsonResponse(result, 200);
  }
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}