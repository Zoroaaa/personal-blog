/**
 * 会话列表组件
 * 
 * 功能：
 * - 显示所有私信会话
 * - 显示最后一条消息和未读数
 * - 点击选择会话
 * - 支持新对话创建
 * - 显示用户在线状态
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import type { Conversation } from '../types/messages';

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  onSelect: (conversation: Conversation) => void;
  onClose: () => void;
  onNewConversation: () => void;
  isAdmin: boolean;
}

export function ConversationList({ 
  conversations, 
  isLoading, 
  onSelect, 
  onClose, 
  onNewConversation,
  isAdmin 
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
        <h3 className="font-semibold text-foreground">私信消息</h3>
        <div className="flex items-center gap-2">
          {/* 新对话按钮 */}
          <button
            onClick={onNewConversation}
            title={isAdmin ? "新对话" : "联系管理员"}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 会话列表 */}
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
            <p className="text-sm text-muted-foreground text-center">
              暂无私信消息
            </p>
            <p className="text-xs text-muted-foreground/70 text-center mt-1">
              开始与他人交流吧
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((conversation) => (
              <button
                key={conversation.partnerId}
                onClick={() => onSelect(conversation)}
                className="w-full flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
              >
                {/* 头像 */}
                <div className="relative flex-shrink-0">
                  <img
                    src={conversation.partnerAvatarUrl || '/default-avatar.png'}
                    alt={conversation.partnerDisplayName}
                    className="w-10 h-10 rounded-full border border-border object-cover"
                  />
                  {/* 在线状态指示器 */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></span>
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground truncate">
                      {conversation.partnerDisplayName}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {conversation.lastMessage.createdAt}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-sm text-muted-foreground truncate flex-1">
                      {conversation.lastMessage.senderId === conversation.partnerId ? (
                        conversation.lastMessage.content
                      ) : (
                        <span className="text-muted-foreground/70">我: {conversation.lastMessage.content}</span>
                      )}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="px-4 py-3 border-t border-border bg-muted/50">
        <a
          href="/messages"
          className="block w-full py-2 text-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          查看全部私信
        </a>
      </div>
    </div>
  );
}
