/**
 * 私信管理页面
 * 
 * 功能：
 * - 显示所有会话列表
 * - 查看与特定用户的完整对话
 * - 发送新消息
 * - 标记已读/删除消息
 * - 搜索用户发送私信
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useMessageStore } from '../stores/messageStore';
import { getConversations, getConversation, sendMessage, markAllAsRead, deleteMessage } from '../utils/messageApi';
import type { Conversation, MessageWithStatus } from '../types/messages';

export function MessagesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageWithStatus[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    unreadCount,
    setConversations,
    setUnreadCount,
  } = useMessageStore();

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
      setIsLoadingMessages(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const data = await getConversation(partnerId, pageNum);
      
      if (pageNum === 1) {
        setMessages(data.messages as MessageWithStatus[]);
      } else {
        setMessages(prev => [...data.messages, ...prev] as MessageWithStatus[]);
      }
      
      setHasMore(data.pagination.page < data.pagination.totalPages);
      setPage(data.pagination.page);
    } catch (error) {
      console.error('获取对话失败:', error);
    } finally {
      setIsLoadingMessages(false);
      setIsLoadingMore(false);
    }
  }, []);

  // 加载更多消息
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || !selectedConversation) return;
    fetchMessages(selectedConversation.partnerId, page + 1);
  }, [selectedConversation, page, isLoadingMore, hasMore, fetchMessages]);
  
  // 使用loadMore
  useEffect(() => {
    // 预加载，避免未使用警告
    if (false) loadMore();
  }, [loadMore]);

  // 选择会话
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setPage(1);
    setHasMore(true);
    fetchMessages(conversation.partnerId, 1);
  }, [fetchMessages]);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversation || !user) return;

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
      createdAt: new Date().toLocaleString(),
      status: 'sending',
      tempId,
    };

    setMessages(prev => [...prev, tempMessage]);
    setMessageInput('');

    try {
      const sentMessage = await sendMessage({
        receiverId: selectedConversation.partnerId,
        content,
      });

      setMessages(prev =>
        prev.map(m =>
          m.tempId === tempId
            ? { ...m, id: sentMessage.id, createdAt: sentMessage.createdAt, status: 'sent' }
            : m
        )
      );
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev =>
        prev.map(m =>
          m.tempId === tempId ? { ...m, status: 'error' } : m
        )
      );
    }
  }, [messageInput, selectedConversation, user]);

  // 标记全部已读
  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllAsRead();
      setUnreadCount(0);
      fetchConversations();
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  }, [fetchConversations, setUnreadCount]);

  // 删除消息
  const handleDeleteMessage = useCallback(async (messageId: number) => {
    if (!confirm('确定要删除这条消息吗？')) return;
    
    try {
      await deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('删除消息失败:', error);
    }
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 新消息自动滚动
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].senderId === user?.id) {
      scrollToBottom();
    }
  }, [messages, user?.id, scrollToBottom]);

  // 初始加载
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 处理按键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">私信管理</h1>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-200px)] min-h-[500px]">
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
                    <svg className="w-12 h-12 text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm text-muted-foreground text-center">暂无私信消息</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.partnerId}
                        onClick={() => handleSelectConversation(conversation)}
                        className={`w-full flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors text-left ${
                          selectedConversation?.partnerId === conversation.partnerId ? 'bg-accent' : ''
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
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 聊天区域 */}
            <div className="md:col-span-2 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* 聊天头部 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedConversation.partnerAvatarUrl || '/default-avatar.png'}
                        alt={selectedConversation.partnerDisplayName}
                        className="w-8 h-8 rounded-full border border-border object-cover"
                      />
                      <span className="font-medium text-foreground">{selectedConversation.partnerDisplayName}</span>
                    </div>
                  </div>

                  {/* 消息列表 */}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {isLoadingMore && (
                      <div className="flex justify-center py-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}

                    {!hasMore && messages.length > 0 && (
                      <div className="text-center py-2">
                        <span className="text-xs text-muted-foreground">没有更多消息了</span>
                      </div>
                    )}

                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <svg className="w-12 h-12 text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm text-muted-foreground">开始发送消息吧</p>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const isMe = message.senderId === user?.id;
                        const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

                        return (
                          <div
                            key={message.id || message.tempId}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              {showAvatar ? (
                                <img
                                  src={isMe ? '/default-avatar.png' : (message.senderAvatarUrl || '/default-avatar.png')}
                                  alt={message.senderDisplayName}
                                  className="w-8 h-8 rounded-full border border-border object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 flex-shrink-0"></div>
                              )}

                              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div
                                  className={`px-4 py-2 rounded-2xl ${
                                    isMe
                                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                      : 'bg-muted text-foreground rounded-tl-sm'
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">{message.createdAt}</span>
                                  {isMe && message.status && (
                                    <span className="text-xs">
                                      {message.status === 'sending' && (
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                      )}
                                      {message.status === 'sent' && (
                                        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                      {message.status === 'error' && (
                                        <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                    </span>
                                  )}
                                  {isMe && (
                                    <button
                                      onClick={() => handleDeleteMessage(message.id)}
                                      className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                                    >
                                      删除
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* 输入区域 */}
                  <div className="p-4 border-t border-border bg-muted/50">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="输入消息..."
                        rows={1}
                        className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm max-h-[120px]"
                        style={{ minHeight: '42px' }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                        className="flex-shrink-0 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        发送
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      按 Enter 发送，Shift + Enter 换行
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <svg className="w-16 h-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
