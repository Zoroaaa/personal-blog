/**
 * 主题管理状态
 * 
 * 功能：
 * - 管理系统主题（亮色/暗色）
 * - 主题切换功能
 * - 主题设置持久化
 * - 响应式主题适配
 * 
 * @author 优化版本
 * @version 2.0.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 主题类型
export type ThemeMode = 'light' | 'dark' | 'system';

// 主题配置接口
export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
}

// 主题状态接口
interface ThemeState extends ThemeConfig {
  actualMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  updateActualMode: () => void;
}

// 默认主题配置
const defaultTheme: ThemeConfig = {
  mode: 'system',
  primaryColor: '#3B82F6', // 蓝色
  fontSize: 'medium'
};

// 检测系统主题
function getSystemTheme(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// 计算实际主题模式
function getActualMode(mode: ThemeMode): ThemeMode {
  return mode === 'system' ? getSystemTheme() : mode;
}

// 应用主题到DOM
function applyThemeToDOM(mode: ThemeMode, config: ThemeConfig): void {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(mode);
    
    // 应用主色调
    document.documentElement.style.setProperty('--primary-color', config.primaryColor);
    
    // 应用字体大小
    document.documentElement.style.setProperty('--font-size', 
      config.fontSize === 'small' ? '0.875rem' : 
      config.fontSize === 'large' ? '1.125rem' : '1rem'
    );
  }
}

// 创建主题状态管理
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      ...defaultTheme,
      actualMode: getSystemTheme(),
      
      // 切换主题
      toggleTheme: () => {
        const { actualMode } = get();
        const newMode = actualMode === 'light' ? 'dark' : 'light';
        set({ mode: newMode, actualMode: newMode });
        applyThemeToDOM(newMode, get());
      },
      
      // 设置主题模式
      setThemeMode: (mode) => {
        const actualMode = getActualMode(mode);
        set({ mode, actualMode });
        applyThemeToDOM(actualMode, get());
      },
      
      // 设置主色调
      setPrimaryColor: (color) => {
        set({ primaryColor: color });
        applyThemeToDOM(get().actualMode, { ...get(), primaryColor: color });
      },
      
      // 设置字体大小
      setFontSize: (size) => {
        set({ fontSize: size });
        applyThemeToDOM(get().actualMode, { ...get(), fontSize: size });
      },
      
      // 更新实际主题模式（例如系统主题变化时）
      updateActualMode: () => {
        const { mode } = get();
        const actualMode = getActualMode(mode);
        set({ actualMode });
        applyThemeToDOM(actualMode, get());
      }
    }),
    {
      name: 'theme-config', // localStorage key
      onRehydrateStorage: () => {
        // 当状态从存储中恢复时
        return (state) => {
          if (state) {
            applyThemeToDOM(state.actualMode, state);
          }
        };
      }
    }
  )
);

// 主题管理钩子
export function useTheme() {
  const { 
    mode, 
    actualMode, 
    primaryColor, 
    fontSize, 
    toggleTheme, 
    setThemeMode, 
    setPrimaryColor, 
    setFontSize 
  } = useThemeStore();
  
  return {
    config: {
      mode,
      primaryColor,
      fontSize
    },
    actualMode,
    toggleTheme,
    setThemeMode,
    setPrimaryColor,
    setFontSize
  };
}

// 主题颜色预设
export const themeColors = [
  { name: '蓝色', value: '#3B82F6' },
  { name: '绿色', value: '#10B981' },
  { name: '红色', value: '#EF4444' },
  { name: '紫色', value: '#8B5CF6' },
  { name: '橙色', value: '#F59E0B' },
  { name: '粉色', value: '#EC4899' },
  { name: '青色', value: '#06B6D4' },
  { name: '琥珀色', value: '#F59E0B' }
];

// 字体大小预设
export const fontSizeOptions = [
  { name: '小', value: 'small' },
  { name: '中', value: 'medium' },
  { name: '大', value: 'large' }
];

// 主题模式预设
export const themeModeOptions = [
  { name: '亮色', value: 'light' },
  { name: '暗色', value: 'dark' },
  { name: '跟随系统', value: 'system' }
];

// 初始化主题
if (typeof window !== 'undefined') {
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  mediaQuery.addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      state.updateActualMode();
    }
  });
  
  // 初始化应用主题
  const initialState = useThemeStore.getState();
  applyThemeToDOM(initialState.actualMode, initialState);
}
