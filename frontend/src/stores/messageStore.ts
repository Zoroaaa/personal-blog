/**
 * 私信状态管理 Store
 */

import { create } from 'zustand';
import type { Conversation, MessageWithStatus, Message } from '../types/messages';

interface MessageState {
  // 状态
  conversations: Conversation[];
  currentMessages: MessageWithStatus[];
  unreadCount: number;
  currentPartnerId: number | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  error: string | null;
  sendStatus: 'idle' | 'sending' | 'sent' | 'error';

  // 分页
  conversationsPage: number;
  messagesPage: number;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversation: Conversation) => void;
  setCurrentMessages: (messages: MessageWithStatus[]) => void;
  addMessage: (message: MessageWithStatus) => void;
  updateMessageStatus: (tempId: string, status: 'sent' | 'error', message?: Message) => void;
  prependMessages: (messages: MessageWithStatus[]) => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  setCurrentPartnerId: (id: number | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setHasMoreMessages: (hasMore: boolean) => void;
  setError: (error: string | null) => void;
  setSendStatus: (status: 'idle' | 'sending' | 'sent' | 'error') => void;
  setConversationsPage: (page: number) => void;
  setMessagesPage: (page: number) => void;
  incrementMessagesPage: () => void;
  resetMessages: () => void;
  markConversationAsRead: (partnerId: number) => void;
  deleteMessage: (messageId: number) => void;
  clearError: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  // 初始状态
  conversations: [],
  currentMessages: [],
  unreadCount: 0,
  currentPartnerId: null,
  isLoading: false,
  isLoadingMore: false,
  hasMoreMessages: true,
  error: null,
  sendStatus: 'idle',
  conversationsPage: 1,
  messagesPage: 1,

  // Actions
  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations.filter((c) => c.partnerId !== conversation.partnerId)],
    })),

  updateConversation: (conversation) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.partnerId === conversation.partnerId ? conversation : c
      ),
    })),

  setCurrentMessages: (messages) => set({ currentMessages: messages }),

  addMessage: (message) =>
    set((state) => ({
      currentMessages: [...state.currentMessages, message],
    })),

  updateMessageStatus: (tempId, status, message) =>
    set((state) => ({
      currentMessages: state.currentMessages.map((m) =>
        m.tempId === tempId
          ? {
              ...m,
              status,
              ...(message && {
                id: message.id,
                createdAt: message.createdAt,
              }),
            }
          : m
      ),
    })),

  prependMessages: (messages) =>
    set((state) => ({
      currentMessages: [...messages, ...state.currentMessages],
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),

  incrementUnreadCount: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  decrementUnreadCount: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

  setCurrentPartnerId: (id) => set({ currentPartnerId: id }),

  setLoading: (loading) => set({ isLoading: loading }),

  setLoadingMore: (loading) => set({ isLoadingMore: loading }),

  setHasMoreMessages: (hasMore) => set({ hasMoreMessages: hasMore }),

  setError: (error) => set({ error }),

  setSendStatus: (status) => set({ sendStatus: status }),

  setConversationsPage: (page) => set({ conversationsPage: page }),

  setMessagesPage: (page) => set({ messagesPage: page }),

  incrementMessagesPage: () =>
    set((state) => ({ messagesPage: state.messagesPage + 1 })),

  resetMessages: () =>
    set({
      currentMessages: [],
      messagesPage: 1,
      hasMoreMessages: true,
    }),

  markConversationAsRead: (partnerId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.partnerId === partnerId ? { ...c, unreadCount: 0 } : c
      ),
      currentMessages: state.currentMessages.map((m) =>
        m.senderId === partnerId ? { ...m, isRead: true } : m
      ),
    })),

  deleteMessage: (messageId) =>
    set((state) => ({
      currentMessages: state.currentMessages.filter((m) => m.id !== messageId),
    })),

  clearError: () => set({ error: null }),
}));
