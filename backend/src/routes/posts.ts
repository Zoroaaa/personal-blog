/**
 * 文章相关路由（优化版）
 * 
 * 功能：
 * - 文章列表查询（支持分类、标签、搜索、排序）
 * - 文章详情获取（缓存优化）
 * - 文章CRUD操作
 * - 文章点赞功能
 * 
 * 优化内容：
 * 1. 统一API响应格式
 * 2. 增强输入验证和清理
 * 3. 优化查询性能（减少N+1问题）
 * 4. 改进缓存策略
 * 5. 添加搜索和排序功能
 * 6. 详细的错误处理和日志
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { Hono } from 'hono';
import { Env, successResponse, errorResponse, safeGetCache, safePutCache, safeDeleteCache } from '../index';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import {
  validateLength,
  sanitizeInput,
  sanitizeMarkdown,
  generateSlug,
  safeParseInt
} from '../utils/validation';

export const postRoutes = new Hono<{ Bindings: Env }>();

// ============= 常量配置 =============

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 200;
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 100000;
const READING_SPEED = 250; // 每分钟阅读字数
const CACHE_TTL = {
  POST_DETAIL: 300,      // 5分钟
  POST_LIST: 180,        // 3分钟
  HOT_POSTS: 600         // 10分钟
};

// ============= 文章列表 =============

/**
 * GET /api/posts
 * 获取文章列表（公开）
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认10，最大50）
 * - category: 分类slug
 * - tag: 标签slug
 * - author: 作者用户名
 * - search: 搜索关键词
 * - sortBy: 排序字段（published_at, view_count, like_count）
 * - order: 排序方向（asc, desc）
 */
postRoutes.get('/', async (c) => {
  const logger = createLogger(c);
  
  try {
    // ===== 1. 解析和验证查询参数 =====
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const category = c.req.query('category');
    const tag = c.req.query('tag');
    const author = c.req.query('author');
    const search = c.req.query('search');
    const sortBy = c.req.query('sortBy') || 'published_at';
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;
    
    // 验证排序字段
    const allowedSortFields = ['published_at', 'view_count', 'like_count', 'comment_count', 'created_at'];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'published_at';
    
    // ===== 2. 尝试从缓存获取（只缓存首页） =====
    const shouldCache = page === 1 && !category && !tag && !author && !search;
    let cached = null;
    
    if (shouldCache) {
      const cacheKey = `posts:homepage:${limit}:${finalSortBy}:${order}`;
      cached = await safeGetCache(c.env, cacheKey);
      
      if (cached) {
        logger.info('Homepage posts served from cache');
        return c.json(JSON.parse(cached));
      }
    }
    
    // ===== 3. 构建查询 =====
    let query = `
      SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
             p.view_count, p.like_count, p.comment_count, p.reading_time,
             p.published_at, p.created_at,
             u.username as author_name, u.display_name as author_display_name, 
             u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug, c.color as category_color
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published' AND p.visibility = 'public'
    `;
    
    const params: any[] = [];
    
    // 分类过滤
    if (category) {
      query += ` AND c.slug = ?`;
      params.push(category);
    }
    
    // 标签过滤
    if (tag) {
      query += ` AND p.id IN (
        SELECT pt.post_id FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.slug = ?
      )`;
      params.push(tag);
    }
    
    // 作者过滤
    if (author) {
      query += ` AND u.username = ?`;
      params.push(author);
    }
    
    // 搜索过滤
    if (search) {
      const searchTerm = `%${search}%`;
      query += ` AND (p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // 排序
    query += ` ORDER BY p.${finalSortBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // ===== 4. 执行查询 =====
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // ===== 5. 获取总数 =====
    let countQuery = `SELECT COUNT(*) as total FROM posts p 
                      LEFT JOIN categories c ON p.category_id = c.id
                      LEFT JOIN users u ON p.author_id = u.id
                      WHERE p.status = 'published' AND p.visibility = 'public'`;
    const countParams: any[] = [];
    
    if (category) {
      countQuery += ' AND c.slug = ?';
      countParams.push(category);
    }
    
    if (tag) {
      countQuery += ` AND p.id IN (
        SELECT pt.post_id FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.slug = ?
      )`;
      countParams.push(tag);
    }
    
    if (author) {
      countQuery += ' AND u.username = ?';
      countParams.push(author);
    }
    
    if (search) {
      const searchTerm = `%${search}%`;
      countQuery += ' AND (p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ?)';
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first() as any;
    const total = countResult?.total || 0;
    
    // ===== 6. 为每篇文章获取标签（优化：批量查询） =====
    const postIds = results.map((p: any) => p.id);
    let postsWithTags = results;
    
    if (postIds.length > 0) {
      const tagsQuery = `
        SELECT pt.post_id, t.id, t.name, t.slug
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await c.env.DB.prepare(tagsQuery).bind(...postIds).all();
      
      // 组织标签数据
      const tagsByPost = new Map();
      (tagResults as any[]).forEach(tag => {
        if (!tagsByPost.has(tag.post_id)) {
          tagsByPost.set(tag.post_id, []);
        }
        tagsByPost.get(tag.post_id).push({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        });
      });
      
      // 添加标签到文章
      postsWithTags = results.map((post: any) => ({
        ...post,
        tags: tagsByPost.get(post.id) || []
      }));
    }
    
    // ===== 7. 构建响应 =====
    const response = successResponse({
      posts: postsWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
    // ===== 8. 缓存结果（只缓存首页） =====
    if (shouldCache) {
      const cacheKey = `posts:homepage:${limit}:${finalSortBy}:${order}`;
      await safePutCache(c.env, cacheKey, JSON.stringify(response), {
        expirationTtl: CACHE_TTL.POST_LIST
      });
    }
    
    logger.info('Posts list fetched successfully', { 
      count: postsWithTags.length, 
      total 
    });
    
    return c.json(response);
    
  } catch (error) {
    logger.error('Get posts error', error);
    return c.json(errorResponse(
      'Failed to fetch posts',
      'An error occurred while fetching posts'
    ), 500);
  }
});


// ============= 管理员获取文章列表 =============

/**
 * GET /api/posts/admin
 * 获取所有文章列表（用于管理后台，需要认证）
 * 不限制状态，返回所有文章
 */
postRoutes.get('/admin', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const offset = (page - 1) * limit;
    
    // 从数据库获取所有文章（不限制状态）
    const { results } = await c.env.DB.prepare(`
      SELECT p.id, p.title, p.slug, p.summary, p.cover_image, p.status,
             p.view_count, p.like_count, p.comment_count, p.reading_time,
             p.published_at, p.created_at, p.updated_at,
             u.username as author_name, u.display_name as author_display_name, 
             u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug, c.color as category_color
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    // 获取总数
    const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM posts').first() as any;
    const total = countResult?.total || 0;
    
    // 为每篇文章获取标签
    const postIds = results.map((p: any) => p.id);
    let postsWithTags = results;
    
    if (postIds.length > 0) {
      const tagsQuery = `
        SELECT pt.post_id, t.id, t.name, t.slug
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await c.env.DB.prepare(tagsQuery).bind(...postIds).all();
      
      // 组织标签数据
      const tagsByPost = new Map();
      (tagResults as any[]).forEach(tag => {
        if (!tagsByPost.has(tag.post_id)) {
          tagsByPost.set(tag.post_id, []);
        }
        tagsByPost.get(tag.post_id).push({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        });
      });
      
      // 添加标签到文章
      postsWithTags = results.map((post: any) => ({
        ...post,
        tags: tagsByPost.get(post.id) || []
      }));
    }
    
    // 构建响应
    const response = successResponse({
      posts: postsWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
    logger.info('Admin posts fetched successfully', { count: postsWithTags.length, total });
    
    return c.json(response);
    
  } catch (error) {
    logger.error('Get admin posts error', error);
    return c.json(errorResponse(
      'Failed to fetch posts',
      'An error occurred while fetching posts'
    ), 500);
  }
});

// ============= 管理员获取文章详情 =============

/**
 * GET /api/posts/admin/:id
 * 通过ID获取文章详情（用于编辑，需要认证）
 */
postRoutes.get('/admin/:id', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json(errorResponse('Invalid post ID'), 400);
    }
    
    // 从数据库获取文章（不限制状态）
    const post = await c.env.DB.prepare(`
      SELECT p.*, 
             u.username as author_username,
             u.display_name as author_name,
             u.avatar_url as author_avatar,
             u.bio as author_bio,
             c.name as category_name, 
             c.slug as category_slug,
             c.color as category_color,
             c.icon as category_icon
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).bind(id).first() as any;
    
    if (!post) {
      logger.warn('Post not found', { id });
      return c.json(errorResponse(
        'Post not found',
        'The requested post does not exist'
      ), 404);
    }
    
    // 权限检查
    const user = c.get('user') as any;
    if (post.author_id !== user.userId && user.role !== 'admin') {
      return c.json(errorResponse(
        'Forbidden',
        'You do not have permission to view this post'
      ), 403);
    }
    
    // 获取标签
    const { results: tags } = await c.env.DB.prepare(`
      SELECT t.id, t.name, t.slug, t.post_count
      FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
    `).bind(post.id).all();
    
    // 构建响应
    const result = {
      ...post,
      tags,
      author: {
        username: post.author_username,
        displayName: post.author_name,
        avatarUrl: post.author_avatar,
        bio: post.author_bio
      }
    };
    
    // 清理冗余字段
    delete result.author_username;
    delete result.author_name;
    delete result.author_avatar;
    delete result.author_bio;
    
    logger.info('Admin post fetched successfully', { id: post.id });
    
    return c.json(successResponse(result));
    
  } catch (error) {
    logger.error('Get admin post error', error);
    return c.json(errorResponse(
      'Failed to fetch post',
      'An error occurred while fetching the post'
    ), 500);
  }
});


// ============= 搜索文章 =============

/**
 * GET /api/posts/search
 * 搜索文章（公开）
 * 
 * 查询参数：
 * - q: 搜索关键词
 * - category: 分类slug
 * - tag: 标签slug
 * - page: 页码（默认1）
 * - limit: 每页数量（默认10，最大50）
 * - sort: 排序方式（published_at, view_count, like_count, comment_count, relevance）
 * - order: 排序方向（asc, desc）
 */
postRoutes.get('/search', async (c) => {
  const logger = createLogger(c);
  
  try {
    // ===== 1. 解析和验证查询参数 =====
    const q = c.req.query('q');
    const category = c.req.query('category');
    const tag = c.req.query('tag');
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const sort = c.req.query('sort') || 'published_at';
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;
    
    // 验证排序字段
    const allowedSortFields = ['published_at', 'view_count', 'like_count', 'comment_count', 'relevance'];
    const finalSortBy = allowedSortFields.includes(sort) ? sort : 'published_at';
    
    // ===== 2. 尝试从缓存获取 =====
    const cacheKey = `posts:search:${q || ''}:${category || ''}:${tag || ''}:${page}:${limit}:${finalSortBy}:${order}`;
    const cached = await c.env.CACHE.get(cacheKey);
    
    if (cached) {
      logger.info('Search results served from cache');
      return c.json(JSON.parse(cached));
    }
    
    // ===== 3. 构建查询 =====
    let query = `
      SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
             p.view_count, p.like_count, p.comment_count, p.reading_time,
             p.published_at, p.created_at,
             u.username as author_name, u.display_name as author_display_name, 
             u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug, c.color as category_color
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published' AND p.visibility = 'public'
    `;
    
    const params: any[] = [];
    
    // 搜索关键词
    if (q) {
      const searchTerm = `%${q}%`;
      query += ` AND (p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // 分类过滤
    if (category) {
      query += ` AND c.slug = ?`;
      params.push(category);
    }
    
    // 标签过滤
    if (tag) {
      query += ` AND p.id IN (
        SELECT pt.post_id FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.slug = ?
      )`;
      params.push(tag);
    }
    
    // 排序
    if (finalSortBy === 'relevance' && q) {
      // 相关性排序（基于标题匹配权重更高）
      query += ` ORDER BY 
        CASE 
          WHEN p.title LIKE ? THEN 0
          WHEN p.summary LIKE ? THEN 1
          WHEN p.content LIKE ? THEN 2
          ELSE 3
        END, p.published_at DESC LIMIT ? OFFSET ?`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, limit, offset);
    } else {
      query += ` ORDER BY p.${finalSortBy === 'relevance' ? 'published_at' : finalSortBy} ${order} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }
    
    // ===== 4. 执行查询 =====
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // ===== 5. 获取总数 =====
    let countQuery = `SELECT COUNT(*) as total FROM posts p 
                      LEFT JOIN categories c ON p.category_id = c.id
                      WHERE p.status = 'published' AND p.visibility = 'public'`;
    const countParams: any[] = [];
    
    if (q) {
      const searchTerm = `%${q}%`;
      countQuery += ' AND (p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ?)';
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (category) {
      countQuery += ' AND c.slug = ?';
      countParams.push(category);
    }
    
    if (tag) {
      countQuery += ` AND p.id IN (
        SELECT pt.post_id FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.slug = ?
      )`;
      countParams.push(tag);
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first() as any;
    const total = countResult?.total || 0;
    
    // ===== 6. 为每篇文章获取标签（优化：批量查询） =====
    const postIds = results.map((p: any) => p.id);
    let postsWithTags = results;
    
    if (postIds.length > 0) {
      const tagsQuery = `
        SELECT pt.post_id, t.id, t.name, t.slug
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await c.env.DB.prepare(tagsQuery).bind(...postIds).all();
      
      // 组织标签数据
      const tagsByPost = new Map();
      (tagResults as any[]).forEach(tag => {
        if (!tagsByPost.has(tag.post_id)) {
          tagsByPost.set(tag.post_id, []);
        }
        tagsByPost.get(tag.post_id).push({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        });
      });
      
      // 添加标签到文章
      postsWithTags = results.map((post: any) => ({
        ...post,
        tags: tagsByPost.get(post.id) || []
      }));
    }
    
    // ===== 7. 构建响应 =====
    const response = successResponse({
      posts: postsWithTags,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
    // ===== 8. 缓存结果 =====
    await c.env.CACHE.put(cacheKey, JSON.stringify(response), {
      expirationTtl: CACHE_TTL.POST_LIST
    });
    
    logger.info('Search completed successfully', { 
      query: q,
      category,
      tag,
      count: postsWithTags.length, 
      total 
    });
    
    return c.json(response);
    
  } catch (error) {
    logger.error('Search error', error);
    return c.json(errorResponse(
      'Failed to search posts',
      'An error occurred while searching posts'
    ), 500);
  }
});

// ============= 获取用户点赞文章 =============

/**
 * GET /api/posts/likes
 * 获取当前用户点赞的文章列表（需要认证）
 * 
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认10，最大50）
 */
postRoutes.get('/likes', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const offset = (page - 1) * limit;
    
    // 获取用户点赞的文章
    const { results } = await c.env.DB.prepare(`
      SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
             p.view_count, p.like_count, p.comment_count, p.reading_time,
             p.published_at, p.created_at,
             u.username as author_name, u.display_name as author_display_name, 
             u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug, c.color as category_color
      FROM posts p
      JOIN likes l ON p.id = l.post_id
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE l.user_id = ? AND p.status = 'published' AND p.visibility = 'public'
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.userId, limit, offset).all();
    
    // 转换为 camelCase 格式
    const formattedResults = (results as any[]).map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      coverImage: post.cover_image,
      viewCount: post.view_count,
      likeCount: post.like_count,
      commentCount: post.comment_count,
      readingTime: post.reading_time,
      publishedAt: post.published_at,
      createdAt: post.created_at,
      authorName: post.author_name,
      authorDisplayName: post.author_display_name,
      authorAvatar: post.author_avatar,
      categoryName: post.category_name,
      categorySlug: post.category_slug,
      categoryColor: post.category_color
    }));
    
    // 获取总数
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM posts p
      JOIN likes l ON p.id = l.post_id
      WHERE l.user_id = ? AND p.status = 'published' AND p.visibility = 'public'
    `).bind(user.userId).first() as any;
    
    const total = countResult?.total || 0;
    
    // 为每篇文章获取标签
    const postIds = formattedResults.map((p: any) => p.id);
    let postsWithTags = formattedResults;
    
    if (postIds.length > 0) {
      const tagsQuery = `
        SELECT pt.post_id, t.id, t.name, t.slug
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await c.env.DB.prepare(tagsQuery).bind(...postIds).all();
      
      // 组织标签数据
      const tagsByPost = new Map();
      (tagResults as any[]).forEach(tag => {
        if (!tagsByPost.has(tag.post_id)) {
          tagsByPost.set(tag.post_id, []);
        }
        tagsByPost.get(tag.post_id).push({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        });
      });
      
      // 添加标签到文章
      postsWithTags = formattedResults.map((post: any) => ({
        ...post,
        tags: tagsByPost.get(post.id) || []
      }));
    }
    
    logger.info('User liked posts fetched successfully', { 
      userId: user.userId,
      count: postsWithTags.length,
      total 
    });
    
    return c.json(successResponse({
      posts: postsWithTags,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }));
    
  } catch (error) {
    logger.error('Get liked posts error', error);
    return c.json(errorResponse(
      'Failed to fetch liked posts',
      'An error occurred while fetching liked posts'
    ), 500);
  }
});

// ============= 文章详情 =============

/**
 * GET /api/posts/:slug
 * 获取文章详情（公开）
 */
postRoutes.get('/:slug', async (c) => {
  const logger = createLogger(c);
  
  try {
    const slug = c.req.param('slug');
    
    if (!slug) {
      return c.json(errorResponse('Invalid slug'), 400);
    }
    
    // ===== 1. 从缓存获取 =====
    const cacheKey = `post:${slug}`;
    const cached = await safeGetCache(c.env, cacheKey);
    
    if (cached) {
      // 异步增加浏览量
      c.executionCtx.waitUntil(
        incrementViewCount(c, slug)
      );
      logger.info('Post served from cache', { slug });
      return c.json(JSON.parse(cached));
    }
    
    // ===== 2. 从数据库获取 =====
    const post = await c.env.DB.prepare(`
      SELECT p.*, 
             u.username as author_username,
             u.display_name as author_name,
             u.avatar_url as author_avatar,
             u.bio as author_bio,
             c.name as category_name, 
             c.slug as category_slug,
             c.color as category_color,
             c.icon as category_icon
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.status = 'published' AND p.visibility = 'public'
    `).bind(slug).first() as any;
    
    if (!post) {
      logger.warn('Post not found', { slug });
      return c.json(errorResponse(
        'Post not found',
        'The requested post does not exist or is not published'
      ), 404);
    }
    
    // ===== 3. 获取标签 =====
    const { results: tags } = await c.env.DB.prepare(`
      SELECT t.id, t.name, t.slug, t.post_count
      FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
    `).bind(post.id).all();
    
    // ===== 4. 检查当前用户是否点赞 =====
    const currentUser = c.get('user') as any;
    let isLiked = false;
    
    if (currentUser) {
      const like = await c.env.DB.prepare(
        'SELECT id FROM likes WHERE user_id = ? AND post_id = ?'
      ).bind(currentUser.userId, post.id).first();
      isLiked = !!like;
    }
    
    // ===== 5. 构建响应 =====
    const result = {
      ...post,
      tags,
      isLiked,
      author: {
        username: post.author_username,
        displayName: post.author_name,
        avatarUrl: post.author_avatar,
        bio: post.author_bio
      }
    };
    
    // 清理冗余字段
    delete result.author_username;
    delete result.author_name;
    delete result.author_avatar;
    delete result.author_bio;
    
    const response = successResponse(result);
    
    // ===== 6. 缓存结果 =====
    await safePutCache(c.env, cacheKey, JSON.stringify(response), {
      expirationTtl: CACHE_TTL.POST_DETAIL
    });
    
    // ===== 7. 异步增加浏览量 =====
    c.executionCtx.waitUntil(
      incrementViewCount(c, slug, post.id)
    );
    
    logger.info('Post fetched successfully', { slug, postId: post.id });
    
    return c.json(response);
    
  } catch (error) {
    logger.error('Get post error', error);
    return c.json(errorResponse(
      'Failed to fetch post',
      'An error occurred while fetching the post'
    ), 500);
  }
});

/**
 * 增加文章浏览量
 */
async function incrementViewCount(c: any, slug: string, postId?: number): Promise<void> {
  try {
    if (postId) {
      await c.env.DB.prepare(
        'UPDATE posts SET view_count = view_count + 1 WHERE id = ?'
      ).bind(postId).run();
    } else {
      await c.env.DB.prepare(
        'UPDATE posts SET view_count = view_count + 1 WHERE slug = ?'
      ).bind(slug).run();
    }
  } catch (error) {
    console.error('Failed to increment view count:', error);
  }
}

// ============= 创建文章 =============

/**
 * POST /api/posts
 * 创建文章（需要认证）
 */
postRoutes.post('/', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const body = await c.req.json();
    let { title, content, summary, categoryId, tags, coverImage, status, visibility, password } = body;
    
    // ===== 1. 验证必填字段 =====
    if (!title || !content) {
      return c.json(errorResponse(
        'Missing required fields',
        'Title and content are required'
      ), 400);
    }
    
    // ===== 2. 清理和验证输入 =====
    title = sanitizeInput(title);
    content = sanitizeMarkdown(content);
    summary = summary ? sanitizeInput(summary) : '';
    
    // 验证标题长度
    const titleError = validateLength(title, MIN_TITLE_LENGTH, MAX_TITLE_LENGTH, 'Title');
    if (titleError) {
      return c.json(errorResponse('Invalid title', titleError), 400);
    }
    
    // 验证内容长度
    const contentError = validateLength(content, MIN_CONTENT_LENGTH, MAX_CONTENT_LENGTH, 'Content');
    if (contentError) {
      return c.json(errorResponse('Invalid content', contentError), 400);
    }
    
    // ===== 3. 生成slug =====
    const slug = generateSlug(title);
    
    // ===== 4. 计算阅读时间 =====
    const readingTime = Math.ceil(content.length / READING_SPEED);
    
    // ===== 5. 验证可见性和密码 =====
    const finalVisibility = visibility || 'public';
    if (finalVisibility === 'password' && !password) {
      return c.json(errorResponse(
        'Password required',
        'Password is required for password-protected posts'
      ), 400);
    }
    
    // ===== 6. 插入文章 =====
    const finalStatus = status || 'draft';
    const result = await c.env.DB.prepare(`
      INSERT INTO posts (
        title, slug, content, summary, author_id, category_id,
        cover_image, status, visibility, password, reading_time, 
        published_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      title,
      slug,
      content,
      summary,
      user.userId,
      categoryId || null,
      coverImage || null,
      finalStatus,
      finalVisibility,
      finalVisibility === 'password' ? password : null,
      readingTime,
      finalStatus === 'published' ? new Date().toISOString() : null
    ).run();
    
    if (!result.success) {
      throw new Error('Failed to create post');
    }
    
    const postId = result.meta.last_row_id;
    
    // ===== 7. 添加标签 =====
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagId of tags) {
        await c.env.DB.prepare(
          'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)'
        ).bind(postId, tagId).run();
      }
    }
    
    // ===== 8. 清除相关缓存 =====
    await clearPostListCache(c);
    
    logger.info('Post created successfully', { 
      postId, 
      slug, 
      title,
      userId: user.userId 
    });
    
    return c.json(successResponse({
      id: postId,
      slug
    }, 'Post created successfully'), 201);
    
  } catch (error) {
    logger.error('Create post error', error);
    return c.json(errorResponse(
      'Failed to create post',
      'An error occurred while creating the post'
    ), 500);
  }
});

// ============= 更新文章 =============

/**
 * PUT /api/posts/:id
 * 更新文章（需要认证）
 */
postRoutes.put('/:id', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const id = c.req.param('id');
    const body = await c.req.json();
    let { title, content, summary, categoryId, tags, coverImage, status, visibility, password } = body;
    
    // ===== 1. 检查文章是否存在 =====
    const post = await c.env.DB.prepare(
      'SELECT * FROM posts WHERE id = ?'
    ).bind(id).first() as any;
    
    if (!post) {
      return c.json(errorResponse('Post not found'), 404);
    }
    
    // ===== 2. 权限检查 =====
    if (post.author_id !== user.userId && user.role !== 'admin') {
      return c.json(errorResponse(
        'Forbidden',
        'You do not have permission to edit this post'
      ), 403);
    }
    
    // ===== 3. 清理和验证输入 =====
    if (title) {
      title = sanitizeInput(title);
      const titleError = validateLength(title, MIN_TITLE_LENGTH, MAX_TITLE_LENGTH, 'Title');
      if (titleError) {
        return c.json(errorResponse('Invalid title', titleError), 400);
      }
    }
    
    if (content) {
      content = sanitizeMarkdown(content);
      const contentError = validateLength(content, MIN_CONTENT_LENGTH, MAX_CONTENT_LENGTH, 'Content');
      if (contentError) {
        return c.json(errorResponse('Invalid content', contentError), 400);
      }
    }
    
    if (summary !== undefined) {
      summary = sanitizeInput(summary);
    }
    
    // ===== 4. 计算阅读时间 =====
    const readingTime = content ? Math.ceil(content.length / READING_SPEED) : post.reading_time;
    
    // ===== 5. 更新文章 =====
    await c.env.DB.prepare(`
      UPDATE posts 
      SET title = ?, content = ?, summary = ?, category_id = ?,
          cover_image = ?, status = ?, visibility = ?, password = ?,
          reading_time = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      title || post.title,
      content || post.content,
      summary !== undefined ? summary : post.summary,
      categoryId !== undefined ? categoryId : post.category_id,
      coverImage !== undefined ? coverImage : post.cover_image,
      status || post.status,
      visibility || post.visibility,
      visibility === 'password' ? password : null,
      readingTime,
      (status === 'published' && !post.published_at) ? new Date().toISOString() : post.published_at,
      id
    ).run();
    
    // ===== 6. 更新标签 =====
    if (tags && Array.isArray(tags)) {
      // 删除旧标签
      await c.env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(id).run();
      
      // 添加新标签
      for (const tagId of tags) {
        await c.env.DB.prepare(
          'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)'
        ).bind(id, tagId).run();
      }
    }
    
    // ===== 7. 清除缓存 =====
    await safeDeleteCache(c.env, `post:${post.slug}`);
    await clearPostListCache(c);
    
    logger.info('Post updated successfully', { postId: id, userId: user.userId });
    
    return c.json(successResponse({ updated: true }, 'Post updated successfully'));
    
  } catch (error) {
    logger.error('Update post error', error);
    return c.json(errorResponse(
      'Failed to update post',
      'An error occurred while updating the post'
    ), 500);
  }
});


// ============= 删除文章 =============

/**
 * DELETE /api/posts/:id
 * 删除文章（需要管理员权限）
 */
postRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const id = c.req.param('id');
    
    // 获取文章信息
    const post = await c.env.DB.prepare(
      'SELECT slug FROM posts WHERE id = ?'
    ).bind(id).first() as any;
    
    if (!post) {
      return c.json(errorResponse('Post not found'), 404);
    }
    
    // 删除文章（级联删除会自动处理评论、点赞等）
    await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    
    // 清除缓存
    await safeDeleteCache(c.env, `post:${post.slug}`);
    await clearPostListCache(c);
    // 清除数据分析缓存
    await safeDeleteCache(c.env, 'analytics:stats');
    
    logger.info('Post deleted successfully', { postId: id });
    
    return c.json(successResponse({ deleted: true }, 'Post deleted successfully'));
    
  } catch (error) {
    logger.error('Delete post error', error);
    return c.json(errorResponse(
      'Failed to delete post',
      'An error occurred while deleting the post'
    ), 500);
  }
});

// ============= 点赞文章 =============

/**
 * POST /api/posts/:id/like
 * 点赞/取消点赞文章（需要认证）
 */
postRoutes.post('/:id/like', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const postId = c.req.param('id');
    
    // 检查文章是否存在
    const post = await c.env.DB.prepare(
      'SELECT id, slug FROM posts WHERE id = ?'
    ).bind(postId).first() as any;
    
    if (!post) {
      return c.json(errorResponse('Post not found'), 404);
    }
    
    // 检查是否已点赞
    const existing = await c.env.DB.prepare(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?'
    ).bind(user.userId, postId).first();
    
    let liked = false;
    
    if (existing) {
      // 取消点赞
      await c.env.DB.prepare('DELETE FROM likes WHERE id = ?').bind(existing.id).run();
      await c.env.DB.prepare(
        'UPDATE posts SET like_count = like_count - 1 WHERE id = ?'
      ).bind(postId).run();
      liked = false;
      logger.info('Post unliked', { postId, userId: user.userId });
    } else {
      // 点赞
      await c.env.DB.prepare(
        'INSERT INTO likes (user_id, post_id) VALUES (?, ?)'
      ).bind(user.userId, postId).run();
      await c.env.DB.prepare(
        'UPDATE posts SET like_count = like_count + 1 WHERE id = ?'
      ).bind(postId).run();
      liked = true;
      logger.info('Post liked', { postId, userId: user.userId });
    }
    
    // 清除文章详情缓存
    await safeDeleteCache(c.env, `post:${post.slug}`);
    
    return c.json(successResponse({ liked }));
    
  } catch (error) {
    logger.error('Like post error', error);
    return c.json(errorResponse(
      'Failed to like post',
      'An error occurred while processing your request'
    ), 500);
  }
});





// ============= 辅助函数 =============

/**
 * 清除文章列表缓存
 */
async function clearPostListCache(c: any): Promise<void> {
  try {
    // 清除首页缓存（现在只缓存首页）
    const sortOptions = ['published_at', 'view_count', 'like_count'];
    const orders = ['DESC', 'ASC'];
    
    for (const sortBy of sortOptions) {
      for (const order of orders) {
        await safeDeleteCache(c.env, `posts:homepage:${DEFAULT_PAGE_SIZE}:${sortBy}:${order}`);
        await safeDeleteCache(c.env, `posts:homepage:${MAX_PAGE_SIZE}:${sortBy}:${order}`);
      }
    }
  } catch (error) {
    console.error('Failed to clear post list cache:', error);
  }
}
