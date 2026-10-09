/**
 * 文章交互 hook
 *
 * 负责：文章点赞、收藏（含乐观更新与失败回滚）。
 */

import { useCallback, useState } from 'react';
import { api } from '../utils/api';
import type { Post } from '../types';

interface UsePostInteractionsOptions {
  post: Post | null;
  setPost: React.Dispatch<React.SetStateAction<Post | null>>;
  isAuthenticated: boolean;
  navigate: (to: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export function usePostInteractions({
  post,
  setPost,
  isAuthenticated,
  navigate,
  showSuccess,
  showError,
}: UsePostInteractionsOptions) {
  const [liking, setLiking] = useState(false);
  const [favoriting, setFavoriting] = useState(false);

  const handleLike = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!post || liking) return;
    const newIsLiked = !post.isLiked;
    const prevLikeCount = post.likeCount ?? 0;
    const newLikeCount = prevLikeCount + (newIsLiked ? 1 : -1);
    setPost({ ...post, isLiked: newIsLiked, likeCount: newLikeCount });
    try {
      setLiking(true);
      const response = await api.likePost(post.id);
      if (!response.success) {
        setPost({ ...post, isLiked: !newIsLiked, likeCount: prevLikeCount });
        showError('点赞失败，请重试');
        return;
      }
      if (response.data?.likeCount !== undefined) {
        setPost((prev) => (prev ? { ...prev, likeCount: response.data!.likeCount! } : null));
      }
      showSuccess(newIsLiked ? '点赞成功' : '已取消点赞');
    } catch (err) {
      setPost({ ...post, isLiked: !newIsLiked, likeCount: prevLikeCount });
      showError('点赞失败，请重试');
    } finally {
      setLiking(false);
    }
  }, [post, liking, isAuthenticated, navigate, setPost, showSuccess, showError]);

  const handleFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!post || favoriting) return;
    try {
      setFavoriting(true);
      const response = await api.toggleFavorite(post.id);
      if (response.success && response.data) {
        setPost((prev) => (prev ? { ...prev, isFavorited: response.data!.favorited } : null));
        showSuccess(response.data.favorited ? '收藏成功' : '已取消收藏');
      }
    } catch (e) {
      console.error('Favorite failed', e);
      showError('操作失败，请重试');
    } finally {
      setFavoriting(false);
    }
  }, [post, favoriting, isAuthenticated, navigate, setPost, showSuccess, showError]);

  return { liking, favoriting, handleLike, handleFavorite };
}