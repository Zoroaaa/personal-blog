/**
 * 内容统计 Hook
 * 功能：
 * - 实时统计中文字符数
 * - 实时统计英文单词数
 * - 计算总字符数
 * - 计算行数
 * - 估算阅读时间
 * 
 * @version 1.0.0
 * @author 博客系统
 * @created 2024-01-01
 */

import { useMemo } from 'react';

export interface ContentStats {
  chineseChars: number;
  englishWords: number;
  totalChars: number;
  lines: number;
  readingTime: number;
}

export function useContentStats(content: string): ContentStats {
  return useMemo(() => {
    // 统计中文字符（包括中文标点）
    const chineseChars = (content.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g) || []).length;
    
    // 统计英文单词
    const englishWords = content
      .split(/\s+/)
      .filter(word => /^[a-zA-Z]+$/.test(word))
      .length;
    
    // 总字符数
    const totalChars = content.length;
    
    // 行数
    const lines = content.split('\n').length;
    
    // 估算阅读时间（中文按每分钟400字，英文按每分钟200词）
    const readingTime = Math.ceil((chineseChars + englishWords * 2) / 400);
    
    return {
      chineseChars,
      englishWords,
      totalChars,
      lines,
      readingTime: Math.max(1, readingTime) // 至少1分钟
    };
  }, [content]);
}
