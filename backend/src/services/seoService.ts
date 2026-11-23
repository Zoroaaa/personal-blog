/**
 * SEO 服务：文章页 meta 注入与站点地图
 *
 * 为什么在 Worker 侧做：前端是 SPA，OG/canonical 只靠客户端 useEffect 注入时，
 * 微信/微博等不执行 JS 的爬虫拿不到任何 meta，分享卡片必挂。
 * 单 Worker 同域托管静态资源，正好在出壳前把 meta 写进 index.html（比上 SSR 便宜一个量级）。
 */

/** 文章 SEO 所需的最小字段（避免整篇 content 进内存） */
export interface PostSeoMeta {
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  coverImage: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string | null;
}

/** 只在 HTML <head> 里插值的字段必须转义，防止标题/摘要闭合标签注入 */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 从 Markdown 摘要/正文提取纯文本描述（截 160 字） */
function buildDescription(meta: { summary: string | null; title: string }, content?: string | null): string {
  const source = meta.summary || content || '';
  const plain = source
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.slice(0, 160) || meta.title;
}

export class SeoService {
  /** 按 slug 取公开文章的 SEO 元信息；密码/草稿/已删文章返回 null（不出 meta） */
  static async getPostSeoMeta(db: any, slug: string): Promise<PostSeoMeta | null> {
    // D1 行是蛇形列名，与对外的 PostSeoMeta（驼峰）分开建模
    interface RawRow {
      slug: string;
      title: string;
      summary: string | null;
      content: string | null;
      cover_image: string | null;
      visibility: string;
      created_at: string;
      updated_at: string | null;
    }
    const row = await db
      .prepare(
        `SELECT slug, title, summary, content, cover_image, visibility, created_at, updated_at
         FROM posts
         WHERE slug = ? AND status = 'published' AND deleted_at IS NULL
           AND visibility IN ('public', 'password')`
      )
      .bind(slug)
      .first() as RawRow | null;

    if (!row) return null;

    return {
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      // content 只用于生成 description，不对外返回
      description: buildDescription(row, row.content),
      coverImage: row.cover_image,
      visibility: row.visibility,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** 生成注入 <head> 的 meta 标签串 */
  static buildHeadTags(meta: PostSeoMeta | null, baseUrl: string): string {
    const siteName = '个人博客';
    const url = meta ? `${baseUrl}/posts/${encodeURIComponent(meta.slug)}` : baseUrl;
    const title = meta ? `${meta.title} - ${siteName}` : siteName;
    const description = meta?.description || '个人博客';
    const image = meta?.coverImage || `${baseUrl}/default-og-image.png`;

    // 密码保护文章不进搜索引擎（内容摘要仍可显示在分享卡片，但不收录）
    const robots = meta && meta.visibility !== 'public' ? '<meta name="robots" content="noindex,nofollow">' : '';

    return [
      `<title>${escapeHtml(title)}</title>`,
      `<meta name="description" content="${escapeHtml(description)}">`,
      `<link rel="canonical" href="${escapeHtml(url)}">`,
      `<meta property="og:site_name" content="${escapeHtml(siteName)}">`,
      `<meta property="og:title" content="${escapeHtml(meta?.title || title)}">`,
      `<meta property="og:description" content="${escapeHtml(description)}">`,
      `<meta property="og:type" content="${meta ? 'article' : 'website'}">`,
      `<meta property="og:url" content="${escapeHtml(url)}">`,
      `<meta property="og:image" content="${escapeHtml(image)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${escapeHtml(meta?.title || title)}">`,
      `<meta name="twitter:description" content="${escapeHtml(description)}">`,
      meta ? `<meta property="article:published_time" content="${escapeHtml(meta.createdAt)}">` : '',
      meta && meta.updatedAt ? `<meta property="article:modified_time" content="${escapeHtml(meta.updatedAt)}">` : '',
      robots,
    ]
      .filter(Boolean)
      .join('');
  }

  /** 生成站点地图（首页 + 静态页 + 公开文章，上限 5000 条） */
  static async buildSitemapXml(db: any, baseUrl: string): Promise<string> {
    const { results } = await db
      .prepare(
        `SELECT slug, updated_at FROM posts
         WHERE status = 'published' AND deleted_at IS NULL AND visibility = 'public'
         ORDER BY COALESCE(updated_at, created_at) DESC
         LIMIT 5000`
      )
      .all();

    const urls: string[] = [
      `<url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      `<url><loc>${baseUrl}/about</loc><priority>0.5</priority></url>`,
    ];

    for (const row of results || []) {
      const lastmod = row.updated_at ? `\n  <lastmod>${escapeHtml(String(row.updated_at).slice(0, 10))}</lastmod>` : '';
      urls.push(`<url><loc>${baseUrl}/posts/${encodeURIComponent(row.slug)}</loc>${lastmod}<priority>0.8</priority></url>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  }
}
