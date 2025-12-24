# ImageBox 打包后白屏（`GET http://localhost:3333/ 500`）排查结论与处理方案（可长期参考）

## 现象
- `npm run electron:dev` 正常
- 打包（尤其 `mac-arm64`）后启动白屏
- DevTools/控制台：`GET http://localhost:3333/ 500 (Internal Server Error)`

## 架构说明（为什么会出现 localhost:3333）
- 开发模式：Electron 主进程不启动 Next，直接加载外部 `next dev`（通常 `3000`）
- 生产模式：Electron 主进程会 `utilityProcess.fork(.next/standalone/server.js)` 启一个 Next 生产服务（固定 `3333`），BrowserWindow 加载 `http://localhost:3333`

## 根因总览（实际抓到的报错）
本次白屏并不是“窗口没加载”，而是 **Next 服务端渲染 `/` 时崩溃导致 500**。根因有三类（可能叠加出现）：

### 1) better-sqlite3 原生模块架构不匹配（最常见）
- **报错特征**：`dlopen ... better_sqlite3.node ... incompatible architecture (have 'x86_64', need 'arm64'...)`
- **成因**：standalone 目录里的 `better_sqlite3.node` 被提前复制/缓存成了错误架构；或跨架构打包/构建流程顺序导致“standalone 内的 native binding 与当前包 arch 不一致”
- **结果**：Prisma 通过 `@prisma/adapter-better-sqlite3` 一执行查询（例如 `prisma.setting.findUnique()`）就炸，`/` 直接 500

### 2) Prisma runtime 文件缺失（`.prisma/client/default` 或类似模块找不到）
- **报错特征**：`Cannot find module '.prisma/client/default'`，require stack 指向 `node_modules/@prisma/client/default.js`
- **成因**：Next standalone / electron-builder 打包规则没有把 `node_modules/.prisma/**` 带进最终 app（或被裁剪）
- **结果**：Prisma 在运行时无法加载必要的 runtime 文件，SSR 直接 500

### 3) 用户数据目录的数据库文件存在但无 schema（缺表）
- **报错特征**：`P2021 The table main.Setting does not exist in the current database`
- **成因**：历史版本/异常初始化可能创建过空库（或 `template.db` 本身没 push schema），导致用户目录 `imagebox.db` 缺表
- **结果**：首页 `/` 会做初始化数据库读写（例如读 Setting），直接 500

---

## 处理方案（已落地到代码/脚本）

### A. 打包阶段：保证 native binding 跟随 arch（解决 1）
**做法：使用 electron-builder `afterPack` 钩子，在“打包完成后”把正确架构的 better-sqlite3 覆盖到 standalone 目录。**

- **原理**：electron-builder 会在打包时对 native deps 做 `@electron/rebuild`，生成“当前 arch 正确”的：
  - `resources/app/node_modules/better-sqlite3/build/Release/better_sqlite3.node`
- **覆盖到**：
  - `resources/app/.next/standalone/node_modules/better-sqlite3/build/Release/better_sqlite3.node`

**对应改动**
- `electron-builder.yml`：`afterPack: scripts/afterPack.js`
- 新增：`scripts/afterPack.js`

### B. 打包阶段：补齐 Prisma runtime（解决 2）
**做法：确保最终 app 内存在 `resources/app/node_modules/.prisma/**`**

- `scripts/afterPack.js`：把项目根 `node_modules/.prisma` 复制到打包产物 `resources/app/node_modules/.prisma`
- `scripts/prepare-standalone.js`：把 `node_modules/@prisma` 和 `node_modules/.prisma` 复制进 `.next/standalone/node_modules/`（辅助兜底）

### C. 构建阶段：强制 Next 用 webpack（规避 Turbopack 与 Prisma external 模块问题）
**做法：把生产构建从 Turbopack 切换到 webpack**

- `package.json`：`"build": "next build --webpack"`

### D. 运行时：数据库自愈 + 模板库保证带 schema（解决 3）

#### 做法 1：启动时校验用户库是否有关键表（Setting），没有则备份并用模板库覆盖修复
- `electron-src/database.ts`：
  - 即使 `imagebox.db` 已存在也会用 `better-sqlite3` 只读检查 `sqlite_master` 是否存在 `Setting` 表
  - 若不存在：备份旧库 `imagebox.db.bak-<timestamp>`，再从 `prisma/template.db` 覆盖初始化

#### 做法 2：保证 `prisma/template.db` 一定包含 schema
- `package.json`：将 `db:template` 加入 `electron:build*` 链路
  - `db:template`：`node scripts/db-template.js`（跨平台，Windows/macOS/Linux 都可用）

---

## 打包建议/流程（推荐）

### mac-arm64
```bash
npm run electron:build:mac
```

该命令链路现在会自动保证：
- Prisma client 生成（`db:generate`）
- `template.db` 带 schema（`db:template`）
- Next 用 webpack 构建（`next build --webpack`）
- standalone 目录准备好（`electron:prepare`）
- afterPack 修正 better-sqlite3 arch + 复制 `.prisma`（`electron-builder` hooks）

---

## 验证标准（以后快速判断是否修复）
- 启动后 `http://localhost:3333/` 不应再 500
- 正常情况下访问 `/` 会 **307/308 跳转到 `/create`**（或直接 200）

## 日志位置（macOS）
- Electron 主进程日志：`~/Library/Logs/imagebox/main.log`

**排查关键词（按优先级）**
- `dlopen` / `better_sqlite3.node`（架构不匹配）
- `Cannot find module '.prisma/client/default'`（Prisma runtime 缺失）
- `P2021` / `Setting table does not exist`（数据库无 schema）

---

## 常见误区（避免回归）
- 只拷贝 `.next/standalone` 不等于可运行：Prisma/better-sqlite3 这类运行时依赖必须确保“架构正确 + 文件齐全”
- 只判断“数据库文件存在”不够：空库/缺表也会让 SSR 直接 500，必须做 schema 校验或从模板恢复



