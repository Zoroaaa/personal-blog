/**
 * 文件上传路由
 */

import { Hono } from 'hono';
import { Env } from '../index';
import { requireAuth } from '../middleware/auth';

export const uploadRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/upload
 * 上传图片(需要认证)
 */
uploadRoutes.post('/', requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type' }, 400);
    }
    
    // 验证文件大小(最大5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: 'File too large' }, 400);
    }
    
    // 生成文件名
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    // 上传到R2
    await c.env.STORAGE.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });
    
    // 生成公开URL
    const url = `https://storage.YOUR_DOMAIN/${filename}`;
    
    return c.json({
      url,
      filename,
      size: file.size,
      type: file.type,
    }, 201);
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

/**
 * DELETE /api/upload/:filename
 * 删除文件(需要认证)
 */
uploadRoutes.delete('/:filename', requireAuth, async (c) => {
  try {
    const filename = c.req.param('filename');
    
    await c.env.STORAGE.delete(filename);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    return c.json({ error: 'Delete failed' }, 500);
  }
});
