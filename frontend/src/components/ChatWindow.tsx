/**
 * 聊天窗口组件
 * 
 * 功能：
 * - 显示与特定用户的对话
 * - 发送消息
 * - 撤回消息（3分钟内）
 * - 编辑撤回的消息
 * - 加载更多历史消息
 * - 显示消息状态
 * - 支持粘贴图片
 * - 支持附件上传
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Conversation, MessageWithStatus, MessageAttachment, EditingMessage } from '../types/messages';
import { api } from '../utils/api';

interface ChatWindowProps {
  messages: MessageWithStatus[];
  partner?: Conversation;
  currentUserId: number;
  messageInput: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  editingMessage: EditingMessage | null;
  onMessageInputChange: (value: string) => void;
  onSend: (attachments?: MessageAttachment[]) => void;
  onRecall: (messageId: number) => void;
  onStartEdit: (messageId: number, content: string, attachments: MessageAttachment[]) => void;
  onEdit: (messageId: number, content: string, attachments?: MessageAttachment[]) => void;
  onCancelEdit: () => void;
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
  editingMessage,
  onMessageInputChange,
  onSend,
  onRecall,
  onStartEdit,
  onEdit,
  onCancelEdit,
  onBack,
  onClose,
  onLoadMore,
  messagesEndRef,
  chatContainerRef,
}: ChatWindowProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showActions, setShowActions] = useState<number | null>(null);

  // 处理发送
  const handleSend = useCallback(() => {
    if (!messageInput.trim() && pendingAttachments.length === 0) return;

    if (editingMessage) {
      // 编辑模式：调用编辑接口重新发送消息
      onEdit(editingMessage.messageId, messageInput, pendingAttachments.length > 0 ? pendingAttachments : undefined);
    } else {
      // 正常发送
      onSend(pendingAttachments.length > 0 ? pendingAttachments : undefined);
    }
    setPendingAttachments([]);
  }, [messageInput, pendingAttachments, editingMessage, onSend, onEdit]);

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

  // 编辑模式时设置附件
  useEffect(() => {
    if (editingMessage) {
      setPendingAttachments(editingMessage.attachments);
    }
  }, [editingMessage]);

  // 滚动检测加载更多
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container || isLoadingMore || !hasMoreMessages) return;

    if (container.scrollTop < 50) {
      onLoadMore();
    }
  }, [chatContainerRef, isLoadingMore, hasMoreMessages, onLoadMore]);

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

    try {
      for (const item of imageItems) {
        const blob = item.getAsFile();
        if (blob) {
          const attachment = await uploadFile(blob);
          if (attachment) {
            setPendingAttachments(prev => [...prev, attachment]);
          }
        }
      }
    } catch (error) {
      console.error('上传图片失败:', error);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 上传文件
  const uploadFile = async (file: File): Promise<MessageAttachment | null> => {
    try {
      const isImage = file.type.startsWith('image/');
      const response = await api.uploadFile(file);
      if (response.success && response.data) {
        return {
          id: Date.now(), // 临时ID
          fileName: file.name,
          fileUrl: response.data.url,
          fileType: isImage ? 'image' : 'file',
          fileSize: file.size
        };
      }
      return null;
    } catch (error) {
      console.error('上传失败:', error);
      return null;
    }
  };

  // 处理文件选择
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const attachment = await uploadFile(file);
        if (attachment) {
          setPendingAttachments(prev => [...prev, attachment]);
        }
      }
    } catch (error) {
      console.error('上传文件失败:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  // 移除待发送附件
  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
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

  // 处理撤回
  const handleRecall = useCallback((messageId: number) => {
    if (confirm('确定要撤回这条消息吗？撤回后3分钟内可以编辑重新发送。')) {
      onRecall(messageId);
    }
    setShowActions(null);
  }, [onRecall]);

  // 开始编辑
  const handleStartEdit = useCallback((message: MessageWithStatus) => {
    // 使用撤回前的原始内容（如果存在）
    const contentToEdit = message.originalContent || message.content;
    onMessageInputChange(contentToEdit);
    setPendingAttachments(message.attachments || []);
    // 通知父组件进入编辑状态
    onStartEdit(message.id, contentToEdit, message.attachments || []);
    setShowActions(null);
  }, [onMessageInputChange, onStartEdit]);

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
            <p className="text-xs text-muted-foreground/70 mt-1">支持粘贴图片和发送附件，3分钟内可撤回</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = message.senderId === currentUserId;
            const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
            const isRecalled = message.isRecalled;
            const canRecall = message.canRecall && isMe && !isRecalled;

            return (
              <div
                key={message.id || message.tempId}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* 头像 */}
                  {showAvatar ? (
                    <img
                      src={isMe ? (message.senderAvatarUrl || '/default-avatar.png') : (message.senderAvatarUrl || '/default-avatar.png')}
                      alt={message.senderDisplayName}
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
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                <div className="flex flex-col">
                                  <span className="text-sm text-foreground truncate max-w-[120px]">{att.fileName}</span>
                                  {att.fileSize > 0 && (
                                    <span className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</span>
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
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {showActions === message.id && (
                            <div className="absolute bottom-full right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-10 min-w-[80px]">
                              {canRecall && (
                                <button
                                  onClick={() => handleRecall(message.id)}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-primary">编辑消息</span>
          </div>
          <button
            onClick={onCancelEdit}
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-sm">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="truncate max-w-[100px]">{att.fileName}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
            onChange={(e) => onMessageInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={editingMessage ? "编辑消息..." : "输入消息...（支持粘贴图片）"}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {editingMessage ? '按 Enter 保存编辑，Shift + Enter 换行' : '按 Enter 发送，Shift + Enter 换行，支持粘贴图片，3分钟内可撤回'}
        </p>
      </div>
    </div>
  );
}
