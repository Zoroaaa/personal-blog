/**
 * 安全的日期格式化函数
 *
 * 处理 null/undefined 日期与无效日期（Invalid time value），
 * 供文章详情页各子组件复用。
 */

import { format } from 'date-fns';

export function formatDate(date: any, formatStr: string = 'yyyy-MM-dd HH:mm'): string {
  if (!date) return '未知时间';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // 检查日期是否有效
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return '未知时间';
    }

    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Date format error:', error, 'Date:', date);
    return '未知时间';
  }
}