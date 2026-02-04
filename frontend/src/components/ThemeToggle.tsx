/**
 * 主题切换组件
 * 
 * 功能：
 * - 主题模式切换（亮色/暗色/系统）
 * - 主色调选择
 * - 字体大小调整
 * - 响应式设计
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { useState } from 'react';
import { useTheme, themeColors, fontSizeOptions, themeModeOptions, ThemeMode } from '../stores/themeStore';

export function ThemeToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const { config, actualMode, setThemeMode, setPrimaryColor, setFontSize } = useTheme();
  
  // 切换主题菜单
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  // 关闭主题菜单
  const closeMenu = () => {
    setIsOpen(false);
  };
  
  // 切换主题模式
  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };
  
  // 选择主色调
  const handleColorChange = (color: string) => {
    setPrimaryColor(color);
  };
  
  // 调整字体大小
  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size);
  };
  
  // 渲染主题模式图标
  const renderThemeIcon = () => {
    switch (actualMode) {
      case 'dark':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        );
      case 'light':
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
    }
  };
  
  return (
    <div className="relative">
      {/* 主题切换按钮 */}
      <button
        onClick={toggleMenu}
        className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
        aria-label="主题设置"
      >
        {renderThemeIcon()}
        <span className="hidden sm:inline">主题</span>
      </button>
      
      {/* 主题设置菜单 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-3 z-50">
          {/* 主题模式 */}
          <div className="px-4 mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">主题模式</h3>
            <div className="grid grid-cols-3 gap-2">
              {themeModeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleThemeModeChange(option.value as ThemeMode)}
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${config.mode === option.value ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* 主色调选择 */}
          <div className="px-4 mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">主色调</h3>
            <div className="grid grid-cols-4 gap-2">
              {themeColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorChange(color.value)}
                  className={`w-8 h-8 rounded-full transition-transform ${config.primaryColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color.value }}
                  aria-label={color.name}
                />
              ))}
            </div>
          </div>
          
          {/* 字体大小 */}
          <div className="px-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">字体大小</h3>
            <div className="grid grid-cols-3 gap-2">
              {fontSizeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFontSizeChange(option.value as 'small' | 'medium' | 'large')}
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${config.fontSize === option.value ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
