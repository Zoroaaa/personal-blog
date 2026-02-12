/**
 * 自动保存状态组件
 * 
 * 功能：
 * - 显示保存中状态
 * - 显示已保存状态和时间
 * - 显示草稿状态
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

interface AutoSaveStatusProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasDraft: boolean;
  className?: string;
}

export function AutoSaveStatus({ isSaving, lastSaved, hasDraft, className = '' }: AutoSaveStatusProps) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isSaving && (
        <>
          <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-blue-600 dark:text-blue-400">保存中...</span>
        </>
      )}
      
      {!isSaving && lastSaved && (
        <>
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600 dark:text-green-400">
            已保存于 {lastSaved.toLocaleTimeString()}
          </span>
        </>
      )}
      
      {!isSaving && !lastSaved && hasDraft && (
        <>
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-yellow-600 dark:text-yellow-400">未保存</span>
        </>
      )}
      
      {hasDraft && (
        <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full">
          草稿
        </span>
      )}
    </div>
  );
}
