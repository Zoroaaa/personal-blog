/**
 * 编辑器底部操作区
 *
 * 提交/更新文章、保存草稿、取消，以及草稿保存成功提示
 *
 * @author 博客系统
 */

interface EditorActionsProps {
  loading: boolean;
  uploading: boolean;
  isSaving: boolean;
  postId?: number;
  onSaveDraft: () => void;
  onCancel?: () => void;
  draftSaveMessage: string | null;
}

export function EditorActions({
  loading,
  uploading,
  isSaving,
  postId,
  onSaveDraft,
  onCancel,
  draftSaveMessage,
}: EditorActionsProps) {
  return (
    <>
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
            onClick={onSaveDraft}
            disabled={isSaving}
            className="px-6 py-3 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors font-medium"
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
    </>
  );
}