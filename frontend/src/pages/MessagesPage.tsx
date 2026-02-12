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
import { api } from '../utils/api';
import { useToast } from '../components/Toast';
import type { Conversation, MessageWithStatus, MessageAttachment, EditingMessage } from '../types/messages';

export function MessagesPage() {
  const navigate = useNavigate();
  const { showError, showSuccess, showInfo, showWarning } = useToast();
  const { user, isAuthenticated } = useAuthStore();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageWithStatus[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);
  const [showActions, setShowActions] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setIsLoadingMessages(true);
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

  // 滚动检测加载更多
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container || isLoadingMore || !hasMore) return;

    if (container.scrollTop < 50) {
      loadMore();
    }
  }, [isLoadingMore, hasMore, loadMore]);

  // 选择会话
  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      setSelectedConversation(conversation);
      setPage(1);
      setHasMore(true);
      setEditingMessage(null);
      setMessageInput('');
      setPendingAttachments([]);
      fetchMessages(conversation.partnerId, 1);
    },
    [fetchMessages]
  );

  // 上传文件
  const uploadFile = async (file: File): Promise<MessageAttachment | null> => {
    try {
      const isImage = file.type.startsWith('image/');
      const response = await api.uploadFile(file);
      if (response.success && response.data) {
        return {
          id: Date.now(),
          fileName: file.name,
          fileUrl: response.data.url,
          fileType: isImage ? 'image' : 'file',
          fileSize: file.size,
        };
      }
      showError('上传失败：服务器返回异常');
      return null;
    } catch (error) {
      console.error('上传失败:', error);
      const errorMessage = error instanceof Error ? error.message : '上传失败，请稍后重试';
      showError(`上传失败：${errorMessage}`);
      return null;
    }
  };

  // 处理文件选择
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let uploadedCount = 0;

    try {
      showInfo(`开始上传 ${files.length} 个文件...`);
      
      for (const file of Array.from(files)) {
        const attachment = await uploadFile(file);
        if (attachment) {
          uploadedCount++;
          setPendingAttachments((prev) => [...prev, attachment]);
        }
      }
      
      if (uploadedCount > 0) {
        showSuccess(`成功上传 ${uploadedCount} 个文件`);
      } else if (uploadedCount === 0 && files.length > 0) {
        showWarning('所有文件上传失败，请检查文件大小和格式');
      }
    } catch (error) {
      console.error('上传文件失败:', error);
      showError('文件上传过程中发生错误，请稍后重试');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  // 处理粘贴事件（图片）
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageItems: DataTransferItem[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageItems.push(items[i]);
      }
    }

    if (imageItems.length === 0) return;

    e.preventDefault();
    setIsUploading(true);
    let uploadedCount = 0;

    try {
      showInfo(`开始上传 ${imageItems.length} 张图片...`);
      
      for (const item of imageItems) {
        const blob = item.getAsFile();
        if (blob) {
          const attachment = await uploadFile(blob);
          if (attachment) {
            uploadedCount++;
            setPendingAttachments((prev) => [...prev, attachment]);
          }
        }
      }
      
      if (uploadedCount > 0) {
        showSuccess(`成功上传 ${uploadedCount} 张图片`);
      } else if (uploadedCount === 0 && imageItems.length > 0) {
        showWarning('图片上传失败，请稍后重试');
      }
    } catch (error) {
      console.error('上传图片失败:', error);
      showError('图片上传过程中发生错误，请稍后重试');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 移除待发送附件
  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 打开文件选择
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if ((!messageInput.trim() && pendingAttachments.length === 0) || !selectedConversation || !user) return;

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
      hasAttachments: pendingAttachments.length > 0,
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      createdAt: new Date().toLocaleString(),
      status: 'sending',
      tempId,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setMessageInput('');
    setPendingAttachments([]);

    try {
      const sentMessage = await sendMessage({
        receiverId: selectedConversation.partnerId,
        content,
        attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === tempId
            ? { ...m, id: sentMessage.id, createdAt: sentMessage.createdAt, status: 'sent' }
            : m
        )
      );
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages((prev) => prev.map((m) => (m.tempId === tempId ? { ...m, status: 'error' } : m)));
    }
  }, [messageInput, pendingAttachments, selectedConversation, user]);

  // 撤回消息
  const handleRecallMessage = useCallback(
    async (messageId: number) => {
      try {
        await recallMessage(messageId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isRecalled: true,
                  status: 'recalled',
                  originalContent: m.content,
                  content: '消息已撤回',
                  attachments: [],
                }
              : m
          )
        );
      } catch (error) {
        console.error('撤回消息失败:', error);
        alert('撤回消息失败，可能已超过3分钟');
      }
      setShowActions(null);
    },
    []
  );

  // 开始编辑消息
  const handleStartEdit = useCallback(
    (message: MessageWithStatus) => {
      const contentToEdit = message.originalContent || message.content;
      setMessageInput(contentToEdit);
      setPendingAttachments(message.attachments || []);
      setEditingMessage({
        messageId: message.id,
        content: contentToEdit,
        attachments: message.attachments || [],
      });
      setShowActions(null);
      // 聚焦输入框
      inputRef.current?.focus();
    },
    []
  );

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setMessageInput('');
    setPendingAttachments([]);
  }, []);

  // 编辑并重新发送消息
  const handleEditMessage = useCallback(
    async (messageId: number, content: string, attachments?: MessageAttachment[]) => {
      if (!content.trim() && (!attachments || attachments.length === 0)) return;

      try {
        const updatedMessage = await editMessage(messageId, {
          content: content.trim(),
          attachments,
        });

        // 更新消息列表
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  ...updatedMessage,
                  isRecalled: false,
                  status: 'sent',
                }
              : m
          )
        );

        // 清除编辑状态
        setEditingMessage(null);
        setMessageInput('');
        setPendingAttachments([]);
      } catch (error) {
        console.error('编辑消息失败:', error);
        alert('编辑消息失败');
      }
    },
    []
  );

  // 处理发送（区分新建和编辑）
  const handleSend = useCallback(() => {
    if ((!messageInput.trim() && pendingAttachments.length === 0) || !selectedConversation) return;

    if (editingMessage) {
      handleEditMessage(
        editingMessage.messageId,
        messageInput,
        pendingAttachments.length > 0 ? pendingAttachments : undefined
      );
    } else {
      handleSendMessage();
    }
  }, [messageInput, pendingAttachments, editingMessage, selectedConversation, handleSendMessage, handleEditMessage]);

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

  // 自动调整输入框高度
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [messageInput]);

  // 初始加载
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 处理按键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {/* 加载更多指示器 */}
                    {isLoadingMore && (
                      <div className="flex justify-center py-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}

                    {/* 没有更多消息提示 */}
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
                        <p className="text-sm text-muted-foreground">开始发送消息吧</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">支持粘贴图片和发送附件，3分钟内可撤回</p>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const isMe = message.senderId === user?.id;
                        const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
                        const isRecalled = message.isRecalled;
                        const canRecall = message.canRecall && isMe && !isRecalled;

                        return (
                          <div
                            key={message.id || message.tempId}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              {/* 头像 */}
                              {showAvatar ? (
                                <img
                                  src={
                                    isMe
                                      ? user?.avatarUrl || '/default-avatar.png'
                                      : message.senderAvatarUrl || '/default-avatar.png'
                                  }
                                  alt={isMe ? user?.displayName : message.senderDisplayName}
                                  className="w-8 h-8 rounded-full border border-border object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 flex-shrink-0"></div>
                              )}

                              {/* 消息内容 */}
                              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                {/* 附件 */}
                                {!isRecalled && message.attachments && message.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {message.attachments.map((att, attIndex) => (
                                      <div key={attIndex} className="max-w-[200px]">
                                        {att.fileType === 'image' ? (
                                          <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <img
                                              src={att.fileUrl}
                                              alt={att.fileName}
                                              className="rounded-lg max-w-[200px] max-h-[150px] object-cover hover:opacity-90 transition-opacity cursor-pointer"
                                            />
                                          </a>
                                        ) : (
                                          <a
                                            href={att.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-accent transition-colors"
                                          >
                                            <svg
                                              className="w-4 h-4 text-muted-foreground"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                              />
                                            </svg>
                                            <div className="flex flex-col">
                                              <span className="text-sm text-foreground truncate max-w-[120px]">
                                                {att.fileName}
                                              </span>
                                              {att.fileSize > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                  {formatFileSize(att.fileSize)}
                                                </span>
                                              )}
                                            </div>
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* 文本内容 */}
                                <div
                                  className={`px-4 py-2 rounded-2xl ${
                                    isMe
                                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                      : 'bg-muted text-foreground rounded-tl-sm'
                                  } ${isRecalled ? 'opacity-60 italic' : ''}`}
                                >
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {isRecalled ? '消息已撤回' : message.content}
                                  </p>
                                </div>

                                {/* 操作按钮和时间 */}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">{message.createdAt}</span>

                                  {/* 发送者操作菜单 */}
                                  {isMe && !isRecalled && (
                                    <div className="relative">
                                      <button
                                        onClick={() => setShowActions(showActions === message.id ? null : message.id)}
                                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                                      >
                                        <svg
                                          className="w-3 h-3"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                          />
                                        </svg>
                                      </button>

                                      {showActions === message.id && (
                                        <div className="absolute bottom-full right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-10 min-w-[80px]">
                                          {canRecall && (
                                            <button
                                              onClick={() => {
                                                if (
                                                  confirm('确定要撤回这条消息吗？撤回后3分钟内可以编辑重新发送。')
                                                ) {
                                                  handleRecallMessage(message.id);
                                                }
                                                setShowActions(null);
                                              }}
                                              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent text-foreground"
                                            >
                                              撤回
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* 状态图标 */}
                                  {isMe && message.status && (
                                    <span className="text-xs">
                                      {message.status === 'sending' && (
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                          <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                          ></circle>
                                          <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                          ></path>
                                        </svg>
                                      )}
                                      {message.status === 'sent' && (
                                        <svg
                                          className="w-3 h-3 text-green-500"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      )}
                                      {message.status === 'error' && (
                                        <svg
                                          className="w-3 h-3 text-red-500"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                          />
                                        </svg>
                                      )}
                                      {message.status === 'recalled' && (
                                        <span className="text-muted-foreground">已撤回</span>
                                      )}
                                    </span>
                                  )}
                                </div>

                                {/* 撤回后可编辑提示 */}
                                {isRecalled && isMe && (
                                  <button
                                    onClick={() => handleStartEdit(message)}
                                    className="text-xs text-primary hover:underline mt-1"
                                  >
                                    编辑并重新发送
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* 编辑模式提示 */}
                  {editingMessage && (
                    <div className="px-4 py-2 bg-primary/10 border-t border-primary/20 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span className="text-primary">编辑消息</span>
                      </div>
                      <button
                        onClick={handleCancelEdit}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        取消
                      </button>
                    </div>
                  )}

                  {/* 待发送附件预览 */}
                  {pendingAttachments.length > 0 && (
                    <div className="px-4 py-2 border-t border-border bg-muted/30">
                      <div className="flex flex-wrap gap-2">
                        {pendingAttachments.map((att, index) => (
                          <div key={index} className="relative group">
                            {att.fileType === 'image' ? (
                              <div className="relative">
                                <img
                                  src={att.fileUrl}
                                  alt={att.fileName}
                                  className="w-16 h-16 rounded-lg object-cover"
                                />
                                <button
                                  onClick={() => removeAttachment(index)}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-sm">
                                <svg
                                  className="w-4 h-4 text-muted-foreground"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                  />
                                </svg>
                                <span className="truncate max-w-[100px]">{att.fileName}</span>
                                <button
                                  onClick={() => removeAttachment(index)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 输入区域 */}
                  <div className="p-4 border-t border-border bg-muted/50">
                    {/* 上传中提示 */}
                    {isUploading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span>上传中...</span>
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      {/* 附件按钮 */}
                      <button
                        onClick={openFilePicker}
                        disabled={isUploading}
                        className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors disabled:opacity-50"
                        title="发送文件"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      <textarea
                        ref={inputRef}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={editingMessage ? '编辑消息...' : '输入消息...（支持粘贴图片）'}
                        rows={1}
                        disabled={isUploading}
                        className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm max-h-[120px] disabled:opacity-50"
                        style={{ minHeight: '42px' }}
                      />
                      <button
                        onClick={handleSend}
                        disabled={(!messageInput.trim() && pendingAttachments.length === 0) || isUploading}
                        className="flex-shrink-0 p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {editingMessage ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {editingMessage
                        ? '按 Enter 保存编辑，Shift + Enter 换行'
                        : '按 Enter 发送，Shift + Enter 换行，支持粘贴图片，3分钟内可撤回'}
                    </p>
                  </div>
                </>
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
