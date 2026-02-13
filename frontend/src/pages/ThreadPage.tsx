/**
 * 私信会话详情页
 *
 * 功能：
 * - 显示与某用户的所有消息往来
 * - 发送新消息
 * - 消息列表滚动加载
 * - 自动标记已读
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2026-02-14
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/Toast';

interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  subject?: string;
  content: string;
  threadId: string;
  replyToId?: number;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  senderUsername?: string;
  senderName?: string;
  senderAvatar?: string;
  recipientUsername?: string;
  recipientName?: string;
  recipientAvatar?: string;
}

interface ThreadInfo {
  otherUserId: number;
  otherUsername: string;
  otherName: string;
  otherAvatar?: string;
}

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showSuccess, showError } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadId) {
      loadMessages(1);
    }
  }, [threadId]);

  useEffect(() => {
    if (messages.length > 0 && page === 1) {
      scrollToBottom();
    }
  }, [messages, page]);

  const loadMessages = async (pageNum: number) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await api.get(`/messages/inbox?threadId=${threadId}&page=${pageNum}&limit=20`);

      if (response.success && response.data) {
        const newMessages = response.data.messages || [];

        if (pageNum === 1) {
          setMessages(newMessages.reverse());

          if (newMessages.length > 0) {
            const firstMsg = newMessages[0];
            const isCurrentUserSender = firstMsg.senderId === user?.id;
            setThreadInfo({
              otherUserId: isCurrentUserSender ? firstMsg.recipientId : firstMsg.senderId,
              otherUsername: isCurrentUserSender ? firstMsg.recipientUsername : firstMsg.senderUsername,
              otherName: isCurrentUserSender ? firstMsg.recipientName : firstMsg.senderName,
              otherAvatar: isCurrentUserSender ? firstMsg.recipientAvatar : firstMsg.senderAvatar,
            });
          }
        } else {
          setMessages(prev => [...newMessages.reverse(), ...prev]);
        }

        setHasMore(response.data.pagination?.page < response.data.pagination?.totalPages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      showError('加载消息失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (!loadingMore && hasMore) {
      loadMessages(page + 1);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !threadInfo || sending) return;

    setSending(true);
    try {
      const response = await api.post('/messages', {
        recipientId: threadInfo.otherUserId,
        content: newMessage.trim(),
      });

      if (response.success && response.data) {
        setMessages(prev => [...prev, response.data]);
        setNewMessage('');
        scrollToBottom();
        showSuccess('消息发送成功');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showError('发送消息失败');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!threadInfo) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <span className="text-4xl">📭</span>
          <p className="mt-4 text-muted-foreground">会话不存在</p>
          <button
            onClick={() => navigate('/messages')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回私信列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/messages')}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <img
              src={threadInfo.otherAvatar || '/default-avatar.png'}
              alt={threadInfo.otherName}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h2 className="font-semibold text-foreground">{threadInfo.otherName}</h2>
              <p className="text-sm text-muted-foreground">@{threadInfo.otherUsername}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/profile/${threadInfo.otherUserId}`)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            查看资料
          </button>
        </div>

        <div
          ref={messagesContainerRef}
          className="h-[400px] overflow-y-auto p-4 space-y-4"
        >
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMoreMessages}
                disabled={loadingMore}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {loadingMore ? '加载中...' : '加载更多消息'}
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">💬</span>
              <p className="mt-4 text-muted-foreground">开始你们的对话吧</p>
              <p className="text-sm text-muted-foreground mt-1">发送第一条消息</p>
            </div>
          ) : (
            messages.map((message) => {
              const isMine = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[70%] ${isMine ? 'flex-row-reverse' : ''}`}>
                    <img
                      src={isMine ? user?.avatarUrl : threadInfo.otherAvatar || '/default-avatar.png'}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      <p className={`text-xs text-muted-foreground mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                        {formatTime(message.createdAt)}
                        {isMine && message.isRead && (
                          <span className="ml-1 text-blue-500">已读</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              rows={2}
              maxLength={2000}
              className="flex-1 px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
            >
              {sending ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {newMessage.length}/2000
          </p>
        </div>
      </div>
    </div>
  );
}
