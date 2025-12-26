import type { NextConfig } from "next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

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
    // Disable Next.js image optimization for Electron builds
    // Local images don't benefit from server-side optimization anyway
    unoptimized: true,
  },
  env: {
    // Expose app version to client components (used for in-app version display)
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? pkg.version ?? "0.0.0",
  },
};

export default nextConfig;
