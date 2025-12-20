// Prisma 7 配置文件
// 数据库 URL 在此配置，而非 schema.prisma
import "dotenv/config";
import { defineConfig } from "prisma/config";

// 优先使用环境变量，否则使用默认开发数据库
const databaseUrl = process.env["DATABASE_URL"] || "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
