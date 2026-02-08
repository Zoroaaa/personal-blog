/**
 * 增强的文章编辑组件
 * 功能:
 * - 分类选择(单选)
 * - 标签选择(多选,带颜色显示)
 * - 标签搜索和快速创建
 * - 标签颜色预览
 * - 封面图片上传
 * - 内容区域粘贴图片自动上传
 * - Markdown编辑器
 * - 图片上传成功提示
 * - 支持拖拽导入文档(txt/md/docx)
 * - 支持从Word文档提取图片
 */


import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { parseDocument, isSupportedDocument } from '../utils/documentParser';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string;
  post_count: number;
}

interface PostEditorProps {
  postId?: number;
  onSave?: () => void;
  onCancel?: () => void;
}

export function PostEditor({ postId, onSave, onCancel }: PostEditorProps) {
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
  
  // 加载分类和标签
  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);
  
  // 如果是编辑模式,加载文章数据
  useEffect(() => {
    if (postId) {
      loadPost(postId);
    }
  }, [postId]);
  
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await api.getCategories();
      if (response.success && response.data) {
        setCategories(response.data.categories || []);
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
        setTags(response.data.tags || []);
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
        const post = response.data;
        setTitle(post.title);
        setContent(post.content);
        setSummary(post.summary || '');
        setCoverImage(post.cover_image || post.coverImage || '');
        setStatus(post.status);
        setSelectedCategoryId(post.category_id);
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
      
      const postData = {
        title,
        content,
        summary,
        coverImage,
        categoryId: selectedCategoryId,
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
              // 将图片URL插入到内容中
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
    // 只有当离开拖拽区域本身时才取消状态
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

    // 只处理第一个文件
    const file = files[0];

    // 检查是否是支持的文档类型
    if (!isSupportedDocument(file)) {
      setError(`不支持的文件类型: ${file.name}。请拖拽 .txt, .md, .markdown 或 .docx 文件`);
      return;
    }

    try {
      setImporting(true);
      setImportProgress('正在解析文档...');

      // 解析文档
      const parsed = await parseDocument(file);

      // 询问用户是否覆盖标题
      if (parsed.title && title && title !== parsed.title) {
        const shouldUpdateTitle = window.confirm(`检测到文档标题 "${parsed.title}"，是否更新标题？`);
        if (shouldUpdateTitle) {
          setTitle(parsed.title);
        }
      } else if (parsed.title && !title) {
        setTitle(parsed.title);
      }

      // 上传 Word 文档中的图片
      let finalContent = parsed.content;
      if (parsed.images.length > 0) {
        setImportProgress(`正在上传 ${parsed.images.length} 张图片...`);
        const uploadedImages: Array<{ id: string; url: string }> = [];

        for (let i = 0; i < parsed.images.length; i++) {
          const img = parsed.images[i];
          setImportProgress(`正在上传图片 ${i + 1}/${parsed.images.length}...`);

          try {
            // 将 Blob 转换为 File
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

        // 将图片引用添加到内容末尾
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

      // 设置内容
      setContent(finalContent);

      // 自动生成摘要（如果为空）
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

  // 处理文件选择导入
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupportedDocument(file)) {
      setError(`不支持的文件类型: ${file.name}。请选择 .txt, .md, .markdown 或 .docx 文件`);
      return;
    }

    try {
      setImporting(true);
      setImportProgress('正在解析文档...');

      const parsed = await parseDocument(file);

      if (parsed.title && !title) {
        setTitle(parsed.title);
      }

      // 上传 Word 文档中的图片
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
      // 清空 input 以便可以重复选择同一文件
      e.target.value = '';
    }
  };
  
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
  
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        {postId ? '编辑文章' : '创建文章'}
      </h1>
      
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
                  onChange={handleFileSelect}
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

        {/* 文章内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            内容 (支持Markdown) *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handleContentPaste}
            disabled={importing}
            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono dark:bg-slate-700 dark:text-white disabled:opacity-50"
            rows={20}
            required
          />
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
      </form>
    </div>
  );
}

