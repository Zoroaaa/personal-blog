import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

interface MessageThread {
  threadId: string;
  otherUserId: number;
  otherUsername: string;
  otherName: string;
  otherAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  totalMessages: number;
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      const response = await api.get('/api/messages/threads');
      setThreads(response.data.threads);
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">私信</h1>
      
      {threads.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          暂无私信会话
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <div
              key={thread.threadId}
              onClick={() => navigate(`/messages/${thread.threadId}`)}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <img
                  src={thread.otherAvatar || '/default-avatar.png'}
                  alt={thread.otherName}
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">
                      {thread.otherName}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {new Date(thread.lastMessageAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 truncate mt-1">
                    {thread.lastMessage}
                  </p>
                  {thread.unreadCount > 0 && (
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                      {thread.unreadCount} 条未读
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
