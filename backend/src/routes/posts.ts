/**
 * 文章相关路由
 */

import { Hono } from 'hono';
import { Env } from '../index';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const postRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/posts
 * 获取文章列表(公开)
 */
postRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const category = c.req.query('category');
    const tag = c.req.query('tag');
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.*, u.username as author_name, u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
    `;
    
    const params: any[] = [];
    
    if (category) {
      query += ` AND c.slug = ?`;
      params.push(category);
    }
    
    if (tag) {
      query += ` AND p.id IN (
        SELECT pt.post_id FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.slug = ?
      )`;
      params.push(tag);
    }
    
    query += ` ORDER BY p.published_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM posts WHERE status = ?';
    const countParams: any[] = ['published'];
    
    if (category) {
      countQuery += ' AND category_id IN (SELECT id FROM categories WHERE slug = ?)';
      countParams.push(category);
    }
    
    const { total } = await c.env.DB.prepare(countQuery).bind(...countParams).first() as any;
    
    return c.json({
      posts: results,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
});

/**
 * GET /api/posts/:slug
 * 获取文章详情(公开)
 */
postRoutes.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    
    // 从缓存获取
    const cached = await c.env.CACHE.get(`post:${slug}`);
    if (cached) {
      // 异步增加浏览量
      c.executionCtx.waitUntil(
        c.env.DB.prepare('UPDATE posts SET view_count = view_count + 1 WHERE slug = ?')
          .bind(slug).run()
      );
      return c.json(JSON.parse(cached));
    }
    
    // 从数据库获取
    const post = await c.env.DB.prepare(`
      SELECT p.*, u.username as author_name, u.display_name as author_display_name,
             u.avatar_url as author_avatar, c.name as category_name, c.slug as category_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.status = 'published'
    `).bind(slug).first() as any;
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    // 获取标签
    const { results: tags } = await c.env.DB.prepare(`
      SELECT t.* FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
    `).bind(post.id).all();
    
    const result = { ...post, tags };
    
    // 缓存5分钟
    await c.env.CACHE.put(`post:${slug}`, JSON.stringify(result), {
      expirationTtl: 300,
    });
    
    // 异步增加浏览量
    c.executionCtx.waitUntil(
      c.env.DB.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?')
        .bind(post.id).run()
    );
    
    return c.json(result);
  } catch (error) {
    console.error('Get post error:', error);
    return c.json({ error: 'Failed to fetch post' }, 500);
  }
});

/**
 * POST /api/posts
 * 创建文章(需要认证)
 */
postRoutes.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user') as any;
    const { title, content, summary, categoryId, tags, coverImage, status } = await c.req.json();
    
    if (!title || !content) {
      return c.json({ error: 'Title and content are required' }, 400);
    }
    
    // 生成slug
    const slug = generateSlug(title);
    
    // 计算阅读时间
    const readingTime = Math.ceil(content.length / 250);
    
    // 插入文章
    const result = await c.env.DB.prepare(`
      INSERT INTO posts (title, slug, content, summary, author_id, category_id,
                        cover_image, status, reading_time, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      slug,
      content,
      summary || '',
      user.userId,
      categoryId || null,
      coverImage || null,
      status || 'draft',
      readingTime,
      status === 'published' ? new Date().toISOString() : null
    ).run();
    
    const postId = result.meta.last_row_id;
    
    // 添加标签
    if (tags && Array.isArray(tags)) {
      for (const tagId of tags) {
        await c.env.DB.prepare(
          'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)'
        ).bind(postId, tagId).run();
      }
    }
    
    return c.json({ id: postId, slug }, 201);
  } catch (error) {
    console.error('Create post error:', error);
    return c.json({ error: 'Failed to create post' }, 500);
  }
});

/**
 * PUT /api/posts/:id
 * 更新文章(需要认证)
 */
postRoutes.put('/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user') as any;
    const id = c.req.param('id');
    const { title, content, summary, categoryId, tags, coverImage, status } = await c.req.json();
    
    // 检查文章是否存在且有权限
    const post = await c.env.DB.prepare(
      'SELECT * FROM posts WHERE id = ?'
    ).bind(id).first() as any;
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    if (post.author_id !== user.userId && user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    // 更新文章
    const readingTime = content ? Math.ceil(content.length / 250) : post.reading_time;
    
    await c.env.DB.prepare(`
      UPDATE posts 
      SET title = ?, content = ?, summary = ?, category_id = ?,
          cover_image = ?, status = ?, reading_time = ?,
          published_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      title || post.title,
      content || post.content,
      summary !== undefined ? summary : post.summary,
      categoryId !== undefined ? categoryId : post.category_id,
      coverImage !== undefined ? coverImage : post.cover_image,
      status || post.status,
      readingTime,
      (status === 'published' && !post.published_at) ? new Date().toISOString() : post.published_at,
      id
    ).run();
    
    // 更新标签
    if (tags && Array.isArray(tags)) {
      await c.env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(id).run();
      for (const tagId of tags) {
        await c.env.DB.prepare(
          'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)'
        ).bind(id, tagId).run();
      }
    }
    
    // 清除缓存
    await c.env.CACHE.delete(`post:${post.slug}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update post error:', error);
    return c.json({ error: 'Failed to update post' }, 500);
  }
});

/**
 * DELETE /api/posts/:id
 * 删除文章(需要管理员权限)
 */
postRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    
    const post = await c.env.DB.prepare('SELECT slug FROM posts WHERE id = ?').bind(id).first() as any;
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    await c.env.CACHE.delete(`post:${post.slug}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return c.json({ error: 'Failed to delete post' }, 500);
  }
});

/**
 * POST /api/posts/:id/like
 * 点赞文章(需要认证)
 */
postRoutes.post('/:id/like', requireAuth, async (c) => {
  try {
    const user = c.get('user') as any;
    const postId = c.req.param('id');
    
    // 检查是否已点赞
    const existing = await c.env.DB.prepare(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?'
    ).bind(user.userId, postId).first();
    
    if (existing) {
      // 取消点赞
      await c.env.DB.prepare('DELETE FROM likes WHERE id = ?').bind(existing.id).run();
      await c.env.DB.prepare('UPDATE posts SET like_count = like_count - 1 WHERE id = ?').bind(postId).run();
      return c.json({ liked: false });
    } else {
      // 点赞
      await c.env.DB.prepare(
        'INSERT INTO likes (user_id, post_id) VALUES (?, ?)'
      ).bind(user.userId, postId).run();
      await c.env.DB.prepare('UPDATE posts SET like_count = like_count + 1 WHERE id = ?').bind(postId).run();
      return c.json({ liked: true });
    }
  } catch (error) {
    console.error('Like post error:', error);
    return c.json({ error: 'Failed to like post' }, 500);
  }
});

/**
 * 生成URL友好的slug
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100) + '-' + Date.now().toString(36);
}
