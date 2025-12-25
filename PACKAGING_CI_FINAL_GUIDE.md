# ImageBox 打包 & CI 最终稳定方案（2025-12）

本文档用于记录当前 **Windows / macOS / Linux / Docker** 全链路已验证可跑通的打包方案，以及后续常见问题的快速排查方法。

---

## 目标与原则

- **Build 工作流（Build Windows/Linux/macOS）**：只负责打包并上传 **Artifacts**，**不自动发布到 GitHub Release**。
- **Release 工作流（Release (Desktop installers)）**：只在你明确发版时运行，负责创建 Release 并将 dmg/exe 等产物 **发布到 Release 页面**。
- **跨平台一致性**：避免使用仅 Unix shell 生效的环境变量写法；避免构建期依赖外网资源；避免 CI 自动 publish 触发 GH_TOKEN 问题。

---

## 关键改动点（最终方案）

### 1) Prisma 模板库：跨平台 `db:template`

**问题背景**：Windows 不支持 `DATABASE_URL=... prisma ...` 这种 Unix 写法，会直接报 `'DATABASE_URL' is not recognized...`。

**最终做法**：使用 Node 脚本设置环境变量并执行 prisma：

- `package.json`：
  - `db:template`: `node scripts/db-template.js`

- `scripts/db-template.js`：
  - 在脚本里设置 `process.env.DATABASE_URL = "file:./prisma/template.db"`
  - 再执行 `prisma db push`

这样 Windows/macOS/Linux 都一致可用。

---

### 2) electron-builder：Build 默认 **禁止 publish**

**问题背景**：electron-builder 在 CI 环境可能出现：

- `artifacts will be published if draft release exists reason=CI detected`
- 然后报 `GH_TOKEN is not set`

**最终做法**：

- **所有 Build 类脚本/工作流统一加 `--publish never`**，只产出 artifacts，不触发上传到 Release。
- 只在 `release-desktop.yml` 中使用 `--publish always`，并注入 `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`。

---

### 3) Linux `.deb`：维护者信息（maintainer/author）

**问题背景**：打 `.deb` 需要 maintainer，会报：

- `Please specify author 'email' in the application package.json`

**最终做法**：在 `package.json` 补齐并使用兼容格式：

- `description`: 必填（electron-builder 也会提示缺失）
- `author`: 推荐字符串格式：`"name <email>"`

示例：

- `author`: `wangyixiao <wangyixiao@users.noreply.github.com>`

---

### 4) Windows NSIS：图标必须是 `.ico`

**问题背景**：NSIS 只接受 `.ico`。如果误配 `.png` 会报：

- `Error while loading icon ... invalid icon file`

**最终做法**：

- Windows 侧 `win.icon` / `nsis.installerIcon` / `nsis.uninstallerIcon` **不强制指定**（CI-safe），避免因为 icon 格式/路径问题导致 makensis 失败。
- 如果你要自定义图标：必须提供真正的 `.ico` 并指向它。

---

### 5) Next.js Windows 构建：EPERM 扫描受限目录（Application Data）

**问题背景**：Windows runner 上 `next build` 可能触发对用户目录 junction 的扫描，报：

- `EPERM: operation not permitted, scandir 'C:\\Users\\runneradmin\\Application Data'`

**最终做法**（双保险）：

- `next.config.ts`：
  - `outputFileTracingRoot: process.cwd()`
  - Windows 下加 `outputFileTracingExcludes` 排除 `Application Data/AppData` 等路径
- `.github/workflows/build-windows-x64.yml`：
  - 将 `HOME/USERPROFILE/HOMEPATH` 指向 `${{ github.workspace }}`，避免构建工具扫描真实 Profile 目录

---

### 6) Docker 构建：避免构建期外网字体 + arm64 qemu 稳定性

#### 6.1 `next/font/google` 构建期拉字体失败

**问题背景**：Docker build 中 `next build` 报：

- `next/font error: Failed to fetch DM Sans from Google Fonts`

**最终做法**：不在构建期依赖 Google Fonts

- `app/layout.tsx` 改为使用系统字体栈（如 `font-sans`），移除 `next/font/google`。

#### 6.2 buildx + qemu 下 arm64 `SIGILL`

**问题背景**：多架构（arm64）在 qemu 模拟下可能报：

- `qemu: Illegal instruction (SIGILL)`

**最终做法**：

- Docker 基底从 `node:20-alpine` 切换为 **Debian glibc**：`node:20-bookworm-slim`
- 构建阶段设置：
  - `TAILWIND_DISABLE_OXIDE=1`（Tailwind v4 回退到纯 JS 路径，避免 oxide native 在 qemu 下触发 SIGILL）

---

### 7) macOS x64 runner 退役

**问题背景**：GitHub Actions `macos-13` 退役/弃用会导致 job 直接被取消。

**最终做法**：

- `build-mac.yml`：
  - x64 使用 `macos-15-intel`
  - arm64 使用 `macos-latest`

同样调整 `release-desktop.yml` 的 macOS matrix，避免发版时 x64 挂掉。

---

## 标准操作流程（推荐）

### A) 日常打包（不发布到 Release）

用途：快速验证产物是否可生成，产物在 **Actions → Artifacts** 下载。

- Actions 手动触发：
  - `Build Windows x64`
  - `Build Linux x64`
  - `Build macOS (x64 + arm64)`

注意：这些 workflow **不需要** `GH_TOKEN`，也不会上传到 Release。

---

### B) 正式发版（Release 页面出现 dmg/exe）

用途：生成 GitHub Release，并把 dmg/exe 等安装包上传到 Release Assets。

- 方式 1：推 tag 触发（传统）
  - push `v*` tag（例如 `v0.1.0`）
  - 自动触发 `Release (Desktop installers)`

- 方式 2：手动触发（推荐）
  - Actions → `Release (Desktop installers)` → Run workflow
  - 输入：
    - `tag`: `v0.1.0`
    - `target`: `main`（默认）

---

## 常见问题 & 快速处理（FAQ）

### Q1：Windows 卡在 `db:template`：`'DATABASE_URL' is not recognized`
- **原因**：Windows 不支持 Unix 的 `DATABASE_URL=...` 语法
- **处理**：确保 `db:template` 使用 `node scripts/db-template.js`

### Q2：Linux `.deb` 报 `Please specify author 'email'`
- **原因**：deb 需要 maintainer
- **处理**：确保 `package.json` 有 `author`（含 email）和 `description`

### Q3：CI 报 `GH_TOKEN is not set`
- **原因**：electron-builder 在 CI 尝试 publish
- **处理**：
  - Build 类命令统一 `--publish never`
  - 只有 release workflow 才 `--publish always` 并注入 `GH_TOKEN`

### Q4：Windows NSIS 报 `invalid icon file`
- **原因**：NSIS 只接受 `.ico`，不能用 `.png`
- **处理**：
  - 不配置 NSIS icon（CI-safe），或提供有效 `.ico`

### Q5：Windows `next build` 报 `EPERM scandir ... Application Data`
- **原因**：构建 tracing/glob 触碰到受限 junction
- **处理**：
  - `next.config.ts` 设置 `outputFileTracingRoot` + `outputFileTracingExcludes`
  - workflow 设置 `HOME/USERPROFILE` 为 workspace

### Q6：Docker build 报 `next/font` 拉取 Google Fonts 失败
- **原因**：构建期外网不可用/超时
- **处理**：移除 `next/font/google`，改用系统字体栈

### Q7：Docker arm64（buildx/qemu）报 `SIGILL`
- **原因**：qemu 下原生二进制/指令集不兼容
- **处理**：
  - Docker 使用 Debian 基底（glibc）
  - `TAILWIND_DISABLE_OXIDE=1`

### Q8：macOS x64 job 被取消/提示 runner 退役
- **原因**：`macos-13` 退役
- **处理**：切换 x64 runner 到 `macos-15-intel`

---

## 建议的回归检查清单（每次大改动后）

- **Build Windows x64**：能生成 `*.exe` artifact
- **Build macOS**：能生成 `*.dmg` artifact（x64 + arm64）
- **Build Linux x64**：能生成 `*.AppImage` 和 `*.deb` artifact
- **Docker**：tag 构建 `linux/amd64,linux/arm64` 都能通过（若 arm64 仍不稳，优先考虑 native arm runner）



