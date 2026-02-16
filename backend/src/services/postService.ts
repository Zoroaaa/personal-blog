/**
 * 文章服务
 *
 * 功能：
 * - 文章列表查询
 * - 文章详情获取
 * - 文章CRUD操作
 * - 文章点赞/收藏
 * - 阅读历史/进度
 * - 搜索功能
 * - 密码验证
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-16
 */

import bcrypt from 'bcryptjs';
import { generateToken, asSecret, asJWTToken, verifyToken } from '../utils/jwt';
import {
  validateLength,
  sanitizeInput,
  sanitizeMarkdown,
  generateSlug,
  safeParseInt
} from '../utils/validation';
import { SoftDeleteHelper } from '../utils/softDeleteHelper';
import { createInteractionNotification } from './notificationService';
import { isInteractionSubtypeEnabled } from './notificationSettingsService';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 200;
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 100000;
const READING_SPEED = 250;

export interface PostListQuery {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  author?: string;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface CreatePostRequest {
  title: string;
  content: string;
  summary?: string;
  categoryId?: number;
  columnId?: number;
  tags?: number[];
  coverImage?: string;
  status?: 'draft' | 'published';
  visibility?: 'public' | 'private' | 'password';
  password?: string;
  isPinned?: boolean;
  pinOrder?: number;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  summary?: string;
  categoryId?: number | null;
  columnId?: number | null;
  tags?: number[];
  coverImage?: string | null;
  status?: 'draft' | 'published';
  visibility?: 'public' | 'private' | 'password';
  password?: string;
  isPinned?: boolean;
  pinOrder?: number;
}

export interface SearchResult {
  success: boolean;
  posts?: any[];
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

function escapeFts5Query(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  const trimmed = query.trim();
  const barewordPattern = /^[\w\u0080-\uFFFF]+$/;

  if (barewordPattern.test(trimmed)) {
    return trimmed;
  }

  const escaped = trimmed.replace(/"/g, '""');
  return `"${escaped}"`;
}

function extractImageUrls(content: string): string[] {
  const urls: string[] = [];
  const markdownRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownRegex.exec(content)) !== null) {
    urls.push(match[2]);
  }
  const htmlRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function extractFilenameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    return filename || null;
  } catch {
    const parts = url.split('/');
    return parts.pop() || null;
  }
}

export class PostService {
  static async getPostList(
    db: any,
    query: PostListQuery
  ): Promise<{ success: boolean; posts?: any[]; pagination?: any; message?: string }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit || DEFAULT_PAGE_SIZE));
    let category = (query.category === 'null' || !query.category) ? undefined : query.category;
    let tag = (query.tag === 'null' || !query.tag) ? undefined : query.tag;
    const author = query.author;
    const search = query.search;
    const sortBy = query.sortBy || 'published_at';
    const order = query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const allowedSortFields = ['published_at', 'view_count', 'like_count', 'comment_count', 'created_at'];
    const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'published_at';

    let sql = `
      SELECT p.id, p.title, p.slug, p.summary, p.cover_image,
             p.view_count, p.like_count, p.comment_count, p.reading_time,
             p.published_at, p.created_at, p.visibility, p.is_pinned, p.pin_order,
             u.username as author_name, u.display_name as author_display_name,
             u.avatar_url as author_avatar,
             c.name as category_name, c.slug as category_slug, c.color as category_color,
             col.name as column_name, col.slug as column_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN columns col ON p.column_id = col.id
      WHERE p.status = 'published' AND p.visibility IN ('public', 'password') AND p.deleted_at IS NULL AND u.deleted_at IS NULL
      AND (col.status IS NULL OR col.status != 'hidden')
    `;

    const params: any[] = [];

    if (category) {
      sql += ` AND c.slug = ?`;
      params.push(category);
    }

    if (tag) {
      sql += ` AND p.id IN (
        SELECT pt.post_id FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.slug = ?
      )`;
      params.push(tag);
    }

    if (author) {
      sql += ` AND u.username = ?`;
      params.push(author);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      sql += ` AND (p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY p.is_pinned DESC, p.pin_order ASC, p.${finalSortBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await db.prepare(sql).bind(...params).all();

    let countSql = `SELECT COUNT(*) as total FROM posts p
                    LEFT JOIN categories c ON p.category_id = c.id
                    LEFT JOIN users u ON p.author_id = u.id
                    LEFT JOIN columns col ON p.column_id = col.id
                    WHERE p.status = 'published' AND p.visibility IN ('public', 'password') AND p.deleted_at IS NULL AND u.deleted_at IS NULL
                    AND (col.status IS NULL OR col.status != 'hidden')`;
    const countParams: any[] = [];

    if (category) {
      countSql += ' AND c.slug = ?';
      countParams.push(category);
    }

    if (tag) {
      countSql += ` AND p.id IN (
        SELECT pt.post_id FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.slug = ?
      )`;
      countParams.push(tag);
    }

    if (author) {
      countSql += ' AND u.username = ?';
      countParams.push(author);
    }

    if (search) {
      const searchTerm = `%${search}%`;
      countSql += ' AND (p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ?)';
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const countResult = await db.prepare(countSql).bind(...countParams).first() as any;
    const total = countResult?.total || 0;

    const postIds = results.map((p: any) => p.id);
    let postsWithTags = results;

    if (postIds.length > 0) {
      const tagsSql = `
        SELECT pt.post_id, t.id, t.name, t.slug
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await db.prepare(tagsSql).bind(...postIds).all();

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

      postsWithTags = results.map((post: any) => ({
        ...post,
        tags: tagsByPost.get(post.id) || []
      }));
    }

    return {
      success: true,
      posts: postsWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getAdminPostList(
    db: any,
    query: PostListQuery
  ): Promise<{ success: boolean; posts?: any[]; pagination?: any }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    const { results } = await db.prepare(`
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

    const countResult = await db.prepare('SELECT COUNT(*) as total FROM posts WHERE deleted_at IS NULL').first() as any;
    const total = countResult?.total || 0;

    const postIds = results.map((p: any) => p.id);
    let postsWithTags = results;

    if (postIds.length > 0) {
      const tagsSql = `
        SELECT pt.post_id, t.id, t.name, t.slug
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await db.prepare(tagsSql).bind(...postIds).all();

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

      postsWithTags = results.map((post: any) => ({
        ...post,
        tags: tagsByPost.get(post.id) || []
      }));
    }

    return {
      success: true,
      posts: postsWithTags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getAdminPostDetail(
    db: any,
    postId: string,
    userId: number,
    userRole: string
  ): Promise<{ success: boolean; post?: any; message?: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    const post = await db.prepare(`
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
    `).bind(postId).first() as any;

    if (!post) {
      return {
        success: false,
        message: 'The requested post does not exist',
        statusCode: 404
      };
    }

    if (post.author_id !== userId && userRole !== 'admin') {
      return {
        success: false,
        message: 'You do not have permission to view this post',
        statusCode: 403
      };
    }

    const { results: tags } = await db.prepare(`
      SELECT t.id, t.name, t.slug, t.post_count
      FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
    `).bind(post.id).all();

    return {
      success: true,
      post: {
        ...post,
        tags
      }
    };
  }

  static async searchPosts(
    db: any,
    env: any,
    query: {
      q?: string;
      category?: string;
      tag?: string;
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
      useFts?: boolean;
    },
    isFeatureEnabled: (env: any, feature: string) => Promise<boolean>
  ): Promise<SearchResult> {
    const isSearchEnabled = await isFeatureEnabled(env, 'feature_search');
    if (!isSearchEnabled) {
      return {
        success: false,
        message: '搜索功能已关闭',
        statusCode: 403
      };
    }

    const q = query.q;
    let category = (query.category === 'null' || !query.category) ? undefined : query.category;
    let tag = (query.tag === 'null' || !query.tag) ? undefined : query.tag;
    const useFts = query.useFts !== false;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit || DEFAULT_PAGE_SIZE));
    const sort = query.sort || 'published_at';
    const order = query.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    const allowedSortFields = ['published_at', 'view_count', 'like_count', 'comment_count', 'relevance'];
    const finalSortBy = allowedSortFields.includes(sort) ? sort : 'published_at';

    let sql: string;
    let params: any[] = [];

    const hasChinese = /[\u4e00-\u9fa5]/.test(q || '');
    const shouldUseFts = !hasChinese && useFts && q && q.trim().length > 0;
    const escapedQuery = shouldUseFts ? escapeFts5Query(q!.trim()) : '';

    if (shouldUseFts) {
      sql = `
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
      sql = `
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

      if (q) {
        const searchTerm = `%${q}%`;
        sql += ` AND (p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ?)`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
    }

    if (category) {
      sql += ` AND c.slug = ?`;
      params.push(category);
    }

    if (tag) {
      sql += ` AND p.id IN (
        SELECT pt.post_id FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.slug = ?
      )`;
      params.push(tag);
    }

    if (finalSortBy === 'relevance' && q) {
      if (shouldUseFts) {
        sql += ` ORDER BY posts_fts.rank ASC, p.published_at DESC LIMIT ? OFFSET ?`;
      } else {
        sql += ` ORDER BY 
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
      const sortField = finalSortBy === 'relevance' ? 'published_at' : finalSortBy;
      sql += ` ORDER BY p.${sortField} ${order} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const { results } = await db.prepare(sql).bind(...params).all();

    let countSql: string;
    let countParams: any[] = [];

    if (shouldUseFts) {
      countSql = `
        SELECT COUNT(*) as total
        FROM posts_fts
        JOIN posts p ON posts_fts.rowid = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.author_id = u.id
        WHERE posts_fts MATCH ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
      `;
      countParams.push(escapedQuery);
    } else {
      countSql = `SELECT COUNT(*) as total FROM posts p
                  LEFT JOIN categories c ON p.category_id = c.id
                  LEFT JOIN users u ON p.author_id = u.id
                  WHERE p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL`;

      if (q) {
        const searchTerm = `%${q}%`;
        countSql += ' AND (p.title LIKE ? OR p.summary LIKE ? OR p.content LIKE ?)';
        countParams.push(searchTerm, searchTerm, searchTerm);
      }
    }

    if (category) {
      countSql += ' AND c.slug = ?';
      countParams.push(category);
    }

    if (tag) {
      countSql += ` AND p.id IN (
        SELECT pt.post_id FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.slug = ?
      )`;
      countParams.push(tag);
    }

    const countResult = await db.prepare(countSql).bind(...countParams).first() as any;
    const total = countResult?.total || 0;

    const postIds = results.map((p: any) => p.id);
    let postsWithTags = results;

    if (postIds.length > 0) {
      const tagsSql = `
        SELECT pt.post_id, t.id, t.name, t.slug
        FROM post_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
      `;
      const { results: tagResults } = await db.prepare(tagsSql).bind(...postIds).all();

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

      postsWithTags = results.map((post: any) => ({
        ...post,
        tags: tagsByPost.get(post.id) || []
      }));
    }

    return {
      success: true,
      posts: postsWithTags,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getPostBySlug(
    db: any,
    env: any,
    slug: string,
    currentUser: any
  ): Promise<{ success: boolean; post?: any; message?: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503; requiresPassword?: boolean }> {
    const post = await db.prepare(`
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
      WHERE p.slug = ? AND p.status = 'published' AND p.deleted_at IS NULL
    `).bind(slug).first() as any;

    if (!post) {
      return {
        success: false,
        message: 'The requested post does not exist or is not published',
        statusCode: 404
      };
    }

    const isAuthor = currentUser && currentUser.userId === post.author_id;
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (post.visibility === 'private' && !isAuthor && !isAdmin) {
      return {
        success: false,
        message: 'This post is private and only accessible by the author',
        statusCode: 403
      };
    }

    if (post.visibility === 'password') {
      return {
        success: true,
        requiresPassword: true,
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          summary: post.summary,
          cover_image: post.cover_image,
          visibility: post.visibility,
          requires_password: true,
          author_username: post.author_username,
          author_name: post.author_name,
          author_avatar: post.author_avatar,
          category_name: post.category_name,
          category_slug: post.category_slug,
          category_color: post.category_color,
          published_at: post.published_at,
          created_at: post.created_at
        }
      };
    }

    const { results: tags } = await db.prepare(`
      SELECT t.id, t.name, t.slug, t.post_count
      FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
    `).bind(post.id).all();

    let isLiked = false;
    let isFavorited = false;

    if (currentUser) {
      const [like, fav] = await Promise.all([
        db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').bind(currentUser.userId, post.id).first(),
        db.prepare('SELECT id FROM favorites WHERE user_id = ? AND post_id = ?').bind(currentUser.userId, post.id).first()
      ]);
      isLiked = !!like;
      isFavorited = !!fav;
    }

    return {
      success: true,
      post: {
        ...post,
        tags,
        isLiked,
        isFavorited
      }
    };
  }

  static async verifyPostPassword(
    db: any,
    env: any,
    postId: string,
    password: string
  ): Promise<{ success: boolean; token?: string; post?: any; message?: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    if (!password) {
      return {
        success: false,
        message: 'Password is required',
        statusCode: 400
      };
    }

    const post = await db.prepare(
      `SELECT id, visibility, password_hash, title, slug
       FROM posts
       WHERE id = ? AND visibility = 'password' AND status = 'published' AND deleted_at IS NULL`
    ).bind(postId).first() as any;

    if (!post) {
      return {
        success: false,
        message: 'The requested post does not exist or is not password-protected',
        statusCode: 404
      };
    }

    if (!post.password_hash) {
      return {
        success: false,
        message: 'This post is marked as password-protected but no password is set',
        statusCode: 500
      };
    }

    const isValid = await bcrypt.compare(password, post.password_hash);

    if (!isValid) {
      return {
        success: false,
        message: 'The password you entered is incorrect',
        statusCode: 401
      };
    }

    const token = await generateToken(asSecret(env.JWT_SECRET), {
      postId: post.id,
      type: 'post_password_access',
      expiresIn: '24h'
    });

    return {
      success: true,
      token,
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug
      }
    };
  }

  static async verifyPostToken(
    env: any,
    token: string,
    postId: number
  ): Promise<boolean> {
    try {
      const decoded = await verifyToken(asJWTToken(token), asSecret(env.JWT_SECRET));
      return decoded && 'postId' in decoded && decoded.postId === postId && decoded.type === 'post_password_access';
    } catch {
      return false;
    }
  }

  static async createPost(
    db: any,
    userId: number,
    body: CreatePostRequest
  ): Promise<{ success: boolean; postId?: number; slug?: string; message?: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    let { title, content, summary, categoryId, columnId, tags, coverImage, status, visibility, password, isPinned, pinOrder } = body;

    if (!title || !content) {
      return {
        success: false,
        message: 'Title and content are required',
        statusCode: 400
      };
    }

    title = sanitizeInput(title);
    content = sanitizeMarkdown(content);
    summary = summary ? sanitizeInput(summary) : '';

    const titleError = validateLength(title, MIN_TITLE_LENGTH, MAX_TITLE_LENGTH, 'Title');
    if (titleError) {
      return {
        success: false,
        message: titleError,
        statusCode: 400
      };
    }

    const contentError = validateLength(content, MIN_CONTENT_LENGTH, MAX_CONTENT_LENGTH, 'Content');
    if (contentError) {
      return {
        success: false,
        message: contentError,
        statusCode: 400
      };
    }

    const slug = generateSlug(title);
    const readingTime = Math.ceil(content.length / READING_SPEED);

    const finalVisibility = visibility || 'public';
    if (finalVisibility === 'password' && !password) {
      return {
        success: false,
        message: 'Password is required for password-protected posts',
        statusCode: 400
      };
    }

    if (columnId) {
      const columnExists = await db.prepare(
        'SELECT id FROM columns WHERE id = ? AND status = ? AND deleted_at IS NULL'
      ).bind(columnId, 'active').first();

      if (!columnExists) {
        return {
          success: false,
          message: 'The specified column does not exist or is not active',
          statusCode: 400
        };
      }
    }

    let passwordHash = null;
    if (finalVisibility === 'password' && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const finalStatus = status || 'draft';
    const finalIsPinned = isPinned ? 1 : 0;
    const finalPinOrder = pinOrder || 0;
    
    const result = await db.prepare(`
      INSERT INTO posts (
        title, slug, content, summary, author_id, category_id, column_id,
        cover_image, status, visibility, password_hash, reading_time,
        published_at, created_at, updated_at, is_pinned, pin_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
    `).bind(
      title,
      slug,
      content,
      summary,
      userId,
      categoryId || null,
      columnId || null,
      coverImage || null,
      finalStatus,
      finalVisibility,
      passwordHash,
      readingTime,
      finalStatus === 'published' ? new Date().toISOString() : null,
      finalIsPinned,
      finalPinOrder
    ).run();

    if (!result.success) {
      return {
        success: false,
        message: 'Failed to create post',
        statusCode: 500
      };
    }

    const postId = result.meta.last_row_id;

    if (tags && Array.isArray(tags) && tags.length > 0) {
      const uniqueTagIds = [...new Set(tags.filter(id => id != null))];
      for (const tagId of uniqueTagIds) {
        await db.prepare(
          'INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)'
        ).bind(postId, tagId).run();
      }
    }

    return {
      success: true,
      postId,
      slug
    };
  }

  static async updatePost(
    db: any,
    userId: number,
    userRole: string,
    postId: string,
    body: UpdatePostRequest
  ): Promise<{ success: boolean; message?: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    let { title, content, summary, categoryId, columnId, tags, coverImage, status, visibility, password, isPinned, pinOrder } = body;

    const post = await db.prepare(
      'SELECT * FROM posts WHERE id = ? AND deleted_at IS NULL'
    ).bind(postId).first() as any;

    if (!post) {
      return {
        success: false,
        message: 'Post not found',
        statusCode: 404
      };
    }

    if (post.author_id !== userId && userRole !== 'admin') {
      return {
        success: false,
        message: 'You do not have permission to edit this post',
        statusCode: 403
      };
    }

    if (title) {
      title = sanitizeInput(title);
      const titleError = validateLength(title, MIN_TITLE_LENGTH, MAX_TITLE_LENGTH, 'Title');
      if (titleError) {
        return {
          success: false,
          message: titleError,
          statusCode: 400
        };
      }
    }

    if (content) {
      content = sanitizeMarkdown(content);
      const contentError = validateLength(content, MIN_CONTENT_LENGTH, MAX_CONTENT_LENGTH, 'Content');
      if (contentError) {
        return {
          success: false,
          message: contentError,
          statusCode: 400
        };
      }
    }

    if (summary !== undefined) {
      summary = sanitizeInput(summary);
    }

    if (columnId !== undefined && columnId !== null) {
      const columnExists = await db.prepare(
        'SELECT id FROM columns WHERE id = ? AND status = ? AND deleted_at IS NULL'
      ).bind(columnId, 'active').first();

      if (!columnExists) {
        return {
          success: false,
          message: 'The specified column does not exist or is not active',
          statusCode: 400
        };
      }
    }

    const readingTime = content ? Math.ceil(content.length / READING_SPEED) : post.reading_time;

    let passwordHash = post.password_hash;
    if (visibility === 'password') {
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      } else if (!post.password_hash) {
        return {
          success: false,
          message: 'Password is required for password-protected posts',
          statusCode: 400
        };
      }
    } else {
      passwordHash = null;
    }

    const finalIsPinned = isPinned !== undefined ? (isPinned ? 1 : 0) : post.is_pinned;
    const finalPinOrder = pinOrder !== undefined ? pinOrder : (post.pin_order || 0);

    await db.prepare(`
      UPDATE posts
      SET title = ?, content = ?, summary = ?, category_id = ?, column_id = ?,
          cover_image = ?, status = ?, visibility = ?, password_hash = ?,
          reading_time = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP,
          is_pinned = ?, pin_order = ?
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
      finalIsPinned,
      finalPinOrder,
      postId
    ).run();

    if (tags && Array.isArray(tags)) {
      const newTagIds = [...new Set(tags.filter(id => id != null))];

      const { results: existingTags } = await db.prepare(
        'SELECT tag_id FROM post_tags WHERE post_id = ?'
      ).bind(postId).all() as any;
      const existingTagIds = existingTags.map((t: any) => t.tag_id);

      const tagsToAdd = newTagIds.filter(id => !existingTagIds.includes(id));
      const tagsToRemove = existingTagIds.filter((id: number) => !newTagIds.includes(id));

      for (const tagId of tagsToRemove) {
        await db.prepare(
          'DELETE FROM post_tags WHERE post_id = ? AND tag_id = ?'
        ).bind(postId, tagId).run();
      }

      for (const tagId of tagsToAdd) {
        await db.prepare(
          'INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)'
        ).bind(postId, tagId).run();
      }
    }

    return {
      success: true,
      message: 'Post updated successfully'
    };
  }

  static async deletePost(
    db: any,
    storage: any,
    postId: string
  ): Promise<{ success: boolean; imagesDeleted?: number; message?: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    const post = await db.prepare(
      'SELECT slug, cover_image, content FROM posts WHERE id = ? AND deleted_at IS NULL'
    ).bind(postId).first() as any;

    if (!post) {
      return {
        success: false,
        message: 'Post not found',
        statusCode: 404
      };
    }

    const imagesToDelete: string[] = [];

    if (post.cover_image) {
      const coverFilename = extractFilenameFromUrl(post.cover_image);
      if (coverFilename) {
        imagesToDelete.push(coverFilename);
      }
    }

    if (post.content) {
      const imageUrls = extractImageUrls(post.content);
      for (const url of imageUrls) {
        const filename = extractFilenameFromUrl(url);
        if (filename && !imagesToDelete.includes(filename)) {
          imagesToDelete.push(filename);
        }
      }
    }

    await SoftDeleteHelper.softDelete(db, 'posts', postId);

    if (imagesToDelete.length > 0 && storage) {
      for (const filename of imagesToDelete) {
        try {
          await storage.delete(filename);
        } catch (error) {
          console.warn('Failed to delete image:', filename, error);
        }
      }
    }

    return {
      success: true,
      imagesDeleted: imagesToDelete.length,
      message: 'Post deleted successfully'
    };
  }

  static async toggleLike(
    db: any,
    env: any,
    userId: number,
    user: any,
    postId: string,
    isFeatureEnabled: (env: any, feature: string) => Promise<boolean>
  ): Promise<{ success: boolean; liked?: boolean; likeCount?: number; message?: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    const isLikeEnabled = await isFeatureEnabled(env, 'feature_like');
    if (!isLikeEnabled) {
      return {
        success: false,
        message: '点赞功能已关闭',
        statusCode: 403
      };
    }

    const post = await db.prepare(
      'SELECT id, slug FROM posts WHERE id = ? AND deleted_at IS NULL'
    ).bind(postId).first() as any;

    if (!post) {
      return {
        success: false,
        message: 'Post not found',
        statusCode: 404
      };
    }

    const existing = await db.prepare(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?'
    ).bind(userId, postId).first();

    let liked = false;

    if (existing) {
      await db.prepare('DELETE FROM likes WHERE id = ?').bind(existing.id).run();
      await db.prepare(
        'UPDATE posts SET like_count = like_count - 1 WHERE id = ?'
      ).bind(postId).run();
      liked = false;
    } else {
      await db.prepare(
        'INSERT INTO likes (user_id, post_id) VALUES (?, ?)'
      ).bind(userId, postId).run();
      await db.prepare(
        'UPDATE posts SET like_count = like_count + 1 WHERE id = ?'
      ).bind(postId).run();
      liked = true;

      try {
        const postInfo = await db.prepare(
          'SELECT author_id, title, slug FROM posts WHERE id = ?'
        ).bind(postId).first() as any;

        if (postInfo && postInfo.author_id !== userId) {
          const isEnabled = await isInteractionSubtypeEnabled(
            db,
            postInfo.author_id,
            'like'
          );

          if (isEnabled) {
            await createInteractionNotification(db, {
              userId: postInfo.author_id,
              subtype: 'like',
              title: `${user.displayName || user.username} 赞了你的文章《${postInfo.title}》`,
              relatedData: {
                postId: parseInt(postId),
                postTitle: postInfo.title,
                postSlug: postInfo.slug,
                senderId: userId,
                senderName: user.displayName || user.username,
                senderAvatar: user.avatarUrl,
              },
            }, env);
          }
        }
      } catch (notifyError) {
        console.error('Send like notification error:', notifyError);
      }
    }

    const updated = await db.prepare('SELECT like_count FROM posts WHERE id = ?').bind(postId).first() as any;
    const likeCount = updated?.like_count ?? 0;

    return {
      success: true,
      liked,
      likeCount
    };
  }

  static async toggleFavorite(
    db: any,
    env: any,
    userId: number,
    user: any,
    postId: string
  ): Promise<{ success: boolean; favorited?: boolean; message?: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    const post = await db.prepare('SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL').bind(postId).first() as any;
    if (!post) {
      return {
        success: false,
        message: 'Post not found',
        statusCode: 404
      };
    }

    const existing = await db.prepare(
      'SELECT id FROM favorites WHERE user_id = ? AND post_id = ?'
    ).bind(userId, postId).first();

    let favorited: boolean;
    if (existing) {
      await db.prepare('DELETE FROM favorites WHERE id = ?').bind(existing.id).run();
      favorited = false;
    } else {
      await db.prepare('INSERT INTO favorites (user_id, post_id) VALUES (?, ?)').bind(userId, postId).run();
      favorited = true;

      try {
        const postInfo = await db.prepare(
          'SELECT author_id, title, slug FROM posts WHERE id = ?'
        ).bind(postId).first() as any;

        if (postInfo && postInfo.author_id !== userId) {
          const isEnabled = await isInteractionSubtypeEnabled(
            db,
            postInfo.author_id,
            'favorite'
          );

          if (isEnabled) {
            await createInteractionNotification(db, {
              userId: postInfo.author_id,
              subtype: 'favorite',
              title: `${user.displayName || user.username} 收藏了你的文章《${postInfo.title}》`,
              relatedData: {
                postId: parseInt(postId),
                postTitle: postInfo.title,
                postSlug: postInfo.slug,
                senderId: userId,
                senderName: user.displayName || user.username,
                senderAvatar: user.avatarUrl,
              },
            }, env);
          }
        }
      } catch (notifyError) {
        console.error('Send favorite notification error:', notifyError);
      }
    }

    return {
      success: true,
      favorited
    };
  }

  static async recordReadingProgress(
    db: any,
    userId: number,
    postId: string,
    readDurationSeconds: number,
    readPercentage: number
  ): Promise<{ success: boolean; message?: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    const post = await db.prepare('SELECT id FROM posts WHERE id = ? AND status = ? AND visibility = ? AND deleted_at IS NULL')
      .bind(postId, 'published', 'public').first() as any;

    if (!post) {
      return {
        success: false,
        message: 'Post not found',
        statusCode: 404
      };
    }

    const existing = await db.prepare(
      'SELECT read_duration_seconds, read_percentage FROM reading_history WHERE user_id = ? AND post_id = ?'
    ).bind(userId, postId).first() as any;

    if (existing) {
      const duration = Math.max(existing.read_duration_seconds || 0, readDurationSeconds);
      const percentage = Math.max(existing.read_percentage || 0, readPercentage);
      await db.prepare(`
        UPDATE reading_history SET last_read_at = CURRENT_TIMESTAMP, read_duration_seconds = ?, read_percentage = ?
        WHERE user_id = ? AND post_id = ?
      `).bind(duration, percentage, userId, postId).run();
    } else {
      await db.prepare(`
        INSERT INTO reading_history (user_id, post_id, first_read_at, last_read_at, read_duration_seconds, read_percentage)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
      `).bind(userId, postId, readDurationSeconds, readPercentage).run();
    }

    return {
      success: true
    };
  }

  static async getLikedPosts(
    db: any,
    userId: number,
    query: PostListQuery
  ): Promise<{ success: boolean; posts?: any[]; pagination?: any }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    const { results } = await db.prepare(`
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
    `).bind(userId, limit, offset).all();

    const countResult = await db.prepare(`
      SELECT COUNT(*) as total FROM posts p
      JOIN likes l ON p.id = l.post_id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE l.user_id = ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL AND u.deleted_at IS NULL
    `).bind(userId).first() as any;

    const total = countResult?.total || 0;

    return {
      success: true,
      posts: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getReadingHistory(
    db: any,
    userId: number,
    query: PostListQuery
  ): Promise<{ success: boolean; items?: any[]; pagination?: any }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    const { results } = await db.prepare(`
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
    `).bind(userId, limit, offset).all();

    const countResult = await db.prepare(
      'SELECT COUNT(*) as total FROM reading_history rh JOIN posts p ON p.id = rh.post_id WHERE rh.user_id = ? AND p.status = ? AND p.visibility = ? AND p.deleted_at IS NULL'
    ).bind(userId, 'published', 'public').first() as any;
    const total = countResult?.total || 0;

    return {
      success: true,
      items: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getFavorites(
    db: any,
    userId: number,
    query: PostListQuery
  ): Promise<{ success: boolean; posts?: any[]; pagination?: any }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    const { results } = await db.prepare(`
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
    `).bind(userId, limit, offset).all();

    const countResult = await db.prepare(
      'SELECT COUNT(*) as total FROM favorites f JOIN posts p ON p.id = f.post_id WHERE f.user_id = ? AND p.status = ? AND p.visibility = ? AND p.deleted_at IS NULL'
    ).bind(userId, 'published', 'public').first() as any;
    const total = countResult?.total || 0;

    return {
      success: true,
      posts: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getMentionableUsers(
    db: any,
    postId: number
  ): Promise<{ success: boolean; users?: any[]; message?: string; statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503 }> {
    if (isNaN(postId)) {
      return {
        success: false,
        message: '无效的文章ID',
        statusCode: 400
      };
    }

    const post = await db.prepare(
      'SELECT id FROM posts WHERE id = ? AND status = ? AND deleted_at IS NULL'
    ).bind(postId, 'published').first();

    if (!post) {
      return {
        success: false,
        message: '文章不存在',
        statusCode: 404
      };
    }

    const users = await db.prepare(
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

    return {
      success: true,
      users: formattedUsers
    };
  }

  static async getAdjacentPosts(
    db: any,
    postId: number
  ): Promise<{ success: boolean; prevPost?: any; nextPost?: any }> {
    const currentPost = await db.prepare(
      'SELECT id, published_at FROM posts WHERE id = ? AND status = ? AND visibility = ? AND deleted_at IS NULL'
    ).bind(postId, 'published', 'public').first() as any;

    if (!currentPost) {
      return { success: false };
    }

    const prevPost = await db.prepare(`
      SELECT id, title, slug, cover_image
      FROM posts
      WHERE status = 'published' AND visibility = 'public' AND deleted_at IS NULL
        AND published_at < ?
      ORDER BY published_at DESC
      LIMIT 1
    `).bind(currentPost.published_at).first() as any;

    const nextPost = await db.prepare(`
      SELECT id, title, slug, cover_image
      FROM posts
      WHERE status = 'published' AND visibility = 'public' AND deleted_at IS NULL
        AND published_at > ?
      ORDER BY published_at ASC
      LIMIT 1
    `).bind(currentPost.published_at).first() as any;

    return {
      success: true,
      prevPost: prevPost || null,
      nextPost: nextPost || null
    };
  }

  static async getRecommendedPosts(
    db: any,
    postId: number,
    limit: number = 5
  ): Promise<{ success: boolean; posts?: any[] }> {
    const currentPost = await db.prepare(`
      SELECT id, category_id, column_id
      FROM posts
      WHERE id = ? AND status = 'published' AND visibility = 'public' AND deleted_at IS NULL
    `).bind(postId).first() as any;

    if (!currentPost) {
      return { success: false };
    }

    const tagResult = await db.prepare(`
      SELECT tag_id FROM post_tags WHERE post_id = ?
    `).bind(postId).all() as any;
    const tagIds = (tagResult.results || []).map((t: any) => t.tag_id);

    let candidates: any[] = [];

    if (currentPost.column_id) {
      const columnPosts = await db.prepare(`
        SELECT id, title, slug, summary, cover_image, view_count, like_count, published_at
        FROM posts
        WHERE column_id = ? AND id != ? AND status = 'published' AND visibility = 'public' AND deleted_at IS NULL
        ORDER BY RAND() LIMIT ?
      `).bind(currentPost.column_id, postId, limit).all() as any;
      candidates = candidates.concat(columnPosts.results || []);
    }

    if (tagIds.length > 0 && candidates.length < limit) {
      const tagPosts = await db.prepare(`
        SELECT DISTINCT p.id, p.title, p.slug, p.summary, p.cover_image, p.view_count, p.like_count, p.published_at
        FROM posts p
        JOIN post_tags pt ON p.id = pt.post_id
        WHERE pt.tag_id IN (${tagIds.map(() => '?').join(',')})
          AND p.id != ? AND p.status = 'published' AND p.visibility = 'public' AND p.deleted_at IS NULL
        ORDER BY RAND() LIMIT ?
      `).bind(...tagIds, postId, limit - candidates.length).all() as any;
      candidates = candidates.concat(tagPosts.results || []);
    }

    if (currentPost.category_id && candidates.length < limit) {
      const categoryPosts = await db.prepare(`
        SELECT id, title, slug, summary, cover_image, view_count, like_count, published_at
        FROM posts
        WHERE category_id = ? AND id != ? AND status = 'published' AND visibility = 'public' AND deleted_at IS NULL
        ORDER BY RAND() LIMIT ?
      `).bind(currentPost.category_id, postId, limit - candidates.length).all() as any;
      candidates = candidates.concat(categoryPosts.results || []);
    }

    const uniquePosts = candidates.filter((post, index, self) =>
      index === self.findIndex(p => p.id === post.id)
    ).slice(0, limit);

    return {
      success: true,
      posts: uniquePosts
    };
  }

  static async getHotPosts(
    db: any,
    limit: number = 10
  ): Promise<{ success: boolean; posts?: any[] }> {
    const { results } = await db.prepare(`
      SELECT id, title, slug, summary, cover_image, view_count, like_count, comment_count, published_at
      FROM posts
      WHERE status = 'published' AND visibility = 'public' AND deleted_at IS NULL
      ORDER BY (view_count * 1 + like_count * 3 + comment_count * 5) DESC, published_at DESC
      LIMIT ?
    `).bind(limit).all();

    return {
      success: true,
      posts: results || []
    };
  }

  static async incrementViewCount(db: any, postId: number): Promise<void> {
    try {
      await db.prepare(
        'UPDATE posts SET view_count = view_count + 1 WHERE id = ?'
      ).bind(postId).run();
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  }
}

export const POST_CONSTANTS = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_TITLE_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_CONTENT_LENGTH,
  MAX_CONTENT_LENGTH,
  READING_SPEED
};
