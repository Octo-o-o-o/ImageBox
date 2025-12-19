import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined }

// Lazy initialization of Prisma Client to ensure environment variables are loaded
const createPrismaClient = () => {
  // Get database URL (with file: prefix as required by the adapter)
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'

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
