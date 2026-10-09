/**
 * 配置页头部：标题与导入/导出/放弃更改/保存所有更改操作条
 */

import type { RefObject } from 'react';

interface ConfigHeaderProps {
  hasChanges: boolean;
  updating: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onReset: () => void;
  onBatchSave: () => void;
}

export function ConfigHeader({
  hasChanges,
  updating,
  fileInputRef,
  onImport,
  onExport,
  onReset,
  onBatchSave,
}: ConfigHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">网站配置</h1>
        <p className="text-muted-foreground">管理网站的各项配置信息</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* 导入按钮 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onImport}
          accept=".json"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-outline px-4 py-2 flex items-center gap-2"
          disabled={updating !== null}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          导入配置
        </button>

        {/* 导出按钮 */}
        <button
          onClick={onExport}
          className="btn btn-outline px-4 py-2 flex items-center gap-2"
          disabled={updating !== null}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出配置
        </button>

        {hasChanges && (
          <>
            <button
              onClick={onReset}
              className="btn btn-outline px-4 py-2"
              disabled={updating !== null}
            >
              放弃更改
            </button>
            <button
              onClick={onBatchSave}
              className="btn btn-primary px-4 py-2"
              disabled={updating !== null}
            >
              {updating === 'batch' ? '保存中...' : '保存所有更改'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}