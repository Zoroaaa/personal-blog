/**
 * 文档导入逻辑（拖拽 / 选择文件）
 *
 * 功能：
 * - 拖拽状态管理与拖拽事件
 * - 解析 txt/md/docx 文档
 * - 上传文档中的图片并替换占位符
 * - 自动填充标题与摘要
 *
 * @author 博客系统
 */

import { useState, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { parseDocument, isSupportedDocument } from '../utils/documentParser';

interface UseDocumentImportOptions {
  title: string;
  setTitle: (value: string) => void;
  setContent: (value: string) => void;
  summary: string;
  setSummary: (value: string) => void;
  setError: (value: string) => void;
}

/**
 * 替换内容中的图片占位符为实际的 Markdown 图片
 * 保持图片在原文档中的位置
 */
function replaceImagePlaceholders(content: string, images: Array<{ id: string; url: string; index: number }>): string {
  let result = content;

  // 按索引从大到小排序，避免替换时影响位置
  const sortedImages = [...images].sort((a, b) => b.index - a.index);

  for (const img of sortedImages) {
    // 查找图片占位符 [图片X] 或 [图片:...]
    const placeholderPattern = new RegExp(`\\[图片${img.index + 1}\\]|\\[图片:${img.id}\\]|\\[图片\\]`, 'g');
    result = result.replace(placeholderPattern, `![图片${img.index + 1}](${img.url})`);
  }

  // 如果没有找到占位符，在末尾添加剩余图片
  const remainingImages = images.filter(img => !result.includes(img.url));
  if (remainingImages.length > 0) {
    const additionalMarkdown = remainingImages
      .sort((a, b) => a.index - b.index)
      .map(img => `![图片${img.index + 1}](${img.url})`)
      .join('\n\n');
    result = result + '\n\n' + additionalMarkdown;
  }

  return result;
}

export function useDocumentImport({
  title,
  setTitle,
  setContent,
  summary,
  setSummary,
  setError,
}: UseDocumentImportOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 拖拽计数器，解决拖拽子元素时频繁触发 dragleave 的问题
  const dragCounterRef = useRef(0);

  // 导入单个文件
  const importFile = useCallback(async (file: File) => {
    if (!isSupportedDocument(file)) {
      setError(`不支持的文件类型: ${file.name}。请拖拽 .txt, .md, .markdown 或 .docx 文件`);
      return;
    }

    try {
      setImporting(true);
      setImportProgress('正在解析文档...');

      const parsed = await parseDocument(file);

      if (parsed.title && title && title !== parsed.title) {
        const shouldUpdateTitle = window.confirm(`检测到文档标题 "${parsed.title}"，是否更新标题？`);
        if (shouldUpdateTitle) {
          setTitle(parsed.title);
        }
      } else if (parsed.title && !title) {
        setTitle(parsed.title);
      }

      let finalContent = parsed.content;

      // 处理图片上传和替换
      if (parsed.images.length > 0) {
        setImportProgress(`正在上传 ${parsed.images.length} 张图片...`);
        const uploadedImages: Array<{ id: string; url: string; index: number }> = [];

        for (let i = 0; i < parsed.images.length; i++) {
          const img = parsed.images[i];
          setImportProgress(`正在上传图片 ${i + 1}/${parsed.images.length}...`);

          try {
            const imageFile = new File([img.blob], img.filename, { type: img.blob.type || 'image/png' });
            const response = await api.uploadImage(imageFile);

            if (response.success && response.data) {
              uploadedImages.push({
                id: img.id,
                url: response.data.url,
                index: img.index ?? i,
              });
            }
          } catch (err) {
            console.warn(`图片 ${img.filename} 上传失败:`, err);
          }
        }

        // 按原文档中的顺序替换图片占位符
        if (uploadedImages.length > 0) {
          // 按索引排序
          uploadedImages.sort((a, b) => a.index - b.index);

          // 替换内容中的图片占位符
          finalContent = replaceImagePlaceholders(finalContent, uploadedImages);
        }

        alert(`成功导入文档，并上传 ${uploadedImages.length}/${parsed.images.length} 张图片`);
      } else {
        alert('文档导入成功！');
      }

      setContent(finalContent);

      if (!summary) {
        const autoSummary = finalContent
          .replace(/[#*_`\[\]!]/g, '')
          .slice(0, 150)
          .trim();
        setSummary(autoSummary + (autoSummary.length >= 150 ? '...' : ''));
      }
    } catch (err) {
      setError('文档导入失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setImporting(false);
      setImportProgress('');
    }
  }, [title, summary, setTitle, setContent, setSummary, setError]);

  const handleFileSelect = useCallback((file: File) => {
    void importFile(file);
  }, [importFile]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    await importFile(files[0]);
  }, [importFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 设置拖拽效果
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  return {
    isDragging,
    importing,
    importProgress,
    dropZoneRef,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  };
}