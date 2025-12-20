import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { getDatabaseUrl } from './paths'

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

// Lazy initialization of Prisma Client to ensure environment variables are loaded
const createPrismaClient = () => {
  // Get database URL:
  // 1. 优先使用环境变量 DATABASE_URL（Docker 或显式配置）
  // 2. 其次使用 paths.ts 的动态路径（桌面应用或 Web 模式）
  const databaseUrl = process.env.DATABASE_URL || getDatabaseUrl()

  // Create adapter with URL configuration (not Database instance)
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
