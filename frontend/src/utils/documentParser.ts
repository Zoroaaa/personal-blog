// @ts-ignore - mammoth 和 jszip 是可选依赖
import mammoth from 'mammoth';
// @ts-ignore
import JSZip from 'jszip';

export interface ParsedDocument {
  title: string;
  content: string;
  images: Array<{
    id: string;
    blob: Blob;
    filename: string;
  }>;
}

/**
 * 读取文本文件内容
 */
export async function parseTextFile(file: File): Promise<ParsedDocument> {
  const content = await file.text();
  // 尝试从内容第一行提取标题
  const lines = content.split('\n');
  const title = lines[0].trim().replace(/^#+\s*/, '') || file.name.replace(/\.[^/.]+$/, '');
  
  return {
    title,
    content,
    images: []
  };
}

/**
 * 解析 Markdown 文件
 */
export async function parseMarkdownFile(file: File): Promise<ParsedDocument> {
  const content = await file.text();
  const lines = content.split('\n');
  
  // 尝试提取标题（第一个 # 开头的行）
  let title = file.name.replace(/\.[^/.]+$/, '');
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      title = match[1].trim();
      break;
    }
  }
  
  return {
    title,
    content,
    images: []
  };
}

/**
 * 解析 Word 文档 (.docx)
 * 支持提取文本和图片
 */
export async function parseWordDocument(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  
  // 提取图片
  const images: Array<{ id: string; blob: Blob; filename: string }> = [];
  
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Word 文档中的图片通常在 word/media/ 目录下
    const mediaFiles = Object.keys(zip.files).filter(
      path => path.startsWith('word/media/') && 
      (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.webp'))
    );
    
    for (const mediaPath of mediaFiles) {
      const imageFile = zip.files[mediaPath];
      if (!imageFile.dir) {
        const blob = await imageFile.async('blob');
        const ext = mediaPath.split('.').pop() || 'png';
        images.push({
          id: mediaPath,
          blob,
          filename: `image_${images.length + 1}.${ext}`
        });
      }
    }
  } catch (err) {
    console.warn('提取 Word 图片失败:', err);
  }
  
  // 使用 mammoth 提取文本内容
  const result = await mammoth.extractRawText({ arrayBuffer });
  const content = result.value;
  
  // 尝试提取标题（第一行非空内容）
  const lines = content.split('\n').filter((line: string) => line.trim());
  const title = lines[0]?.trim() || file.name.replace(/\.[^/.]+$/, '');
  
  return {
    title,
    content,
    images
  };
}

/**
 * 根据文件类型解析文档
 */
export async function parseDocument(file: File): Promise<ParsedDocument> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'txt':
      return parseTextFile(file);
    case 'md':
    case 'markdown':
      return parseMarkdownFile(file);
    case 'docx':
      return parseWordDocument(file);
    default:
      throw new Error(`不支持的文件类型: ${ext}`);
  }
}

/**
 * 检查文件是否支持
 */
export function isSupportedDocument(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['txt', 'md', 'markdown', 'docx'].includes(ext || '');
}
