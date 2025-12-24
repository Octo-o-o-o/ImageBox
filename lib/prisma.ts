import { PrismaClient } from '@prisma/client'
import { getDatabaseUrl } from './paths'

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

// Lazy initialization of Prisma Client to ensure environment variables are loaded
const createPrismaClient = () => {
  // Get database URL:
  // 1. 优先使用环境变量 DATABASE_URL（Docker 或显式配置）
  // 2. 其次使用 paths.ts 的动态路径（桌面应用或 Web 模式）
  const databaseUrl = process.env.DATABASE_URL || getDatabaseUrl()

  /**
   * 说明：
   * - 之前使用 `@prisma/adapter-better-sqlite3` + `better-sqlite3`。
   * - Prisma 7 起，PrismaClient 需要提供 driver adapter（或 Accelerate），无法降级回“默认引擎”。
   * - Electron 打包白屏的根因通常是：better-sqlite3 原生 binding 架构/ABI 不匹配。
   *   我们在打包阶段用 afterPack 钩子确保 standalone 目录里的 binding 与当前 arch 一致。
   */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
  const adapter = new PrismaBetterSqlite3(
    { url: databaseUrl },
    { timestampFormat: 'unixepoch-ms' } // For backward compatibility
  )
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
