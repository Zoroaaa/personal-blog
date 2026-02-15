/**
 * 私信会话详情页
 *
 * 功能：
 * - 显示与某用户的所有消息往来
 * - 发送新消息（文本、图片、附件）
 * - 消息撤回功能（3分钟内）
 * - 图片粘贴发送
 * - 附件上传发送
 * - 表情选择
 * - 消息列表滚动加载
 * - 自动标记已读
 * - 图片/附件下载
 *
 * @author 博客系统
 * @version 2.0.0
 * @created 2026-02-14
 * @updated 2026-02-15
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/Toast';
import { useMessageUnread } from '../hooks/useMessageUnread';

type MessageType = 'text' | 'image' | 'attachment' | 'mixed';

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
  isRecalled: boolean;
  recalledAt?: string;
  messageType: MessageType;
  attachmentUrl?: string;
  attachmentFilename?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
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

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
  '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
  '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '🤯',
  '😱', '🥵', '🥶', '😰', '😥', '😢', '😭', '😤', '😡', '🤬',
  '👍', '👎', '👏', '🙌', '🤝', '💪', '🎉', '🔥', '❤️', '💔',
  '✨', '⭐', '🌟', '💯', '✅', '❌', '❓', '💡', '📌', '📝',
  '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
  '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎',
  '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
  '🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🌸', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵',
  '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒',
];

const RECALL_TIME_LIMIT_MS = 3 * 60 * 1000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1020;

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const { refresh: refreshUnreadCount } = useMessageUnread();

  const [messages, setMessages] = useState<Message[]>([]);
  const [threadInfo, setThreadInfo] = useState<ThreadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showRecallMenu, setShowRecallMenu] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    type: 'image' | 'file';
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

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

      const response = await api.getThreadMessages(threadId!, pageNum, 20);

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
            
            markThreadAsRead();
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

  const markThreadAsRead = async () => {
    if (!threadId) return;
    
    try {
      await api.markThreadAsRead(threadId);
      refreshUnreadCount();
    } catch (error) {
      console.error('Failed to mark thread as read:', error);
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

  const canRecall = useCallback((message: Message) => {
    if (message.senderId !== user?.id) return false;
    if (message.isRecalled) return false;
    
    if (!message.createdAt) return true;
    
    try {
      let createdAt: Date;
      
      if (typeof message.createdAt === 'string' && message.createdAt.includes(' ') && !message.createdAt.includes('T')) {
        const utcTimeStr = message.createdAt.replace(' ', 'T') + 'Z';
        createdAt = new Date(utcTimeStr);
      } else {
        createdAt = new Date(message.createdAt);
      }
      
      if (isNaN(createdAt.getTime())) return true;
      
      const now = new Date();
      const timeDiff = now.getTime() - createdAt.getTime();
      
      return timeDiff <= RECALL_TIME_LIMIT_MS;
    } catch (error) {
      return true;
    }
  }, [user?.id]);

  const handleRecallMessage = async (messageId: number) => {
    try {
      const response = await api.recallMessage(messageId);
      if (response.success) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isRecalled: true, recalledAt: new Date().toISOString() }
            : msg
        ));
        showSuccess('消息已撤回');
        setShowRecallMenu(null);
      } else {
        showError(response.error || '撤回失败');
      }
    } catch (error) {
      console.error('Failed to recall message:', error);
      showError('撤回消息失败');
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setNewMessage(message.content);
    setShowRecallMenu(null);
    
    if (message.attachmentUrl) {
      const isImageType = message.messageType === 'image' || 
                          message.messageType === 'mixed' && message.attachmentMimeType?.startsWith('image/');
      setAttachmentPreview({
        url: message.attachmentUrl,
        filename: message.attachmentFilename || 'file',
        size: message.attachmentSize || 0,
        mimeType: message.attachmentMimeType || '',
        type: isImageType ? 'image' : 'file',
      });
    } else {
      setAttachmentPreview(null);
    }
    
    textareaRef.current?.focus();
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (file.size > MAX_IMAGE_SIZE) {
      showError('图片大小不能超过 5MB');
      return null;
    }

    try {
      const response = await api.uploadImage(file);
      if (response.success && response.data) {
        return response.data.url;
      }
      throw new Error(response.error || '上传失败');
    } catch (error) {
      showError(error instanceof Error ? error.message : '图片上传失败');
      return null;
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      showError('附件大小不能超过 10MB');
      return;
    }

    try {
      setUploadingAttachment(true);
      const response = await api.uploadFile(file);
      if (response.success && response.data) {
        const isImage = file.type.startsWith('image/');
        setAttachmentPreview({
          url: response.data.url,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          type: isImage ? 'image' : 'file',
        });
      } else {
        throw new Error(response.error || '上传失败');
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : '附件上传失败');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === 0) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const url = await handleImageUpload(file);
          if (url) {
            setAttachmentPreview({
              url,
              filename: 'pasted-image.png',
              size: file.size,
              mimeType: file.type,
              type: 'image',
            });
          }
        }
        break;
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAttachmentUpload(file);
    }
    e.target.value = '';
  };

  const handleSendMessage = async () => {
    if (!threadInfo || sending) return;
    
    const hasContent = newMessage.trim() || attachmentPreview;
    if (!hasContent) return;

    setSending(true);
    try {
      let messageType: MessageType = 'text';
      if (attachmentPreview) {
        if (newMessage.trim()) {
          messageType = 'mixed';
        } else if (attachmentPreview.type === 'image') {
          messageType = 'image';
        } else {
          messageType = 'attachment';
        }
      }

      if (editingMessage) {
        const response = await api.resendMessage(editingMessage.id, {
          content: newMessage.trim() || (attachmentPreview ? `[${attachmentPreview.type === 'image' ? '图片' : '附件'}]` : ''),
          messageType,
          attachmentUrl: attachmentPreview?.url,
          attachmentFilename: attachmentPreview?.filename,
          attachmentSize: attachmentPreview?.size,
          attachmentMimeType: attachmentPreview?.mimeType,
        });

        if (response.success && response.data) {
          const messageWithTime = {
            ...response.data,
            createdAt: response.data.createdAt || new Date().toISOString(),
            isRecalled: response.data.isRecalled ?? false,
            isRead: response.data.isRead ?? false,
          };
          
          setMessages(prev => prev.map(msg => 
            msg.id === editingMessage.id ? messageWithTime : msg
          ));
          setNewMessage('');
          setAttachmentPreview(null);
          setEditingMessage(null);
          scrollToBottom();
          showSuccess('消息已重新发送');
        }
      } else {
        const response = await api.sendMessage({
          recipientId: threadInfo.otherUserId,
          content: newMessage.trim() || (attachmentPreview ? `[${attachmentPreview.type === 'image' ? '图片' : '附件'}]` : ''),
          messageType,
          attachmentUrl: attachmentPreview?.url,
          attachmentFilename: attachmentPreview?.filename,
          attachmentSize: attachmentPreview?.size,
          attachmentMimeType: attachmentPreview?.mimeType,
        });

        if (response.success && response.data) {
          const messageWithTime = {
            ...response.data,
            createdAt: response.data.createdAt || new Date().toISOString(),
            isRecalled: response.data.isRecalled ?? false,
            isRead: response.data.isRead ?? false,
          };
          
          setMessages(prev => [...prev, messageWithTime]);
          setNewMessage('');
          setAttachmentPreview(null);
          setEditingMessage(null);
          scrollToBottom();
          showSuccess('消息发送成功');
        }
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

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = newMessage.substring(0, start) + emoji + newMessage.substring(end);
      setNewMessage(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      setNewMessage(prev => prev + emoji);
    }
    setShowEmojis(false);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      });
      
      if (!response.ok) {
        throw new Error('下载失败');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      showError('文件下载失败，请重试');
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.isRecalled) {
      return (
        <p className="text-gray-400 italic text-sm">此消息已撤回</p>
      );
    }

    const isImageAttachment = message.attachmentUrl && 
      (message.messageType === 'image' || 
       (message.attachmentMimeType?.startsWith('image/')));

    return (
      <>
        {message.content && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        
        {isImageAttachment && message.attachmentUrl && (
          <div className="mt-2">
            <img 
              src={message.attachmentUrl} 
              alt="图片消息" 
              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.attachmentUrl, '_blank')}
            />
            <button
              onClick={() => handleDownload(message.attachmentUrl!, message.attachmentFilename || 'image.jpg')}
              className="mt-2 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载图片
            </button>
          </div>
        )}
        
        {!isImageAttachment && (message.messageType === 'attachment' || message.messageType === 'mixed') && message.attachmentUrl && (
          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{message.attachmentFilename}</p>
                <p className="text-xs text-gray-500">{formatFileSize(message.attachmentSize || 0)}</p>
              </div>
              <button
                onClick={() => handleDownload(message.attachmentUrl!, message.attachmentFilename || 'file')}
                className="flex-shrink-0 p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                title="下载文件"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </>
    );
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
              const canRecallThis = canRecall(message);
              
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
                    <div className="relative group">
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        }`}
                      >
                        {renderMessageContent(message)}
                      </div>
                      <div className={`flex items-center gap-2 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(message.createdAt)}
                        </p>
                        {isMine && message.isRead && !message.isRecalled && (
                          <span className="text-xs text-blue-500">已读</span>
                        )}
                        {isMine && message.isRecalled && (
                          <button
                            onClick={() => handleEditMessage(message)}
                            className="text-xs text-blue-500 hover:text-blue-600"
                          >
                            编辑重新发送
                          </button>
                        )}
                        {canRecallThis && (
                          <div className="relative">
                            <button
                              onClick={() => setShowRecallMenu(showRecallMenu === message.id ? null : message.id)}
                              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              更多
                            </button>
                            {showRecallMenu === message.id && (
                              <div className="absolute bottom-full right-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[100px] z-10">
                                <button
                                  onClick={() => handleRecallMessage(message.id)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  撤回
                                </button>
                              </div>
                            )}
                          </div>
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

        {attachmentPreview && (
          <div className="px-4 py-2 border-t border-border bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              {attachmentPreview.type === 'image' ? (
                <img src={attachmentPreview.url} alt="预览" className="w-16 h-16 object-cover rounded" />
              ) : (
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachmentPreview.filename}</p>
                <p className="text-xs text-gray-500">{formatFileSize(attachmentPreview.size)}</p>
              </div>
              <button
                onClick={() => setAttachmentPreview(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border">
          {editingMessage && (
            <div className="mb-2 text-sm text-blue-600 flex items-center gap-2">
              <span>正在编辑已撤回的消息，发送后将重新发送</span>
              <button
                onClick={() => {
                  setEditingMessage(null);
                  setNewMessage('');
                  setAttachmentPreview(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                取消
              </button>
            </div>
          )}
          
          <div className="flex gap-2 mb-2">
            <button
              ref={emojiButtonRef}
              onClick={() => setShowEmojis(!showEmojis)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="表情"
            >
              <span className="text-xl">😀</span>
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAttachment}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="上传附件"
            >
              {uploadingAttachment ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="输入消息... 可直接粘贴图片"
              rows={2}
              maxLength={2000}
              className="flex-1 px-4 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !attachmentPreview) || sending}
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

      {showEmojis && createPortal(
        <div 
          className="fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-[9999] p-2 w-72"
          style={{
            top: emojiButtonRef.current 
              ? emojiButtonRef.current.getBoundingClientRect().bottom + 8 
              : 0,
            left: emojiButtonRef.current 
              ? emojiButtonRef.current.getBoundingClientRect().left 
              : 0,
          }}
        >
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {EMOJI_LIST.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
