/**
 * 文件上传路由（简化版）
 *
 * 功能：
 * - 图片上传到R2存储（仅存储原始文件）
 * - 文件删除
 * - 文件类型和大小验证
 *
 * 简化内容：
 * 1. 仅存储原始文件，不再生成多版本
 * 2. 保留文件验证和安全检查
 * 3. 统一API响应格式
 * 4. 详细的错误处理和日志
 *
 * @author 简化版本
 * @version 2.1.0
 */

import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { requireAuth } from '../middleware/auth';
import { createLogger } from '../middleware/requestLogger';
import { generateRandomString } from '../utils/validation';

export const uploadRoutes = new Hono<{ Bindings: Env }>();

// ============= 常量配置 =============

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png', 
  'image/gif', 
  'image/webp'
];

// 文件魔数（用于验证真实文件类型）
const FILE_SIGNATURES: { [key: string]: number[] } = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46]
};

// ============= 上传文件 =============

/**
 * POST /api/upload
 * 上传图片（需要认证）
 * 
 * 表单数据：
 * - file: File（图片文件）
 */
uploadRoutes.post('/', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    
    // ===== 1. 获取上传的文件 =====
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json(errorResponse(
        'No file provided',
        'Please select a file to upload'
      ), 400);
    }
    
    // ===== 2. 验证文件类型 =====
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return c.json(errorResponse(
        'Invalid file type',
        `Only ${ALLOWED_IMAGE_TYPES.join(', ')} files are allowed`
      ), 400);
    }
    
    // ===== 3. 验证文件大小 =====
    if (file.size > MAX_FILE_SIZE) {
      return c.json(errorResponse(
        'File too large',
        `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`
      ), 400);
    }
    
    if (file.size === 0) {
      return c.json(errorResponse(
        'Empty file',
        'The uploaded file is empty'
      ), 400);
    }
    
    // ===== 4. 读取文件内容并验证魔数 =====
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    if (!validateFileSignature(bytes, file.type)) {
      logger.warn('File signature validation failed', { 
        fileType: file.type,
        userId: user.userId 
      });
      return c.json(errorResponse(
        'Invalid file',
        'The file appears to be corrupted or is not a valid image'
      ), 400);
    }
    
    // ===== 5. 生成唯一文件名 =====
    const ext = getFileExtension(file.name);
    const timestamp = Date.now();
    const randomStr = generateRandomString(8);
    const filename = `${timestamp}-${randomStr}.${ext}`;

    // ===== 6. 上传原始文件 =====
    try {
      await c.env.STORAGE.put(filename, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          uploadedBy: user.userId.toString(),
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        }
      });
    } catch (error) {
      logger.error('R2 upload failed', error);
      return c.json(errorResponse(
        'Upload failed',
        'Failed to upload file to storage'
      ), 500);
    }

    // ===== 7. 生成公开访问URL =====
    const storageUrl = c.env.STORAGE_PUBLIC_URL || 'https://storage.your-domain.com';
    const url = `${storageUrl}/${filename}`;

    logger.info('File uploaded successfully', {
      filename,
      size: file.size,
      type: file.type,
      userId: user.userId,
    });

    return c.json(successResponse({
      url,
      filename,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    }, 'File uploaded successfully'), 201);
    
  } catch (error) {
    logger.error('Upload error', error);
    return c.json(errorResponse(
      'Upload failed',
      'An error occurred while uploading the file'
    ), 500);
  }
});

// ============= 删除文件 =============

/**
 * DELETE /api/upload/:filename
 * 删除文件（需要认证）
 * 
 * 注意：只有管理员或文件上传者可以删除文件
 */
uploadRoutes.delete('/:filename', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const user = c.get('user') as any;
    const filename = c.req.param('filename');
    
    if (!filename) {
      return c.json(errorResponse('Invalid filename'), 400);
    }
    
    // 验证文件名格式（防止路径遍历攻击）
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return c.json(errorResponse(
        'Invalid filename',
        'Filename contains invalid characters'
      ), 400);
    }
    
    // ===== 1. 获取文件元数据检查权限 =====
    try {
      const object = await c.env.STORAGE.head(filename);
      
      if (!object) {
        return c.json(errorResponse(
          'File not found',
          'The requested file does not exist'
        ), 404);
      }
      
      // 检查权限（只有上传者或管理员可以删除）
      const uploadedBy = object.customMetadata?.uploadedBy;
      if (uploadedBy && uploadedBy !== user.userId.toString() && user.role !== 'admin') {
        return c.json(errorResponse(
          'Forbidden',
          'You do not have permission to delete this file'
        ), 403);
      }
    } catch (error) {
      // 文件不存在
      return c.json(errorResponse('File not found'), 404);
    }
    
    // ===== 2. 删除文件 =====
    await c.env.STORAGE.delete(filename);
    
    logger.info('File deleted successfully', { 
      filename,
      userId: user.userId 
    });
    
    return c.json(successResponse({ deleted: true }, 'File deleted successfully'));
    
  } catch (error) {
    logger.error('Delete file error', error);
    return c.json(errorResponse(
      'Delete failed',
      'An error occurred while deleting the file'
    ), 500);
  }
});

// ============= 获取文件信息 =============

/**
 * GET /api/upload/:filename
 * 获取文件元数据（需要认证）
 */
uploadRoutes.get('/:filename', requireAuth, async (c) => {
  const logger = createLogger(c);
  
  try {
    const filename = c.req.param('filename');
    
    if (!filename) {
      return c.json(errorResponse('Invalid filename'), 400);
    }
    
    // 验证文件名格式
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return c.json(errorResponse('Invalid filename'), 400);
    }
    
    // 获取文件信息
    const object = await c.env.STORAGE.head(filename);
    
    if (!object) {
      return c.json(errorResponse('File not found'), 404);
    }
    
    const storageUrl = c.env.STORAGE_PUBLIC_URL || 'https://storage.your-domain.com';
    
    return c.json(successResponse({
      filename,
      url: `${storageUrl}/${filename}`,
      size: object.size,
      type: object.httpMetadata?.contentType,
      uploadedAt: object.customMetadata?.uploadedAt,
      uploadedBy: object.customMetadata?.uploadedBy,
      etag: object.etag
    }));
    
  } catch (error) {
    logger.error('Get file info error', error);
    return c.json(errorResponse('Failed to get file info'), 500);
  }
});

// ============= 辅助函数 =============

/**
 * 验证文件魔数（文件签名）
 */
function validateFileSignature(bytes: Uint8Array, mimeType: string): boolean {
  const signature = FILE_SIGNATURES[mimeType];
  
  if (!signature) {
    // 如果没有定义签名，跳过验证
    return true;
  }
  
  // 检查文件头是否匹配
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) {
    return 'bin'; // 默认扩展名
  }
  return parts[parts.length - 1].toLowerCase();
}

/**
 * 获取MIME类型对应的扩展名
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  
  return mimeMap[mimeType] || 'bin';
}
