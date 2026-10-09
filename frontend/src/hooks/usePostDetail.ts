/**
 * 文章详情数据 hook
 *
 * 负责：文章加载、密码保护校验、上一篇/下一篇、推荐文章、
 * 阅读进度上报、旧文章标题 id 补全。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';
import { transformPost } from '../utils/apiTransformer';
import type { Post } from '../types';

interface AdjacentPosts {
  prevPost: any | null;
  nextPost: any | null;
}

interface UsePostDetailOptions {
  slug?: string;
  isAuthenticated: boolean;
  onPasswordVerified?: (message: string) => void;
}

export function usePostDetail({ slug, isAuthenticated, onPasswordVerified }: UsePostDetailOptions) {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordVerifying, setPasswordVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [adjacentPosts, setAdjacentPosts] = useState<AdjacentPosts>({ prevPost: null, nextPost: null });
  const [recommendedPosts, setRecommendedPosts] = useState<any[]>([]);

  const readStartTime = useRef<number>(0);
  const readProgressSent = useRef<boolean>(false);
  const progressTimeoutRef = useRef<number | null>(null);

  const getPasswordToken = useCallback((postId: number) => {
    return sessionStorage.getItem(`post_token_${postId}`);
  }, []);

  const setPasswordToken = useCallback((postId: number, token: string) => {
    sessionStorage.setItem(`post_token_${postId}`, token);
  }, []);

  const loadPost = useCallback(async (explicitToken?: string) => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      setRequiresPassword(false);
      setPasswordError(null);

      const response = await api.getPost(slug, explicitToken);

      if (response.success && response.data) {
        if ((response.data as any).requires_password) {
          const postId = (response.data as any).id;
          const savedToken = getPasswordToken(postId);

          if (savedToken && !explicitToken) {
            const retryResponse = await api.getPost(slug, savedToken);
            if (retryResponse.success && retryResponse.data && !(retryResponse.data as any).requires_password) {
              setPost(transformPost(retryResponse.data));
              setLoading(false);
              return;
            }
          }

          setRequiresPassword(true);
          setPost(transformPost(response.data));
          setLoading(false);
          return;
        }

        setPost(transformPost(response.data));
      } else {
        throw new Error(response.error || '文章不存在');
      }
    } catch (err) {
      console.error('Failed to load post:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [slug, getPasswordToken]);

  useEffect(() => {
    if (slug) {
      loadPost();
    }
  }, [slug, loadPost]);

  const loadAdjacentPosts = useCallback(async (postId: number) => {
    try {
      const response = await api.getAdjacentPosts(postId);
      if (response.success && response.data) {
        setAdjacentPosts({
          prevPost: response.data.prevPost,
          nextPost: response.data.nextPost,
        });
      }
    } catch (err) {
      console.error('Failed to load adjacent posts:', err);
    }
  }, []);

  const loadRecommendedPosts = useCallback(async (postId: number) => {
    try {
      const response = await api.getRecommendedPosts(postId, 5);
      if (response.success && response.data) {
        setRecommendedPosts(response.data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load recommended posts:', err);
    }
  }, []);

  useEffect(() => {
    if (post?.id && !requiresPassword) {
      loadAdjacentPosts(post.id);
      loadRecommendedPosts(post.id);
    }
  }, [post?.id, requiresPassword, loadAdjacentPosts, loadRecommendedPosts]);

  // 文章加载后，为没有 id 的标题添加 id（兼容旧文章）
  useEffect(() => {
    if (!post) return;

    // 延迟执行，确保 DOM 已经渲染
    const timer = setTimeout(() => {
      const proseElement = document.querySelector('.prose');
      if (!proseElement) return;

      const headings = proseElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((heading) => {
        if (!heading.id) {
          // 从标题文本生成 id
          const text = heading.textContent || '';
          const id = text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          if (id) {
            heading.id = id;
          }
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [post]);

  // 阅读进度：进入页面开始计时，离开或滚动时上报（仅登录用户）
  const sendReadingProgress = useCallback(async (readPercentage: number) => {
    if (!post?.id || !isAuthenticated) return;
    const duration = Math.floor((Date.now() - readStartTime.current) / 1000);
    try {
      await api.postReadingProgress(post.id, {
        readDurationSeconds: duration,
        readPercentage: Math.min(100, readPercentage),
      });
      readProgressSent.current = true;
    } catch (e) {
      console.warn('Failed to send reading progress', e);
    }
  }, [post?.id, isAuthenticated]);

  useEffect(() => {
    if (!post?.id || !isAuthenticated) return;
    readStartTime.current = Date.now();
    readProgressSent.current = false;

    const contentEl = document.querySelector('.prose');
    if (!contentEl) return;

    const onScroll = () => {
      if (readProgressSent.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const percent = scrollHeight <= clientHeight ? 100 : Math.round((scrollTop + clientHeight) / scrollHeight * 100);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = window.setTimeout(() => sendReadingProgress(percent), 800);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        const percent = scrollHeight <= clientHeight ? 100 : Math.round((scrollTop + clientHeight) / scrollHeight * 100);
        sendReadingProgress(percent);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    };
  }, [post?.id, isAuthenticated, sendReadingProgress]);

  const handleVerifyPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordInput.trim() || !post) return;

    try {
      setPasswordVerifying(true);
      setPasswordError(null);

      const response = await api.verifyPostPassword(post.id, passwordInput);

      if (response.success && response.data?.verified) {
        const token = response.data.token;

        if (token) {
          setPasswordToken(post.id, token);
          setRequiresPassword(false);
          setPasswordInput('');
          loadPost(token);
          onPasswordVerified?.('密码验证成功');
        } else {
          setPasswordError('验证成功但未收到访问令牌');
        }
      } else {
        setPasswordError(response.error || '密码错误');
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : '验证失败');
    } finally {
      setPasswordVerifying(false);
    }
  }, [passwordInput, post, setPasswordToken, loadPost, onPasswordVerified]);

  return {
    post,
    setPost,
    loading,
    error,
    requiresPassword,
    passwordInput,
    setPasswordInput,
    passwordVerifying,
    passwordError,
    adjacentPosts,
    recommendedPosts,
    handleVerifyPassword,
  };
}