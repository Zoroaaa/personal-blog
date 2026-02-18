/**
 * 文件上传服务
 *
 * 功能：
 * - 图片上传到R2存储
 * - 文件删除
 * - 文件类型和大小验证
 * - 文件魔数验证
 * - 动态上传大小限制（从系统配置读取）
 *
 * @author 博客系统
 * @version 2.0.0
 * @created 2026-02-16
 * @updated 2026-02-19 - 支持动态上传大小限制
 */

import { generateRandomString } from '../utils/validation';

const DEFAULT_MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'application/zip',
  'application/x-rar-compressed',
  'text/javascript',
  'application/json',
  'text/html',
  'text/css'
];

const FILE_SIGNATURES: { [key: string]: number[] } = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46]
};

export interface UploadResult {
  success: boolean;
  data?: {
    url?: string;
    filename?: string;
    size?: number;
    type?: string;
    uploadedAt?: string;
    deleted?: boolean;
    uploadedBy?: string;
    etag?: string;
  };
  message?: string;
  statusCode?: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
}

export class UploadService {
  static validateImageType(mimeType: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimeType);
  }

  static validateFileType(mimeType: string): boolean {
    return ALLOWED_FILE_TYPES.includes(mimeType);
  }

  static validateImageSize(size: number, maxSize: number = DEFAULT_MAX_IMAGE_SIZE): boolean {
    return size > 0 && size <= maxSize;
  }

  static validateFileSize(size: number, maxSize: number = DEFAULT_MAX_FILE_SIZE): boolean {
    return size > 0 && size <= maxSize;
  }

  static validateFileSignature(bytes: Uint8Array, mimeType: string): boolean {
    const signature = FILE_SIGNATURES[mimeType];

    if (!signature) {
      return true;
    }

    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  static validateFilename(filename: string): boolean {
    return !filename.includes('/') && !filename.includes('\\') && !filename.includes('..');
  }

  static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length < 2) {
      return 'bin';
    }
    return parts[parts.length - 1].toLowerCase();
  }

  static generateFilename(originalName: string, prefix: string = ''): string {
    const ext = this.getFileExtension(originalName);
    const timestamp = Date.now();
    const randomStr = generateRandomString(8);
    return prefix ? `${prefix}/${timestamp}-${randomStr}.${ext}` : `${timestamp}-${randomStr}.${ext}`;
  }

  static async uploadImage(storage: any, file: File, userId: number, storageUrl: string, maxSizeBytes: number = DEFAULT_MAX_IMAGE_SIZE): Promise<UploadResult> {
    if (!this.validateImageType(file.type)) {
      return {
        success: false,
        message: `Only ${ALLOWED_IMAGE_TYPES.join(', ')} files are allowed`,
        statusCode: 400
      };
    }

    if (!this.validateImageSize(file.size, maxSizeBytes)) {
      return {
        success: false,
        message: `File size must be less than ${maxSizeBytes / 1024 / 1024}MB`,
        statusCode: 400
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (!this.validateFileSignature(bytes, file.type)) {
      return {
        success: false,
        message: 'The file appears to be corrupted or is not a valid image',
        statusCode: 400
      };
    }

    const filename = this.generateFilename(file.name);

    try {
      await storage.put(filename, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          uploadedBy: userId.toString(),
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('R2 upload failed:', error);
      return {
        success: false,
        message: 'Failed to upload file to storage',
        statusCode: 500
      };
    }

    const url = `${storageUrl}/${filename}`;

    return {
      success: true,
      data: {
        url,
        filename,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      }
    };
  }

  static async uploadFile(storage: any, file: File, userId: number, storageUrl: string, maxSizeBytes: number = DEFAULT_MAX_FILE_SIZE): Promise<UploadResult> {
    if (!this.validateFileType(file.type)) {
      return {
        success: false,
        message: `不支持的文件类型: ${file.type || 'unknown'}`,
        statusCode: 400
      };
    }

    if (!this.validateFileSize(file.size, maxSizeBytes)) {
      return {
        success: false,
        message: `文件大小不能超过 ${maxSizeBytes / 1024 / 1024}MB`,
        statusCode: 400
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const filename = this.generateFilename(file.name, 'files');

    try {
      await storage.put(filename, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          uploadedBy: userId.toString(),
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('R2 upload failed:', error);
      return {
        success: false,
        message: '文件上传失败',
        statusCode: 500
      };
    }

    const url = `${storageUrl}/${filename}`;

    return {
      success: true,
      data: {
        url,
        filename: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      }
    };
  }

  static async deleteFile(storage: any, filename: string, userId: number, userRole: string): Promise<UploadResult> {
    if (!this.validateFilename(filename)) {
      return {
        success: false,
        message: 'Filename contains invalid characters',
        statusCode: 400
      };
    }

    try {
      const object = await storage.head(filename);

      if (!object) {
        return {
          success: false,
          message: 'The requested file does not exist',
          statusCode: 404
        };
      }

      const uploadedBy = object.customMetadata?.uploadedBy;
      if (uploadedBy && uploadedBy !== userId.toString() && userRole !== 'admin') {
        return {
          success: false,
          message: 'You do not have permission to delete this file',
          statusCode: 403
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'File not found',
        statusCode: 404
      };
    }

    await storage.delete(filename);

    return {
      success: true,
      data: { deleted: true }
    };
  }

  static async getFileInfo(storage: any, filename: string, storageUrl: string): Promise<UploadResult> {
    if (!this.validateFilename(filename)) {
      return {
        success: false,
        message: 'Invalid filename',
        statusCode: 400
      };
    }

    const object = await storage.head(filename);

    if (!object) {
      return {
        success: false,
        message: 'File not found',
        statusCode: 404
      };
    }

    return {
      success: true,
      data: {
        filename,
        url: `${storageUrl}/${filename}`,
        size: object.size,
        type: object.httpMetadata?.contentType,
        uploadedAt: object.customMetadata?.uploadedAt,
        uploadedBy: object.customMetadata?.uploadedBy,
        etag: object.etag
      }
    };
  }
}

export const UPLOAD_CONSTANTS = {
  DEFAULT_MAX_IMAGE_SIZE,
  DEFAULT_MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_FILE_TYPES
};
