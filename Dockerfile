# ============================================
# ImageBox Docker Image
# Multi-stage build for Next.js with SQLite
# Supports: linux/amd64, linux/arm64
# ============================================

# ============================================
# Stage 1: 依赖安装 + 构建
# ============================================
FROM node:20-bookworm-slim AS builder

# 安装构建原生模块所需的依赖 (better-sqlite3, sharp)
# 说明：在 buildx + qemu 下，alpine(musl) 上某些原生二进制（如 tailwindcss oxide / swc 等）
# 可能触发 SIGILL；切换到 Debian(glibc) 通常更稳。
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm ci

# 重新编译 better-sqlite3 以确保 ABI 兼容性
# npm ci 会触发 postinstall (electron-builder install-app-deps)，
# 这会为 Electron 编译 better-sqlite3，但 Docker 需要 Node.js 原生版本
RUN npm rebuild better-sqlite3

# 生成 Prisma Client（Prisma 7+ 需要 prisma.config.ts）
RUN npx prisma generate

# 在构建阶段创建数据库模板（用于运行时初始化）
ENV DATABASE_URL="file:/app/prisma/template.db"
RUN npx prisma db push

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

# 复制 Prisma 相关文件（数据库操作需要）
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3

# 入口脚本
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 创建数据目录并设置权限
RUN mkdir -p /app/data /app/public/generated/thumbnails
RUN chown -R nextjs:nodejs /app /app/data /app/public/generated

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/imagebox.db"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]

