/**
 * softDeleteHelper.ts 单元测试 — 软删除 SQL 构造与 mock D1 行为
 *
 * 约束：getWhereCondition / appendWhereCondition 生成的 SQL 直接拼进查询，
 * 语句写错会让「已删数据」漏进列表或误删数据，属于高危契约。
 */

import { describe, it, expect, vi } from 'vitest';
import { SoftDeleteHelper } from '../softDeleteHelper';

// 轻量 mock D1：只实现 helper 用到的 prepare().bind().run()/first() 链
function createMockDb(result: any = { success: true }) {
  const first = vi.fn().mockResolvedValue(result.first ?? undefined);
  const run = vi.fn().mockResolvedValue(result.run ?? result);
  const bind = vi.fn().mockReturnValue({ run, first });
  const prepare = vi.fn().mockReturnValue({ bind, run, first });
  return { db: { prepare } as any, prepare, bind, run, first };
}

describe('getWhereCondition', () => {
  it('默认排除已删除记录', () => {
    expect(SoftDeleteHelper.getWhereCondition('posts')).toBe('posts.deleted_at IS NULL');
  });

  it('includeSoftDeleted 时不做任何过滤', () => {
    expect(SoftDeleteHelper.getWhereCondition('posts', { includeSoftDeleted: true })).toBe('');
  });

  it('onlySoftDeleted 只留已删除记录', () => {
    expect(SoftDeleteHelper.getWhereCondition('posts', { onlySoftDeleted: true })).toBe(
      'posts.deleted_at IS NOT NULL'
    );
  });

  it('两个选项同时为 true 时 include 优先（含全部记录）', () => {
    // 实现里 includeSoftDeleted 分支在前；该优先级被现有调用依赖
    expect(
      SoftDeleteHelper.getWhereCondition('posts', { includeSoftDeleted: true, onlySoftDeleted: true })
    ).toBe('');
  });
});

describe('appendWhereCondition', () => {
  it('无 WHERE 时补 WHERE', () => {
    const sql = 'SELECT * FROM posts';
    expect(SoftDeleteHelper.appendWhereCondition(sql, 'posts', false)).toBe(
      'SELECT * FROM posts WHERE posts.deleted_at IS NULL'
    );
  });

  it('已有 WHERE 时用 AND 追加', () => {
    const sql = 'SELECT * FROM posts WHERE status = ?';
    expect(SoftDeleteHelper.appendWhereCondition(sql, 'posts', true)).toBe(
      'SELECT * FROM posts WHERE status = ? AND posts.deleted_at IS NULL'
    );
  });

  it('includeSoftDeleted 时原样返回，不注入条件', () => {
    const sql = 'SELECT * FROM posts';
    expect(SoftDeleteHelper.appendWhereCondition(sql, 'posts', false, { includeSoftDeleted: true })).toBe(sql);
  });
});

describe('softDelete / restore（mock D1）', () => {
  it('softDelete 执行 UPDATE 打 deleted_at 标记', async () => {
    const { db, prepare, bind } = createMockDb({ success: true });
    const ok = await SoftDeleteHelper.softDelete(db, 'posts', 42);

    expect(ok).toBe(true);
    // 必须是打标记而不是 DELETE——硬删会让数据无法恢复
    expect(prepare).toHaveBeenCalledWith('UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?');
    expect(bind).toHaveBeenCalledWith(42);
  });

  it('restore 将 deleted_at 置回 NULL', async () => {
    const { db, prepare } = createMockDb({ success: true });
    await SoftDeleteHelper.restore(db, 'posts', 42);
    expect(prepare).toHaveBeenCalledWith('UPDATE posts SET deleted_at = NULL WHERE id = ?');
  });

  it('success=false 时返回 false，不抛错', async () => {
    const { db } = createMockDb({ success: false });
    expect(await SoftDeleteHelper.softDelete(db, 'posts', 1)).toBe(false);
    expect(await SoftDeleteHelper.restore(db, 'posts', 1)).toBe(false);
  });

  it('D1 抛错时吞掉并返回 false（保持现有容错语义）', async () => {
    const { db, run } = createMockDb();
    run.mockRejectedValue(new Error('db down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await SoftDeleteHelper.softDelete(db, 'posts', 1)).toBe(false);
    spy.mockRestore();
  });
});

describe('isDeleted', () => {
  it('deleted_at 非空 → true', async () => {
    const { db } = createMockDb({ first: { deleted_at: '2026-01-01' } });
    expect(await SoftDeleteHelper.isDeleted(db, 'posts', 1)).toBe(true);
  });

  it('deleted_at 为 null → false', async () => {
    const { db } = createMockDb({ first: { deleted_at: null } });
    expect(await SoftDeleteHelper.isDeleted(db, 'posts', 1)).toBe(false);
  });

  it('记录不存在 → false', async () => {
    const { db } = createMockDb({ first: undefined });
    expect(await SoftDeleteHelper.isDeleted(db, 'posts', 999)).toBe(false);
  });
});

describe('cleanup / getStats', () => {
  it('cleanup 只清理已删除且超期的记录，返回变更行数', async () => {
    const { db, prepare } = createMockDb({ run: { meta: { changes: 3 }, success: true } });
    const n = await SoftDeleteHelper.cleanup(db, 'posts', 30);

    expect(n).toBe(3);
    const sql = prepare.mock.calls[0][0];
    // 必须带 deleted_at IS NOT NULL，否则会把活跃数据物理删除
    expect(sql).toContain('DELETE FROM posts WHERE deleted_at IS NOT NULL');
    expect(sql).toContain('-30 days');
  });

  it('cleanup 默认 30 天', async () => {
    const { db, prepare } = createMockDb({ run: { meta: { changes: 0 }, success: true } });
    await SoftDeleteHelper.cleanup(db, 'posts');
    expect(prepare.mock.calls[0][0]).toContain('-30 days');
  });

  it('getStats 返回 total/deleted/active', async () => {
    const { db } = createMockDb({ first: { total: 10, active: 7, deleted: 3 } });
    expect(await SoftDeleteHelper.getStats(db, 'posts')).toEqual({ total: 10, deleted: 3, active: 7 });
  });

  it('getStats 查询失败时返回全 0', async () => {
    const { db, first } = createMockDb();
    first.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await SoftDeleteHelper.getStats(db, 'posts')).toEqual({ total: 0, deleted: 0, active: 0 });
    spy.mockRestore();
  });
});
