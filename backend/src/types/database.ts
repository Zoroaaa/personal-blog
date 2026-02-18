/**
 * 数据库查询结果类型定义
 *
 * 为常用查询结果提供 TypeScript 类型保护
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-18
 */

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'suspended' | 'deleted';
  oauth_provider: 'github' | 'google' | null;
  oauth_id: string | null;
  post_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  deleted_at: string | null;
}

export interface PostRow {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  cover_image: string | null;
  author_id: number;
  category_id: number | null;
  column_id: number | null;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'password';
  password_hash: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  reading_time: number | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_pinned: number;
  pin_order: number;
}

export interface CommentRow {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  like_count: number;
  reply_count: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  post_count: number;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TagRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  post_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ColumnRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  author_id: number;
  post_count: number;
  total_view_count: number;
  total_like_count: number;
  total_favorite_count: number;
  total_comment_count: number;
  display_order: number;
  status: 'active' | 'hidden' | 'archived';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NotificationRow {
  id: number;
  user_id: number;
  type: 'system' | 'interaction' | 'private_message';
  subtype: string | null;
  title: string;
  content: string | null;
  related_data: string | null;
  is_read: number;
  read_at: string | null;
  created_at: string;
}

export interface MessageRow {
  id: number;
  sender_id: number;
  receiver_id: number;
  thread_id: string | null;
  parent_id: number | null;
  content: string;
  is_read: number;
  read_at: string | null;
  recalled_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RefreshTokenRow {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export interface CountResult {
  count: number;
}

export interface SumResult {
  total: number | null;
}

export interface LikeRow {
  id: number;
  user_id: number;
  post_id: number | null;
  comment_id: number | null;
  created_at: string;
}

export interface FavoriteRow {
  id: number;
  user_id: number;
  post_id: number;
  created_at: string;
}

export function typedResult<T>(result: unknown): T {
  return result as T;
}

export function isUserRow(row: unknown): row is UserRow {
  return typeof row === 'object' && row !== null && 'id' in row && 'username' in row;
}

export function isPostRow(row: unknown): row is PostRow {
  return typeof row === 'object' && row !== null && 'id' in row && 'slug' in row;
}

export function isCommentRow(row: unknown): row is CommentRow {
  return typeof row === 'object' && row !== null && 'id' in row && 'post_id' in row;
}
