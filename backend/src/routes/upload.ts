/**
 * 文件上传路由（重构版）
 *
 * 功能：
 * - 图片上传到R2存储
 * - 文件删除
 * - 文件信息获取
 *
 * 安全措施：
 * - 速率限制
 * - 文件大小预检
 * - 文件类型验证
 *
 * @version 2.2.0
 * @author 博客系统
 * @created 2024-01-01
 * @refactored 2026-02-16
 * @updated 2026-02-18 - 添加安全加固
 */

import { Hono } from 'hono';
import { Env, Variables } from '../types';
import { successResponse, errorResponse, getStatus } from '../utils/response';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { createLogger } from '../middleware/requestLogger';
import { UploadService, UPLOAD_CONSTANTS } from '../services/uploadService';

export const uploadRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: '1 分钟内最多上传 5 个文件'
});

function checkContentLength(c: any, maxSize: number): boolean {
  const contentLength = c.req.header('content-length');
  if (contentLength) {
    const length = parseInt(contentLength, 10);
    if (length > maxSize * 1.1) {
      return false;
    }
  }
  return true;
}

uploadRoutes.post('/', uploadRateLimit, requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    if (!checkContentLength(c, UPLOAD_CONSTANTS.MAX_IMAGE_SIZE)) {
      return c.json(errorResponse('File too large', `文件大小不能超过 ${UPLOAD_CONSTANTS.MAX_IMAGE_SIZE / 1024 / 1024}MB`), 413);
    }

    const user = c.get('user') as any;

    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json(errorResponse('No file provided', 'Please select a file to upload'), 400);
    }

    const storageUrl = c.env.STORAGE_PUBLIC_URL || 'https://storage.your-domain.com';
    const result = await UploadService.uploadImage(c.env.STORAGE, file, user.userId, storageUrl);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('File uploaded successfully', {
      filename: result.data?.filename,
      size: result.data?.size,
      type: result.data?.type,
      userId: user.userId,
    });

    return c.json(successResponse(result.data, 'File uploaded successfully'), 201);
  } catch (error) {
    logger.error('Upload error', error);
    return c.json(errorResponse('Upload failed', 'An error occurred while uploading the file'), 500);
  }
});

uploadRoutes.delete('/:filename', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const user = c.get('user') as any;
    const filename = c.req.param('filename');

    if (!filename) {
      return c.json(errorResponse('Invalid filename'), 400);
    }

    const result = await UploadService.deleteFile(c.env.STORAGE, filename, user.userId, user.role);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    logger.info('File deleted successfully', { filename, userId: user.userId });

    return c.json(successResponse(result.data, 'File deleted successfully'));
  } catch (error) {
    logger.error('Delete file error', error);
    return c.json(errorResponse('Delete failed', 'An error occurred while deleting the file'), 500);
  }
});

uploadRoutes.get('/:filename', requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    const filename = c.req.param('filename');

    if (!filename) {
      return c.json(errorResponse('Invalid filename'), 400);
    }

    const storageUrl = c.env.STORAGE_PUBLIC_URL || 'https://storage.your-domain.com';
    const result = await UploadService.getFileInfo(c.env.STORAGE, filename, storageUrl);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 404));
    }

    return c.json(successResponse(result.data));
  } catch (error) {
    logger.error('Get file info error', error);
    return c.json(errorResponse('Failed to get file info'), 500);
  }
});

uploadRoutes.post('/file', uploadRateLimit, requireAuth, async (c) => {
  const logger = createLogger(c);

  try {
    if (!checkContentLength(c, UPLOAD_CONSTANTS.MAX_FILE_SIZE)) {
      return c.json(errorResponse('File too large', `文件大小不能超过 ${UPLOAD_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB`), 413);
    }

    const user = c.get('user') as any;

    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json(errorResponse('No file provided', '请选择要上传的文件'), 400);
    }

    const storageUrl = c.env.STORAGE_PUBLIC_URL || 'https://storage.your-domain.com';
    const result = await UploadService.uploadFile(c.env.STORAGE, file, user.userId, storageUrl);

    if (!result.success) {
      return c.json(errorResponse(result.message || 'Error'), getStatus(result.statusCode, 400));
    }

    logger.info('File uploaded successfully', {
      filename: result.data?.filename,
      size: result.data?.size,
      type: result.data?.type,
      userId: user.userId,
    });

    return c.json(successResponse(result.data, '文件上传成功'), 201);
  } catch (error) {
    logger.error('Upload error', error);
    return c.json(errorResponse('Upload failed', '文件上传失败'), 500);
  }
});
