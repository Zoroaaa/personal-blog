/**
 * JWT 工具函数
 * 
 * 功能：
 * - 生成JWT token（Access Token 和 Refresh Token）
 * - 验证JWT token
 * - 提供HMAC-SHA256签名
 * - 实现Base64 URL编码/解码
 * 
 * 使用Web Crypto API实现JWT签名和验证
 * 
 * @author 博客系统
 * @version 2.0.0
 * @created 2024-01-01
 * @updated 2026-02-18 - 添加 Refresh Token 支持
 */

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  exp: number;
  type: 'access' | 'refresh';
}

export interface PostPasswordPayload {
  postId: number;
  type: string;
  exp: number;
}

export type TokenPayload = JWTPayload | PostPasswordPayload | Record<string, any>;

declare const __brand: unique symbol;

export type JWTToken = string & { readonly [__brand]: 'JWTToken' };
export type Secret = string & { readonly [__brand]: 'Secret' };

export function asJWTToken(token: string): JWTToken {
  return token as JWTToken;
}

export function asSecret(secret: string): Secret {
  return secret as Secret;
}

/**
 * 生成 Access Token
 * 
 * @param secret 密钥字符串
 * @param payload 用户信息载荷
 * @param expiresInSeconds 有效期（秒）
 * @returns Access Token
 */
export async function generateAccessToken(
  secret: Secret | string,
  payload: { userId: number; username: string; role: string },
  expiresInSeconds: number
): Promise<JWTToken> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  
  const fullPayload: JWTPayload = {
    ...payload,
    exp,
    type: 'access'
  };
  
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));
  
  const signature = await sign(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );
  
  return asJWTToken(`${encodedHeader}.${encodedPayload}.${signature}`);
}

/**
 * 生成 Refresh Token
 * 
 * @param secret 密钥字符串
 * @param payload 用户信息载荷
 * @param expiresInSeconds 有效期（秒）
 * @returns Refresh Token
 */
export async function generateRefreshToken(
  secret: Secret | string,
  payload: { userId: number; username: string; role: string },
  expiresInSeconds: number
): Promise<JWTToken> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  
  const fullPayload: JWTPayload = {
    ...payload,
    exp,
    type: 'refresh'
  };
  
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));
  
  const signature = await sign(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );
  
  return asJWTToken(`${encodedHeader}.${encodedPayload}.${signature}`);
}

/**
 * 生成JWT token（兼容旧接口）
 * 
 * 功能：使用HMAC-SHA256算法生成JWT token
 * 
 * @param secret 密钥字符串
 * @param payload JWT载荷，可以包含 expiresIn 字段自定义过期时间
 * @returns 生成的JWT token字符串
 */
export async function generateToken(
  secret: Secret | string,
  payload: Record<string, any>
): Promise<JWTToken> {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  let exp: number;
  if (payload.expiresIn) {
    const expiresIn = payload.expiresIn;
    delete payload.expiresIn;
    
    if (typeof expiresIn === 'string') {
      const match = expiresIn.match(/^(\d+)([hd])$/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2];
        if (unit === 'h') {
          exp = Math.floor(Date.now() / 1000) + value * 60 * 60;
        } else {
          exp = Math.floor(Date.now() / 1000) + value * 24 * 60 * 60;
        }
      } else {
        exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
      }
    } else {
      exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
    }
  } else {
    exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  }
  
  const fullPayload = { ...payload, exp };
  
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));
  
  const signature = await sign(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );
  
  return asJWTToken(`${encodedHeader}.${encodedPayload}.${signature}`);
}

/**
 * 验证JWT token
 * 
 * 功能：验证JWT token的格式、签名和过期时间
 * 
 * @param token JWT token字符串
 * @param secret 密钥字符串
 * @returns 解码后的JWT载荷
 * @throws 当token格式无效、签名错误或过期时抛出异常
 */
export async function verifyToken(
  token: JWTToken | string,
  secret: Secret | string
): Promise<TokenPayload> {
  if (!token || !token.includes('.')) {
    throw new Error('Invalid token: must be in JWT format (xxx.yyy.zzz)');
  }
  
  if (!secret || secret.includes('.')) {
    throw new Error('Invalid secret: must not be in JWT format');
  }
  
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  const [encodedHeader, encodedPayload, signature] = parts;
  
  const expectedSignature = await sign(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }
  
  const payload = JSON.parse(base64urlDecode(encodedPayload)) as TokenPayload;
  
  if ((payload as any).exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  
  return payload;
}

/**
 * HMAC-SHA256签名
 * 
 * 功能：使用HMAC-SHA256算法对数据进行签名
 * 
 * @param data 要签名的数据字符串
 * @param secret 密钥字符串
 * @returns 签名后的Base64 URL编码字符串
 */
async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  return base64urlEncode(signature);
}

/**
 * Base64 URL编码
 * 
 * 功能：将字符串或ArrayBuffer编码为Base64 URL格式
 * 
 * @param data 要编码的数据，可以是字符串或ArrayBuffer
 * @returns Base64 URL编码后的字符串
 */
function base64urlEncode(data: string | ArrayBuffer): string {
  let base64: string;
  
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL解码
 * 
 * 功能：将Base64 URL格式的字符串解码为原始字符串
 * 
 * @param str Base64 URL编码的字符串
 * @returns 解码后的原始字符串
 */
function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  
  while (str.length % 4) {
    str += '=';
  }
  
  return atob(str);
}
