/**
 * 私信聊天弹窗组件
 * 
 * 功能：
 * - 显示会话列表或聊天界面
 * - 支持发送和接收消息
 * - 支持撤回消息（3分钟内）
 * - 支持编辑撤回的消息
 * - 消息分页加载
 * - 自动滚动到底部
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useMessageStore } from '../stores/messageStore';
import { getConversations, getConversation, sendMessage, recallMessage, editMessage } from '../utils/messageApi';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { NewConversationModal } from './NewConversationModal';
import type { Conversation, MessageWithStatus, EditingMessage, MessageAttachment } from '../types/messages';

interface MessageChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MessageChatModal({ isOpen, onClose }: MessageChatModalProps) {
  const {
    conversations,
    currentMessages,
    currentPartnerId,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    setConversations,
    setCurrentMessages,
    addMessage,
    updateMessageStatus,
    updateMessageRecalled,
    prependMessages,
    setLoading,
    setLoadingMore,
    setHasMoreMessages,
    setCurrentPartnerId,
    setMessagesPage,
    incrementMessagesPage,
    resetMessages,
    markConversationAsRead,
    setError,
  } = useMessageStore();

  const { user } = useAuthStore();

  const [view, setView] = useState<'list' | 'chat'>('list');
  const [messageInput, setMessageInput] = useState('');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';

  // 获取会话列表
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConversations();
      setConversations(data.conversations);
    } catch (error) {
      console.error('获取会话列表失败:', error);
      setError('获取会话列表失败');
    } finally {
      setLoading(false);
    }
  }, [setConversations, setError, setLoading]);

  // 获取对话消息
  const fetchMessages = useCallback(async (partnerId: number, page = 1) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await getConversation(partnerId, page);
      
      if (page === 1) {
        setCurrentMessages(data.messages as MessageWithStatus[]);
      } else {
        prependMessages(data.messages as MessageWithStatus[]);
      }

      setHasMoreMessages(data.pagination.page < data.pagination.totalPages);
      setMessagesPage(data.pagination.page);
    } catch (error) {
      console.error('获取对话失败:', error);
      setError('获取对话失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [setCurrentMessages, prependMessages, setHasMoreMessages, setMessagesPage, setError, setLoading, setLoadingMore]);

  // 加载更多消息
  const loadMoreMessages = useCallback(() => {
    if (isLoadingMore || !hasMoreMessages || !currentPartnerId) return;
    
    incrementMessagesPage();
    const nextPage = useMessageStore.getState().messagesPage;
    fetchMessages(currentPartnerId, nextPage);
  }, [currentPartnerId, isLoadingMore, hasMoreMessages, incrementMessagesPage, fetchMessages]);

  // 打开对话
  const openConversation = useCallback((conversation: Conversation) => {
    setCurrentPartnerId(conversation.partnerId);
    resetMessages();
    setView('chat');
    markConversationAsRead(conversation.partnerId);
    fetchMessages(conversation.partnerId, 1);
  }, [setCurrentPartnerId, resetMessages, markConversationAsRead, fetchMessages]);

  // 返回列表
  const backToList = useCallback(() => {
    setView('list');
    setCurrentPartnerId(null);
    resetMessages();
    setEditingMessage(null);
    setMessageInput('');
    fetchConversations();
  }, [setCurrentPartnerId, resetMessages, fetchConversations]);

  // 打开新对话
  const handleNewConversation = useCallback((userId: number) => {
    setCurrentPartnerId(userId);
    resetMessages();
    setView('chat');
    fetchMessages(userId, 1);
  }, [setCurrentPartnerId, resetMessages, fetchMessages]);

  // 打开新对话弹窗
  const openNewConversation = useCallback(() => {
    setIsNewConversationOpen(true);
  }, []);

  // 发送消息
  const handleSendMessage = useCallback(async (attachments?: MessageAttachment[]) => {
    if ((!messageInput.trim() && (!attachments || attachments.length === 0)) || !currentPartnerId || !user) return;

    const content = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    // 创建临时消息
    const tempMessage: MessageWithStatus = {
      id: 0,
      senderId: user.id,
      senderUsername: user.username,
      senderDisplayName: user.displayName,
      senderAvatarUrl: user.avatarUrl,
      receiverId: currentPartnerId,
      receiverUsername: '',
      receiverDisplayName: '',
      content,
      isRead: false,
      canRecall: true,
      hasAttachments: attachments && attachments.length > 0,
      attachments: attachments,
      createdAt: new Date().toLocaleString(),
      status: 'sending',
      tempId,
    };

    addMessage(tempMessage);
    setMessageInput('');

    try {
      const sentMessage = await sendMessage({
        receiverId: currentPartnerId,
        content,
        attachments,
      });

      updateMessageStatus(tempId, 'sent', sentMessage);
    } catch (error) {
      console.error('发送消息失败:', error);
      updateMessageStatus(tempId, 'error');
      setError('发送消息失败');
    }
  }, [messageInput, currentPartnerId, user, addMessage, updateMessageStatus, setError]);

  // 撤回消息
  const handleRecallMessage = useCallback(async (messageId: number) => {
    try {
      await recallMessage(messageId);
      updateMessageRecalled(messageId);
    } catch (error) {
      console.error('撤回消息失败:', error);
      setError('撤回消息失败');
    }
  }, [updateMessageRecalled, setError]);

  // 开始编辑消息
  const handleStartEdit = useCallback((messageId: number, content: string, attachments: MessageAttachment[]) => {
    setEditingMessage({ messageId, content, attachments });
    setMessageInput(content);
  }, []);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setMessageInput('');
  }, []);

  // 编辑并重新发送消息
  const handleEditMessage = useCallback(async (messageId: number, content: string, attachments?: MessageAttachment[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    try {
      const updatedMessage = await editMessage(messageId, {
        content: content.trim(),
        attachments,
      });

      // 更新消息状态
      const { updateMessageEdited } = useMessageStore.getState();
      updateMessageEdited(messageId, updatedMessage);

      // 清除编辑状态
      setEditingMessage(null);
      setMessageInput('');
    } catch (error) {
      console.error('编辑消息失败:', error);
      setError('编辑消息失败');
    }
  }, [setError]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 新消息自动滚动
  useEffect(() => {
    if (view === 'chat' && currentMessages.length > 0) {
      const lastMessage = currentMessages[currentMessages.length - 1];
      if (lastMessage.senderId === user?.id) {
        scrollToBottom();
      }
    }
  }, [currentMessages, view, user?.id, scrollToBottom]);

  // 初始加载会话列表
  useEffect(() => {
    if (isOpen && view === 'list') {
      fetchConversations();
    }
  }, [isOpen, view, fetchConversations]);

  // 监听ESC关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[55] flex items-end justify-end p-4 sm:p-6 pointer-events-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="w-full sm:w-[400px] h-[500px] sm:h-[600px] bg-card border border-border rounded-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {view === 'list' ? (
            <ConversationList
              conversations={conversations}
              isLoading={isLoading}
              onSelect={openConversation}
              onClose={onClose}
              onNewConversation={openNewConversation}
              isAdmin={isAdmin}
            />
          ) : (
            <ChatWindow
              messages={currentMessages}
              partner={conversations.find(c => c.partnerId === currentPartnerId)}
              currentUserId={user?.id || 0}
              messageInput={messageInput}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMoreMessages={hasMoreMessages}
              editingMessage={editingMessage}
              onMessageInputChange={setMessageInput}
              onSend={handleSendMessage}
              onRecall={handleRecallMessage}
              onStartEdit={handleStartEdit}
              onEdit={handleEditMessage}
              onCancelEdit={handleCancelEdit}
              onBack={backToList}
              onClose={onClose}
              onLoadMore={loadMoreMessages}
              messagesEndRef={messagesEndRef}
              chatContainerRef={chatContainerRef}
            />
          )}
        </div>
      </div>

      {/* 新对话弹窗 */}
      <NewConversationModal
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        onSelect={handleNewConversation}
      />
    </>
  );
}
