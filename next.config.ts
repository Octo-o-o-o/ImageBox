import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用独立构建模式，用于 Docker 部署
  output: 'standalone',
  // Windows CI 上某些环境会在 output tracing 时触发对用户目录下受限 junction 的扫描（如 "Application Data"），导致 EPERM。
  // 固定 tracing root 为项目根，并对 Windows 增加排除项，避免构建失败。
  outputFileTracingRoot: process.cwd(),
  ...(process.platform === "win32"
    ? {
        outputFileTracingExcludes: {
          "*": ["**/Application Data/**", "**/AppData/**"],
        },
      }
    : {}),
  experimental: {
    serverActions: {
      // 增加到50MB以支持多张参考图片的base64编码
      bodySizeLimit: '50mb',
    },
  },
  images: {
    // Custom image sizes for better thumbnail optimization
    // Smaller sizes for grid thumbnails, larger for previews
    imageSizes: [64, 96, 128, 192, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
};

export default nextConfig;
