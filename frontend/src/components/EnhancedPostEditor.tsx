/**
 * 增强型文章编辑组件
 * 功能:
 * - 链接自动识别与编辑
 * - 实时 Markdown 预览
 * - 自动保存
 * - 键盘快捷键
 * - 分屏编辑模式
 *
 * 结构说明：
 * - 本组件为编排层，负责组合下面的状态、业务 hook 与展示子组件
 * - 表单状态集中在此；分类/专栏/标签数据、Markdown 编辑、图片上传、
 *   文档导入、草稿管理分别由对应 hook 负责；UI 由 post-editor/ 下子组件渲染
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { transformPost } from '../utils/apiTransformer';
import { useAutoSave, useKeyboardShortcuts } from '../hooks/useAutoSave';
import { usePostTaxonomies } from '../hooks/usePostTaxonomies';
import { useMarkdownEditor } from '../hooks/useMarkdownEditor';
import { useImageUpload } from '../hooks/useImageUpload';
import { useDocumentImport } from '../hooks/useDocumentImport';
import { useDraftManager, type DraftSnapshot } from '../hooks/useDraftManager';
import { LinkEditor } from './LinkEditor';
import { AutoSaveStatus } from './AutoSaveStatus';
import { SEOAssistant } from './SEOAssistant';
import { DraftSelector } from './DraftSelector';
import { CategoryPicker, ColumnPicker, TagPicker } from './post-editor/TaxonomyPickers';
import { DocumentDropZone, ImportProgress } from './post-editor/DocumentDropZone';
import { EditorToolbar } from './post-editor/EditorToolbar';
import { MarkdownEditorPane } from './post-editor/MarkdownEditorPane';
import { PublishSettings, type PostStatus, type PostVisibility } from './post-editor/PublishSettings';
import { EditorActions } from './post-editor/EditorActions';

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
  columnId: number | null;
  tags: number[];
  status: PostStatus;
  visibility: PostVisibility;
  password?: string;
  isPinned: boolean;
  pinOrder: number;
}

export function EnhancedPostEditor({ postId, onSave, onCancel }: PostEditorProps) {
  // 文章基本信息
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [pinOrder, setPinOrder] = useState(0);

  // 为每个新建文章会话生成唯一的 sessionId
  const [sessionId] = useState(() => {
    return postId ? null : Date.now().toString();
  });

  // 构建草稿键
  const draftKey = postId ? `post_${postId}` : `new_post_${sessionId}`;

  // 分类 / 专栏 / 标签选择
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // 标签搜索
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 分类 / 专栏 / 标签数据
  const { categories, columns, tags, categoriesLoading, columnsLoading, tagsLoading } = usePostTaxonomies();

  // Markdown 编辑交互
  const editor = useMarkdownEditor({ content, setContent });

  // 图片上传
  const { uploading, handleCoverImageUpload, handleContentPaste } = useImageUpload({
    content,
    setContent,
    setCoverImage,
    setError,
    textareaRef: editor.textareaRef,
  });

  // 文档导入
  const importer = useDocumentImport({
    title,
    setTitle,
    setContent,
    summary,
    setSummary,
    setError,
  });

  // 将草稿数据回填到表单
  const applyDraft = useCallback((data: DraftSnapshot) => {
    setTitle(data.title || '');
    setContent(data.content || '');
    setSummary(data.summary || '');
    setCoverImage(data.coverImage || '');
    setStatus(data.status || 'draft');
    setSelectedCategoryId(data.categoryId || null);
    setSelectedColumnId(data.columnId || null);
    setSelectedTagIds(data.tags || []);
    setIsPinned(data.isPinned || false);
    setPinOrder(data.pinOrder || 0);
  }, []);

  // 草稿管理（仅新建文章时启用）
  const { draftSelectorOpen, setDraftSelectorOpen, availableDrafts, handleSelectDraft, handleClearAllDrafts } =
    useDraftManager({ enabled: !postId, applyDraft });

  // 自动保存
  const postData: PostData = {
    title, content, summary, coverImage,
    categoryId: selectedCategoryId,
    columnId: selectedColumnId,
    tags: selectedTagIds,
    status,
    visibility,
    password: visibility === 'password' ? password : undefined,
    isPinned,
    pinOrder,
  };

  const { lastSaved, isSaving, hasDraft, saveNow, clearLocalStorage } = useAutoSave({
    key: draftKey,
    data: postData,
    interval: 30000,
    enabled: true,
  });

  // 保存草稿成功提示
  const [draftSaveMessage, setDraftSaveMessage] = useState<string | null>(null);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 处理手动保存草稿
  const handleSaveDraft = useCallback(async () => {
    await saveNow();
    // 显示保存成功提示
    setDraftSaveMessage('草稿已保存到浏览器缓存');
    // 清除之前的定时器
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }
    // 3秒后清除提示
    draftSaveTimeoutRef.current = setTimeout(() => {
      setDraftSaveMessage(null);
    }, 3000);
  }, [saveNow]);

  // 如果是编辑模式,加载文章数据
  useEffect(() => {
    if (!postId) return;

    (async () => {
      try {
        setLoading(true);
        const response = await api.getPostById(postId);
        if (response.success && response.data) {
          const post = transformPost(response.data);
          setTitle(post.title);
          setContent(post.content);
          setSummary(post.summary || '');
          setCoverImage(post.coverImage || '');
          setStatus(post.status as PostStatus);
          setVisibility(post.visibility || 'public');
          setSelectedCategoryId(post.categoryId || null);
          setSelectedColumnId(post.columnId || null);
          setSelectedTagIds(post.tags?.map((t: any) => t.id) || []);
          setIsPinned(post.isPinned || false);
          setPinOrder(post.pinOrder || 0);
        }
      } catch (err: any) {
        setError(err.message || '加载文章失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

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

    if (visibility === 'password' && !password.trim() && !postId) {
      setError('密码保护的文章必须设置访问密码');
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        title,
        content,
        summary,
        coverImage,
        categoryId: selectedCategoryId ?? undefined,
        columnId: selectedColumnId ?? undefined,
        tags: selectedTagIds,
        status,
        visibility,
        isPinned,
        pinOrder,
      };

      if (visibility === 'password' && password.trim()) {
        payload.password = password;
      }

      let response;
      if (postId) {
        response = await api.updatePost(postId, payload);
      } else {
        response = await api.createPost(payload);
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

  // 分类 / 专栏 / 标签选择切换
  const toggleCategory = useCallback((id: number) => {
    setSelectedCategoryId(prev => (prev === id ? null : id));
  }, []);

  const toggleColumn = useCallback((id: number | null) => {
    setSelectedColumnId(prev => (id === null ? null : prev === id ? null : id));
  }, []);

  const toggleTag = useCallback((tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const handlePinnedChange = useCallback((checked: boolean) => {
    setIsPinned(checked);
    if (!checked) {
      setPinOrder(0);
    }
  }, []);

  // 键盘快捷键
  useKeyboardShortcuts([
    { key: 's', ctrl: true, handler: () => { handleSaveDraft(); handleSubmit(new Event('submit') as any); }, description: '保存文章' },
    { key: 'p', ctrl: true, handler: editor.togglePreview, description: '切换预览' },
    { key: 'k', ctrl: true, handler: editor.openLinkEditor, description: '插入链接' },
    { key: 'f11', ctrl: false, handler: editor.toggleFullscreen, description: '全屏模式' },
    { key: 'Escape', ctrl: false, handler: editor.exitFullscreen, description: '退出全屏' },
  ]);

  return (
    <div className={`${editor.isFullscreen ? 'fixed inset-0 z-50 bg-card overflow-auto' : 'max-w-7xl mx-auto p-6'}`}>
      {/* 链接编辑器弹窗 */}
      <LinkEditor
        isOpen={editor.linkEditorOpen}
        url={editor.linkEditorUrl}
        displayText={editor.linkEditorText}
        onClose={editor.closeLinkEditor}
        onConfirm={editor.handleLinkConfirm}
      />

      {/* 草稿选择器弹窗 */}
      <DraftSelector
        isOpen={draftSelectorOpen}
        drafts={availableDrafts}
        onClose={() => setDraftSelectorOpen(false)}
        onSelect={handleSelectDraft}
        onClearAll={handleClearAllDrafts}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">
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
      <ImportProgress importing={importer.importing} importProgress={importer.importProgress} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            文章标题 *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 text-lg border border-border rounded-lg focus:ring-2 focus:ring-primary dark:bg-muted dark:text-foreground"
            placeholder="请输入文章标题..."
            required
          />
        </div>

        {/* 分类选择 */}
        <CategoryPicker
          categories={categories}
          loading={categoriesLoading}
          selectedId={selectedCategoryId}
          onToggle={toggleCategory}
        />

        {/* 专栏选择 */}
        <ColumnPicker
          columns={columns}
          loading={columnsLoading}
          selectedId={selectedColumnId}
          onToggle={toggleColumn}
        />

        {/* 标签选择 */}
        <TagPicker
          tags={tags}
          loading={tagsLoading}
          selectedTagIds={selectedTagIds}
          onToggle={toggleTag}
          searchTerm={tagSearchTerm}
          onSearchChange={setTagSearchTerm}
          dropdownOpen={showTagDropdown}
          onOpenDropdown={() => setShowTagDropdown(true)}
          onCloseDropdown={() => setShowTagDropdown(false)}
        />

        {/* SEO 优化助手 */}
        <SEOAssistant
          title={title}
          summary={summary}
          content={content}
          onContentOptimize={(optimizedContent) => setContent(optimizedContent)}
        />

        {/* 摘要 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            文章摘要
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary dark:bg-muted dark:text-foreground"
            rows={3}
            placeholder="简短描述文章内容..."
          />
        </div>

        {/* 封面图片 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            封面图片
          </label>
          <div className="flex space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverImageUpload}
              disabled={uploading}
              className="border border-border bg-card rounded-lg px-3 py-2"
            />
          </div>
          {coverImage && (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground mb-1">当前封面图片:</p>
              <img src={coverImage} alt="当前封面" className="max-w-xs h-auto rounded" />
            </div>
          )}
        </div>

        {/* 文档导入区域 */}
        <DocumentDropZone
          isDragging={importer.isDragging}
          importing={importer.importing}
          dropZoneRef={importer.dropZoneRef}
          onDragEnter={importer.handleDragEnter}
          onDragOver={importer.handleDragOver}
          onDragLeave={importer.handleDragLeave}
          onDrop={importer.handleDrop}
          onFileSelect={importer.handleFileSelect}
        />

        {/* 编辑器工具栏 */}
        <EditorToolbar
          activeTab={editor.activeTab}
          onTabChange={editor.setActiveTab}
          isFullscreen={editor.isFullscreen}
          onToggleFullscreen={editor.toggleFullscreen}
          onInsertMarkdown={editor.insertMarkdown}
          onOpenLinkEditor={editor.openLinkEditor}
        />

        {/* 编辑器内容区域 */}
        <MarkdownEditorPane
          content={content}
          onChange={setContent}
          onPaste={handleContentPaste}
          onKeyDown={editor.handleKeyDown}
          textareaRef={editor.textareaRef}
          activeTab={editor.activeTab}
          importing={importer.importing}
          detectedLinks={editor.detectedLinks}
          onConvertLink={editor.convertDetectedLink}
        />

        {/* 发布设置 */}
        <PublishSettings
          status={status}
          onStatusChange={setStatus}
          isPinned={isPinned}
          onPinnedChange={handlePinnedChange}
          pinOrder={pinOrder}
          onPinOrderChange={setPinOrder}
          visibility={visibility}
          onVisibilityChange={setVisibility}
          password={password}
          onPasswordChange={setPassword}
          showPassword={showPassword}
          onToggleShowPassword={() => setShowPassword(!showPassword)}
          postId={postId}
        />

        {/* 操作按钮 */}
        <EditorActions
          loading={loading}
          uploading={uploading}
          isSaving={isSaving}
          postId={postId}
          onSaveDraft={handleSaveDraft}
          onCancel={onCancel}
          draftSaveMessage={draftSaveMessage}
        />

        {/* 快捷键提示 */}
        <div className="text-xs text-muted-foreground pt-4 border-t border-border">
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