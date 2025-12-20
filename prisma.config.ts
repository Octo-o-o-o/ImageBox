// Prisma 7 配置文件
// 数据库 URL 在此配置，而非 schema.prisma
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Docker 环境使用 /app/data/imagebox.db，本地开发使用 ./dev.db
    url: process.env["DATABASE_URL"] || "file:./dev.db",
  },
});
