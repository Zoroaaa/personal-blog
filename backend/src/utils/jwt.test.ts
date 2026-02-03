import { generateToken, verifyToken } from './jwt';

// Mock Cloudflare Workers environment
const mockEnv = {
  JWT_SECRET: 'test-secret-key',
};

Object.defineProperty(globalThis, 'env', {
  value: mockEnv,
});

describe('JWT Utils', () => {
  it('should generate a valid token', async () => {
    const payload = { userId: 1, username: 'testuser' };
    const token = await generateToken(payload);
    
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });
  
  it('should verify a valid token', async () => {
    const payload = { userId: 1, username: 'testuser' };
    const token = await generateToken(payload);
    const decoded = await verifyToken(token);
    
    expect(decoded).toBeTruthy();
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.username).toBe(payload.username);
  });
  
  it('should reject an invalid token', async () => {
    const invalidToken = 'invalid-token';
    
    await expect(verifyToken(invalidToken)).rejects.toThrow();
  });
});
