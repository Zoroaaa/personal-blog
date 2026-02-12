/**
 * 登录提示弹窗组件
 * 
 * 功能：
 * - 未登录用户点击私信按钮时显示
 * - 提供前往登录和取消选项
 * - 优雅的动画效果
 * - 响应式设计
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

import { useNavigate } from 'react-router-dom';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginPromptModal({ isOpen, onClose }: LoginPromptModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">需要登录</h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-foreground mb-2">
              请先登录以使用私信功能
            </h4>
            <p className="text-sm text-muted-foreground">
              登录后可以与其他用户发送和接收私信消息
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleLogin}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            前往登录
          </button>
        </div>
      </div>
    </div>
  );
}
