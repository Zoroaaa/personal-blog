/**
 * 发起新私信页面
 *
 * 功能：
 * - 从URL参数获取收件人信息
 * - 发送私信
 * - 自动跳转到会话详情
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-14
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/Toast';

interface RecipientInfo {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export default function NewMessagePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { showSuccess, showError } = useToast();

  const [recipient, setRecipient] = useState<RecipientInfo | null>(null);
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const recipientId = searchParams.get('recipientId');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!recipientId) {
      showError('缺少收件人信息');
      navigate('/messages');
      return;
    }

    loadRecipientInfo();
  }, [recipientId, isAuthenticated]);

  const loadRecipientInfo = async () => {
    if (!recipientId) return;
    try {
      setLoading(true);
      const response = await api.getUserProfile(parseInt(recipientId));

      if (response.success && response.data?.user) {
        if (response.data.user.id === user?.id) {
          showError('不能给自己发送私信');
          navigate('/messages');
          return;
        }
        setRecipient(response.data.user);
      } else {
        showError('用户不存在');
        navigate('/messages');
      }
    } catch (error) {
      console.error('Load recipient error:', error);
      showError('加载收件人信息失败');
      navigate('/messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!recipient || !content.trim()) {
      showError('请输入消息内容');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/messages', {
        recipientId: recipient.id,
        subject: subject.trim() || undefined,
        content: content.trim(),
      });

      if (response.success && response.data) {
        showSuccess('消息发送成功');
        const threadId = response.data.threadId || `${Math.min(user!.id, recipient.id)}-${Math.max(user!.id, recipient.id)}`;
        navigate(`/messages/${threadId}`);
      }
    } catch (error) {
      console.error('Send message error:', error);
      showError('发送消息失败');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!recipient) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="flex items-center gap-4 p-4 border-b border-border">
          <button
            onClick={() => navigate('/messages')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <img
              src={recipient.avatarUrl || '/default-avatar.png'}
              alt={recipient.displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h2 className="font-semibold text-foreground">发送私信给 {recipient.displayName}</h2>
              <p className="text-sm text-muted-foreground">@{recipient.username}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              主题（可选）
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
              placeholder="消息主题"
              className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              消息内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息内容..."
              rows={6}
              maxLength={2000}
              className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                按 Ctrl/Cmd + Enter 快速发送
              </p>
              <p className="text-xs text-muted-foreground">
                {content.length}/2000
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => navigate('/messages')}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSend}
              disabled={!content.trim() || sending}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? '发送中...' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
