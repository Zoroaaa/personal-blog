/**
 * 增强型文章编辑组件
 * 功能:
 * - 链接自动识别与编辑
 * - 实时 Markdown 预览
 * - 自动保存
 * - 键盘快捷键
 * - 分屏编辑模式
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { parseDocument, isSupportedDocument } from '../utils/documentParser';
import { transformCategoryList, transformTagList, transformPost } from '../utils/apiTransformer';
import { 
  detectUrls, 
  insertOrUpdateMarkdownLink,
  extractLinkFromMarkdown,
  isValidUrl 
} from '../utils/linkDetector';
import { useAutoSave, useKeyboardShortcuts } from '../hooks/useAutoSave';
import { LinkEditor } from './LinkEditor';
import { SplitPreview } from './MarkdownPreview';
import { ContentStats } from './ContentStats';
import { AutoSaveStatus } from './AutoSaveStatus';
import { SEOAssistant } from './SEOAssistant';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  color?: string;
  postCount?: number;
}

interface PostEditorProps {
  postId?: number;
  onSave?: () => void;
  onCancel?: () => void;
}

interface PostData {
  title: string;
  content: string;
  summary: string;
  coverImage: string;
  categoryId: number | null;
  tags: number[];
  status: 'draft' | 'published';
}

export function EnhancedPostEditor({ postId, onSave, onCancel }: PostEditorProps) {
  // 文章基本信息
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  
  // 分类和标签
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  
  // 标签搜索
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // 编辑器状态
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 链接编辑器状态
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkEditorUrl, setLinkEditorUrl] = useState('');
  const [linkEditorText, setLinkEditorText] = useState('');
  const [linkEditorSelection, setLinkEditorSelection] = useState({ start: 0, end: 0 });
  
  // 检测到的链接
  const [detectedLinks, setDetectedLinks] = useState<string[]>([]);
  
  // 自动保存
  const postData: PostData = {
    title, content, summary, coverImage, 
    categoryId: selectedCategoryId, 
    tags: selectedTagIds, 
    status 
  };
  
  const { lastSaved, isSaving, hasDraft, saveNow, restoreFromLocalStorage, clearLocalStorage } = useAutoSave({
    key: postId ? `post_${postId}` : 'new_post',
    data: postData,
    interval: 30000,
    enabled: true,
  });

  // 键盘快捷键
  useKeyboardShortcuts([
    { key: 's', ctrl: true, handler: () => { saveNow(); handleSubmit(new Event('submit') as any); }, description: '保存文章' },
    { key: 'p', ctrl: true, handler: () => setActiveTab(prev => prev === 'edit' ? 'split' : 'edit'), description: '切换预览' },
    { key: 'k', ctrl: true, handler: openLinkEditor, description: '插入链接' },
    { key: 'f11', ctrl: false, handler: () => setIsFullscreen(prev => !prev), description: '全屏模式' },
    { key: 'Escape', ctrl: false, handler: () => setIsFullscreen(false), description: '退出全屏' },
  ]);

  // 加载分类和标签
  useEffect(() => {
    loadCategories();
    loadTags();
    checkDraft();
  }, []);
  
  // 如果是编辑模式,加载文章数据
  useEffect(() => {
    if (postId) {
      loadPost(postId);
    }
  }, [postId]);
  
  // 检测内容中的链接
  useEffect(() => {
    const urls = detectUrls(content);
    setDetectedLinks(urls);
  }, [content]);

  // 检查是否有草稿
  const checkDraft = () => {
    const draft = restoreFromLocalStorage();
    if (draft && !postId) {
      const shouldRestore = window.confirm('检测到未保存的草稿，是否恢复？');
      if (shouldRestore) {
        setTitle(draft.title || '');
        setContent(draft.content || '');
        setSummary(draft.summary || '');
        setCoverImage(draft.coverImage || '');
        setStatus(draft.status || 'draft');
        setSelectedCategoryId(draft.categoryId || null);
        setSelectedTagIds(draft.tags || []);
      } else {
        clearLocalStorage();
      }
    }
  };
  
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await api.getCategories();
      if (response.success && response.data) {
        setCategories(transformCategoryList(response.data.categories || []));
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      setTagsLoading(true);
      const response = await api.getTags();
      if (response.success && response.data) {
        setTags(transformTagList(response.data.tags || []));
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setTagsLoading(false);
    }
  };
  
  const loadPost = async (id: number) => {
    try {
      setLoading(true);
      const response = await api.getPostById(id);
      if (response.success && response.data) {
        const post = transformPost(response.data);
        setTitle(post.title);
        setContent(post.content);
        setSummary(post.summary || '');
        setCoverImage(post.coverImage || '');
        setStatus(post.status as 'draft' | 'published');
        setSelectedCategoryId(post.categoryId || null);
        setSelectedTagIds(post.tags?.map((t: any) => t.id) || []);
      }
    } catch (err: any) {
      setError(err.message || '加载文章失败');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!title.trim()) {
      setError('标题不能为空');
      return;
    }
    
    if (!content.trim()) {
      setError('内容不能为空');
      return;
    }
    
    try {
      setLoading(true);
      
      const postData: any = {
        title,
        content,
        summary,
        coverImage,
        categoryId: selectedCategoryId ?? undefined,
        tags: selectedTagIds,
        status
      };
      
      let response;
      if (postId) {
        response = await api.updatePost(postId, postData);
      } else {
        response = await api.createPost(postData);
      }
      
      if (response.success) {
        clearLocalStorage();
        alert(postId ? '文章更新成功!' : '文章创建成功!');
        if (onSave) onSave();
      } else {
        throw new Error(response.error || '操作失败');
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };
  
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
              setContent(prev => prev + markdownImage);
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

  // 处理拖拽事件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];

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
      if (parsed.images.length > 0) {
        setImportProgress(`正在上传 ${parsed.images.length} 张图片...`);
        const uploadedImages: Array<{ id: string; url: string }> = [];

        for (let i = 0; i < parsed.images.length; i++) {
          const img = parsed.images[i];
          setImportProgress(`正在上传图片 ${i + 1}/${parsed.images.length}...`);

          try {
            const imageFile = new File([img.blob], img.filename, { type: img.blob.type || 'image/png' });
            const response = await api.uploadImage(imageFile);

            if (response.success && response.data) {
              uploadedImages.push({
                id: img.id,
                url: response.data.url
              });
            }
          } catch (err) {
            console.warn(`图片 ${img.filename} 上传失败:`, err);
          }
        }

        if (uploadedImages.length > 0) {
          const imageMarkdown = uploadedImages
            .map(img => `![图片](${img.url})`)
            .join('\n\n');
          finalContent = finalContent + '\n\n' + imageMarkdown;
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
  }, [title, summary]);

  // 切换标签选择
  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };
  
  // 过滤标签
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase())
  );
  
  // 获取选中的标签对象
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  // 打开链接编辑器
  function openLinkEditor() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    // 检查是否选中了一个链接
    const existingLink = extractLinkFromMarkdown(content, start);
    
    if (existingLink) {
      setLinkEditorUrl(existingLink.url);
      setLinkEditorText(existingLink.text);
      setLinkEditorSelection({ start: existingLink.start, end: existingLink.end });
    } else if (isValidUrl(selectedText)) {
      setLinkEditorUrl(selectedText);
      setLinkEditorText(selectedText);
      setLinkEditorSelection({ start, end });
    } else {
      setLinkEditorUrl('');
      setLinkEditorText(selectedText);
      setLinkEditorSelection({ start, end });
    }

    setLinkEditorOpen(true);
  }

  // 处理链接编辑器确认
  const handleLinkConfirm = (url: string, displayText: string) => {
    const { newText, cursorPosition } = insertOrUpdateMarkdownLink(
      content,
      url,
      displayText,
      linkEditorSelection.start,
      linkEditorSelection.end
    );
    setContent(newText);
    
    // 恢复焦点
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  // 快速转换检测到的链接
  const convertDetectedLink = (url: string) => {
    const newContent = content.replace(url, `[${url}](${url})`);
    setContent(newContent);
  };

  // 编辑器工具栏按钮
  const ToolbarButton = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
    >
      {children}
    </button>
  );

  // 插入 Markdown 语法
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // 处理 Tab 键缩进
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      if (e.shiftKey) {
        // Shift+Tab: 反缩进
        const beforeCursor = value.substring(0, start);
        const afterCursor = value.substring(end);
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];
        
        // 检查当前行是否有缩进
        if (currentLine.startsWith('  ')) {
          const newBeforeCursor = beforeCursor.slice(0, -2);
          const newValue = newBeforeCursor + afterCursor;
          setContent(newValue);
          setTimeout(() => {
            textarea.setSelectionRange(start - 2, end - 2);
          }, 0);
        } else if (currentLine.startsWith('\t')) {
          const newBeforeCursor = beforeCursor.slice(0, -1);
          const newValue = newBeforeCursor + afterCursor;
          setContent(newValue);
          setTimeout(() => {
            textarea.setSelectionRange(start - 1, end - 1);
          }, 0);
        }
      } else {
        // Tab: 缩进（插入两个空格）
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        setContent(newValue);
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-auto' : 'max-w-7xl mx-auto p-6'}`}>
      {/* 链接编辑器弹窗 */}
      <LinkEditor
        isOpen={linkEditorOpen}
        url={linkEditorUrl}
        displayText={linkEditorText}
        onClose={() => setLinkEditorOpen(false)}
        onConfirm={handleLinkConfirm}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {postId ? '编辑文章' : '创建文章'}
        </h1>
        
        {/* 自动保存状态 */}
        <AutoSaveStatus 
          isSaving={isSaving} 
          lastSaved={lastSaved} 
          hasDraft={hasDraft} 
        />
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* 导入进度提示 */}
      {importing && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-blue-700 dark:text-blue-300">{importProgress || '正在导入...'}</span>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            文章标题 *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            placeholder="请输入文章标题..."
            required
          />
        </div>
        
        {/* 分类选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            选择分类
          </label>
          {categoriesLoading ? (
            <div className="text-gray-500 dark:text-gray-400">加载分类中...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(
                    selectedCategoryId === category.id ? null : category.id
                  )}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    selectedCategoryId === category.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-105'
                      : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.icon}</span>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* 标签选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            选择标签
          </label>
          
          {/* 已选择的标签 */}
          {selectedTags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border-2 hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: tag.color ? `${tag.color}20` : '#F3F4F6',
                    borderColor: tag.color || '#E5E7EB',
                    color: tag.color || '#6B7280'
                  }}
                >
                  #{tag.name}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
            </div>
          )}
          
          {/* 标签搜索 */}
          <div className="relative">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={tagSearchTerm}
                onChange={(e) => setTagSearchTerm(e.target.value)}
                onFocus={() => setShowTagDropdown(true)}
                placeholder="搜索标签..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
            
            {/* 标签下拉列表 */}
            {showTagDropdown && !tagsLoading && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredTags.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                    没有找到标签
                  </div>
                ) : (
                  <div className="p-2">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          toggleTag(tag.id);
                          setTagSearchTerm('');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                          selectedTagIds.includes(tag.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color || '#6B7280' }}
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            #{tag.name}
                          </span>
                        </div>
                        {selectedTagIds.includes(tag.id) && (
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 点击外部关闭下拉 */}
          {showTagDropdown && (
            <div
              className="fixed inset-0 z-0"
              onClick={() => setShowTagDropdown(false)}
            />
          )}
        </div>
        
        {/* SEO 优化助手 */}
        <SEOAssistant
          title={title}
          summary={summary}
          content={content}
          onContentOptimize={(optimizedContent) => setContent(optimizedContent)}
        />

        {/* 摘要 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            文章摘要
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
            rows={3}
            placeholder="简短描述文章内容..."
          />
        </div>
        
        {/* 封面图片 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            封面图片
          </label>
          <div className="flex space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverImageUpload}
              disabled={uploading}
              className="border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 py-2"
            />
          </div>
          {coverImage && (
            <div className="mt-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">当前封面图片:</p>
              <img src={coverImage} alt="当前封面" className="max-w-xs h-auto rounded" />
            </div>
          )}
        </div>
        
        {/* 文档导入区域 */}
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative p-6 border-2 border-dashed rounded-lg transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
          }`}
        >
          <div className="text-center">
            <svg className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span className="font-medium">拖拽文件到此处</span> 或
              <label className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer">
                点击选择文件
                <input
                  type="file"
                  accept=".txt,.md,.markdown,.docx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // 复用 handleDrop 的逻辑
                    const mockEvent = { preventDefault: () => {}, stopPropagation: () => {}, dataTransfer: { files: [file] } } as any;
                    await handleDrop(mockEvent);
                  }}
                  className="hidden"
                  disabled={importing}
                />
              </label>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              支持 .txt, .md, .markdown, .docx 格式（Word 文档中的图片也会被提取）
            </p>
          </div>
          
          {/* 拖拽时的遮罩提示 */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-lg shadow-lg">
                <p className="text-blue-600 dark:text-blue-400 font-medium">释放以导入文档</p>
              </div>
            </div>
          )}
        </div>

        {/* 编辑器标签页 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              内容 (支持Markdown) *
            </label>
            
            {/* 编辑器模式切换 */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === 'split'
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                分屏
              </button>
              <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              预览
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? '退出全屏 (F11/Esc)' : '全屏模式 (F11)'}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                isFullscreen
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
          </div>

          {/* 工具栏 */}
          {activeTab !== 'preview' && (
            <div className="flex items-center gap-1 mb-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 flex-wrap">
              <ToolbarButton onClick={() => insertMarkdown('**', '**')} title="粗体 (Ctrl+B)">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" />
                </svg>
              </ToolbarButton>
              <ToolbarButton onClick={() => insertMarkdown('*', '*')} title="斜体 (Ctrl+I)">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </ToolbarButton>
              <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
              <ToolbarButton onClick={() => insertMarkdown('# ')} title="标题 1">
                H1
              </ToolbarButton>
              <ToolbarButton onClick={() => insertMarkdown('## ')} title="标题 2">
                H2
              </ToolbarButton>
              <ToolbarButton onClick={() => insertMarkdown('### ')} title="标题 3">
                H3
              </ToolbarButton>
              <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
              <ToolbarButton onClick={() => insertMarkdown('- ')} title="无序列表">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </ToolbarButton>
              <ToolbarButton onClick={() => insertMarkdown('1. ')} title="有序列表">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12M7 12h12M7 17h12M3 7h.01M3 12h.01M3 17h.01" />
                </svg>
              </ToolbarButton>
              <ToolbarButton onClick={() => insertMarkdown('- [ ] ')} title="任务列表">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </ToolbarButton>
              <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
              <ToolbarButton onClick={() => insertMarkdown('> ')} title="引用">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </ToolbarButton>
              <ToolbarButton onClick={() => insertMarkdown('```\n', '\n```')} title="代码块">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </ToolbarButton>
              <ToolbarButton onClick={() => insertMarkdown('`', '`')} title="行内代码">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </ToolbarButton>
              <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1" />
              <ToolbarButton onClick={openLinkEditor} title="插入链接 (Ctrl+K)">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </ToolbarButton>
              <ToolbarButton onClick={() => insertMarkdown('![', '](url)')} title="插入图片">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </ToolbarButton>
              <ToolbarButton onClick={() => insertMarkdown('| 列1 | 列2 |\n| --- | --- |\n| 内容 | 内容 |')} title="插入表格">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </ToolbarButton>
            </div>
          )}

          {/* 编辑器内容区域 */}
          <div className={`grid gap-4 ${activeTab === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* 编辑区域 */}
            {activeTab !== 'preview' && (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onPaste={handleContentPaste}
                  onKeyDown={handleKeyDown}
                  disabled={importing}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm dark:bg-slate-700 dark:text-white disabled:opacity-50 resize-y"
                  rows={activeTab === 'split' ? 30 : 20}
                  required
                  placeholder="在此输入 Markdown 内容...\n\n支持：\n- 标题、列表、引用\n- 代码块、表格\n- 图片、链接\n- 任务列表\n- Tab 键缩进"
                />
                
                {/* 内容统计信息 */}
                <div className="mt-2 flex items-center justify-between">
                  <ContentStats content={content} />
                </div>
                
                {/* 检测到的链接提示 */}
                {detectedLinks.length > 0 && activeTab === 'edit' && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      检测到 {detectedLinks.length} 个链接，点击转换为 Markdown 格式：
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detectedLinks.slice(0, 5).map((url, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => convertDetectedLink(url)}
                          className="text-xs px-2 py-1 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors truncate max-w-xs"
                          title={url}
                        >
                          {url.length > 40 ? url.substring(0, 40) + '...' : url}
                        </button>
                      ))}
                      {detectedLinks.length > 5 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 py-1">
                          还有 {detectedLinks.length - 5} 个...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 预览区域 */}
            {(activeTab === 'preview' || activeTab === 'split') && (
              <SplitPreview content={content} isVisible={true} />
            )}
          </div>
        </div>
        
        {/* 发布状态 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            发布状态
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="draft"
                checked={status === 'draft'}
                onChange={(e) => setStatus(e.target.value as 'draft')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">草稿</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="published"
                checked={status === 'published'}
                onChange={(e) => setStatus(e.target.value as 'published')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">发布</span>
            </label>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-slate-700">
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium text-lg"
          >
            {loading ? '提交中...' : uploading ? '上传中...' : postId ? '更新文章' : '发布文章'}
          </button>
          <button
            type="button"
            onClick={() => saveNow()}
            disabled={isSaving}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
          >
            {isSaving ? '保存中...' : '保存草稿'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading || uploading}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium text-lg"
            >
              取消
            </button>
          )}
        </div>

        {/* 快捷键提示 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-slate-700">
          <p className="mb-1">快捷键：</p>
          <div className="flex flex-wrap gap-4">
            <span>Ctrl+S: 保存</span>
            <span>Ctrl+P: 切换预览</span>
            <span>Ctrl+K: 插入链接</span>
            <span>F11: 全屏模式</span>
            <span>Esc: 退出全屏</span>
            <span>Tab: 缩进</span>
            <span>Shift+Tab: 反缩进</span>
          </div>
        </div>
      </form>
    </div>
  );
}
