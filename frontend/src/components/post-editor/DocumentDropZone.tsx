/**
 * 文档导入拖拽区
 *
 * 支持拖拽或点击选择 .txt/.md/.markdown/.docx 文件
 *
 * @author 博客系统
 */

import type { RefObject } from 'react';

interface ImportProgressProps {
  importing: boolean;
  importProgress: string;
}

/** 文档导入进度提示 */
export function ImportProgress({ importing, importProgress }: ImportProgressProps) {
  if (!importing) return null;

  return (
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
  );
}

interface DocumentDropZoneProps {
  isDragging: boolean;
  importing: boolean;
  dropZoneRef: RefObject<HTMLDivElement>;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (file: File) => void;
}

export function DocumentDropZone({
  isDragging,
  importing,
  dropZoneRef,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: DocumentDropZoneProps) {
  return (
    <>
      {/* 文档导入区域 */}
      <div
        ref={dropZoneRef}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
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
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  onFileSelect(file);
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
    </>
  );
}