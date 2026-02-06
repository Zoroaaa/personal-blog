/**
 * 主题管理状态 (增强版)
 * 
 * 功能:
 * - 管理系统主题(亮色/暗色)
 * - 主题切换功能
 * - 动态主色调应用 (修复)
 * - 主题设置持久化
 * - 响应式主题适配
 * - 与网站配置联动
 * 
 * @version 3.0.0 - 修复主色调功能
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
  syncWithSiteConfig: (primaryColor?: string, defaultMode?: ThemeMode) => void;
}

// 默认主题配置
const defaultTheme: ThemeConfig = {
  mode: 'system',
  primaryColor: '#3B82F6',
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

// 将十六进制颜色转为RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// 生成主题色调色板
function generateColorShades(baseColor: string): Record<string, string> {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return {};
  
  // 生成不同明暗度的颜色
  const shades = {
    50: lighten(rgb, 0.95),
    100: lighten(rgb, 0.9),
    200: lighten(rgb, 0.75),
    300: lighten(rgb, 0.6),
    400: lighten(rgb, 0.3),
    500: baseColor,
    600: darken(rgb, 0.15),
    700: darken(rgb, 0.3),
    800: darken(rgb, 0.45),
    900: darken(rgb, 0.6),
    950: darken(rgb, 0.75)
  };
  
  return shades;
}

function lighten(rgb: { r: number; g: number; b: number }, amount: number): string {
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function darken(rgb: { r: number; g: number; b: number }, amount: number): string {
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// 应用主题到DOM - 增强版
function applyThemeToDOM(mode: ThemeMode, config: ThemeConfig): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // 1. 应用主题模式class
  root.classList.remove('light', 'dark');
  root.classList.add(mode);
  
  // 2. 应用主色调到CSS变量
  const rgb = hexToRgb(config.primaryColor);
  if (rgb) {
    root.style.setProperty('--primary-color', config.primaryColor);
    root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    
    // 生成并应用色调色板
    const shades = generateColorShades(config.primaryColor);
    Object.entries(shades).forEach(([shade, color]) => {
      const shadeRgb = hexToRgb(color);
      if (shadeRgb) {
        root.style.setProperty(`--primary-${shade}`, color);
        root.style.setProperty(`--primary-${shade}-rgb`, `${shadeRgb.r}, ${shadeRgb.g}, ${shadeRgb.b}`);
      }
    });
  }
  
  // 3. 应用字体大小
  const fontSizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px'
  };
  root.style.setProperty('--base-font-size', fontSizeMap[config.fontSize]);
  
  // 4. 为body添加过渡效果
  document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
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
      
      // 设置主色调 - 增强版
      setPrimaryColor: (color) => {
        console.log('设置主色调:', color);
        set({ primaryColor: color });
        const newConfig = { ...get(), primaryColor: color };
        applyThemeToDOM(get().actualMode, newConfig);
      },
      
      // 设置字体大小
      setFontSize: (size) => {
        set({ fontSize: size });
        applyThemeToDOM(get().actualMode, { ...get(), fontSize: size });
      },
      
      // 更新实际主题模式(例如系统主题变化时)
      updateActualMode: () => {
        const { mode } = get();
        const actualMode = getActualMode(mode);
        set({ actualMode });
        applyThemeToDOM(actualMode, get());
      },
      
      // 与网站配置同步
      syncWithSiteConfig: (primaryColor?: string, defaultMode?: ThemeMode) => {
        const updates: Partial<ThemeConfig> = {};
        const currentState = get();
        
        // 只有当用户未设置自定义主色调时，才使用网站配置的主色调
        if (primaryColor && currentState.primaryColor === defaultTheme.primaryColor) {
          updates.primaryColor = primaryColor;
        }
        
        // 只有当用户未设置自定义主题模式时，才使用网站配置的默认模式
        if (defaultMode && currentState.mode === defaultTheme.mode) {
          updates.mode = defaultMode;
        }
        
        if (Object.keys(updates).length > 0) {
          const newConfig = { ...currentState, ...updates };
          const actualMode = getActualMode(newConfig.mode);
          set({ ...updates, actualMode });
          applyThemeToDOM(actualMode, newConfig);
        }
      }
    }),
    {
      name: 'theme-config',
      onRehydrateStorage: () => {
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
  const store = useThemeStore();
  
  return {
    config: {
      mode: store.mode,
      primaryColor: store.primaryColor,
      fontSize: store.fontSize
    },
    actualMode: store.actualMode,
    toggleTheme: store.toggleTheme,
    setThemeMode: store.setThemeMode,
    setPrimaryColor: store.setPrimaryColor,
    setFontSize: store.setFontSize,
    syncWithSiteConfig: store.syncWithSiteConfig
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
  { name: '靛蓝', value: '#6366F1' }
];

// 字体大小预设
export const fontSizeOptions = [
  { name: '小', value: 'small' as const },
  { name: '中', value: 'medium' as const },
  { name: '大', value: 'large' as const }
];

// 主题模式预设
export const themeModeOptions = [
  { name: '亮色', value: 'light' as const },
  { name: '暗色', value: 'dark' as const },
  { name: '跟随系统', value: 'system' as const }
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
