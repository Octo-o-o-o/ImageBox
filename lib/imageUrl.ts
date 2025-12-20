import { isDesktopApp } from './env';

/**
 * 根据存储配置获取图片的访问 URL
 * 
 * @param imagePath - 数据库中存储的图片路径 (如 /generated/xxx.png)
 * @param isCustomStoragePath - 是否使用了自定义存储路径
 * @returns 可访问的图片 URL
 */
export function getImageUrl(imagePath: string, isCustomStoragePath: boolean): string {
  // 提取相对路径（去掉 /generated/ 前缀）
  let relativePath = imagePath;
  if (relativePath.startsWith('/generated/')) {
    relativePath = relativePath.substring(11); // remove '/generated/'
  } else if (relativePath.startsWith('/')) {
    relativePath = relativePath.substring(1);
  }
  
  // 桌面应用模式：始终使用 API 路由
  if (isDesktopApp()) {
    return `/api/images/${encodeURIComponent(relativePath)}`;
  }
  
  // Web 模式：如果是默认配置，直接返回原路径（静态文件访问）
  if (!isCustomStoragePath) {
    return imagePath;
  }
  
  // 通过 API 路由访问（需要编码以支持子目录中的文件）
  return `/api/images/${encodeURIComponent(relativePath)}`;
}

/**
 * 获取缩略图 URL
 * 
 * @param thumbnailPath - 数据库中存储的缩略图路径
 * @param isCustomStoragePath - 是否使用了自定义存储路径
 * @returns 缩略图 URL
 */
export function getThumbnailUrl(thumbnailPath: string | null | undefined, isCustomStoragePath: boolean = false): string | null {
  if (!thumbnailPath) return null;
  
  const filename = thumbnailPath.split('/').pop();
  if (!filename) return thumbnailPath;
  
  // 桌面应用模式：通过 API 访问
  if (isDesktopApp()) {
    return `/api/images/thumbnails/${filename}`;
  }
  
  // Web 模式：自定义存储路径时也通过 API
  if (isCustomStoragePath) {
    return `/api/images/thumbnails/${filename}`;
  }
  
  return thumbnailPath;
}
