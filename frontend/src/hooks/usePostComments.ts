/**
 * 文章评论 hook
 *
 * 负责：评论列表分页加载（按页拉取 + 加载更多）、发表评论/回复、评论点赞、@提及用户、评论图片上传。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';
import { transformCommentList } from '../utils/apiTransformer';
import type { Comment, Post, User } from '../types';

// 每页根评论数。取 10 而非后端默认的 20：根评论会带整棵回复树渲染，DOM 节点数可能是
// 评论条数的好几倍，长评论页一次性渲染是滚动卡顿主因。首屏 10 条已足够铺满视口，
// 其余内容靠「加载更多」渐进追加，避免长任务阻塞主线程。
const COMMENT_PAGE_SIZE = 10;

interface CommentConfig {
  upload_max_image_size_mb?: number;
}

interface UsePostCommentsOptions {
  post: Post | null;
  requiresPassword: boolean;
  isAuthenticated: boolean;
  config?: CommentConfig | null;
  navigate: (to: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

// 辅助函数：更新评论列表中的评论
function updateCommentInList(comments: Comment[], commentId: number, liked: boolean): Comment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return {
        ...comment,
        isLiked: liked,
        likeCount: comment.likeCount + (liked ? 1 : -1),
      };
    }
    if (comment.replies) {
      return {
        ...comment,
        replies: updateCommentInList(comment.replies, commentId, liked),
      };
    }
    return comment;
  });
}

export function usePostComments({
  post,
  requiresPassword,
  isAuthenticated,
  config,
  navigate,
  showSuccess,
  showError,
}: UsePostCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // 已加载页数用 ref 记录：发评论后要「重拉当前已加载的全部页」，若放进 useCallback
  // 依赖会让提交函数身份随翻页变化；ref 与 comments 列表同步维护即可
  const loadedPagesRef = useRef(1);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentLiking, setCommentLiking] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [mentionableUsers, setMentionableUsers] = useState<User[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<Set<number>>(new Set());
  const [replyMentionedUserIds, setReplyMentionedUserIds] = useState<Set<number>>(new Set());

  // 按页拉取评论。mode='replace' 覆盖列表（首屏/换文章），'append' 追加（加载更多）。
  // 后端分页以根评论为单位（parent_id IS NULL），回复树随所属根评论整棵返回，
  // 所以 total/totalPages 反映的是根评论数，不是含回复的总条数。
  const fetchCommentPage = useCallback(async (postId: number, page: number, mode: 'replace' | 'append') => {
    try {
      const response = await api.getComments({
        postId: postId.toString(),
        page,
        limit: COMMENT_PAGE_SIZE,
      });

      if (response.success && response.data) {
        const list = transformCommentList(response.data.comments || []);
        const pagination = response.data.pagination;

        setComments((prev) => (mode === 'append' ? [...prev, ...list] : list));
        if (pagination) {
          setTotalComments(pagination.total);
          setHasMore(page < pagination.totalPages);
        } else {
          // 后端契约成功响应必带 pagination；缺失时按末页兜底，防止「加载更多」空转
          setHasMore(false);
        }
        loadedPagesRef.current = page;
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  }, []);

  const loadComments = useCallback(async (postId: number) => {
    await fetchCommentPage(postId, 1, 'replace');
  }, [fetchCommentPage]);

  // 「加载更多」：追加下一页。hasMore/loadingMore 双重守卫防止重复点击触发并发请求
  const loadMoreComments = useCallback(async () => {
    if (!post?.id || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchCommentPage(post.id, loadedPagesRef.current + 1, 'append');
    } finally {
      setLoadingMore(false);
    }
  }, [post?.id, hasMore, loadingMore, fetchCommentPage]);

  // 发评论/回复后刷新「已加载的全部页」，而不是只刷第 1 页：
  // 新评论按 created_at DESC 会落到第 1 页，新回复挂在其根评论所在的任意页——
  // 重拉 1..N 页保证两者都可见，同时不丢用户已翻出来的内容。
  const reloadLoadedPages = useCallback(async (postId: number) => {
    const pages = loadedPagesRef.current;
    try {
      const responses = await Promise.all(
        Array.from({ length: pages }, (_, i) =>
          api.getComments({ postId: postId.toString(), page: i + 1, limit: COMMENT_PAGE_SIZE })
        )
      );

      const list: Comment[] = [];
      let total = 0;
      let totalPages = 1;
      for (const response of responses) {
        if (response.success && response.data) {
          list.push(...transformCommentList(response.data.comments || []));
          if (response.data.pagination) {
            total = response.data.pagination.total;
            totalPages = response.data.pagination.totalPages;
          }
        }
      }

      setComments(list);
      setTotalComments(total);
      setHasMore(pages < totalPages);
      loadedPagesRef.current = pages;
    } catch (err) {
      console.error('Failed to reload comments:', err);
    }
  }, []);

  const loadMentionableUsers = useCallback(async (postId: number) => {
    try {
      const response = await api.get(`/posts/${postId}/mentionable-users`);
      if (response.success && response.data) {
        setMentionableUsers(response.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load mentionable users:', err);
    }
  }, []);

  useEffect(() => {
    if (post?.id && !requiresPassword) {
      loadComments(post.id);
    }
  }, [post?.id, requiresPassword, loadComments]);

  // 加载可@用户列表
  useEffect(() => {
    if (post?.id) {
      loadMentionableUsers(post.id);
    }
  }, [post?.id, loadMentionableUsers]);

  const handleMention = useCallback((user: User) => {
    setMentionedUserIds((prev) => new Set(prev).add(user.id));
  }, []);

  const handleReplyMention = useCallback((user: User) => {
    setReplyMentionedUserIds((prev) => new Set(prev).add(user.id));
  }, []);

  // 处理评论图片上传
  const handleCommentImageUpload = useCallback(async (file: File): Promise<string | null> => {
    if (!isAuthenticated) {
      showError('请先登录');
      return null;
    }

    const maxImageSize = (config?.upload_max_image_size_mb || 5) * 1024 * 1024;
    if (file.size > maxImageSize) {
      showError(`图片大小不能超过 ${config?.upload_max_image_size_mb || 5}MB`);
      return null;
    }

    try {
      setUploadingImage(true);
      const response = await api.uploadImage(file);
      if (response.success && response.data) {
        return response.data.url;
      }
      throw new Error(response.error || '上传失败');
    } catch (err) {
      showError(err instanceof Error ? err.message : '图片上传失败');
      return null;
    } finally {
      setUploadingImage(false);
    }
  }, [isAuthenticated, config, showError]);

  // 处理评论点赞
  const handleLikeComment = useCallback(async (commentId: number) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (commentLiking === commentId) return;

    try {
      setCommentLiking(commentId);

      const response = await api.likeComment(commentId);

      if (response.success && response.data) {
        setComments((prevComments) =>
          updateCommentInList(prevComments, commentId, response.data!.liked)
        );
      }
    } catch (err) {
      console.error('Failed to like comment:', err);
    } finally {
      setCommentLiking(null);
    }
  }, [isAuthenticated, commentLiking, navigate]);

  // 处理评论回复
  const handleReply = useCallback((commentId: number) => {
    setReplyingTo((prev) => (prev === commentId ? null : commentId));
    setReplyContent('');
  }, []);

  const handleSubmitComment = useCallback(async (e: React.FormEvent, parentId?: number) => {
    e.preventDefault();

    if (!newComment.trim() || !post) return;

    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      setCommentLoading(true);

      const response = await api.createComment({
        postId: post.id,
        content: newComment.trim(),
        parentId,
        mentionedUserIds: mentionedUserIds.size > 0 ? Array.from(mentionedUserIds) : undefined,
      });

      if (response.success) {
        setNewComment('');
        setMentionedUserIds(new Set());
        // 重新加载已加载的评论页（新评论落在第 1 页，保持分页状态下可见）
        await reloadLoadedPages(post.id);
        showSuccess('评论发表成功');
      } else {
        throw new Error(response.error || '发表评论失败');
      }
    } catch (err) {
      console.error('Failed to create comment:', err);
      showError(err instanceof Error ? err.message : '发表评论失败');
    } finally {
      setCommentLoading(false);
    }
  }, [newComment, post, isAuthenticated, navigate, mentionedUserIds, reloadLoadedPages, showSuccess, showError]);

  // 处理回复提交
  const handleSubmitReply = useCallback(async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();

    if (!replyContent.trim() || !post) return;

    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      setCommentLoading(true);

      const response = await api.createComment({
        postId: post.id,
        content: replyContent.trim(),
        parentId,
        mentionedUserIds: replyMentionedUserIds.size > 0 ? Array.from(replyMentionedUserIds) : undefined,
      });

      if (response.success) {
        setReplyContent('');
        setReplyingTo(null);
        setReplyMentionedUserIds(new Set());
        // 重新加载已加载的评论页（新回复挂在对应根评论所在页，整段刷新保证可见）
        await reloadLoadedPages(post.id);
        showSuccess('回复发表成功');
      } else {
        throw new Error(response.error || '发表回复失败');
      }
    } catch (err) {
      console.error('Failed to create reply:', err);
      showError(err instanceof Error ? err.message : '发表回复失败');
    } finally {
      setCommentLoading(false);
    }
  }, [replyContent, post, isAuthenticated, navigate, replyMentionedUserIds, reloadLoadedPages, showSuccess, showError]);

  return {
    comments,
    totalComments,
    hasMore,
    loadingMore,
    loadMoreComments,
    newComment,
    setNewComment,
    commentLoading,
    commentLiking,
    replyingTo,
    replyContent,
    setReplyContent,
    mentionableUsers,
    uploadingImage,
    handleMention,
    handleReplyMention,
    handleCommentImageUpload,
    handleLikeComment,
    handleReply,
    handleSubmitComment,
    handleSubmitReply,
  };
}

export type PostCommentsController = ReturnType<typeof usePostComments>;