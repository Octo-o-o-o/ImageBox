# ImageBox

<div align="center">

**本地优先的 AI 图像生成工具**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

## 项目简介

**ImageBox** 是一个完全免费、本地优先的 AI 图像生成工具，基于 Next.js 16 构建。使用 Google Gemini 3 Pro 生成惊艳的 AI 图像，管理可复用的提示词模板，并在本地组织您的所有创作。提供 Web 应用和原生桌面应用（macOS、Windows、Linux）两种使用方式。无需云存储、无需订阅、不收集数据——只需在您的机器上尽情创作。

## ✨ 核心功能预览

### 1. 🚀 零门槛初始化
小白也能轻松上手。设置向导引导您选择 **本地存储路径**，一键配置 Provider，即刻开始创作。
![初始化向导](public/Readme_Image/SetupWizard.png)

### 2. 🎨 专业级生成体验
支持 **文生图** 与 **以图生图**，支持 **提示词优化**，让您的简单想法转化为专业指令。更支持基于生成结果 **继续修改**，让创意层层递进。
![生成图片](public/Readme_Image/CreateImage.png)

### 3. 🔍 精准细节把控
点击查看生成详情，支持 **继续生成**。保留参数，微调提示词，直到获得完美作品。
![图片详情](public/Readme_Image/ImageDetail.png)

### 4. 📂 私有化本地图库
您的所有创作均 **存储在本地**。无需担心隐私泄露，像管理本地文件一样管理您的 AI 艺术作品。支持快速浏览与筛选。
![本地资源库](public/Readme_Image/Library.png)

### 5. 📝 高效模版管理
告别重复劳动。保存您最爱的 **提示词模版**，支持变量替换，一键复用高质量 Prompt，极大提升工作流效率。
![模版管理](public/Readme_Image/Templates.png)

### 6. 📊 全链路运行日志
完整的 **运行日志** 记录生成参数、耗时与结果。每一次灵感的迸发都值得被记录，方便回溯与复盘。
![运行日志](public/Readme_Image/RunLog.png)

### 7. 🔌 多模型自由切换
内置主流服务商，配置 **API-Key** 即可使用。同时支持本地生图服务（推进中），让您掌握算力自由。
![模型管理](public/Readme_Image/Models.png)
![添加服务商](public/Readme_Image/AddProvider.png)

### 8. 🛡️ 全能设置中心
支持 **自定义存储路径**，可开启 **远程访问**。提供带密码的 **数据备份/恢复** 功能，从重置到迁移，安全无忧。
![设置](public/Readme_Image/Settings.png)

## 快速开始

### 方式一：桌面应用（推荐）

下载适合您平台的预构建桌面应用：

**📦 [从 GitHub Releases 下载](https://github.com/Octo-o-o-o/ImageBox/releases/latest)**

- **macOS**：`ImageBox-{版本号}-mac-{架构}.dmg`（Intel: x64，Apple Silicon: arm64）
  
  > **⚠️ macOS 用户提示：**
  > 由于 Apple 开发者证书正在申请中，首次打开可能会遇到“应用已损坏”的提示。请按以下步骤绕过公证：
  > 1. 打开 **终端 (Terminal)**。
  > 2. 复制指令：`sudo xattr -r -d com.apple.quarantine ` (注意命令末尾有一个空格)。
  > 3. 将安装好的 `ImageBox.app` (通常在应用程序文件夹) 拖入终端窗口，路径会自动补全。
  > 4. 按回车，输入电脑密码，再次回车即可。
- **Windows**：`ImageBox-{版本号}-win-x64.exe`（NSIS 安装程序）
- **Linux**：`ImageBox-{版本号}-linux-x64.AppImage` 或 `.deb`

安装后：
1. 启动 ImageBox 应用
2. 按照设置向导配置存储位置
3. 在设置 → 模型中添加 AI 服务商 API 密钥
4. 开始创作！

### 方式二：Docker（推荐用于服务器部署）

拉取并运行预构建的 Docker 镜像：

```bash
# 拉取最新镜像
docker pull octoooo/imagebox:latest

# 使用持久化数据卷运行
docker run -d \
  --name imagebox \
  -p 3000:3000 \
  -v imagebox-data:/app/data \
  octoooo/imagebox:latest
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

**Docker 说明：**
- 多架构支持：amd64（Intel/AMD）和 arm64（Apple Silicon、树莓派）
- 数据持久化在 `imagebox-data` 卷中（数据库 + 生成的图片）
- 可用标签：`latest`、`v0.1.3` 等

### 方式三：Web 应用（开发/自托管）

#### 前置要求

- 已安装 Node.js 18+
- Google Gemini API 密钥（可在 [Google AI Studio](https://makersuite.google.com/app/apikey) 免费获取）

#### 安装步骤

##### Windows 用户

**重要提示：** 本仓库包含 `.npmrc` 文件，会自动配置 npm 使用国内镜像源（淘宝/npmmirror）以获得更快、更稳定的包下载速度，特别是 Electron 二进制文件。这解决了在中国大陆安装依赖时常见的网络问题。

```bash
# 克隆仓库
git clone https://github.com/Octo-o-o-o/ImageBox.git
cd ImageBox

# 清理 npm 缓存（首次安装推荐执行）
npm cache clean --force

# 安装依赖
# .npmrc 文件会自动为 npm 包和 Electron 使用镜像源
npm install

# 初始化数据库
npm run db:setup

# 启动开发服务器
npm run dev
```

**安装故障排除：**

如果在运行 `npm run dev` 时遇到 `better-sqlite3` 模块错误（例如：`NODE_MODULE_VERSION` 不匹配），这表示原生模块是为不同的 Node.js 版本编译的：

```bash
# 解决方案 1：重新编译原生模块（推荐）
npm rebuild better-sqlite3

# 解决方案 2：重新安装所有依赖（如果重新编译不起作用）
rm -rf node_modules
npm install
```

此问题的原因是 `better-sqlite3` 是一个原生 C++ 模块，需要针对您的特定 Node.js 版本进行编译。rebuild 命令会为您当前的 Node.js 版本重新编译它。

**Windows 安装故障排除：**

如果在 `npm install` 过程中遇到网络错误（例如：`RequestError: Client network socket disconnected`），请尝试以下方法：

1. **验证 .npmrc 文件存在**：仓库中已包含 `.npmrc` 文件，请确保它未被删除。

2. **使用环境变量**（如果 .npmrc 不起作用）：
   ```bash
   # 在命令提示符（CMD）中：
   set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
   npm install

   # 或在 PowerShell 中：
   $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
   npm install
   ```

3. **临时跳过 Electron 下载**（如果仍然失败）：
   ```bash
   set ELECTRON_SKIP_BINARY_DOWNLOAD=1
   npm install
   ```
   注意：这将跳过 Electron 二进制文件下载。您可以稍后手动下载或仅使用 Web 版本。

4. **检查代理设置**（如果使用 VPN/代理）：
   ```bash
   npm config get proxy
   npm config get https-proxy

   # 如果不需要代理，清除代理设置：
   npm config delete proxy
   npm config delete https-proxy
   ```

有关更多 Windows 特定故障排除，请参阅 [WINDOWS_TROUBLESHOOTING.md](./WINDOWS_TROUBLESHOOTING.md)。

##### Linux/macOS 用户

```bash
# 克隆仓库
git clone https://github.com/Octo-o-o-o/ImageBox.git
cd ImageBox

# 安装依赖
npm install

# 初始化数据库
npm run db:setup

# 启动开发服务器
npm run dev
```

**国外用户注意：** 如果您在中国大陆以外地区遇到下载速度慢的问题，可以删除或重命名 `.npmrc` 文件以使用默认 npm 镜像源：

```bash
# 备份 .npmrc（可选）
mv .npmrc .npmrc.backup

# 然后运行 npm install
npm install
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

### 更新到最新版本

如果您已经安装了 ImageBox 并想更新到最新版本：

#### 方式一：常规更新（保留本地修改）

```bash
# 进入您的 ImageBox 目录
cd ImageBox

# 停止正在运行的服务器（如果正在运行，按 Ctrl+C）

# 从 GitHub 拉取最新更改
git pull origin main

# 安装可能的新依赖
npm install

# 更新数据库架构（如有变化）
npm run db:setup

# 重启服务器
npm run dev
```

#### 方式二：强制更新（放弃所有本地修改）

**⚠️ 警告：** 此操作将完全用远程版本覆盖您的本地代码。您的数据（数据库和生成的图片）将会保留，但您对代码所做的任何修改都将丢失。

```bash
# 进入您的 ImageBox 目录
cd ImageBox

# 停止正在运行的服务器（如果正在运行，按 Ctrl+C）

# 从 GitHub 获取最新更改
git fetch origin

# 强制重置到远程仓库的确切状态
git reset --hard origin/main

# 清理未跟踪的文件（可选，请谨慎使用！）
# git clean -fd

# 安装可能的新依赖
npm install

# 更新数据库架构（如有变化）
npm run db:setup

# 重启服务器
npm run dev
```

**注意：** 您现有的数据（图片、模板、模型、设置）将在更新过程中保留。`prisma db push` 命令会安全地应用架构更改而不会丢失数据。

### 首次设置

1. 进入 **Models（模型管理）** 页面 (`/models`)
2. 添加新的服务商并配置您的 API 密钥
3. 添加新的模型并选择适当的服务商
4. 前往 **Create（创建）** 页面 (`/create`) 开始生成图像！

### 远程访问设置（可选）

如果您想从网络上的其他设备访问 ImageBox：

1. 进入 **Settings（设置）** 页面 (`/settings`)
2. 开启 **远程访问** 开关
3. 点击 **创建访问令牌**
4. 选择过期时间并添加描述（可选）
5. 复制生成的令牌和访问链接
6. 在远程设备上访问链接并输入令牌
7. 现在您已安全连接！

**安全提示：**
- 使用较短的过期时间以提高安全性
- 为不同设备创建单独的令牌
- 不再需要时立即撤销令牌
- 保护好您的令牌 - 它们可完全访问您的 ImageBox 实例

## 使用方法

### 创建模板

1. 前往 **Templates（模板）** 页面 (`/templates`)
2. 点击 **新建模板**
3. 使用 `{{变量名}}` 语法添加变量（例如：`{{subject}}`、`{{style}}`）
4. 保存并在创建页面中使用

**示例模板：**
```
一个美丽的{{subject}}，采用{{style}}风格，高度细节，4k画质
```

### 生成图像

1. 前往 **Create（创建）** 页面 (`/create`)
2. 输入提示词或选择模板
3. 如适用，填写模板变量
4. （可选）上传参考图片或从图库继续调整已生成的图片
5. 点击 **生成**
6. 在 **Library（图库）** (`/library`) 中查看结果

**专业提示**：在图库中点击任何生成图片的"继续调整"按钮，即可将其添加为参考图以进一步优化！

## 技术栈

- **框架**: Next.js 16（App Router、React Server Components）
- **桌面应用**: Electron 39（原生跨平台封装）
- **数据库**: SQLite（通过 Prisma ORM）
- **样式**: Tailwind CSS v4 + Framer Motion
- **AI 模型**: Google Gemini 3 Pro (`gemini-3-pro-image-preview`)
- **语言**: TypeScript 5

## 项目结构

```
imagebox/
├── app/
│   ├── page.tsx              # 首页（重定向到 /library）
│   ├── library/page.tsx      # 图库与图片管理
│   ├── create/page.tsx       # 图像生成界面
│   ├── templates/page.tsx    # 模板管理
│   ├── models/page.tsx       # 模型与服务商配置
│   ├── settings/page.tsx     # 设置（远程访问、存储）
│   ├── run_log/page.tsx      # 生成历史日志
│   ├── wizard/page.tsx       # 首次设置向导
│   ├── auth/login/page.tsx   # 远程访问登录页
│   ├── api/
│   │   ├── auth/             # 认证端点
│   │   ├── images/           # 图片服务 API 和缩略图
│   │   └── browse-folders/   # 文件夹浏览 API
│   ├── actions.ts            # Server Actions（数据库 + API）
│   └── layout.tsx            # 根布局和导航
├── components/
│   ├── Sidebar.tsx           # 导航侧边栏
│   ├── ThemeProvider.tsx     # 主题管理
│   ├── LanguageProvider.tsx  # 国际化支持
│   └── FolderBrowser.tsx     # 存储路径浏览器
├── electron-src/             # Electron 主进程（TypeScript）
│   ├── main.ts               # 主进程入口
│   ├── preload.ts            # 预加载脚本
│   ├── database.ts           # 数据库初始化
│   ├── tray.ts               # 系统托盘集成
│   ├── shortcuts.ts          # 全局快捷键
│   └── updater.ts            # 自动更新处理
├── lib/
│   ├── prisma.ts             # Prisma 客户端单例
│   ├── modelParameters.ts    # 参数映射系统
│   ├── imageUrl.ts           # 图片 URL 工具
│   ├── env.ts                # 环境配置
│   ├── paths.ts              # 路径工具
│   └── i18n/                 # 翻译文件
├── prisma/
│   └── schema.prisma         # 数据库模式
├── assets/                   # 桌面应用资源
│   ├── icon.png              # 应用图标
│   └── splash.html           # 启动画面
├── electron-builder.yml      # 桌面应用构建配置
├── middleware.ts             # 认证与访问控制
└── public/generated/         # 生成的图像（自动创建）
```

## 路线图

### ✅ 已完成功能
- [x] **国际化（i18n）** - 13 种语言，支持阿拉伯语 RTL
- [x] **深色/浅色主题** - 用户可选主题，流畅过渡动画和系统检测
- [x] **多模型支持** - Google Gemini 2.5/3 Pro、OpenAI DALL-E 3 和 OpenAI 兼容端点
- [x] **远程访问系统** - 基于令牌的认证和灵活的访问控制
- [x] **自定义存储路径** - 可配置图片存储目录，支持验证
- [x] **文件夹组织** - 基于文件夹的图片管理系统
- [x] **图片收藏** - 星标/收藏功能，快速访问
- [x] **原生桌面应用** - 跨平台 Electron 封装，系统托盘（国际化）、快捷键和自动更新
- [x] **设置向导** - 首次配置引导，无缝入门体验
- [x] **系统托盘国际化** - 系统托盘菜单支持 13 种语言，自动检测系统语言
- [x] **跨平台稳定性** - 改进 Windows 支持，使用异步 IPC 进行语言检测
- [x] **缩略图生成** - 优化的图片缩略图，加快图库加载
- [x] **高级图片预览** - 全功能模态框，支持缩放、拖拽和快捷操作
- [x] **性能优化** - 基于 Buffer 的图片处理和异步缩略图生成

### 高优先级
- [ ] **本地模型支持（开发中）** - 在您自己的硬件上完全离线运行 AI 模型
  - 硬件检测（NVIDIA GPU、Apple Silicon）
  - 自动发现本地推理服务器
  - 支持 stable-diffusion.cpp、ComfyUI 等后端
  - 模型安装器和版本管理
- [ ] **高级搜索与筛选** - 按提示词、日期、模型、标签搜索图片
- [ ] **批量生成** - 从单个提示词生成多张图片
- [ ] **图片标签系统** - 自定义标签，更好地组织管理

### 中优先级
- [ ] 增强生成控制（负面提示词、种子、高级参数）
- [ ] 导出和分享功能（ZIP 导出、可分享链接）
- [ ] Stable Diffusion 集成
- [ ] 图片编辑和变体生成

### 未来增强
- [ ] 性能优化（虚拟滚动、懒加载）
- [ ] 数据库备份/恢复功能
- [x] Docker 多架构部署（amd64/arm64，通过 GitHub Actions）
- [ ] 移动端响应式界面改进

## 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建您的功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交您的更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

## 开发

### Web 应用

```bash
# 安装依赖
npm install

# 启动开发服务器（热重载）
npm run dev

# 生产环境构建
npm run build

# 启动生产服务器
npm start

# 使用 Prisma Studio 查看数据库
npm run db:studio

# 代码检查
npm run lint
```

### 桌面应用

```bash
# 开发模式（配合 Next.js 开发服务器）
npm run electron:dev

# 为当前平台构建桌面应用
npm run electron:build

# 为特定平台构建
npm run electron:build:mac     # macOS（Intel 和 Apple Silicon）
npm run electron:build:win     # Windows x64
npm run electron:build:linux   # Linux（AppImage 和 deb）

# 为所有平台构建
npm run electron:build:all

# 发布到 GitHub Releases
npm run electron:publish
```

## 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](./LICENSE) 文件。

## 致谢

- 使用 [Next.js](https://nextjs.org/) 构建
- 由 [Google Gemini AI](https://deepmind.google/technologies/gemini/) 驱动
- 使用 [Tailwind CSS](https://tailwindcss.com/) 设计
- 使用 [Framer Motion](https://www.framer.com/motion/) 制作动画

## 支持项目

如果您觉得这个项目有帮助，请考虑：
- 为仓库加星标 ⭐
- 分享给他人
- [提交 Issue](https://github.com/Octo-o-o-o/ImageBox/issues) 报告 Bug 或请求新功能

---

<div align="center">

Made with ❤️ by the open source community

</div>
