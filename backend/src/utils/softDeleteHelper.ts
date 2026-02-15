/**
 * 软删除工具类
 *
 * 功能：
 * - 提供软删除的通用方法
 * - 自动处理 deleted_at 字段
 * - 帮助构建查询条件
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-13
 */

/**
 * 软删除查询条件
 */
export interface SoftDeleteQueryOptions {
  // 是否包含已删除的记录
  includeSoftDeleted?: boolean;
  // 仅显示已删除的记录
  onlySoftDeleted?: boolean;
}

/**
 * 软删除工具类
 */
export class SoftDeleteHelper {
  /**
   * 获取 WHERE 子句条件
   * 用于过滤已删除的记录
   *
   * @param table 表名
   * @param options 查询选项
   * @returns WHERE 条件（可能为空字符串）
   */
  static getWhereCondition(
    table: string,
    options: SoftDeleteQueryOptions = {}
  ): string {
    const { includeSoftDeleted = false, onlySoftDeleted = false } = options;

    if (includeSoftDeleted) {
      // 包含所有记录
      return '';
    }

    if (onlySoftDeleted) {
      // 仅显示已删除的记录
      return `${table}.deleted_at IS NOT NULL`;
    }

    // 默认：仅显示未删除的记录
    return `${table}.deleted_at IS NULL`;
  }

  /**
   * 在SQL WHERE子句中追加软删除条件
   * 如果已有WHERE条件，使用 AND 连接；否则使用 WHERE
   *
   * @param sql 原始SQL语句
   * @param table 表名
   * @param hasWhere 是否已有WHERE子句
   * @param options 查询选项
   * @returns 修改后的SQL语句
   */
  static appendWhereCondition(
    sql: string,
    table: string,
    hasWhere: boolean = false,
    options: SoftDeleteQueryOptions = {}
  ): string {
    const condition = this.getWhereCondition(table, options);

    if (!condition) {
      return sql;
    }

    if (hasWhere) {
      return `${sql} AND ${condition}`;
    } else {
      return `${sql} WHERE ${condition}`;
    }
  }

  /**
   * 软删除记录
   *
   * @param db Cloudflare D1 数据库
   * @param table 表名
   * @param id 记录ID
   * @returns 删除是否成功
   */
  static async softDelete(db: any, table: string, id: number | string): Promise<boolean> {
    try {
      const result = await db
        .prepare(`UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(id)
        .run();

      return result.success;
    } catch (error) {
      console.error(`Failed to soft delete from ${table}:`, error);
      return false;
    }
  }

  /**
   * 永久删除记录（真实删除）
   * ⚠️ 谨慎使用！此操作不可逆
   *
   * @param db Cloudflare D1 数据库
   * @param table 表名
   * @param id 记录ID
   * @returns 删除是否成功
   */
  static async hardDelete(db: any, table: string, id: number | string): Promise<boolean> {
    try {
      const result = await db
        .prepare(`DELETE FROM ${table} WHERE id = ?`)
        .bind(id)
        .run();

      return result.success;
    } catch (error) {
      console.error(`Failed to hard delete from ${table}:`, error);
      return false;
    }
  }

  /**
   * 恢复软删除的记录
   *
   * @param db Cloudflare D1 数据库
   * @param table 表名
   * @param id 记录ID
   * @returns 恢复是否成功
   */
  static async restore(db: any, table: string, id: number | string): Promise<boolean> {
    try {
      const result = await db
        .prepare(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`)
        .bind(id)
        .run();

      return result.success;
    } catch (error) {
      console.error(`Failed to restore from ${table}:`, error);
      return false;
    }
  }

  /**
   * 检查记录是否已被软删除
   *
   * @param db Cloudflare D1 数据库
   * @param table 表名
   * @param id 记录ID
   * @returns 是否已删除
   */
  static async isDeleted(db: any, table: string, id: number | string): Promise<boolean> {
    try {
      const result = await db
        .prepare(`SELECT deleted_at FROM ${table} WHERE id = ?`)
        .bind(id)
        .first() as { deleted_at: string | null } | undefined;

      return result?.deleted_at !== null && result?.deleted_at !== undefined;
    } catch (error) {
      console.error(`Failed to check delete status in ${table}:`, error);
      return false;
    }
  }

  /**
   * 清理已删除超过指定时间的记录（永久删除）
   * 用于存储空间管理
   *
   * @param db Cloudflare D1 数据库
   * @param table 表名
   * @param daysAgo 多少天前删除的记录会被清理（默认30天）
   * @returns 清理的记录数
   */
  static async cleanup(
    db: any,
    table: string,
    daysAgo: number = 30
  ): Promise<number> {
    try {
      const result = await db
        .prepare(
          `DELETE FROM ${table} WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-${daysAgo} days')`
        )
        .run();

      return result.meta.changes || 0;
    } catch (error) {
      console.error(`Failed to cleanup ${table}:`, error);
      return 0;
    }
  }

  /**
   * 获取已删除记录的统计
   *
   * @param db Cloudflare D1 数据库
   * @param table 表名
   * @returns { total: 总数, deleted: 已删除数, active: 活跃数 }
   */
  static async getStats(
    db: any,
    table: string
  ): Promise<{ total: number; deleted: number; active: number }> {
    try {
      const stats = await db
        .prepare(
          `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active,
          COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted
        FROM ${table}
        `
        )
        .first() as { total: number; active: number; deleted: number } | undefined;

      return {
        total: stats?.total || 0,
        deleted: stats?.deleted || 0,
        active: stats?.active || 0
      };
    } catch (error) {
      console.error(`Failed to get stats from ${table}:`, error);
      return { total: 0, deleted: 0, active: 0 };
    }
  }
}

/**
 * 使用示例
 */
/*

// 查询活跃的文章（不包括已删除）
const sql = 'SELECT * FROM posts WHERE status = ?';
const condition = SoftDeleteHelper.getWhereCondition('posts');
const finalSql = SoftDeleteHelper.appendWhereCondition(sql, 'posts', true);
const posts = await db.prepare(finalSql).bind('published').all();

// 软删除文章
await SoftDeleteHelper.softDelete(db, 'posts', postId);

// 恢复已删除的文章
await SoftDeleteHelper.restore(db, 'posts', postId);

// 获取统计信息
const stats = await SoftDeleteHelper.getStats(db, 'posts');
console.log(`总数: ${stats.total}, 活跃: ${stats.active}, 已删除: ${stats.deleted}`);

// 清理30天前删除的文章
const cleaned = await SoftDeleteHelper.cleanup(db, 'posts', 30);
console.log(`清理了 ${cleaned} 条记录`);

*/
