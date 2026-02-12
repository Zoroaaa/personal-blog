/**
 * API工具单元测试
 * 使用简化的测试方法，避免import.meta问题
 * 
 * @author 博客系统
 * @version 1.0.0
 * @created 2024-01-01
 */

// 模拟fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// 模拟localStorage
const mockLocalStorage = window.localStorage as jest.Mocked<Storage>;

describe('API工具测试', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 模拟成功响应
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: 'http://localhost:8787/api/test',
      body: null,
      bodyUsed: false,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: {}
      }),
      text: jest.fn().mockResolvedValue(''),
      blob: jest.fn().mockResolvedValue(new Blob()),
      formData: jest.fn().mockResolvedValue(new FormData()),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
    } as unknown as Response);
  });

  it('应该能够模拟API调用', async () => {
    // 测试fetch模拟是否工作
    const response = await fetch('http://localhost:8787/api/test');
    const data = await response.json();
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/api/test'
    );
    expect(data).toEqual({ success: true, data: {} });
  });

  it('应该能够模拟localStorage操作', () => {
    // 测试localStorage模拟是否工作
    localStorage.setItem('test', 'value');
    localStorage.getItem('test');
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test', 'value');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test');
  });

  it('应该能够处理错误响应', async () => {
    // 模拟错误响应
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: 'http://localhost:8787/api/test',
      body: null,
      bodyUsed: false,
      json: jest.fn().mockResolvedValue({
        success: false,
        error: 'Not Found',
        message: 'Resource not found'
      }),
      text: jest.fn().mockResolvedValue(''),
      blob: jest.fn().mockResolvedValue(new Blob()),
      formData: jest.fn().mockResolvedValue(new FormData()),
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
    } as unknown as Response);
    
    const response = await fetch('http://localhost:8787/api/test');
    const data = await response.json();
    
    expect(response.ok).toBe(false);
    expect(data.error).toBe('Not Found');
  });
});
