/**
 * 文章评论 hook
 *
 * 负责：评论列表加载、发表评论/回复、评论点赞、@提及用户、评论图片上传。
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/api';
import { transformCommentList } from '../utils/apiTransformer';
import type { Comment, Post, User } from '../types';

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
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentLiking, setCommentLiking] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [mentionableUsers, setMentionableUsers] = useState<User[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mentionedUserIds, setMentionedUserIds] = useState<Set<number>>(new Set());
  const [replyMentionedUserIds, setReplyMentionedUserIds] = useState<Set<number>>(new Set());

  const loadComments = useCallback(async (postId: number) => {
    try {
      const response = await api.getComments({ postId: postId.toString() });

      console.log('Comments response:', response);

      if (response.success && response.data) {
        setComments(transformCommentList(response.data.comments || []));
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
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
        // 重新加载评论列表
        await loadComments(post.id);
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
  }, [newComment, post, isAuthenticated, navigate, mentionedUserIds, loadComments, showSuccess, showError]);

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
        // 重新加载评论列表
        await loadComments(post.id);
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
  }, [replyContent, post, isAuthenticated, navigate, replyMentionedUserIds, loadComments, showSuccess, showError]);

  return {
    comments,
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