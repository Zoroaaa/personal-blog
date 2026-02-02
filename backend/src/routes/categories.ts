/**
 * 分类和标签路由
 */

import { Hono } from 'hono';
import { Env } from '../index';

export const categoryRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/categories
 * 获取所有分类(公开)
 */
categoryRoutes.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM categories ORDER BY name
    `).all();
    
    return c.json({ categories: results });
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

/**
 * GET /api/categories/tags
 * 获取所有标签(公开)
 */
categoryRoutes.get('/tags', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM tags ORDER BY post_count DESC, name
    `).all();
    
    return c.json({ tags: results });
  } catch (error) {
    console.error('Get tags error:', error);
    return c.json({ error: 'Failed to fetch tags' }, 500);
  }
});
