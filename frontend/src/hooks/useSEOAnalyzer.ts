/**
 * SEO 分析 Hook
 * 功能：
 * - 分析标题长度（建议50-60字符）
 * - 分析摘要长度（建议150-160字符）
 * - 检查图片 alt 文本
 * - 检查关键词密度
 * - 提供优化建议
 */

import { useMemo } from 'react';

export interface SEOCheck {
  type: 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
}

export interface SEOAnalysis {
  score: number;
  checks: SEOCheck[];
  titleLength: number;
  summaryLength: number;
  imageCount: number;
  imagesWithoutAlt: number;
  keywordDensity: Map<string, number>;
}

export function useSEOAnalyzer(
  title: string,
  summary: string,
  content: string
): SEOAnalysis {
  return useMemo(() => {
    const checks: SEOCheck[] = [];
    let score = 100;

    // 1. 检查标题长度
    const titleLength = title.length;
    if (titleLength === 0) {
      checks.push({
        type: 'error',
        message: '标题不能为空',
        detail: '请添加文章标题'
      });
      score -= 30;
    } else if (titleLength < 10) {
      checks.push({
        type: 'warning',
        message: '标题过短',
        detail: `当前 ${titleLength} 字符，建议至少 10 字符`
      });
      score -= 10;
    } else if (titleLength > 60) {
      checks.push({
        type: 'warning',
        message: '标题过长',
        detail: `当前 ${titleLength} 字符，建议控制在 60 字符以内`
      });
      score -= 5;
    } else {
      checks.push({
        type: 'success',
        message: '标题长度合适',
        detail: `${titleLength} 字符`
      });
    }

    // 2. 检查摘要长度
    const summaryLength = summary.length;
    if (summaryLength === 0) {
      checks.push({
        type: 'warning',
        message: '摘要为空',
        detail: '建议添加摘要以提高 SEO 效果'
      });
      score -= 15;
    } else if (summaryLength < 50) {
      checks.push({
        type: 'warning',
        message: '摘要过短',
        detail: `当前 ${summaryLength} 字符，建议 150-160 字符`
      });
      score -= 10;
    } else if (summaryLength > 160) {
      checks.push({
        type: 'warning',
        message: '摘要过长',
        detail: `当前 ${summaryLength} 字符，建议控制在 160 字符以内`
      });
      score -= 5;
    } else {
      checks.push({
        type: 'success',
        message: '摘要长度合适',
        detail: `${summaryLength} 字符`
      });
    }

    // 3. 检查内容长度
    const contentLength = content.length;
    if (contentLength < 300) {
      checks.push({
        type: 'warning',
        message: '内容过短',
        detail: `当前 ${contentLength} 字符，建议至少 300 字符以获得更好的 SEO 效果`
      });
      score -= 10;
    } else {
      checks.push({
        type: 'success',
        message: '内容长度合适',
        detail: `${contentLength} 字符`
      });
    }

    // 4. 检查图片 alt 文本
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images: { alt: string; url: string }[] = [];
    let match;
    while ((match = imageRegex.exec(content)) !== null) {
      images.push({ alt: match[1], url: match[2] });
    }
    const imagesWithoutAlt = images.filter(img => !img.alt.trim()).length;
    
    if (images.length > 0 && imagesWithoutAlt > 0) {
      checks.push({
        type: 'warning',
        message: '部分图片缺少 alt 文本',
        detail: `${imagesWithoutAlt}/${images.length} 张图片没有描述`
      });
      score -= 5;
    } else if (images.length > 0) {
      checks.push({
        type: 'success',
        message: '所有图片都有 alt 文本',
        detail: `${images.length} 张图片`
      });
    }

    // 5. 检查标题层级
    const h1Count = (content.match(/^# /gm) || []).length;
    const h2Count = (content.match(/^## /gm) || []).length;
    const h3Count = (content.match(/^### /gm) || []).length;
    
    if (h1Count === 0) {
      checks.push({
        type: 'warning',
        message: '缺少一级标题',
        detail: '建议在内容中添加 # 一级标题'
      });
      score -= 5;
    } else if (h1Count > 1) {
      checks.push({
        type: 'warning',
        message: '多个一级标题',
        detail: '建议只使用一个 # 一级标题'
      });
      score -= 5;
    } else {
      checks.push({
        type: 'success',
        message: '标题层级正确',
        detail: `${h1Count} 个 H1, ${h2Count} 个 H2, ${h3Count} 个 H3`
      });
    }

    // 6. 检查链接
    const internalLinks = (content.match(/\[([^\]]+)\]\((?!http|\/\/)([^)]+)\)/g) || []).length;
    const externalLinks = (content.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g) || []).length;
    
    if (internalLinks === 0 && externalLinks === 0) {
      checks.push({
        type: 'warning',
        message: '缺少链接',
        detail: '建议添加相关链接以提高内容质量'
      });
      score -= 5;
    } else {
      checks.push({
        type: 'success',
        message: '链接数量合适',
        detail: `${internalLinks} 个内部链接, ${externalLinks} 个外部链接`
      });
    }

    // 7. 关键词密度分析
    const keywordDensity = new Map<string, number>();
    const words = content.toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2);
    
    const wordCount = words.length;
    const wordFreq = new Map<string, number>();
    
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    
    // 找出高频词（排除常见停用词）
    const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '这些', '那些', '这个', '那个', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'and', 'but', 'or', 'yet', 'so', 'if', 'because', 'although', 'though', 'while', 'where', 'when', 'that', 'which', 'who', 'whom', 'whose', 'what', 'whatever', 'whoever', 'whomever', 'whichever', 'this', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing']);
    
    wordFreq.forEach((count, word) => {
      if (!stopWords.has(word) && count >= 3) {
        const density = (count / wordCount) * 100;
        keywordDensity.set(word, Math.round(density * 100) / 100);
      }
    });

    // 检查关键词密度是否过高
    let hasHighDensity = false;
    keywordDensity.forEach((density) => {
      if (density > 3) {
        hasHighDensity = true;
      }
    });

    if (hasHighDensity) {
      checks.push({
        type: 'warning',
        message: '部分关键词密度过高',
        detail: '建议降低关键词密度，避免被搜索引擎判定为关键词堆砌'
      });
      score -= 5;
    }

    return {
      score: Math.max(0, score),
      checks,
      titleLength,
      summaryLength,
      imageCount: images.length,
      imagesWithoutAlt,
      keywordDensity
    };
  }, [title, summary, content]);
}
