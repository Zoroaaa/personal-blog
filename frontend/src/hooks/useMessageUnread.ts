import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export function useMessageUnread() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    setLoading(true);
    try {
      const response = await api.get('/messages/unread/count');
      setUnreadCount(response.data?.count || 0);
    } catch (error) {
      console.error('Failed to fetch message unread count:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return { unreadCount, loading, refresh: fetchUnreadCount };
}
