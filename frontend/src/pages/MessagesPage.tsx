/**
 * 私信管理页面
 *
 * 功能：
 * - 显示所有会话列表
 * - 查看与特定用户的完整对话
 * - 发送新消息（支持附件）
 * - 撤回消息（3分钟内）
 * - 编辑撤回的消息
 * - 标记已读
 * - 粘贴图片发送
 * - 加载更多历史消息
 *
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useMessageStore } from '../stores/messageStore';
import {
  getConversations,
  getConversation,
  sendMessage,
  markAllAsRead,
  recallMessage,
  editMessage,
} from '../utils/messageApi';
import { useToast } from '../components/Toast';
import { ChatWindow } from '../components/ChatWindow';
import type { Conversation, MessageWithStatus, MessageAttachment, EditingMessage } from '../types/messages';

export function MessagesPage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageWithStatus[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { conversations, unreadCount, setConversations, setUnreadCount } = useMessageStore();

  // 检查登录状态
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // 获取会话列表
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getConversations();
      setConversations(data.conversations);
    } catch (error) {
      console.error('获取会话列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setConversations]);

  // 获取对话消息
  const fetchMessages = useCallback(async (partnerId: number, pageNum = 1) => {
    if (pageNum === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const data = await getConversation(partnerId, pageNum);

      if (pageNum === 1) {
        setMessages(data.messages as MessageWithStatus[]);
      } else {
        setMessages((prev) => [...data.messages, ...prev] as MessageWithStatus[]);
      }

      setHasMoreMessages(data.pagination.page < data.pagination.totalPages);
    } catch (error) {
      console.error('获取对话失败:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // 加载更多消息
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMoreMessages || !selectedConversation) return;
    fetchMessages(selectedConversation.partnerId, 2);
  }, [selectedConversation, isLoadingMore, hasMoreMessages, fetchMessages]);

  // 选择会话
  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      setSelectedConversation(conversation);
      setEditingMessage(null);
      setMessageInput('');
      fetchMessages(conversation.partnerId, 1);
    },
    [fetchMessages]
  );

  // 发送消息
  const handleSend = useCallback(async (attachments?: MessageAttachment[]) => {
    if ((!messageInput.trim() && (!attachments || attachments.length === 0)) || !selectedConversation || !user) return;

    const content = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    // 创建临时消息
    const tempMessage: MessageWithStatus = {
      id: 0,
      senderId: user.id,
      senderUsername: user.username,
      senderDisplayName: user.displayName,
      senderAvatarUrl: user.avatarUrl,
      receiverId: selectedConversation.partnerId,
      receiverUsername: selectedConversation.partnerUsername,
      receiverDisplayName: selectedConversation.partnerDisplayName,
      receiverAvatarUrl: selectedConversation.partnerAvatarUrl,
      content,
      isRead: false,
      hasAttachments: attachments && attachments.length > 0,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      createdAt: new Date().toLocaleString(),
      status: 'sending',
      tempId,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setMessageInput('');

    try {
      const sentMessage = await sendMessage({
        receiverId: selectedConversation.partnerId,
        content,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === tempId
            ? { ...m, id: sentMessage.id, createdAt: sentMessage.createdAt, status: 'sent' }
            : m
        )
      );

      // 更新会话列表
      fetchConversations();
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages((prev) => prev.map((m) => (m.tempId === tempId ? { ...m, status: 'error' } : m)));
    }
  }, [messageInput, selectedConversation, user, fetchConversations]);

  // 撤回消息
  const handleRecall = useCallback(async (messageId: number) => {
    if (!user) return;

    try {
      await recallMessage(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isRecalled: true, status: 'recalled' } : m
        )
      );
      showSuccess('消息已撤回');
    } catch (error) {
      console.error('撤回消息失败:', error);
      showError('撤回消息失败，请稍后重试');
    }
  }, [user]);

  // 开始编辑消息
  const handleStartEdit = useCallback((messageId: number, content: string, attachments: MessageAttachment[]) => {
    setEditingMessage({ messageId, content, attachments });
    setMessageInput(content);
  }, []);

  // 编辑消息
  const handleEdit = useCallback(async (messageId: number, content: string, attachments?: MessageAttachment[]) => {
    if (!user) return;

    try {
      const updatedMessage = await editMessage({
        messageId,
        content,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: updatedMessage.content, attachments: updatedMessage.attachments, isRecalled: false, status: 'sent' }
            : m
        )
      );

      setEditingMessage(null);
      setMessageInput('');
      showSuccess('消息已编辑并重新发送');
    } catch (error) {
      console.error('编辑消息失败:', error);
      showError('编辑消息失败，请稍后重试');
    }
  }, [user]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setMessageInput('');
  }, []);

  // 标记全部已读
  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllAsRead();
      setUnreadCount(0);
      fetchConversations();
      showSuccess('所有消息已标记为已读');
    } catch (error) {
      console.error('标记已读失败:', error);
      showError('标记已读失败，请稍后重试');
    }
  }, [fetchConversations, setUnreadCount]);

  // 初始加载
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated, fetchConversations]);

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">私信管理</h1>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 h-[80vh] min-h-[500px] max-h-[700px]">
            {/* 会话列表 */}
            <div className="border-r border-border flex flex-col">
              {/* 头部 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                <h2 className="font-semibold text-foreground">会话列表</h2>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    全部已读
                  </button>
                )}
              </div>

              {/* 列表 */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <svg
                      className="w-12 h-12 text-muted-foreground mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <p className="text-sm text-muted-foreground text-center">暂无私信消息</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {conversations.map((conversation) => {
                      const isSelected = selectedConversation?.partnerId === conversation.partnerId;
                      return (
                        <button
                          key={conversation.partnerId}
                          onClick={() => handleSelectConversation(conversation)}
                          className={`w-full flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors text-left ${
                            isSelected ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={conversation.partnerAvatarUrl || '/default-avatar.png'}
                              alt={conversation.partnerDisplayName}
                              className="w-10 h-10 rounded-full border border-border object-cover"
                            />
                            {conversation.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground truncate">
                                {conversation.partnerDisplayName}
                              </span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {conversation.lastMessage.createdAt}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {conversation.lastMessage.senderId === conversation.partnerId
                                ? conversation.lastMessage.content
                                : `我: ${conversation.lastMessage.content}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 聊天区域 */}
            <div className="md:col-span-2">
              {selectedConversation ? (
                <ChatWindow
                  messages={messages}
                  partner={selectedConversation}
                  currentUserId={user.id}
                  messageInput={messageInput}
                  isLoading={isLoading}
                  isLoadingMore={isLoadingMore}
                  hasMoreMessages={hasMoreMessages}
                  editingMessage={editingMessage}
                  onMessageInputChange={setMessageInput}
                  onSend={handleSend}
                  onRecall={handleRecall}
                  onStartEdit={handleStartEdit}
                  onEdit={handleEdit}
                  onCancelEdit={handleCancelEdit}
                  onBack={() => setSelectedConversation(null)}
                  onClose={() => navigate('/')}
                  onLoadMore={handleLoadMore}
                  messagesEndRef={messagesEndRef}
                  chatContainerRef={chatContainerRef}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <svg
                    className="w-16 h-16 text-muted-foreground mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-muted-foreground">选择一个会话开始聊天</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
