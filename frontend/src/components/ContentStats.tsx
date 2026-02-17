/**
 * 内容统计信息组件
 * 
 * 功能：
 * - 显示中文字符数
 * - 显示英文单词数
 * - 显示总字符数
 * - 显示行数
 * - 显示预计阅读时间
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useContentStats } from '../hooks/useContentStats';

interface ContentStatsProps {
  content: string;
  className?: string;
}

export function ContentStats({ content, className = '' }: ContentStatsProps) {
  const stats = useContentStats(content);

  return (
    <div className={`flex flex-wrap items-center gap-4 text-xs text-muted-foreground ${className}`}>
      <div className="flex items-center gap-1" title="中文字符数">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        <span>{stats.chineseChars} 字</span>
      </div>
      
      <div className="flex items-center gap-1" title="英文单词数">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        <span>{stats.englishWords} 词</span>
      </div>
      
      <div className="flex items-center gap-1" title="总字符数">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>{stats.totalChars} 字符</span>
      </div>
      
      <div className="flex items-center gap-1" title="行数">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>{stats.lines} 行</span>
      </div>
      
      <div className="flex items-center gap-1" title="预计阅读时间">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{stats.readingTime} 分钟</span>
      </div>
    </div>
  );
}
