import React, { useState } from 'react';
import { api } from '../utils/api';

interface Props {
  recipientId: number;
  recipientName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ComposeMessageModal({
  recipientId,
  recipientName,
  onClose,
  onSuccess,
}: Props) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      alert('请输入消息内容');
      return;
    }

    setSending(true);
    try {
      await api.post('/messages', {
        recipientId,
        subject: subject.trim() || undefined,
        content: content.trim(),
      });
      
      alert('私信发送成功！');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">
          发送私信给 {recipientName}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              主题（可选）
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="消息主题"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={6}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="输入消息内容..."
              required
            />
            <div className="text-sm text-gray-500 text-right mt-1">
              {content.length}/2000
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={sending}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              disabled={sending}
            >
              {sending ? '发送中...' : '发送'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
