/**
 * 私信列表页面
 *
 * 功能：
 * - 显示所有私信会话
 * - 发起新私信
 * - 未读消息提示
 * - 会话管理
 *
 * @author 博客系统
 * @version 1.1.0
 * @created 2024-01-01
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/Toast';

interface MessageThread {
  threadId: string;
  otherUserId: number;
  otherUsername: string;
  otherName: string;
  otherAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  totalMessages: number;
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [recipientUsername, setRecipientUsername] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: number; username: string; displayName: string; avatarUrl?: string } | null>(null);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user } = useAuthStore();

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      const response = await api.get('/messages/threads');
      if (response.success && response.data) {
        setThreads(response.data.threads || []);
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
      showError('加载私信列表失败');
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!recipientUsername.trim()) {
      showError('请输入用户名');
      return;
    }

    setSearching(true);
    setFoundUser(null);

    try {
      const response = await api.searchUser(recipientUsername.trim());
      if (response.success && response.data) {
        if (response.data.user) {
          if (response.data.user.id === user?.id) {
            showError('不能给自己发送私信');
            return;
          }
          setFoundUser(response.data.user);
        } else {
          showError('未找到该用户');
        }
      }
    } catch (error) {
      console.error('Search user error:', error);
      showError('搜索用户失败');
    } finally {
      setSearching(false);
    }
  };

  const handleSendNewMessage = async () => {
    if (!foundUser || !newMessageContent.trim()) {
      showError('请选择收件人并输入消息内容');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/messages', {
        recipientId: foundUser.id,
        content: newMessageContent.trim(),
      });

      if (response.success) {
        showSuccess('消息发送成功');
        setShowNewMessageModal(false);
        setRecipientUsername('');
        setNewMessageContent('');
        setFoundUser(null);
        loadThreads();
      }
    } catch (error) {
      console.error('Send message error:', error);
      showError('发送消息失败');
    } finally {
      setSending(false);
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

    return date.toLocaleDateString('zh-CN');
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('确定要删除这个会话吗？所有消息将被删除。')) {
      return;
    }

    try {
      const response = await api.delete(`/messages/threads/${threadId}`);
      if (response.success) {
        showSuccess('会话已删除');
        setThreads(prev => prev.filter(t => t.threadId !== threadId));
      }
    } catch (error) {
      console.error('Delete thread error:', error);
      showError('删除会话失败');
    }
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">私信</h1>
        <button
          onClick={() => setShowNewMessageModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          发起私信
        </button>
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <span className="text-5xl">💬</span>
          <h3 className="mt-4 text-lg font-medium text-foreground">暂无私信会话</h3>
          <p className="mt-2 text-muted-foreground">点击上方按钮发起第一封私信</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <div
              key={thread.threadId}
              onClick={() => navigate(`/messages/${thread.threadId}`)}
              className="bg-card rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow border border-border group"
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img
                    src={thread.otherAvatar || '/default-avatar.png'}
                    alt={thread.otherName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {thread.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">
                        {thread.otherName}
                      </h3>
                      <p className="text-sm text-muted-foreground">@{thread.otherUsername}</p>
                    </div>
                    <span className="text-sm text-muted-foreground flex-shrink-0">
                      {formatTime(thread.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate mt-2">
                    {thread.lastMessage}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      共 {thread.totalMessages} 条消息
                    </span>
                    <button
                      onClick={(e) => handleDeleteThread(thread.threadId, e)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-600 transition-opacity"
                    >
                      删除会话
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">发起私信</h2>
              <button
                onClick={() => {
                  setShowNewMessageModal(false);
                  setRecipientUsername('');
                  setNewMessageContent('');
                  setFoundUser(null);
                }}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  收件人用户名
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recipientUsername}
                    onChange={(e) => {
                      setRecipientUsername(e.target.value);
                      setFoundUser(null);
                    }}
                    placeholder="输入用户名搜索"
                    className="flex-1 px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={searchUser}
                    disabled={searching || !recipientUsername.trim()}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    {searching ? '搜索中...' : '搜索'}
                  </button>
                </div>
              </div>

              {foundUser && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <img
                    src={foundUser.avatarUrl || '/default-avatar.png'}
                    alt={foundUser.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-foreground">{foundUser.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{foundUser.username}</p>
                  </div>
                  <svg className="w-5 h-5 text-green-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  消息内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newMessageContent}
                  onChange={(e) => setNewMessageContent(e.target.value)}
                  placeholder="输入消息内容..."
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {newMessageContent.length}/2000
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNewMessageModal(false);
                    setRecipientUsername('');
                    setNewMessageContent('');
                    setFoundUser(null);
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSendNewMessage}
                  disabled={!foundUser || !newMessageContent.trim() || sending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? '发送中...' : '发送'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
