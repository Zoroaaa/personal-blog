/**
 * 网站配置路由
 *
 * 功能:
 * - 获取公开配置信息
 * - 管理员更新配置
 *
 * 优化内容:
 * 1. 配置分类管理
 * 2. 类型安全的配置读取
 * 3. 批量更新配置
 *
 * @version 2.2.0
 * @author 博客系统
 * @created 2024-01-01
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { createLogger } from '../middleware/requestLogger';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getConfigValue, invalidateConfigCache } from '../services/configService';
import { createModuleLogger } from '../utils/logger';

// 模块级 logger：供请求上下文之外的辅助函数使用；请求处理器内用 createLogger(c) 局部变量
const logger = createModuleLogger('config');

// isFeatureEnabled / getConfigValue 已迁至 services/configService.ts（带 KV TTL 缓存）。
// routes 只保留 HTTP 端点与响应整形；其他文件请从 services/configService 引用，
// 不要在 routes 层重新导出，避免依赖方向再次模糊。


export const configRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

export interface UploadLimits {
  maxImageSizeMB: number;
  maxFileSizeMB: number;
  maxImageSizeBytes: number;
  maxFileSizeBytes: number;
}

const DEFAULT_UPLOAD_LIMITS: UploadLimits = {
  maxImageSizeMB: 5,
  maxFileSizeMB: 10,
  maxImageSizeBytes: 5 * 1024 * 1024,
  maxFileSizeBytes: 10 * 1024 * 1024
};

export async function getUploadLimits(env: Env): Promise<UploadLimits> {
  const maxImageSizeMB = await getConfigValue(env, 'upload_max_image_size_mb', DEFAULT_UPLOAD_LIMITS.maxImageSizeMB);
  const maxFileSizeMB = await getConfigValue(env, 'upload_max_file_size_mb', DEFAULT_UPLOAD_LIMITS.maxFileSizeMB);
  
  return {
    maxImageSizeMB,
    maxFileSizeMB,
    maxImageSizeBytes: maxImageSizeMB * 1024 * 1024,
    maxFileSizeBytes: maxFileSizeMB * 1024 * 1024
  };
}

export const PUBLIC_CONFIG_KEYS = [
  'site_name',
  'site_subtitle',
  'site_logo',
  'site_favicon',
  'site_description',
  'site_keywords',
  'site_author',
  'site_og_image',
  'site_twitter_card',
  'theme_primary_color',
  'theme_default_mode',
  'theme_font_family',
  'theme_font_url',
  'social_github',
  'social_twitter',
  'social_youtube',
  'social_telegram',
  'social_email',
  'feature_comments',
  'feature_search',
  'feature_like',
  'feature_share',
  'feature_registration',
  'feature_oauth_github',
  'feature_rss',
  'footer_text',
  'footer_links',
  'footer_tech_stack',
  'posts_per_page',
  'upload_max_image_size_mb',
  'upload_max_file_size_mb',
  'allow_html_comments',
  'max_comment_length'
];

// ============= 类型定义 =============

interface ConfigItem {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
}

interface ConfigResponse {
  [key: string]: string | number | boolean | object;
}

// ============= 辅助函数 =============

/**
 * 解析配置值为正确的类型
 */
function parseConfigValue(item: ConfigItem): any {
  const { value, type } = item;
  
  if (value === null || value === undefined) {
    return null;
  }
  
  switch (type) {
    case 'number':
      return parseFloat(value);
    case 'boolean':
      return value === 'true' || value === '1';
    case 'json':
      try {
        return JSON.parse(value);
      } catch (e) {
        logger.error('Failed to parse JSON config:', item.key, e);
        return value;
      }
    case 'string':
    default:
      return value;
  }
}

/**
 * 从数据库获取所有配置
 */
async function fetchConfigFromDB(env: Env, keysFilter?: string[]): Promise<ConfigResponse> {
  let query = 'SELECT key, value, type, category, description FROM site_config';
  const params: string[] = [];
  
  if (keysFilter && keysFilter.length > 0) {
    query += ` WHERE key IN (${keysFilter.map(() => '?').join(',')})`;
    params.push(...keysFilter);
  }
  
  try {
    const { results } = await env.DB.prepare(query).bind(...params).all();
    
    const config: ConfigResponse = {};
    (results as unknown as ConfigItem[]).forEach(item => {
      config[item.key] = parseConfigValue(item);
    });
    
    return config;
  } catch (error) {
    logger.error('Failed to fetch config from DB:', error);
    return {};
  }
}

// ============= 获取公开配置 =============

/**
 * GET /api/config
 * 获取公开的网站配置
 *
 * 特性:
 * - 只返回公开配置项
 * - 自动类型转换
 */
configRoutes.get('/', async (c) => {
  const logger = createLogger(c);

  try {
    // 获取环境配置
    const envConfig = {
      githubClientId: c.env.GITHUB_CLIENT_ID,
      frontendUrl: c.env.FRONTEND_URL
    };

    // 从数据库获取公开配置
    const dbConfig = await fetchConfigFromDB(c.env, PUBLIC_CONFIG_KEYS);

    // 合并配置
    const config = {
      ...dbConfig,
      ...envConfig
    };

    const response = successResponse(config);

    logger.info('Config fetched from database', { count: Object.keys(config).length });

    return c.json(response);

  } catch (error) {
    logger.error('Get config error', error);
    return c.json(successResponse({
      githubClientId: c.env.GITHUB_CLIENT_ID,
      frontendUrl: c.env.FRONTEND_URL,
      site_name: '我的博客',
      site_subtitle: '分享技术与生活'
    }));
  }
});

// ============= 获取所有配置 (管理员) =============

/**
 * GET /api/config/admin
 * 获取所有配置项(包括敏感配置)
 * 需要管理员权限
 */
configRoutes.get('/admin', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    // 获取所有配置(不过滤)
    const { results } = await c.env.DB.prepare(`
      SELECT key, value, type, category, description, updated_at
      FROM site_config
      ORDER BY category, key
    `).all();
    
    // 按分类分组
    const groupedConfig: Record<string, ConfigItem[]> = {};
    (results as unknown as ConfigItem[]).forEach(item => {
      if (!groupedConfig[item.category]) {
        groupedConfig[item.category] = [];
      }
      groupedConfig[item.category].push({
        ...item,
        value: parseConfigValue(item)
      });
    });
    
    logger.info('Admin config fetched', { 
      count: results.length,
      categories: Object.keys(groupedConfig).length 
    });
    
    return c.json(successResponse({
      config: groupedConfig,
      total: results.length
    }));
    
  } catch (error) {
    logger.error('Get admin config error', error);
    return c.json(errorResponse(
      'Failed to fetch config',
      'An error occurred while fetching configuration'
    ), 500);
  }
});

// ============= 更新单个配置 =============

/**
 * PUT /api/config/:key
 * 更新单个配置项
 * 需要管理员权限
 */
configRoutes.put('/:key', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const key = c.req.param('key');
    const body = await c.req.json();
    const { value } = body;
    
    // ===== 1. 验证配置键是否存在 =====
    const existing = await c.env.DB.prepare(
      'SELECT id, key, type, category FROM site_config WHERE key = ?'
    ).bind(key).first() as { id: number; key: string; type: string; category: string } | null;
    
    if (!existing) {
      return c.json(errorResponse('Config not found'), 404);
    }
    
    // ===== 2. 类型验证 =====
    let processedValue = value;
    
    if (existing.type === 'number') {
      processedValue = typeof value === 'number' ? value.toString() : value;
      if (isNaN(parseFloat(processedValue))) {
        return c.json(errorResponse('Invalid number value'), 400);
      }
    } else if (existing.type === 'boolean') {
      if (typeof value === 'boolean') {
        processedValue = value ? 'true' : 'false';
      } else if (value !== 'true' && value !== 'false') {
        return c.json(errorResponse('Invalid boolean value'), 400);
      }
    } else if (existing.type === 'json') {
      try {
        processedValue = typeof value === 'string' ? value : JSON.stringify(value);
        JSON.parse(processedValue); // 验证JSON有效性
      } catch (e) {
        return c.json(errorResponse('Invalid JSON value'), 400);
      }
    }
    
    // ===== 3. 更新数据库 =====
    await c.env.DB.prepare(
      'UPDATE site_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?'
    ).bind(processedValue, key).run();

    // 写后失效读缓存：热路径（feature 开关等）读的是 KV 缓存，不失效会改了不生效。
    // 路由模式 /:key 保证 key 必存在，Hono 参数类型未收窄故此处断言
    await invalidateConfigCache(c.env, key!);

    logger.info('Config updated', { key, value: processedValue });
    
    return c.json(successResponse({ 
      key, 
      value: parseConfigValue({ ...existing!, value: processedValue, type: existing!.type as 'string' | 'number' | 'boolean' | 'json' }) 
    }, 'Config updated successfully'));
    
  } catch (error) {
    logger.error('Update config error', error);
    return c.json(errorResponse(
      'Failed to update config',
      'An error occurred while updating configuration'
    ), 500);
  }
});

// ============= 批量更新配置 =============

/**
 * PUT /api/config
 * 批量更新多个配置项
 * 需要管理员权限
 * 
 * 请求体:
 * {
 *   "configs": {
 *     "site_name": "新博客名称",
 *     "theme_primary_color": "#FF5733",
 *     "feature_comments": true
 *   }
 * }
 */
configRoutes.put('/', requireAuth, requireAdmin, async (c) => {
  const logger = createLogger(c);
  
  try {
    const body = await c.req.json();
    const { configs } = body;
    
    if (!configs || typeof configs !== 'object') {
      return c.json(errorResponse('Invalid request format'), 400);
    }
    
    // ===== 1. 获取所有待更新配置的元数据 =====
    const keys = Object.keys(configs);
    const { results: existingConfigs } = await c.env.DB.prepare(`
      SELECT key, type FROM site_config WHERE key IN (${keys.map(() => '?').join(',')})
    `).bind(...keys).all() as { results: { key: string; type: string }[] };
    
    const configMap = new Map(
      existingConfigs.map(c => [c.key, c.type])
    );
    
    // ===== 2. 验证并更新每个配置 =====
    const updates: Array<{ key: string; value: string }> = [];
    const errors: Array<{ key: string; error: string }> = [];
    
    for (const [key, value] of Object.entries(configs)) {
      const type = configMap.get(key);
      
      if (!type) {
        errors.push({ key, error: 'Config not found' });
        continue;
      }
      
      // 类型转换
      let processedValue: string;
      
      try {
        if (type === 'number') {
          processedValue = typeof value === 'number' ? value.toString() : String(value);
        } else if (type === 'boolean') {
          processedValue = Boolean(value) ? 'true' : 'false';
        } else if (type === 'json') {
          processedValue = typeof value === 'string' ? value : JSON.stringify(value);
          JSON.parse(processedValue); // 验证
        } else {
          processedValue = String(value);
        }
        
        updates.push({ key, value: processedValue });
      } catch (e) {
        errors.push({ key, error: 'Invalid value type' });
      }
    }
    
    // ===== 3. 批量执行更新 =====
    for (const { key, value } of updates) {
      await c.env.DB.prepare(
        'UPDATE site_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?'
      ).bind(value, key).run();
    }

    // 逐 key 失效读缓存（同单个更新端点）；safeDeleteCache 内部吞错，失败只影响
    // 该 key 的生效延迟（最多一个 TTL），不阻塞批量更新结果
    await Promise.all(updates.map(({ key }) => invalidateConfigCache(c.env, key)));

    logger.info('Configs batch updated', {
      updated: updates.length,
      failed: errors.length
    });
    
    return c.json(successResponse({
      updated: updates.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    }, `Successfully updated ${updates.length} configs`));
    
  } catch (error) {
    logger.error('Batch update config error', error);
    return c.json(errorResponse(
      'Failed to update configs',
      'An error occurred while updating configurations'
    ), 500);
  }
});

// 已移除 POST /:key/reset 占位路由：
// 该接口无前端入口、无默认值映射、始终返回 "not implemented yet"，
// 属于未完成实现。site_config 表也没有 default_value 列可作为恢复来源。
// 若将来需要重置能力，应先在 schema 中引入默认值再新增真实实现。


