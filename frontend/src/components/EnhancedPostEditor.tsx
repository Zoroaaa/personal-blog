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
import { transformCategoryList, transformTagList, transformColumnList, transformPost } from '../utils/apiTransformer';
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
import { DraftSelector } from './DraftSelector';

interface Category {
 id: number;
 name: string;
 slug: string;
 icon?: string;
 color?: string;
}

interface Column {
 id: number;
 name: string;
 slug: string;
 coverImage?: string;
 postCount?: number;
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
 columnId: number | null;
 tags: number[];
 status: 'draft' | 'published' | 'archived';
 visibility: 'public' | 'private' | 'password';
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
 const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
 const [visibility, setVisibility] = useState<'public' | 'private' | 'password'>('public');
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
 
 // 分类、专栏和标签
 const [categories, setCategories] = useState<Category[]>([]);
 const [columns, setColumns] = useState<Column[]>([]);
 const [tags, setTags] = useState<Tag[]>([]);
 const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
 const [selectedColumnId, setSelectedColumnId] = useState<number | null>(null);
 const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
 
 // 标签搜索
 const [tagSearchTerm, setTagSearchTerm] = useState('');
 const [showTagDropdown, setShowTagDropdown] = useState(false);
 
 // 状态管理
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 const [categoriesLoading, setCategoriesLoading] = useState(true);
 const [columnsLoading, setColumnsLoading] = useState(true);
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
 
 // 草稿选择器状态
 const [draftSelectorOpen, setDraftSelectorOpen] = useState(false);
 const [availableDrafts, setAvailableDrafts] = useState<any[]>([]);
 
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
 pinOrder
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

 // 键盘快捷键
 useKeyboardShortcuts([
 { key: 's', ctrl: true, handler: () => { handleSaveDraft(); handleSubmit(new Event('submit') as any); }, description: '保存文章' },
 { key: 'p', ctrl: true, handler: () => setActiveTab(prev => prev === 'edit' ? 'split' : 'edit'), description: '切换预览' },
 { key: 'k', ctrl: true, handler: openLinkEditor, description: '插入链接' },
 { key: 'f11', ctrl: false, handler: () => setIsFullscreen(prev => !prev), description: '全屏模式' },
 { key: 'Escape', ctrl: false, handler: () => setIsFullscreen(false), description: '退出全屏' },
 ]);

 // 加载分类、专栏和标签，并检查草稿
 useEffect(() => {
 loadCategories();
 loadColumns();
 loadTags();
 }, []);

 // 新建文章时检查草稿
 useEffect(() => {
 if (!postId) {
 checkDraft();
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [postId]);
 
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

 // 获取所有新建文章的草稿
 const getAllNewPostDrafts = useCallback(() => {
 const drafts = [];
 for (let i = 0; i < localStorage.length; i++) {
 const key = localStorage.key(i);
 if (key?.startsWith('draft_new_post_')) {
 try {
 const item = localStorage.getItem(key);
 if (item) {
 const draft = JSON.parse(item);
 // 只保留有内容的草稿
 if (draft.data?.title?.trim() || draft.data?.content?.trim()) {
 drafts.push({
 key,
 ...draft,
 sessionId: key.replace('draft_new_post_', '')
 });
 }
 }
 } catch (err) {
 console.error('Failed to parse draft:', err);
 }
 }
 }
 // 按时间倒序排序
 return drafts.sort((a, b) =>
 new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
 );
 }, []);

 // 处理选择草稿
 const handleSelectDraft = useCallback((draft: any) => {
 setTitle(draft.data.title || '');
 setContent(draft.data.content || '');
 setSummary(draft.data.summary || '');
 setCoverImage(draft.data.coverImage || '');
 setStatus(draft.data.status || 'draft');
 setSelectedCategoryId(draft.data.categoryId || null);
 setSelectedColumnId(draft.data.columnId || null);
 setSelectedTagIds(draft.data.tags || []);
 setIsPinned(draft.data.isPinned || false);
 setPinOrder(draft.data.pinOrder || 0);

 localStorage.removeItem(draft.key);

 setAvailableDrafts(prev => prev.filter(d => d.key !== draft.key));

 setDraftSelectorOpen(false);
 }, []);

 // 处理清除所有草稿
 const handleClearAllDrafts = useCallback(() => {
 availableDrafts.forEach(draft => {
 localStorage.removeItem(draft.key);
 });
 setAvailableDrafts([]);
 setDraftSelectorOpen(false);
 }, [availableDrafts]);

 // 检查是否有草稿（只在新建文章时执行）
 const checkDraft = useCallback(() => {
 if (postId) return; // 编辑模式不检查

 const drafts = getAllNewPostDrafts();

 if (drafts.length > 0) {
 // 只取最新的 5 个草稿
 const recentDrafts = drafts.slice(0, 5);
 setAvailableDrafts(recentDrafts);
 setDraftSelectorOpen(true);
 }
 }, [postId, getAllNewPostDrafts]);
 
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

 const loadColumns = async () => {
 try {
 setColumnsLoading(true);
 const response = await api.getColumns({ limit: '100' });
 if (response.success && response.data) {
 setColumns(transformColumnList(response.data.columns || []));
 }
 } catch (err) {
 console.error('Failed to load columns:', err);
 } finally {
 setColumnsLoading(false);
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

 if (visibility === 'password' && !password.trim() && !postId) {
 setError('密码保护的文章必须设置访问密码');
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
 columnId: selectedColumnId ?? undefined,
 tags: selectedTagIds,
 status,
 visibility,
 isPinned,
 pinOrder
 };

 if (visibility === 'password' && password.trim()) {
 postData.password = password;
 }
 
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

 // 拖拽计数器，解决拖拽子元素时频繁触发 dragleave 的问题
 const dragCounterRef = useRef(0);

 // 处理拖拽事件
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

 const handleDrop = useCallback(async (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 dragCounterRef.current = 0;
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
 index: img.index ?? i
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
 tag.name?.toLowerCase().includes(tagSearchTerm.toLowerCase())
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

 /**
 * 替换内容中的图片占位符为实际的 Markdown 图片
 * 保持图片在原文档中的位置
 */
 const replaceImagePlaceholders = (content: string, images: Array<{ id: string; url: string; index: number }>): string => {
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
 };

 // 编辑器工具栏按钮
 const ToolbarButton = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
 <button
 type="button"
 onClick={onClick}
 title={title}
 className="p-2 text-muted-foreground hover:bg-accent rounded transition-colors"
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
 if (currentLine.startsWith(' ')) {
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
 const newValue = value.substring(0, start) + ' ' + value.substring(end);
 setContent(newValue);
 setTimeout(() => {
 textarea.setSelectionRange(start + 2, start + 2);
 }, 0);
 }
 }
 };

 return (
 <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-card overflow-auto' : 'max-w-7xl mx-auto p-6'}`}>
 {/* 链接编辑器弹窗 */}
 <LinkEditor
 isOpen={linkEditorOpen}
 url={linkEditorUrl}
 displayText={linkEditorText}
 onClose={() => setLinkEditorOpen(false)}
 onConfirm={handleLinkConfirm}
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
 {importing && (
 <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
 <div className="flex items-center gap-3 mb-3">
 <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
 <span className="text-primary font-medium">{importProgress || '正在导入...'}</span>
 </div>
 {/* 进度条 */}
 <div className="w-full bg-primary/25 rounded-full h-2.5 overflow-hidden">
 <div
 className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
 style={{
 width: importProgress.includes('/') && importProgress.match(/(\d+)\/(\d+)/)
 ? `${(parseInt(importProgress.match(/(\d+)\/(\d+)/)?.[1] || '0') / parseInt(importProgress.match(/(\d+)\/(\d+)/)?.[2] || '1') * 100)}%`
 : importProgress.includes('解析')
 ? '20%'
 : '60%'
 }}
 ></div>
 </div>
 <p className="text-xs text-primary mt-2">
 请勿关闭页面，上传完成后会自动更新内容
 </p>
 </div>
 )}
 
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
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">
 选择分类
 </label>
 {categoriesLoading ? (
 <div className="text-muted-foreground">加载分类中...</div>
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
 ? 'border-primary bg-primary/10 scale-105'
 : 'border-border hover:border-primary/50'
 }`}
 >
 <div className="flex items-center gap-2">
 <span className="text-2xl">{category.icon}</span>
 <div
 className="w-4 h-4 rounded-full"
 style={{ backgroundColor: category.color }}
 />
 </div>
 <span className="text-sm font-medium text-foreground">
 {category.name}
 </span>
 </button>
 ))}
 </div>
 )}
 </div>

 {/* 专栏选择 */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">
 选择专栏
 </label>
 {columnsLoading ? (
 <div className="text-muted-foreground">加载专栏中...</div>
 ) : columns.length === 0 ? (
 <div className="text-muted-foreground text-sm">
 暂无专栏，请在专栏管理中创建
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
 <button
 type="button"
 onClick={() => setSelectedColumnId(null)}
 className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
 selectedColumnId === null
 ? 'border-primary bg-primary/10 scale-105'
 : 'border-border hover:border-primary/50'
 }`}
 >
 <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
 <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
 </svg>
 </div>
 <span className="text-sm font-medium text-foreground">
 不选择
 </span>
 </button>
 {columns.map((column) => (
 <button
 key={column.id}
 type="button"
 onClick={() => setSelectedColumnId(
 selectedColumnId === column.id ? null : column.id
 )}
 className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
 selectedColumnId === column.id
 ? 'border-primary bg-primary/10 scale-105'
 : 'border-border hover:border-primary/50'
 }`}
 >
 <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
 {column.name.slice(0, 2)}
 </div>
 <span className="text-sm font-medium text-foreground truncate max-w-full">
 {column.name}
 </span>
 {column.postCount !== undefined && (
 <span className="text-xs text-muted-foreground">
 {column.postCount} 篇文章
 </span>
 )}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* 标签选择 */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">
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
 <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
 </svg>
 <input
 type="text"
 value={tagSearchTerm}
 onChange={(e) => setTagSearchTerm(e.target.value)}
 onFocus={() => setShowTagDropdown(true)}
 placeholder="搜索标签..."
 className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary dark:bg-muted dark:text-foreground"
 />
 </div>
 
 {/* 标签下拉列表 */}
 {showTagDropdown && !tagsLoading && (
 <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
 {filteredTags.length === 0 ? (
 <div className="p-3 text-center text-muted-foreground">
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
 className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent transition-colors ${
 selectedTagIds.includes(tag.id) ? 'bg-primary/10' : ''
 }`}
 >
 <div className="flex items-center gap-2">
 <div
 className="w-3 h-3 rounded-full"
 style={{ backgroundColor: tag.color || '#6B7280' }}
 />
 <span className="text-sm font-medium text-foreground">
 #{tag.name}
 </span>
 </div>
 {selectedTagIds.includes(tag.id) && (
 <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
 <div
 ref={dropZoneRef}
 onDragEnter={handleDragEnter}
 onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 onDrop={handleDrop}
 className={`relative p-8 border-2 border-dashed rounded-xl transition-all duration-200 ${
 isDragging
 ? 'border-primary bg-primary/10 scale-[1.02] shadow-xl ring-4 ring-primary/30'
 : 'border-border hover:border-primary/50 hover:bg-accent'
 } ${importing ? 'opacity-50 pointer-events-none' : ''}`}
 >
 <div className="text-center">
 <div className={`mx-auto w-16 h-16 mb-4 rounded-full flex items-center justify-center transition-all duration-200 ${
 isDragging
 ? 'bg-primary/15 scale-110'
 : 'bg-muted'
 }`}>
 <svg className={`w-8 h-8 transition-all duration-200 ${
 isDragging
 ? 'text-primary scale-110'
 : 'text-muted-foreground'
 }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
 </svg>
 </div>
 <p className="text-base text-foreground mb-2">
 <span className="font-semibold">拖拽文件到此处</span>
 <span className="text-muted-foreground mx-2">或</span>
 <label className="text-primary hover:text-primary/80 cursor-pointer font-medium underline underline-offset-2">
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
 <p className="text-sm text-muted-foreground">
 支持 .txt, .md, .markdown, .docx 格式
 </p>
 <p className="text-xs text-muted-foreground mt-1">
 Word 文档中的图片会被自动提取并按原文档位置插入
 </p>
 </div>

 {/* 拖拽时的遮罩提示 */}
 {isDragging && (
 <div className="absolute inset-0 bg-primary/5 dark:bg-primary/20 rounded-xl flex items-center justify-center pointer-events-none">
 <div className="bg-card px-8 py-4 rounded-xl shadow-2xl border-2 border-primary/50 transform scale-110">
 <div className="flex items-center gap-3">
 <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 <p className="text-primary font-semibold text-lg">释放以导入文档</p>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* 编辑器标签页 */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <label className="block text-sm font-medium text-foreground">
 内容 (支持Markdown) *
 </label>
 
 {/* 编辑器模式切换 */}
 <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
 <button
 type="button"
 onClick={() => setActiveTab('edit')}
 className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
 activeTab === 'edit'
 ? 'bg-card text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
 }`}
 >
 编辑
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('split')}
 className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
 activeTab === 'split'
 ? 'bg-card text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
 }`}
 >
 分屏
 </button>
 <button
 type="button"
 onClick={() => setActiveTab('preview')}
 className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
 activeTab === 'preview'
 ? 'bg-card text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
 }`}
 >
 预览
 </button>
 <div className="w-px h-5 bg-border mx-1" />
 <button
 type="button"
 onClick={() => setIsFullscreen(!isFullscreen)}
 title={isFullscreen ? '退出全屏 (F11/Esc)' : '全屏模式 (F11)'}
 className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
 isFullscreen
 ? 'bg-primary/10 text-primary'
 : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
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
 <div className="flex items-center gap-1 mb-2 p-2 bg-background rounded-lg border border-border flex-wrap">
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
 <div className="w-px h-5 bg-border mx-1" />
 <ToolbarButton onClick={() => insertMarkdown('# ')} title="标题 1">
 H1
 </ToolbarButton>
 <ToolbarButton onClick={() => insertMarkdown('## ')} title="标题 2">
 H2
 </ToolbarButton>
 <ToolbarButton onClick={() => insertMarkdown('### ')} title="标题 3">
 H3
 </ToolbarButton>
 <div className="w-px h-5 bg-border mx-1" />
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
 <div className="w-px h-5 bg-border mx-1" />
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
 <div className="w-px h-5 bg-border mx-1" />
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
 className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary font-mono text-sm dark:bg-muted dark:text-foreground disabled:opacity-50 resize-y"
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
 <div className="mt-2 p-3 bg-primary/10 rounded-lg">
 <p className="text-sm text-primary mb-2">
 检测到 {detectedLinks.length} 个链接，点击转换为 Markdown 格式：
 </p>
 <div className="flex flex-wrap gap-2">
 {detectedLinks.slice(0, 5).map((url, index) => (
 <button
 key={index}
 type="button"
 onClick={() => convertDetectedLink(url)}
 className="text-xs px-2 py-1 bg-card text-primary rounded border border-primary/30 hover:bg-primary/10 transition-colors truncate max-w-xs"
 title={url}
 >
 {url.length > 40 ? url.substring(0, 40) + '...' : url}
 </button>
 ))}
 {detectedLinks.length > 5 && (
 <span className="text-xs text-muted-foreground py-1">
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
 <label className="block text-sm font-medium text-foreground mb-2">
 发布状态
 </label>
 <div className="flex flex-wrap gap-4 mb-2">
 <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
 status === 'draft'
 ? 'border-border bg-background dark:bg-muted'
 : 'border-border hover:border-primary/50'
 }`}>
 <input
 type="radio"
 value="draft"
 checked={status === 'draft'}
 onChange={(e) => setStatus(e.target.value as 'draft')}
 className="w-4 h-4 text-muted-foreground"
 />
 <span className="text-foreground font-medium">草稿</span>
 </label>
 <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
 status === 'published'
 ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
 : 'border-border hover:border-primary/50'
 }`}>
 <input
 type="radio"
 value="published"
 checked={status === 'published'}
 onChange={(e) => setStatus(e.target.value as 'published')}
 className="w-4 h-4 text-green-600"
 />
 <span className="text-foreground font-medium">发布</span>
 </label>
 <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
 status === 'archived'
 ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
 : 'border-border hover:border-primary/50'
 }`}>
 <input
 type="radio"
 value="archived"
 checked={status === 'archived'}
 onChange={(e) => setStatus(e.target.value as 'archived')}
 className="w-4 h-4 text-orange-600"
 />
 <span className="text-foreground font-medium">归档</span>
 </label>
 </div>
 <p className="text-xs text-muted-foreground">
 {status === 'draft' 
 ? '草稿状态：文章会保存在文章管理中，但前端页面不可见。更新为"发布"状态后前端才能看到。' 
 : status === 'published'
 ? '发布状态：文章将立即在前端页面显示。'
 : '归档状态：文章将不再允许接收新评论。选择此状态后，文章将不再允许接收新评论。'}
 </p>
 </div>

 {/* 文章置顶 */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">
 文章置顶
 </label>
 <div className="flex flex-wrap items-center gap-4">
 <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
 isPinned
 ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
 : 'border-border hover:border-primary/50'
 }`}>
 <input
 type="checkbox"
 checked={isPinned}
 onChange={(e) => {
 setIsPinned(e.target.checked);
 if (!e.target.checked) {
 setPinOrder(0);
 }
 }}
 className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
 />
 <svg className={`w-5 h-5 ${isPinned ? 'text-red-500' : 'text-muted-foreground'}`} fill="currentColor" viewBox="0 0 20 20">
 <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
 </svg>
 <span className={`font-medium ${isPinned ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
 置顶此文章
 </span>
 </label>
 {isPinned && (
 <div className="flex items-center gap-2">
 <label className="text-sm text-muted-foreground">排序:</label>
 <input
 type="number"
 value={pinOrder}
 onChange={(e) => setPinOrder(parseInt(e.target.value) || 0)}
 min="0"
 className="w-20 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-muted dark:text-foreground text-sm"
 placeholder="0"
 />
 <span className="text-xs text-muted-foreground">数字越小越靠前</span>
 </div>
 )}
 </div>
 <p className="text-xs text-muted-foreground mt-2">
 {isPinned 
 ? '置顶的文章将在文章列表顶部优先显示，可设置排序值控制置顶文章的显示顺序。' 
 : '勾选后将此文章置顶，置顶文章会在列表顶部优先显示。'}
 </p>
 </div>

 {/* 文章可见性 */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">
 文章可见性
 </label>
 <div className="flex flex-wrap gap-4 mb-2">
 <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
 visibility === 'public'
 ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
 : 'border-border hover:border-primary/50'
 }`}>
 <input
 type="radio"
 value="public"
 checked={visibility === 'public'}
 onChange={(e) => setVisibility(e.target.value as 'public')}
 className="w-4 h-4 text-green-600"
 />
 <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <span className="text-foreground font-medium">公开</span>
 </label>
 <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
 visibility === 'private'
 ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
 : 'border-border hover:border-primary/50'
 }`}>
 <input
 type="radio"
 value="private"
 checked={visibility === 'private'}
 onChange={(e) => setVisibility(e.target.value as 'private')}
 className="w-4 h-4 text-orange-600"
 />
 <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
 </svg>
 <span className="text-foreground font-medium">私密</span>
 </label>
 <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
 visibility === 'password'
 ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
 : 'border-border hover:border-primary/50'
 }`}>
 <input
 type="radio"
 value="password"
 checked={visibility === 'password'}
 onChange={(e) => setVisibility(e.target.value as 'password')}
 className="w-4 h-4 text-purple-600"
 />
 <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
 </svg>
 <span className="text-foreground font-medium">密码保护</span>
 </label>
 </div>
 <p className="text-xs text-muted-foreground">
 {visibility === 'public' && '公开：所有人均可查看此文章'}
 {visibility === 'private' && '私密：仅作者和管理员可查看此文章'}
 {visibility === 'password' && '密码保护：访问者需要输入密码才能查看此文章'}
 </p>
 </div>

 {/* 密码输入（仅在密码保护模式下显示） */}
 {visibility === 'password' && (
 <div className="animate-fade-in">
 <label className="block text-sm font-medium text-foreground mb-2">
 访问密码 {postId && <span className="text-muted-foreground text-xs">(留空保持原密码)</span>}
 </label>
 <div className="relative">
 <input
 type={showPassword ? 'text' : 'password'}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full px-4 py-3 pr-12 border border-border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-muted dark:text-foreground"
 placeholder={postId ? "输入新密码或留空保持原密码" : "请输入访问密码"}
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
 >
 {showPassword ? (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
 </svg>
 ) : (
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
 </svg>
 )}
 </button>
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 密码将被加密存储，访问者需要输入此密码才能查看文章内容
 </p>
 </div>
 )}
 
 {/* 操作按钮 */}
 <div className="flex gap-4 pt-6 border-t border-border">
 <button
 type="submit"
 disabled={loading || uploading}
 className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/60 text-white rounded-lg transition-colors font-medium text-lg"
 >
 {loading ? '提交中...' : uploading ? '上传中...' : postId ? '更新文章' : '发布文章'}
 </button>
 <div className="flex flex-col items-center">
 <button
 type="button"
 onClick={handleSaveDraft}
 disabled={isSaving}
 className="px-6 py-3 bg-muted hover:bg-muted dark:bg-muted dark:hover:bg-slate-600 text-foreground rounded-lg transition-colors font-medium"
 >
 {isSaving ? '保存中...' : '保存草稿'}
 </button>
 <span className="text-xs text-muted-foreground mt-1">仅保存到浏览器缓存</span>
 </div>
 {onCancel && (
 <button
 type="button"
 onClick={onCancel}
 disabled={loading || uploading}
 className="px-6 py-3 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors font-medium text-lg"
 >
 取消
 </button>
 )}
 </div>

 {/* 草稿保存成功提示 */}
 {draftSaveMessage && (
 <div className="fixed bottom-6 right-6 z-50">
 <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 <span>{draftSaveMessage}</span>
 </div>
 </div>
 )}

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
