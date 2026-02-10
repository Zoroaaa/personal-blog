/**
 * 聊天窗口组件
 * 
 * 功能：
 * - 显示与特定用户的对话
 * - 发送消息
 * - 加载更多历史消息
 * - 显示消息状态
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Conversation, MessageWithStatus } from '../types/messages';

interface ChatWindowProps {
  messages: MessageWithStatus[];
  partner?: Conversation;
  currentUserId: number;
  messageInput: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  onMessageInputChange: (value: string) => void;
  onSend: () => void;
  onBack: () => void;
  onClose: () => void;
  onLoadMore: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  chatContainerRef: React.RefObject<HTMLDivElement>;
}

export function ChatWindow({
  messages,
  partner,
  currentUserId,
  messageInput,
  isLoading,
  isLoadingMore,
  hasMoreMessages,
  onMessageInputChange,
  onSend,
  onBack,
  onClose,
  onLoadMore,
  messagesEndRef,
  chatContainerRef,
}: ChatWindowProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 处理发送
  const handleSend = useCallback(() => {
    if (!messageInput.trim()) return;
    onSend();
  }, [messageInput, onSend]);

  // 处理按键
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // 自动调整输入框高度
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [messageInput]);

  // 滚动检测加载更多
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container || isLoadingMore || !hasMoreMessages) return;

    if (container.scrollTop < 50) {
      onLoadMore();
    }
  }, [chatContainerRef, isLoadingMore, hasMoreMessages, onLoadMore]);

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {partner && (
            <div className="flex items-center gap-2">
              <img
                src={partner.partnerAvatarUrl || '/default-avatar.png'}
                alt={partner.partnerDisplayName}
                className="w-8 h-8 rounded-full border border-border object-cover"
              />
              <span className="font-medium text-foreground">{partner.partnerDisplayName}</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
        {!hasMoreMessages && messages.length > 0 && (
          <div className="text-center py-2">
            <span className="text-xs text-muted-foreground">没有更多消息了</span>
          </div>
        )}

        {isLoading ? (
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
            const isMe = message.senderId === currentUserId;
            const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;

            return (
              <div
                key={message.id || message.tempId}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* 头像 */}
                  {showAvatar ? (
                    <img
                      src={isMe ? '/default-avatar.png' : (message.senderAvatarUrl || '/default-avatar.png')}
                      alt={message.senderDisplayName}
                      className="w-8 h-8 rounded-full border border-border object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 flex-shrink-0"></div>
                  )}

                  {/* 消息内容 */}
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
                    <div className="flex items-center gap-1 mt-1">
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
            ref={inputRef}
            value={messageInput}
            onChange={(e) => onMessageInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm max-h-[120px]"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={!messageInput.trim()}
            className="flex-shrink-0 p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  );
}
