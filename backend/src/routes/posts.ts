/**
 * 文章相关路由（重构版）
 *
 * 功能：
 * - 文章列表查询
 * - 文章详情获取
 * - 文章CRUD操作
 * - 文章点赞/收藏
 * - 阅读历史/进度
 * - 搜索功能
 *
 * @author 博客系统
 * @version 2.1.0
 * @created 2024-01-01
 * @refactored 2026-02-16
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse, getStatus } from '../utils/response';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { isFeatureEnabled } from './config';
import { safeParseInt } from '../utils/validation';
import { PostService, POST_CONSTANTS } from '../services/postService';

export const postRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

postRoutes.get('/', async (c) => {
  const logger = createLogger(c);

  try {
    const result = await PostService.getPostList(c.env.DB, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), POST_CONSTANTS.DEFAULT_PAGE_SIZE),
      category: c.req.query('category'),
      tag: c.req.query('tag'),
      author: c.req.query('author'),
      search: c.req.query('search'),
      sortBy: c.req.query('sortBy'),
      order: c.req.query('order') as 'asc' | 'desc'
    });

    if (!result.success) {
      return c.json(errorResponse('Failed to fetch posts', result.message || 'Error'), 500);
    }

    logger.info('Posts list fetched successfully', {
      count: result.posts?.length,
      total: result.pagination?.total
    });

    return c.json(successResponse({
      posts: result.posts,
      pagination: result.pagination
    }));
  } catch (error) {
    logger.error('Get posts error', error);
    return c.json(errorResponse('Failed to fetch posts', 'An error occurred while fetching posts'), 500);
  }
});

postRoutes.get('/admin', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const result = await PostService.getAdminPostList(c.env.DB, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), POST_CONSTANTS.DEFAULT_PAGE_SIZE)
    });

    logger.info('Admin posts fetched successfully', {
      count: result.posts?.length,
      total: result.pagination?.total
    });

    return c.json(successResponse({
      posts: result.posts,
      pagination: result.pagination
    }));
  } catch (error) {
    logger.error('Get admin posts error', error);
    return c.json(errorResponse('Failed to fetch posts', 'An error occurred while fetching posts'), 500);
  }
});

postRoutes.get('/admin/:id', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');
    const user = c.get('user');

    const result = await PostService.getAdminPostDetail(c.env.DB, id, user.userId, user.role);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Post not found'), getStatus(result.statusCode, 404));
    }

    logger.info('Admin post fetched successfully', { id });

    return c.json(successResponse(result.post));
  } catch (error) {
    logger.error('Get admin post error', error);
    return c.json(errorResponse('Failed to fetch post', 'An error occurred while fetching the post'), 500);
  }
});

postRoutes.get('/search', async (c) => {
  const logger = createLogger(c);

  try {
    const result = await PostService.searchPosts(
      c.env.DB,
      c.env,
      {
        q: c.req.query('q'),
        category: c.req.query('category'),
        tag: c.req.query('tag'),
        page: safeParseInt(c.req.query('page'), 1),
        limit: safeParseInt(c.req.query('limit'), POST_CONSTANTS.DEFAULT_PAGE_SIZE),
        sort: c.req.query('sort'),
        order: c.req.query('order'),
        useFts: c.req.query('use_fts') !== 'false'
      },
      isFeatureEnabled
    );

    if (!result.success) {
      return c.json(errorResponse('Search failed', result.message || 'Error'), getStatus(result.statusCode, 500));
    }

    logger.info('Search completed successfully', {
      query: c.req.query('q'),
      count: result.posts?.length,
      total: result.total
    });

    return c.json(successResponse({
      posts: result.posts,
      total: result.total,
      pagination: result.pagination
    }));
  } catch (error) {
    logger.error('Search error', error);
    return c.json(errorResponse('Failed to search posts', 'An error occurred while searching posts'), 500);
  }
});

postRoutes.get('/likes', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const result = await PostService.getLikedPosts(c.env.DB, user.userId, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), POST_CONSTANTS.DEFAULT_PAGE_SIZE)
    });

    logger.info('User liked posts fetched successfully', {
      userId: user.userId,
      count: result.posts?.length,
      total: result.pagination?.total
    });

    return c.json(successResponse({
      posts: result.posts,
      total: result.pagination?.total,
      pagination: result.pagination
    }));
  } catch (error) {
    logger.error('Get liked posts error', error);
    return c.json(errorResponse('Failed to fetch liked posts', 'An error occurred while fetching liked posts'), 500);
  }
});

postRoutes.get('/reading-history', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const result = await PostService.getReadingHistory(c.env.DB, user.userId, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), POST_CONSTANTS.DEFAULT_PAGE_SIZE)
    });

    return c.json(successResponse({
      items: result.items,
      pagination: result.pagination
    }));
  } catch (error) {
    logger.error('Get reading history error', error);
    return c.json(errorResponse('Failed to fetch reading history', 'An error occurred while fetching reading history'), 500);
  }
});

postRoutes.get('/favorites', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const result = await PostService.getFavorites(c.env.DB, user.userId, {
      page: safeParseInt(c.req.query('page'), 1),
      limit: safeParseInt(c.req.query('limit'), POST_CONSTANTS.DEFAULT_PAGE_SIZE)
    });

    return c.json(successResponse({
      posts: result.posts,
      total: result.pagination?.total,
      pagination: result.pagination
    }));
  } catch (error) {
    logger.error('Get favorites error', error);
    return c.json(errorResponse('Failed to fetch favorites', 'An error occurred while fetching favorites'), 500);
  }
});

postRoutes.get('/:slug', optionalAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const slug = c.req.param('slug');
    const currentUser = c.get('user');

    const result = await PostService.getPostBySlug(c.env.DB, c.env, slug, currentUser);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Post not found'), getStatus(result.statusCode, 404));
    }

    const postId = (result.post as { id: number }).id;

    if (result.requiresPassword) {
      const { results: tags } = await c.env.DB.prepare(`
        SELECT t.id, t.name, t.slug, t.post_count
        FROM tags t
        JOIN post_tags pt ON t.id = pt.tag_id
        WHERE pt.post_id = ?
      `).bind(postId).all();

      return c.json(successResponse({
        ...result.post,
        tags
      }));
    }

    c.executionCtx.waitUntil(
      PostService.incrementViewCount(c.env.DB, postId)
    );

    logger.info('Post fetched successfully', { slug, postId });

    return c.json(successResponse(result.post));
  } catch (error) {
    logger.error('Get post error', error);
    return c.json(errorResponse('Failed to fetch post', 'An error occurred while fetching the post'), 500);
  }
});

postRoutes.post('/', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const body = await c.req.json();

    const result = await PostService.createPost(c.env.DB, user.userId, body);

    if (!result.success) {
      return c.json(errorResponse('Create failed', result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Post created successfully', {
      postId: result.postId,
      slug: result.slug,
      userId: user.userId
    });

    return c.json(successResponse({
      id: result.postId,
      slug: result.slug
    }, 'Post created successfully'), 201);
  } catch (error) {
    logger.error('Create post error', error);
    return c.json(errorResponse('Failed to create post', 'An error occurred while creating the post'), 500);
  }
});

postRoutes.put('/:id', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = await c.req.json();

    const result = await PostService.updatePost(c.env.DB, user.userId, user.role, id, body);

    if (!result.success) {
      return c.json(errorResponse('Update failed', result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Post updated successfully', { postId: id, userId: user.userId });

    return c.json(successResponse({ updated: true }, result.message || 'Post updated successfully'));
  } catch (error) {
    logger.error('Update post error', error);
    return c.json(errorResponse('Failed to update post', 'An error occurred while updating the post'), 500);
  }
});

postRoutes.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);

  try {
    const id = c.req.param('id');

    const result = await PostService.deletePost(c.env.DB, c.env.STORAGE, id);

    if (!result.success) {
      return c.json(errorResponse('Delete failed', result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Post deleted successfully', {
      postId: id,
      imagesDeleted: result.imagesDeleted
    });

    return c.json(successResponse({
      deleted: true,
      imagesDeleted: result.imagesDeleted
    }, result.message || 'Post deleted successfully'));
  } catch (error) {
    logger.error('Delete post error', error);
    return c.json(errorResponse('Failed to delete post', 'An error occurred while deleting the post'), 500);
  }
});

postRoutes.post('/:id/like', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const postId = c.req.param('id');

    const result = await PostService.toggleLike(c.env.DB, c.env, user.userId, user, postId, isFeatureEnabled);

    if (!result.success) {
      return c.json(errorResponse('Like failed', result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Post like toggled', { postId, userId: user.userId, liked: result.liked });

    return c.json(successResponse({ liked: result.liked, likeCount: result.likeCount }));
  } catch (error) {
    logger.error('Like post error', error);
    return c.json(errorResponse('Failed to like post', 'An error occurred while processing your request'), 500);
  }
});

postRoutes.post('/:id/reading-progress', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const postId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));

    const result = await PostService.recordReadingProgress(
      c.env.DB,
      user.userId,
      postId,
      Math.max(0, safeParseInt(body.readDurationSeconds, 0)),
      Math.min(100, Math.max(0, safeParseInt(body.readPercentage, 0)))
    );

    if (!result.success) {
      return c.json(errorResponse('Record failed', result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Reading progress recorded', { postId, userId: user.userId });

    return c.json(successResponse({ updated: true }));
  } catch (error) {
    logger.error('Reading progress error', error);
    return c.json(errorResponse('Failed to record reading progress', 'An error occurred while saving progress'), 500);
  }
});

postRoutes.post('/:id/favorite', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user');
    const postId = c.req.param('id');

    const result = await PostService.toggleFavorite(c.env.DB, c.env, user.userId, user, postId);

    if (!result.success) {
      return c.json(errorResponse('Favorite failed', result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Post favorite toggled', { postId, userId: user.userId, favorited: result.favorited });

    return c.json(successResponse({ favorited: result.favorited }));
  } catch (error) {
    logger.error('Favorite post error', error);
    return c.json(errorResponse('Failed to update favorite', 'An error occurred while processing your request'), 500);
  }
});

postRoutes.get('/:id/mentionable-users', async (c) => {
  const logger = createLogger(c);

  try {
    const postId = parseInt(c.req.param('id'));

    const result = await PostService.getMentionableUsers(c.env.DB, postId);

    if (!result.success) {
      return c.json(errorResponse('Failed to get users', result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('Mentionable users fetched', { postId, count: result.users?.length });

    return c.json(successResponse({ users: result.users }));
  } catch (error) {
    logger.error('Get mentionable users error', error);
    return c.json(errorResponse('Failed to get mentionable users', '获取可@用户列表失败'), 500);
  }
});

postRoutes.get('/:id/adjacent', async (c) => {
  const logger = createLogger(c);

  try {
    const postId = parseInt(c.req.param('id'));

    const result = await PostService.getAdjacentPosts(c.env.DB, postId);

    if (!result.success) {
      return c.json(errorResponse('Failed to get adjacent posts', 'Error'), 404);
    }

    return c.json(successResponse({
      prevPost: result.prevPost,
      nextPost: result.nextPost
    }));
  } catch (error) {
    logger.error('Get adjacent posts error', error);
    return c.json(errorResponse('Failed to get adjacent posts', 'An error occurred'), 500);
  }
});

postRoutes.get('/:id/recommended', async (c) => {
  const logger = createLogger(c);

  try {
    const postId = parseInt(c.req.param('id'));
    const limit = parseInt(c.req.query('limit') || '5');

    const result = await PostService.getRecommendedPosts(c.env.DB, postId, limit);

    if (!result.success) {
      return c.json(errorResponse('Failed to get recommended posts', 'Error'), 404);
    }

    return c.json(successResponse({ posts: result.posts }));
  } catch (error) {
    logger.error('Get recommended posts error', error);
    return c.json(errorResponse('Failed to get recommended posts', 'An error occurred'), 500);
  }
});

postRoutes.get('/hot/list', async (c) => {
  const logger = createLogger(c);

  try {
    const limit = parseInt(c.req.query('limit') || '10');

    const result = await PostService.getHotPosts(c.env.DB, limit);

    return c.json(successResponse({ posts: result.posts }));
  } catch (error) {
    logger.error('Get hot posts error', error);
    return c.json(errorResponse('Failed to get hot posts', 'An error occurred'), 500);
  }
});

postRoutes.post('/:id/verify-password', async (c) => {
  const logger = createLogger(c);

  try {
    const postId = c.req.param('id');
    const body = await c.req.json();
    const { password } = body;

    const result = await PostService.verifyPostPassword(c.env.DB, c.env, postId, password);

    if (!result.success) {
      return c.json(errorResponse('Verification failed', result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('Password verification successful', { postId });

    return c.json(successResponse({
      verified: true,
      token: result.token,
      post: result.post
    }, '密码正确'));
  } catch (error) {
    logger.error('Password verification error', error);
    return c.json(errorResponse('Verification failed', 'An error occurred during password verification'), 500);
  }
});
