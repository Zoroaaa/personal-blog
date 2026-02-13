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
 * @author 博客系统
 * @version 2.0.0
 * @created 2024-01-01
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';

import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { isFeatureEnabled } from './config';
import {
  validateLength,
  sanitizeInput,
  sanitizeMarkdown,
  generateSlug,
  safeParseInt
} from '../utils/validation';
import { createInteractionNotification } from '../services/notificationService';
import { isInteractionSubtypeEnabled } from '../services/notificationSettingsService';
import { SoftDeleteHelper } from '../utils/softDeleteHelper';

// 定义应用路由类型
export const postRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ============= 常量配置 =============

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 200;
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 100000;
const READING_SPEED = 250; // 每分钟阅读字数

// ============= 常量配置 =============

// ============= 工具函数 =============

/**
 * 转义 FTS5 查询字符串
 * 根据 SQLite FTS5 语法，包含特殊字符的字符串需要用双引号包裹
 * 双引号内的内容中，双引号本身需要用两个双引号转义
 * 
 * FTS5 bareword 允许的字符：
 * - 字母（A-Z, a-z）
 * - 数字（0-9）
 * - 下划线（_）
 * - 非 ASCII 字符（Unicode > 127）
 * 
 * 其他字符需要用双引号包裹
 */
function escapeFts5Query(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  const trimmed = query.trim();
  
  // 检查是否是简单的 bareword（只包含允许的字符）
  // 允许的字符：字母、数字、下划线、非 ASCII 字符
  const barewordPattern = /^[\w\u0080-\uFFFF]+$/;
  
  // 如果是纯 bareword，直接返回
  if (barewordPattern.test(trimmed)) {
    return trimmed;
  }
  
  // 需要转义：将双引号替换为两个双引号，然后用双引号包裹
  const escaped = trimmed.replace(/"/g, '""');
  return `"${escaped}"`;
}

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
    let category = c.req.query('category');
    let tag = c.req.query('tag');
    const author = c.req.query('author');
    const search = c.req.query('search');
    
    // 将字符串 "null" 转为真正的 null
    category = (category === 'null' || !category) ? undefined : category;
    tag = (tag === 'null' || !tag) ? undefined : tag;
    const sortBy = c.req.query('sortBy') || 'published_at';
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;
    
    // 验证排序字段
    const allowedSortFields = ['published_at', 'view_count', 'like_count', 'comment_count', 'created_at'];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'published_at';
    
    // ===== 2. 直接从D1读取 - 不使用缓存 =====
    // 理由: D1查询足够快,无需KV缓存
    logger.info('Fetching posts from D1', { page, limit, category, tag, author, search });
    
    // ===== 3. 构建查询 =====
    let query = `
      SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
             p.view_count, p.like_count, p.comment_count, p.reading_time,
             p.published_at, p.created_at,
             u.username as author_name, u.display_name as author_display_name,
             u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug, c.color as category_color,
             col.name as column_name, col.slug as column_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN columns col ON p.column_id = col.id
      WHERE p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
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
                      WHERE p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL`;
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
    
    // ===== 8. 直接返回响应 - 不使用缓存 =====
    // 理由: D1查询足够快,无需KV缓存
    
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
             c.name as category_name, c.slug as category_slug, c.color as category_color,
             col.name as column_name, col.slug as column_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN columns col ON p.column_id = col.id
      WHERE p.deleted_at IS NULL AND u.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    // 获取总数
    const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM posts WHERE deleted_at IS NULL').first() as any;
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
             c.icon as category_icon,
             col.id as column_id,
             col.name as column_name,
             col.slug as column_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN columns col ON p.column_id = col.id
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
    // 保持 snake_case 格式，让前端转换层统一处理
    const result = {
      ...post,
      tags
    };
    
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
 * - q: 搜索关键词（支持FTS5全文搜索语法）
 * - category: 分类slug
 * - tag: 标签slug
 * - page: 页码（默认1）
 * - limit: 每页数量（默认10，最大50）
 * - sort: 排序方式（published_at, view_count, like_count, comment_count, relevance）
 * - order: 排序方向（asc, desc）
 * - use_fts: 是否使用FTS5全文搜索（默认true）
 * 
 * FTS5搜索语法：
 * - 普通关键词: "React"
 * - AND搜索: "React AND TypeScript"
 * - OR搜索: "React OR Vue"
 * - 短语搜索: "\"完整短语\""
 * - 前缀搜索: "React*"
 * - 排除搜索: "React -Vue"
 */
postRoutes.get('/search', async (c) => {
  const logger = createLogger(c);
  
  try {
    // ===== 0. 检查是否允许搜索 =====
    const isSearchEnabled = await isFeatureEnabled(c.env, 'feature_search');
    if (!isSearchEnabled) {
      return c.json(errorResponse(
        'Search disabled',
        '搜索功能已关闭'
      ), 403);
    }
    
    // ===== 1. 解析和验证查询参数 =====
    const q = c.req.query('q');
    let category = c.req.query('category');
    let tag = c.req.query('tag');
    const useFts = c.req.query('use_fts') !== 'false'; // 默认启用FTS5
    
    // 将字符串 "null" 转为真正的 undefined
    category = (category === 'null' || !category) ? undefined : category;
    tag = (tag === 'null' || !tag) ? undefined : tag;
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const sort = c.req.query('sort') || 'published_at';
    const order = c.req.query('order') === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;
    
    // 验证排序字段
    const allowedSortFields = ['published_at', 'view_count', 'like_count', 'comment_count', 'relevance'];
    const finalSortBy = allowedSortFields.includes(sort) ? sort : 'published_at';
    
    // ===== 2. 直接从数据库读取 - 不使用缓存 =====
    logger.info('Searching posts from D1', { query: q, category, tag, page, limit, useFts });
    
    // ===== 3. 构建查询 =====
    let query: string;
    let params: any[] = [];

    // 检测是否包含中文
    const hasChinese = /[\u4e00-\u9fa5]/.test(q || '');
    // 中文用LIKE，英文用FTS
    const shouldUseFts = !hasChinese && useFts && q && q.trim().length > 0;
    
    // 对搜索词进行 FTS5 转义处理（如果需要使用FTS）
    const escapedQuery = shouldUseFts ? escapeFts5Query(q!.trim()) : '';

    if (shouldUseFts) {
      // 使用FTS5全文搜索（JOIN方式，使用完整表名）
      query = `
        SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
               p.view_count, p.like_count, p.comment_count, p.reading_time,
               p.published_at, p.created_at,
               u.username as author_name, u.display_name as author_display_name,
               u.avatar_url as author_avatar,
               c.name as category_name, c.slug as category_slug, c.color as category_color,
               col.name as column_name, col.slug as column_slug,
               posts_fts.rank as search_rank
        FROM posts_fts
        JOIN posts p ON posts_fts.rowid = p.id
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN columns col ON p.column_id = col.id
        WHERE posts_fts MATCH ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
      `;
      params.push(escapedQuery);
    } else {
      // 使用传统LIKE搜索（兼容旧方式或不使用关键词时）
      query = `
        SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
               p.view_count, p.like_count, p.comment_count, p.reading_time,
               p.published_at, p.created_at,
               u.username as author_name, u.display_name as author_display_name,
               u.avatar_url as author_avatar,
               c.name as category_name, c.slug as category_slug, c.color as category_color,
               col.name as column_name, col.slug as column_slug
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN columns col ON p.column_id = col.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
      `;
      
      // 搜索关键词（LIKE方式）
      if (q) {
        const searchTerm = `%${q}%`;
        query += ` AND (p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ?)`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
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
      if (shouldUseFts) {
        // FTS5模式下使用BM25相关性排序
        query += ` ORDER BY posts_fts.rank ASC, p.published_at DESC LIMIT ? OFFSET ?`;
      } else {
        // LIKE模式下使用标题匹配权重排序
        query += ` ORDER BY 
          CASE 
            WHEN p.title LIKE ? THEN 0
            WHEN p.summary LIKE ? THEN 1
            WHEN p.content LIKE ? THEN 2
            ELSE 3
          END, p.published_at DESC LIMIT ? OFFSET ?`;
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      params.push(limit, offset);
    } else {
      // 非相关性排序
      const sortField = finalSortBy === 'relevance' ? 'published_at' : finalSortBy;
      query += ` ORDER BY p.${sortField} ${order} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }
    
    // ===== 4. 执行查询 =====
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    // ===== 5. 获取总数 =====
    let countQuery: string;
    let countParams: any[] = [];
    
    if (shouldUseFts) {
      // FTS5模式下使用FTS表计算总数
      // 复用之前转义后的查询词
      countQuery = `
        SELECT COUNT(*) as total
        FROM posts_fts
        JOIN posts p ON posts_fts.rowid = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.author_id = u.id
        WHERE posts_fts MATCH ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
      `;
      countParams.push(escapedQuery);
    } else {
      countQuery = `SELECT COUNT(*) as total FROM posts p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN users u ON p.author_id = u.id
                    WHERE p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL`;
      
      if (q) {
        const searchTerm = `%${q}%`;
        countQuery += ' AND (p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ?)';
        countParams.push(searchTerm, searchTerm, searchTerm);
      }
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
             c.name as category_name, c.slug as category_slug, c.color as category_color,
             col.name as column_name, col.slug as column_slug
      FROM posts p
      JOIN likes l ON p.id = l.post_id
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN columns col ON p.column_id = col.id
      WHERE l.user_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
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
      LEFT JOIN users u ON p.author_id = u.id
      WHERE l.user_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
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

// ============= 阅读历史列表 =============

/**
 * GET /api/posts/reading-history
 * 获取当前用户阅读历史（需要认证）
 * 返回阅读时长、阅读百分比
 */
postRoutes.get('/reading-history', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const offset = (page - 1) * limit;
    
    const { results } = await c.env.DB.prepare(`
      SELECT rh.id, rh.post_id, rh.first_read_at, rh.last_read_at, rh.read_duration_seconds, rh.read_percentage,
             p.title, p.slug, p.summary, p.cover_image, p.view_count, p.like_count, p.comment_count, p.reading_time, p.published_at,
             u.username as author_name, u.display_name as author_display_name, u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug, c.color as category_color,
             col.name as column_name, col.slug as column_slug
      FROM reading_history rh
      JOIN posts p ON p.id = rh.post_id
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN columns col ON p.column_id = col.id
      WHERE rh.user_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
      ORDER BY rh.last_read_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.userId, limit, offset).all();
    
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM reading_history rh JOIN posts p ON p.id = rh.post_id WHERE rh.user_id = ? AND p.status = ? AND p.visibility = ? AND p.deleted_at IS NULL'
    ).bind(user.userId, 'published', 'public').first() as any;
    const total = countResult?.total || 0;
    
    const postIds = (results as any[]).map((r: any) => r.post_id);
    let withTags = results as any[];
    if (postIds.length > 0) {
      const tagsQuery = `SELECT pt.post_id, t.id, t.name, t.slug FROM post_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})`;
      const { results: tagResults } = await c.env.DB.prepare(tagsQuery).bind(...postIds).all();
      const tagsByPost = new Map();
      (tagResults as any[]).forEach((t: any) => {
        if (!tagsByPost.has(t.post_id)) tagsByPost.set(t.post_id, []);
        tagsByPost.get(t.post_id).push({ id: t.id, name: t.name, slug: t.slug });
      });
      withTags = (results as any[]).map((r: any) => ({
        ...r,
        tags: tagsByPost.get(r.post_id) || []
      }));
    }
    
    const items = withTags.map((r: any) => ({
      id: r.id,
      postId: r.post_id,
      title: r.title,
      slug: r.slug,
      summary: r.summary,
      coverImage: r.cover_image,
      viewCount: r.view_count,
      likeCount: r.like_count,
      commentCount: r.comment_count,
      readingTime: r.reading_time,
      publishedAt: r.published_at,
      authorName: r.author_name,
      authorDisplayName: r.author_display_name,
      authorAvatar: r.author_avatar,
      categoryName: r.category_name,
      categorySlug: r.category_slug,
      categoryColor: r.category_color,
      tags: r.tags || [],
      firstReadAt: r.first_read_at,
      lastReadAt: r.last_read_at,
      readDurationSeconds: r.read_duration_seconds,
      readPercentage: r.read_percentage
    }));
    
    return c.json(successResponse({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }));
  } catch (error) {
    logger.error('Get reading history error', error);
    return c.json(errorResponse(
      'Failed to fetch reading history',
      'An error occurred while fetching reading history'
    ), 500);
  }
});

// ============= 收藏列表 =============

/**
 * GET /api/posts/favorites
 * 获取当前用户收藏的文章列表（需要认证）
 */
postRoutes.get('/favorites', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const page = Math.max(1, safeParseInt(c.req.query('page'), 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, safeParseInt(c.req.query('limit'), DEFAULT_PAGE_SIZE)));
    const offset = (page - 1) * limit;
    
    const { results } = await c.env.DB.prepare(`
      SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
             p.view_count, p.like_count, p.comment_count, p.reading_time,
             p.published_at, p.created_at,
             u.username as author_name, u.display_name as author_display_name, u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug, c.color as category_color,
             col.name as column_name, col.slug as column_slug
      FROM posts p
      JOIN favorites f ON p.id = f.post_id
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN columns col ON p.column_id = col.id
      WHERE f.user_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.userId, limit, offset).all();
    
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM favorites f JOIN posts p ON p.id = f.post_id WHERE f.user_id = ? AND p.status = ? AND p.visibility = ? AND p.deleted_at IS NULL'
    ).bind(user.userId, 'published', 'public').first() as any;
    const total = countResult?.total || 0;
    
    const postIds = (results as any[]).map((p: any) => p.id);
    let postsWithTags = results as any[];
    if (postIds.length > 0) {
      const tagsQuery = `SELECT pt.post_id, t.id, t.name, t.slug FROM post_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})`;
      const { results: tagResults } = await c.env.DB.prepare(tagsQuery).bind(...postIds).all();
      const tagsByPost = new Map();
      (tagResults as any[]).forEach((t: any) => {
        if (!tagsByPost.has(t.post_id)) tagsByPost.set(t.post_id, []);
        tagsByPost.get(t.post_id).push({ id: t.id, name: t.name, slug: t.slug });
      });
      postsWithTags = (results as any[]).map((p: any) => ({ ...p, tags: tagsByPost.get(p.id) || [] }));
    }
    
    const formatted = postsWithTags.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      coverImage: p.cover_image,
      viewCount: p.view_count,
      likeCount: p.like_count,
      commentCount: p.comment_count,
      readingTime: p.reading_time,
      publishedAt: p.published_at,
      createdAt: p.created_at,
      authorName: p.author_name,
      authorDisplayName: p.author_display_name,
      authorAvatar: p.author_avatar,
      categoryName: p.category_name,
      categorySlug: p.category_slug,
      categoryColor: p.category_color,
      tags: p.tags || []
    }));
    
    return c.json(successResponse({
      posts: formatted,
      total,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }));
  } catch (error) {
    logger.error('Get favorites error', error);
    return c.json(errorResponse(
      'Failed to fetch favorites',
      'An error occurred while fetching favorites'
    ), 500);
  }
});

// ============= 文章详情 =============

/**
 * GET /api/posts/:slug
 * 获取文章详情（公开）
 */
postRoutes.get('/:slug', optionalAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const slug = c.req.param('slug');
    
    if (!slug) {
      return c.json(errorResponse('Invalid slug'), 400);
    }
    
    // ===== 1. 先查询文章基本信息(包括浏览量) =====
    const post = await c.env.DB.prepare(`
      SELECT p.*,
             u.username as author_username,
             u.display_name as author_name,
             u.avatar_url as author_avatar,
             u.bio as author_bio,
             c.name as category_name,
             c.slug as category_slug,
             c.color as category_color,
             c.icon as category_icon,
             col.id as column_id,
             col.name as column_name,
             col.slug as column_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN columns col ON p.column_id = col.id
      WHERE p.slug = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL
    `).bind(slug).first() as any;
    
    if (!post) {
      logger.warn('Post not found', { slug });
      return c.json(errorResponse(
        'Post not found',
        'The requested post does not exist or is not published'
      ), 404);
    }
    
    // ===== 2. 获取标签 =====
    const { results: tags } = await c.env.DB.prepare(`
      SELECT t.id, t.name, t.slug, t.post_count
      FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
    `).bind(post.id).all();
    
    // ===== 3. 检查当前用户是否点赞、是否收藏 =====
    const currentUser = c.get('user') as any;
    let isLiked = false;
    let isFavorited = false;
    
    if (currentUser) {
      const [like, fav] = await Promise.all([
        c.env.DB.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').bind(currentUser.userId, post.id).first(),
        c.env.DB.prepare('SELECT id FROM favorites WHERE user_id = ? AND post_id = ?').bind(currentUser.userId, post.id).first()
      ]);
      isLiked = !!like;
      isFavorited = !!fav;
    }
    
    // ===== 5. 构建响应 =====
    // 保持 snake_case 格式，让前端转换层统一处理
    const result = {
      ...post,
      tags,
      isLiked,
      isFavorited
    };
    
    const response = successResponse(result);
    
    // ===== 5. 异步增加浏览量 =====
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
    let { title, content, summary, categoryId, columnId, tags, coverImage, status, visibility, password } = body;
    
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
    
    // ===== 6. 验证专栏ID（如果提供）=====
    if (columnId) {
      const columnExists = await c.env.DB.prepare(
        'SELECT id FROM columns WHERE id = ? AND status = ? AND deleted_at IS NULL'
      ).bind(columnId, 'active').first();

      if (!columnExists) {
        return c.json(errorResponse(
          'Invalid column',
          'The specified column does not exist or is not active'
        ), 400);
      }
    }

    // ===== 7. 处理密码哈希 =====
    let passwordHash = null;
    if (finalVisibility === 'password' && password) {
      // 使用bcrypt哈希密码
      passwordHash = await bcrypt.hash(password, 10);
    }

    // ===== 8. 插入文章 =====
    const finalStatus = status || 'draft';
    const result = await c.env.DB.prepare(`
      INSERT INTO posts (
        title, slug, content, summary, author_id, category_id, column_id,
        cover_image, status, visibility, password_hash, reading_time,
        published_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      title,
      slug,
      content,
      summary,
      user.userId,
      categoryId || null,
      columnId || null,
      coverImage || null,
      finalStatus,
      finalVisibility,
      passwordHash,
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
    let { title, content, summary, categoryId, columnId, tags, coverImage, status, visibility, password } = body;
    
    // ===== 1. 检查文章是否存在 =====
    const post = await c.env.DB.prepare(
      'SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL'
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

    // ===== 4. 验证专栏ID（如果提供）=====
    if (columnId !== undefined && columnId !== null) {
      const columnExists = await c.env.DB.prepare(
        'SELECT id FROM columns WHERE id = ? AND status = ? AND deleted_at IS NULL'
      ).bind(columnId, 'active').first();

      if (!columnExists) {
        return c.json(errorResponse(
          'Invalid column',
          'The specified column does not exist or is not active'
        ), 400);
      }
    }

    // ===== 5. 计算阅读时间 =====
    const readingTime = content ? Math.ceil(content.length / READING_SPEED) : post.reading_time;

    // ===== 5.5. 处理密码哈希 =====
    let passwordHash = post.password_hash;
    if (visibility === 'password') {
      if (password) {
        // 如果提供了新密码，则哈希它
        passwordHash = await bcrypt.hash(password, 10);
      } else if (!post.password_hash) {
        // 如果变更为密码保护但没有提供密码，返回错误
        return c.json(errorResponse(
          'Password required',
          'Password is required for password-protected posts'
        ), 400);
      }
      // 否则保持现有的密码哈希
    } else {
      // 如果不是密码保护，清除密码哈希
      passwordHash = null;
    }

    // ===== 6. 更新文章 =====
    await c.env.DB.prepare(`
      UPDATE posts
      SET title = ?, content = ?, summary = ?, category_id = ?, column_id = ?,
          cover_image = ?, status = ?, visibility = ?, password_hash = ?,
          reading_time = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      title || post.title,
      content || post.content,
      summary !== undefined ? summary : post.summary,
      categoryId !== undefined ? categoryId : post.category_id,
      columnId !== undefined ? columnId : post.column_id,
      coverImage !== undefined ? coverImage : post.cover_image,
      status || post.status,
      visibility || post.visibility,
      passwordHash,
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
 * 从内容中提取所有图片URL
 */
function extractImageUrls(content: string): string[] {
  const urls: string[] = [];
  // 匹配 Markdown 图片语法: ![alt](url)
  const markdownRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownRegex.exec(content)) !== null) {
    urls.push(match[2]);
  }
  // 匹配 HTML img 标签: <img src="url" />
  const htmlRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

/**
 * 从URL中提取文件名
 */
function extractFilenameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    return filename || null;
  } catch {
    // 如果不是完整URL，可能是相对路径
    const parts = url.split('/');
    return parts.pop() || null;
  }
}

/**
 * DELETE /api/posts/:id
 * 删除文章（需要管理员权限）
 * 同时删除封面图片和内容中的图片
 */
postRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');

    // 获取文章信息（包括封面图片和内容）
    const post = await c.env.DB.prepare(
      'SELECT slug, cover_image, content FROM posts WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first() as any;

    if (!post) {
      return c.json(errorResponse('Post not found'), 404);
    }

    // 收集需要删除的图片
    const imagesToDelete: string[] = [];

    // 1. 封面图片
    if (post.cover_image) {
      const coverFilename = extractFilenameFromUrl(post.cover_image);
      if (coverFilename) {
        imagesToDelete.push(coverFilename);
      }
    }

    // 2. 内容中的图片
    if (post.content) {
      const imageUrls = extractImageUrls(post.content);
      for (const url of imageUrls) {
        const filename = extractFilenameFromUrl(url);
        if (filename && !imagesToDelete.includes(filename)) {
          imagesToDelete.push(filename);
        }
      }
    }

    // 软删除文章（保留数据以支持审计和恢复）
    await SoftDeleteHelper.softDelete(c.env.DB, 'posts', id);

    // 异步删除图片（不阻塞响应）
    if (imagesToDelete.length > 0) {
      c.executionCtx.waitUntil(
        (async () => {
          for (const filename of imagesToDelete) {
            try {
              await c.env.STORAGE.delete(filename);
              logger.info('Image deleted', { filename, postId: id });
            } catch (error) {
              // 忽略删除失败的错误，继续删除其他图片
              logger.warn('Failed to delete image', { filename, postId: id, error });
            }
          }
        })()
      );
    }

    logger.info('Post deleted successfully', {
      postId: id,
      imagesDeleted: imagesToDelete.length
    });

    return c.json(successResponse({
      deleted: true,
      imagesDeleted: imagesToDelete.length
    }, 'Post deleted successfully'));

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
    // ===== 0. 检查是否允许点赞 =====
    const isLikeEnabled = await isFeatureEnabled(c.env, 'feature_like');
    if (!isLikeEnabled) {
      return c.json(errorResponse(
        'Like disabled',
        '点赞功能已关闭'
      ), 403);
    }
    
    const user = c.get('user') as any;
    const postId = c.req.param('id');
    
    // 检查文章是否存在
    const post = await c.env.DB.prepare(
      'SELECT id, slug FROM posts WHERE id = ? AND deleted_at IS NULL'
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

      // 发送点赞通知
      try {
        const postInfo = await c.env.DB.prepare(
          'SELECT author_id, title, slug FROM posts WHERE id = ?'
        ).bind(postId).first() as any;

        if (postInfo && postInfo.author_id !== user.userId) {
          // 检查用户是否开启了点赞通知
          const isEnabled = await isInteractionSubtypeEnabled(
            c.env.DB,
            postInfo.author_id,
            'like'
          );

          if (isEnabled) {
            await createInteractionNotification(c.env.DB, {
              userId: postInfo.author_id,
              subtype: 'like',
              title: `${user.displayName || user.username} 赞了你的文章《${postInfo.title}》`,
              relatedData: {
                postId: parseInt(postId),
                postTitle: postInfo.title,
                postSlug: postInfo.slug,
                senderId: user.userId,
                senderName: user.displayName || user.username,
                senderAvatar: user.avatarUrl,
              },
            });
          }
        }
      } catch (notifyError) {
        // 通知发送失败不影响点赞操作
        logger.error('Send like notification error', notifyError);
      }
    }

    // 返回最新点赞数，便于前端实时更新
    const updated = await c.env.DB.prepare('SELECT like_count FROM posts WHERE id = ?').bind(postId).first() as any;
    const likeCount = updated?.like_count ?? 0;

    return c.json(successResponse({ liked, likeCount }));

  } catch (error) {
    logger.error('Like post error', error);
    return c.json(errorResponse(
      'Failed to like post',
      'An error occurred while processing your request'
    ), 500);
  }
});

// ============= 记录阅读进度 =============

/**
 * POST /api/posts/:id/reading-progress
 * 记录当前用户对文章的阅读进度（需要认证）
 * 请求体: { readDurationSeconds?: number, readPercentage?: number }
 */
postRoutes.post('/:id/reading-progress', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const postId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const readDurationSeconds = Math.max(0, safeParseInt(body.readDurationSeconds, 0));
    const readPercentage = Math.min(100, Math.max(0, safeParseInt(body.readPercentage, 0)));
    
    const post = await c.env.DB.prepare('SELECT id FROM posts WHERE id = ? AND status = ? AND visibility = ? AND deleted_at IS NULL')
      .bind(postId, 'published', 'public').first() as any;
    
    if (!post) {
      return c.json(errorResponse('Post not found'), 404);
    }
    
    const existing = await c.env.DB.prepare(
      'SELECT read_duration_seconds, read_percentage FROM reading_history WHERE user_id = ? AND post_id = ?'
    ).bind(user.userId, postId).first() as any;
    
    if (existing) {
      const duration = Math.max(existing.read_duration_seconds || 0, readDurationSeconds);
      const percentage = Math.max(existing.read_percentage || 0, readPercentage);
      await c.env.DB.prepare(`
        UPDATE reading_history SET last_read_at = CURRENT_TIMESTAMP, read_duration_seconds = ?, read_percentage = ?
        WHERE user_id = ? AND post_id = ?
      `).bind(duration, percentage, user.userId, postId).run();
    } else {
      await c.env.DB.prepare(`
        INSERT INTO reading_history (user_id, post_id, first_read_at, last_read_at, read_duration_seconds, read_percentage)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
      `).bind(user.userId, postId, readDurationSeconds, readPercentage).run();
    }
    
    logger.info('Reading progress recorded', { postId, userId: user.userId });
    return c.json(successResponse({ updated: true }));
  } catch (error) {
    logger.error('Reading progress error', error);
    return c.json(errorResponse(
      'Failed to record reading progress',
      'An error occurred while saving progress'
    ), 500);
  }
});

// ============= 收藏/取消收藏文章 =============

/**
 * POST /api/posts/:id/favorite
 * 收藏或取消收藏文章（需要认证）
 */
postRoutes.post('/:id/favorite', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const postId = c.req.param('id');
    
    const post = await c.env.DB.prepare('SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL').bind(postId).first() as any;
    if (!post) {
      return c.json(errorResponse('Post not found'), 404);
    }
    
    const existing = await c.env.DB.prepare(
      'SELECT id FROM favorites WHERE user_id = ? AND post_id = ?'
    ).bind(user.userId, postId).first();
    
    let favorited: boolean;
    if (existing) {
      await c.env.DB.prepare('DELETE FROM favorites WHERE id = ?').bind(existing.id).run();
      favorited = false;
      logger.info('Post unfavorited', { postId, userId: user.userId });
    } else {
      await c.env.DB.prepare('INSERT INTO favorites (user_id, post_id) VALUES (?, ?)').bind(user.userId, postId).run();
      favorited = true;
      logger.info('Post favorited', { postId, userId: user.userId });

      // 发送收藏通知
      try {
        const postInfo = await c.env.DB.prepare(
          'SELECT author_id, title, slug FROM posts WHERE id = ?'
        ).bind(postId).first() as any;

        if (postInfo && postInfo.author_id !== user.userId) {
          // 检查用户是否开启了收藏通知
          const isEnabled = await isInteractionSubtypeEnabled(
            c.env.DB,
            postInfo.author_id,
            'favorite'
          );

          if (isEnabled) {
            await createInteractionNotification(c.env.DB, {
              userId: postInfo.author_id,
              subtype: 'favorite',
              title: `${user.displayName || user.username} 收藏了你的文章《${postInfo.title}》`,
              relatedData: {
                postId: parseInt(postId),
                postTitle: postInfo.title,
                postSlug: postInfo.slug,
                senderId: user.userId,
                senderName: user.displayName || user.username,
                senderAvatar: user.avatarUrl,
              },
            });
          }
        }
      } catch (notifyError) {
        // 通知发送失败不影响收藏操作
        logger.error('Send favorite notification error', notifyError);
      }
    }

    return c.json(successResponse({ favorited }));
  } catch (error) {
    logger.error('Favorite post error', error);
    return c.json(errorResponse(
      'Failed to update favorite',
      'An error occurred while processing your request'
    ), 500);
  }
});

// ============= 评论@用户功能：获取可@用户列表 =============

/**
 * GET /api/posts/:id/mentionable-users
 * 获取文章中可@的用户列表（文章作者 + 已评论用户）
 */
postRoutes.get('/:id/mentionable-users', async (c) => {
  const logger = createLogger(c);
  
  try {
    const postId = parseInt(c.req.param('id'));
    
    if (isNaN(postId)) {
      return c.json(errorResponse(
        'Invalid post ID',
        '无效的文章ID'
      ), 400);
    }
    
    // 验证文章是否存在
    const post = await c.env.DB.prepare(
      'SELECT id FROM posts WHERE id = ? AND status = ? AND deleted_at IS NULL'
    ).bind(postId, 'published').first();
    
    if (!post) {
      return c.json(errorResponse(
        'Post not found',
        '文章不存在'
      ), 404);
    }
    
    // 获取文章作者和已评论用户（去重）
    const users = await c.env.DB.prepare(
      `SELECT DISTINCT u.id, u.username, u.display_name, u.avatar_url
       FROM users u
       WHERE u.id IN (
         SELECT author_id FROM posts WHERE id = ?
         UNION
         SELECT user_id FROM comments WHERE post_id = ? AND status = 'approved'
       )
       AND u.status = 'active'
       ORDER BY u.display_name ASC
       LIMIT 20`
    ).bind(postId, postId).all() as any;
    
    const formattedUsers = (users.results || []).map((user: any) => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    }));
    
    logger.info('Mentionable users fetched', { 
      postId, 
      count: formattedUsers.length 
    });
    
    return c.json(successResponse({ users: formattedUsers }));
    
  } catch (error) {
    logger.error('Get mentionable users error', error);
    return c.json(errorResponse(
      'Failed to get mentionable users',
      '获取可@用户列表失败'
    ), 500);
  }
});

// ============= 密码验证 =============

/**
 * POST /api/posts/:id/verify-password
 * 验证文章密码（用于访问受密码保护的文章）
 *
 * 请求体：
 * {
 *   password: string
 * }
 */
postRoutes.post('/:id/verify-password', async (c) => {
  const logger = createLogger(c);

  try {
    const postId = c.req.param('id');
    const body = await c.req.json();
    const { password } = body;

    if (!password) {
      return c.json(errorResponse(
        'Missing password',
        'Password is required'
      ), 400);
    }

    // 获取文章的密码哈希
    const post = await c.env.DB.prepare(
      `SELECT id, visibility, password_hash, title, slug
       FROM posts
       WHERE id = ? AND visibility = 'password' AND status = 'published' AND deleted_at IS NULL`
    ).bind(postId).first() as any;

    if (!post) {
      return c.json(errorResponse(
        'Post not found',
        'The requested post does not exist or is not password-protected'
      ), 404);
    }

    if (!post.password_hash) {
      return c.json(errorResponse(
        'No password set',
        'This post is marked as password-protected but no password is set'
      ), 500);
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, post.password_hash);

    if (!isValid) {
      logger.warn('Password verification failed', { postId });
      return c.json(errorResponse(
        'Invalid password',
        'The password you entered is incorrect'
      ), 401);
    }

    // 生成临时访问令牌（可选）
    // 这个令牌可以存储在客户端，以避免重复输入密码
    const token = await generateToken(c.env.JWT_SECRET, {
      postId: post.id,
      type: 'post_password_access',
      expiresIn: '24h'
    });

    logger.info('Password verification successful', { postId });

    return c.json(successResponse({
      verified: true,
      token,
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug
      }
    }, '密码正确'));

  } catch (error) {
    logger.error('Password verification error', error);
    return c.json(errorResponse(
      'Verification failed',
      'An error occurred during password verification'
    ), 500);
  }
});

// ============= 辅助函数 =============

