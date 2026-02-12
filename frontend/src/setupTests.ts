/**
 * 测试设置文件
 */

// 模拟DOM环境
global.fetch = jest.fn();

// 模拟localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(() => null),
    removeItem: jest.fn(() => null),
    clear: jest.fn(() => null),
  },
  writable: true,
});

// 模拟环境变量
process.env.VITE_API_URL = 'http://localhost:8787/api';
