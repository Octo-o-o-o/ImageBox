/**
 * 根据存储配置获取图片的访问 URL
 * 
 * @param imagePath - 数据库中存储的图片路径 (如 /generated/xxx.png)
 * @param isCustomStoragePath - 是否使用了自定义存储路径
 * @returns 可访问的图片 URL
 */
export function getImageUrl(imagePath: string, isCustomStoragePath: boolean): string {
  // 提取文件名
  const filename = imagePath.split('/').pop();
  
  if (!filename) {
    return imagePath;
  }
  
  // 如果是默认配置，直接返回原路径（静态文件访问）
  if (!isCustomStoragePath) {
    return imagePath;
  }
  
  // 通过 API 路由访问
  return `/api/images/${filename}`;
}

/**
 * 缩略图始终从默认路径访问（不受存储配置影响）
 * 
 * @param thumbnailPath - 数据库中存储的缩略图路径
 * @returns 缩略图 URL
 */
export function getThumbnailUrl(thumbnailPath: string | null | undefined): string | null {
  return thumbnailPath || null;
}

