import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const MESSAGE_UNREAD_STORAGE_KEY = 'message_unread_count';

export function useMessageUnread() {
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const stored = localStorage.getItem(MESSAGE_UNREAD_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/messages/unread/count');
      const count = response.data?.count || 0;
      setUnreadCount(count);
      localStorage.setItem(MESSAGE_UNREAD_STORAGE_KEY, String(count));
      
      window.dispatchEvent(new CustomEvent('messageUnreadUpdated', { detail: { count } }));
    } catch (error) {
      console.error('Failed to fetch message unread count:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const decrement = useCallback((amount: number = 1) => {
    setUnreadCount(prev => {
      const newCount = Math.max(0, prev - amount);
      localStorage.setItem(MESSAGE_UNREAD_STORAGE_KEY, String(newCount));
      return newCount;
    });
  }, []);

  const clear = useCallback(() => {
    setUnreadCount(0);
    localStorage.setItem(MESSAGE_UNREAD_STORAGE_KEY, '0');
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    
    const interval = setInterval(fetchUnreadCount, 30000);
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MESSAGE_UNREAD_STORAGE_KEY && e.newValue !== null) {
        setUnreadCount(parseInt(e.newValue, 10));
      }
    };
    
    const handleCustomEvent = (e: CustomEvent<{ count: number }>) => {
      setUnreadCount(e.detail.count);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('messageUnreadUpdated', handleCustomEvent as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('messageUnreadUpdated', handleCustomEvent as EventListener);
    };
  }, [fetchUnreadCount]);

  return { 
    unreadCount, 
    loading, 
    refresh, 
    decrement, 
    clear,
    setUnreadCount 
  };
}
