# ============================================
# ImageBox Docker Image
# Multi-stage build for Next.js with JSON storage
# Supports: linux/amd64, linux/arm64
# ============================================

# ============================================
# Stage 1: 依赖安装 + 构建
# ============================================
FROM node:20-bookworm-slim AS builder

# 安装构建所需的依赖
# 说明：在 buildx + qemu 下，alpine(musl) 上某些原生二进制（如 tailwindcss oxide / swc 等）
# 可能触发 SIGILL；切换到 Debian(glibc) 通常更稳。
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建 Next.js (standalone 模式)
ENV NEXT_TELEMETRY_DISABLED=1
# Tailwind v4 默认使用原生 oxide；在 qemu(跨架构) 环境可能触发 SIGILL，禁用后回退到纯 JS 路径更稳。
ENV TAILWIND_DISABLE_OXIDE=1
RUN npm run build

# ============================================
# Stage 2: 生产运行
# ============================================
FROM node:20-bookworm-slim AS runner

# 安装运行时依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 入口脚本
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 创建数据目录并设置权限
RUN mkdir -p /app/data /app/public/generated
RUN chown -R nextjs:nodejs /app /app/data /app/public/generated

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# JSON 存储使用 USER_DATA_PATH 环境变量
ENV USER_DATA_PATH="/app"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
