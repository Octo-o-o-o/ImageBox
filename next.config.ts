import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用独立构建模式，用于 Docker 部署
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
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
