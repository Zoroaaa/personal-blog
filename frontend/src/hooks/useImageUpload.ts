/**
 * 文章编辑中的图片上传逻辑
 *
 * 功能：
 * - 封面上传
 * - 内容区粘贴图片并按光标位置插入 Markdown
 *
 * @author 博客系统
 */

import { useState } from 'react';
import type { RefObject } from 'react';
import { api } from '../utils/api';

interface UseImageUploadOptions {
  content: string;
  setContent: (value: string) => void;
  setCoverImage: (value: string) => void;
  setError: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
}

export function useImageUpload({
  content,
  setContent,
  setCoverImage,
  setError,
  textareaRef,
}: UseImageUploadOptions) {
  const [uploading, setUploading] = useState(false);

  // 处理封面图片上传
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setUploading(true);
        const response = await api.uploadImage(file);
        if (response.success && response.data) {
          setCoverImage(response.data.url);
          alert('图片上传成功: ' + response.data.url);
        }
      } catch (error) {
        setError('上传失败: ' + (error instanceof Error ? error.message : '未知错误'));
      } finally {
        setUploading(false);
      }
    }
  };

  // 处理内容区域粘贴图片
  const handleContentPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === 0) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          try {
            setUploading(true);
            const response = await api.uploadImage(file);
            if (response.success && response.data) {
              const imageUrl = response.data.url;
              const markdownImage = `![图片](${imageUrl})`;

              // 在光标位置插入图片，而不是追加到末尾
              const cursorPosition = textarea.selectionStart;
              const selectionEnd = textarea.selectionEnd;
              const beforeCursor = content.substring(0, cursorPosition);
              const afterCursor = content.substring(selectionEnd);
              const newContent = beforeCursor + markdownImage + afterCursor;
              setContent(newContent);

              // 恢复光标位置到插入的图片之后
              setTimeout(() => {
                textarea.focus();
                const newPosition = cursorPosition + markdownImage.length;
                textarea.setSelectionRange(newPosition, newPosition);
              }, 0);

              alert('图片粘贴成功');
            }
          } catch (error) {
            setError('图片粘贴失败: ' + (error instanceof Error ? error.message : '未知错误'));
          } finally {
            setUploading(false);
          }
        }
      }
    }
  };

  return { uploading, handleCoverImageUpload, handleContentPaste };
}