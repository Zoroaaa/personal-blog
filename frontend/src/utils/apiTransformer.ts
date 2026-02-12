/**
 * API 数据转换层
 *
 * 功能：
 * - 将后端返回的 snake_case 字段转换为前端使用的 camelCase
 * - 统一数据格式，确保前后端字段对应
 * - 提供类型安全的转换函数
 *
 * 原则：
 * - 不做错误兼容，只进行字段命名转换
 * - 保持数据结构和类型的一致性
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import type {
  Post,
  PostListItem,
  Comment,
  Category,
  Column,
  Tag,
  User,
  UserPublicProfile
} from '../types';

// ============= 文章相关转换 =============

/**
 * 转换文章列表项
 * 后端返回 snake_case，前端使用 camelCase
 */
export function transformPostListItem(post: any): PostListItem {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    coverImage: post.cover_image,
    authorName: post.author_display_name || post.author_name || '未知用户',
    authorAvatar: post.author_avatar,
    categoryName: post.category_name,
    categorySlug: post.category_slug,
    categoryColor: post.category_color,
    columnName: post.column_name,
    columnSlug: post.column_slug,
    viewCount: post.view_count ?? 0,
    likeCount: post.like_count ?? 0,
    commentCount: post.comment_count ?? 0,
    readingTime: post.reading_time,
    publishedAt: post.published_at,
    createdAt: post.created_at,
    tags: post.tags ? post.tags.map(transformTag) : undefined
  };
}

/**
 * 转换文章详情
 */
export function transformPost(post: any): Post {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    content: post.content,
    coverImage: post.cover_image,
    authorId: post.author_id,
    categoryId: post.category_id,
    columnId: post.column_id,
    status: post.status,
    visibility: post.visibility,
    viewCount: post.view_count,
    likeCount: post.like_count,
    commentCount: post.comment_count,
    readingTime: post.reading_time,
    metaTitle: post.meta_title,
    metaDescription: post.meta_description,
    metaKeywords: post.meta_keywords,
    publishedAt: post.published_at,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    // 关联数据
    author: post.author ? transformUserPublicProfile(post.author) : undefined,
    authorName: post.author_name,
    authorUsername: post.author_username,
    authorAvatar: post.author_avatar,
    category: post.category ? transformCategory(post.category) : undefined,
    categoryName: post.category_name,
    categorySlug: post.category_slug,
    categoryColor: post.category_color,
    column: post.column ? transformColumn(post.column) : undefined,
    columnName: post.column_name,
    columnSlug: post.column_slug,
    tags: post.tags ? post.tags.map(transformTag) : undefined,
    // 交互状态（后端可能返回 camelCase 或 snake_case）
    isLiked: post.isLiked !== undefined ? post.isLiked : post.is_liked,
    isFavorited: post.isFavorited !== undefined ? post.isFavorited : post.is_favorited
  };
}

// ============= 评论相关转换 =============

/**
 * 转换评论
 */
export function transformComment(comment: any): Comment {
  return {
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    parentId: comment.parent_id,
    content: comment.content,
    status: comment.status,
    likeCount: comment.like_count,
    replyCount: comment.reply_count,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    // 关联数据
    user: comment.user ? transformUserPublicProfile(comment.user) : undefined,
    username: comment.username,
    displayName: comment.display_name,
    avatarUrl: comment.avatar_url,
    replies: comment.replies ? comment.replies.map(transformComment) : undefined,
    // 关联文章信息（来自管理后台API）
    post: comment.post_title ? {
      id: comment.post_id,
      title: comment.post_title,
      slug: comment.post_slug
    } : comment.post
  };
}

// ============= 分类相关转换 =============

/**
 * 转换分类
 */
export function transformCategory(category: any): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    color: category.color,
    postCount: category.post_count,
    displayOrder: category.display_order,
    createdAt: category.created_at,
    updatedAt: category.updated_at
  };
}

// ============= 专栏相关转换 =============

/**
 * 转换专栏
 */
export function transformColumn(column: any): Column {
  return {
    id: column.id,
    name: column.name,
    slug: column.slug,
    description: column.description,
    coverImage: column.cover_image,
    authorId: column.author_id,
    authorUsername: column.author_username,
    authorName: column.author_name,
    authorAvatar: column.author_avatar,
    authorBio: column.author_bio,
    postCount: column.post_count ?? 0,
    totalViewCount: column.total_view_count ?? 0,
    totalLikeCount: column.total_like_count ?? 0,
    totalFavoriteCount: column.total_favorite_count ?? 0,
    totalCommentCount: column.total_comment_count ?? 0,
    displayOrder: column.display_order ?? 0,
    status: column.status,
    createdAt: column.created_at,
    updatedAt: column.updated_at
  };
}

/**
 * 批量转换专栏列表
 */
export function transformColumnList(columns: any[]): Column[] {
  return columns.map(transformColumn);
}

// ============= 标签相关转换 =============

/**
 * 转换标签
 */
export function transformTag(tag: any): Tag {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    postCount: tag.post_count,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
    color: tag.color
  };
}

// ============= 用户相关转换 =============

/**
 * 转换用户公开资料
 */
export function transformUserPublicProfile(user: any): UserPublicProfile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    postCount: user.post_count,
    createdAt: user.created_at
  };
}

/**
 * 转换用户完整信息
 */
export function transformUser(user: any): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    role: user.role,
    status: user.status,
    oauthProvider: user.oauth_provider,
    postCount: user.post_count,
    commentCount: user.comment_count,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at
  };
}

// ============= 批量转换 =============

/**
 * 批量转换文章列表
 */
export function transformPostList(posts: any[]): PostListItem[] {
  return posts.map(transformPostListItem);
}

/**
 * 批量转换评论列表
 */
export function transformCommentList(comments: any[]): Comment[] {
  return comments.map(transformComment);
}

/**
 * 批量转换分类列表
 */
export function transformCategoryList(categories: any[]): Category[] {
  return categories.map(transformCategory);
}

/**
 * 批量转换标签列表
 */
export function transformTagList(tags: any[]): Tag[] {
  return tags.map(transformTag);
}

/**
 * 批量转换用户列表
 */
export function transformUserList(users: any[]): User[] {
  return users.map(transformUser);
}
