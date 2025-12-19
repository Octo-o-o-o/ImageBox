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

**ImageBox** 是一个完全免费、本地优先的 AI 图像生成工具，基于 Next.js 16 构建。使用 Google Gemini 3 Pro 生成惊艳的 AI 图像，管理可复用的提示词模板，并在本地组织您的所有创作。无需云存储、无需订阅、不收集数据——只需在您的机器上尽情创作。

## 特性

- **100% 免费开源** - 除了您自己的 Gemini API 密钥外，无任何费用
- **本地优先存储** - 所有图像和数据存储在本地
- **模板管理** - 创建可复用的提示词模板，支持变量替换
- **现代化界面** - 精美的暗色玻璃拟态设计，流畅动画效果
- **跨平台访问** - 通过 localhost 或局域网从任何设备访问
- **隐私保护** - API 密钥和图像永不离开您的设备
- **SQLite 数据库** - 轻量级、可移植、零配置数据库
- **Server Actions** - 使用 Next.js Server Actions 实现快速、安全的 API 调用

## 截图

> 即将推出 - UI 优化后将添加截图

## 快速开始

### 前置要求

- 已安装 Node.js 18+
- Google Gemini API 密钥（可在 [Google AI Studio](https://makersuite.google.com/app/apikey) 免费获取）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/yourusername/imagebox.git
cd imagebox

# 安装依赖
npm install

# 初始化数据库
npx prisma generate
npx prisma db push

# 启动开发服务器
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

### 首次设置

1. 进入 **Settings（设置）** 页面
2. 输入您的 Google Gemini API 密钥
3. 点击 **Save Settings（保存设置）**
4. 前往 **Studio（工作室）** 开始生成图像！

## 使用方法

### 创建模板

1. 前往 **Templates（模板）** 页面
2. 点击 **New Template（新建模板）**
3. 使用 `{{变量名}}` 语法添加变量（例如：`{{subject}}`、`{{style}}`）
4. 保存并在工作室中使用

**示例模板：**
```
一个美丽的{{subject}}，采用{{style}}风格，高度细节，4k画质
```

### 生成图像

1. 前往 **Studio（工作室）** 页面
2. 输入提示词或选择模板
3. 如适用，填写模板变量
4. 点击 **Generate（生成）**
5. 在 **Gallery（图库）** 中查看结果

## 技术栈

- **框架**: Next.js 16（App Router、React Server Components）
- **数据库**: SQLite（通过 Prisma ORM）
- **样式**: Tailwind CSS v4 + Framer Motion
- **AI 模型**: Google Gemini 3 Pro (`gemini-3-pro-image-preview`)
- **语言**: TypeScript 5

## 项目结构

```
imagebox/
├── app/
│   ├── page.tsx              # 图库（主页）
│   ├── studio/page.tsx       # 图像生成界面
│   ├── templates/page.tsx    # 模板管理
│   ├── settings/page.tsx     # 设置和 API 密钥
│   ├── actions.ts            # Server Actions（数据库 + API）
│   └── layout.tsx            # 根布局和导航
├── components/
│   └── Sidebar.tsx           # 导航侧边栏
├── lib/
│   └── prisma.ts             # Prisma 客户端单例
├── prisma/
│   └── schema.prisma         # 数据库模式
└── public/generated/         # 生成的图像（自动创建）
```

## 路线图

详细路线图请查看 [CLAUDE.md](./CLAUDE.md#roadmap--todo)。

### 高优先级
- [ ] **国际化（i18n）** - 支持中英双语
- [ ] **深色/浅色主题** - 用户可选主题，流畅过渡动画
- [ ] **多模型支持** - OpenAI DALL-E 3、Stable Diffusion 等

### 中优先级
- [ ] 批量图像生成
- [ ] 高级图像组织（标签、文件夹、收藏）
- [ ] 增强生成控制（尺寸、负面提示词、种子）
- [ ] 导出和分享功能

### 未来增强
- [ ] 性能优化（虚拟滚动、懒加载）
- [ ] 数据库备份/恢复
- [ ] Docker 部署
- [ ] Electron 桌面应用封装

## 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建您的功能分支（`git checkout -b feature/AmazingFeature`）
3. 提交您的更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

## 开发

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
npx prisma studio

# 代码检查
npm run lint
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
- [提交 Issue](https://github.com/yourusername/imagebox/issues) 报告 Bug 或请求新功能

---

<div align="center">

Made with ❤️ by the open source community

</div>
