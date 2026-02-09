// @ts-ignore - mammoth 和 jszip 是可选依赖
import mammoth from 'mammoth';
// @ts-ignore
import JSZip from 'jszip';

export interface ParsedImage {
  id: string;
  blob: Blob;
  filename: string;
  index: number;
}

export interface ParsedDocument {
  title: string;
  content: string;
  images: ParsedImage[];
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
 * 支持提取文本和图片，并保持图片在文档中的位置
 */
export async function parseWordDocument(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();

  // 提取图片
  const images: ParsedImage[] = [];
  // 图片位置映射：图片ID -> 在文档中的位置索引
  const imagePositionMap = new Map<string, number>();

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. 解析 document.xml 以获取图片在文档中的位置顺序
    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (documentXml) {
      // 提取所有图片引用，保持它们在文档中出现的顺序
      // Word 中的图片引用格式通常是 <a:blip r:embed="rIdX" ...>
      const blipRegex = /<a:blip[^>]+r:embed="([^"]+)"[^>]*>/g;
      let match;
      let positionIndex = 0;
      while ((match = blipRegex.exec(documentXml)) !== null) {
        const rId = match[1];
        if (!imagePositionMap.has(rId)) {
          imagePositionMap.set(rId, positionIndex++);
        }
      }

      // 备用方案：也查找 v:imagedata 标签（旧版 Word 格式）
      const vmlRegex = /<v:imagedata[^>]+r:id="([^"]+)"[^>]*>/g;
      while ((match = vmlRegex.exec(documentXml)) !== null) {
        const rId = match[1];
        if (!imagePositionMap.has(rId)) {
          imagePositionMap.set(rId, positionIndex++);
        }
      }
    }

    // 2. 解析 relationships 文件以建立 rId 到文件路径的映射
    const relsPath = 'word/_rels/document.xml.rels';
    const relsXml = await zip.file(relsPath)?.async('text');
    const rIdToPathMap = new Map<string, string>();

    if (relsXml) {
      // 解析 Relationship 元素
      const relRegex = /<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"[^>]*>/g;
      let match;
      while ((match = relRegex.exec(relsXml)) !== null) {
        const rId = match[1];
        let target = match[2];
        // 处理相对路径
        if (target.startsWith('media/')) {
          rIdToPathMap.set(rId, 'word/' + target);
        }
      }
    }

    // 3. 提取图片文件
    const mediaFiles = Object.keys(zip.files).filter(
      path => path.startsWith('word/media/') &&
      /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(path)
    );

    // 创建路径到文件的映射
    const pathToFileMap = new Map<string, typeof zip.files[string]>();
    for (const mediaPath of mediaFiles) {
      const file = zip.files[mediaPath];
      if (!file.dir) {
        pathToFileMap.set(mediaPath, file);
      }
    }

    // 4. 按文档中的顺序提取图片
    // 首先处理有位置信息的图片
    const sortedRIds = Array.from(imagePositionMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([rId]) => rId);

    for (const rId of sortedRIds) {
      const mediaPath = rIdToPathMap.get(rId);
      if (mediaPath && pathToFileMap.has(mediaPath)) {
        const imageFile = pathToFileMap.get(mediaPath)!;
        const blob = await imageFile.async('blob');
        const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
        const position = imagePositionMap.get(rId) || images.length;

        images.push({
          id: rId,
          blob,
          filename: `image_${position + 1}.${ext}`,
          index: position
        });

        // 从映射中移除已处理的文件
        pathToFileMap.delete(mediaPath);
      }
    }

    // 处理剩余没有位置信息的图片（放在最后）
    let remainingIndex = images.length;
    for (const [mediaPath, imageFile] of pathToFileMap) {
      const blob = await imageFile.async('blob');
      const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';

      images.push({
        id: `unmapped_${remainingIndex}`,
        blob,
        filename: `image_${remainingIndex + 1}.${ext}`,
        index: remainingIndex
      });
      remainingIndex++;
    }

  } catch (err) {
    console.warn('提取 Word 图片失败:', err);
  }

  // 5. 使用 mammoth 提取文本内容，同时转换图片为占位符
  const result = await mammoth.convertToMarkdown({ arrayBuffer });
  let content = result.value;

  // 6. 处理 mammoth 生成的图片标记
  // mammoth 会将图片转换为 ![...](...) 格式，我们需要将其替换为占位符
  // 以便后续按正确位置插入
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let imageIndex = 0;
  content = content.replace(imageRegex, () => {
    // 如果图片在 images 数组中有对应项，使用其索引
    const img = images[imageIndex];
    if (img) {
      imageIndex++;
      return `[图片${img.index + 1}]`;
    }
    return '[图片]';
  });

  // 7. 尝试提取标题（第一行非空内容）
  const lines = content.split('\n').filter((line: string) => line.trim());
  const title = lines[0]?.trim().replace(/^#+\s*/, '') || file.name.replace(/\.[^/.]+$/, '');

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
