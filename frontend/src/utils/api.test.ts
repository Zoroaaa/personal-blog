import { apiRequest, isAuthenticated, getCurrentUser } from './api';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('apiRequest', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockLocalStorage.clear();
  });
  
  it('should make a successful API request', async () => {
    const mockResponse = {
      success: true,
      data: { message: 'Test' },
    };
    
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as Response);
    
    const result = await apiRequest('/test');
    
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });
  
  it('should handle authentication token', async () => {
    mockLocalStorage.setItem('auth-storage', JSON.stringify({
      state: {
        token: 'test-token',
      },
    }));
    
    const mockResponse = {
      success: true,
      data: { message: 'Test' },
    };
    
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockResponse),
    } as Response);
    
    await apiRequest('/test');
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
      })
    );
  });
  
  it('should handle API errors', async () => {
    const mockErrorResponse = {
      success: false,
      error: 'Test error',
    };
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue(mockErrorResponse),
    } as Response);
    
    await expect(apiRequest('/test')).rejects.toThrow('Test error');
  });
});

describe('isAuthenticated', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });
  
  it('should return true when user is authenticated', () => {
    mockLocalStorage.setItem('auth-storage', JSON.stringify({
      state: {
        token: 'test-token',
      },
    }));
    
    expect(isAuthenticated()).toBe(true);
  });
  
  it('should return false when user is not authenticated', () => {
    expect(isAuthenticated()).toBe(false);
  });
});

describe('getCurrentUser', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });
  
  it('should return user when authenticated', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
    };
    
    mockLocalStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: mockUser,
      },
    }));
    
    expect(getCurrentUser()).toEqual(mockUser);
  });
  
  it('should return null when not authenticated', () => {
    expect(getCurrentUser()).toBeNull();
  });
});
