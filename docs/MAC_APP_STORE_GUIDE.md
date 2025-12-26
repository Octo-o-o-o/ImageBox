# Mac App Store 上架指南

本文档记录将 ImageBox 上架到 Mac App Store 需要的所有准备工作和改动。

## 目录

1. [前置条件](#前置条件)
2. [Apple Developer 配置](#apple-developer-配置)
3. [项目改动](#项目改动)
4. [构建命令](#构建命令)
5. [上传与提交审核](#上传与提交审核)
6. [沙盒兼容性分析](#沙盒兼容性分析)
7. [常见问题](#常见问题)

---

## 前置条件

- [x] Apple Developer Program 会员资格（$99/年）
- [x] Xcode 已安装（用于上传工具）
- [x] 证书已在 Keychain 中（Mac App Distribution + Mac Installer Distribution）

---

## Apple Developer 配置

### 1. 创建 App ID

1. 访问 [Apple Developer - Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. 点击 `+` 创建新的 App ID
3. 填写：
   - **Description**: `ImageBox`
   - **Bundle ID**: `com.imagebox.app`（选择 Explicit）
   - **Capabilities**: 不需要勾选任何特殊功能

### 2. 创建证书

需要两个证书：

| 证书类型 | 用途 |
|---------|------|
| **Mac App Distribution** | 签名应用（.app） |
| **Mac Installer Distribution** | 签名安装包（.pkg） |

创建步骤：
1. 访问 [Apple Developer - Certificates](https://developer.apple.com/account/resources/certificates/list)
2. 点击 `+` → 选择证书类型 → 选择 `G2 Sub-CA`
3. 上传 CSR（在 Keychain Access 中生成）
4. 下载 `.cer` 文件，双击导入到 **login** 钥匙串

### 3. 创建 Provisioning Profile

1. 访问 [Apple Developer - Profiles](https://developer.apple.com/account/resources/profiles/list)
2. 点击 `+` → 选择 **Mac App Store Connect**
3. 选择 App ID: `com.imagebox.app`
4. 选择证书: Mac App Distribution
5. 命名为 `ImageBox MAS Distribution`
6. 下载文件，保存到项目 `build/ImageBox_MAS.provisionprofile`

### 4. App Store Connect 设置

1. 访问 [App Store Connect](https://appstoreconnect.apple.com)
2. 我的 App → `+` → 新建 App
3. 填写：
   - **平台**: macOS
   - **名称**: ImageBox
   - **主要语言**: 简体中文 或 English
   - **Bundle ID**: com.imagebox.app
   - **SKU**: imagebox-001
4. 填写应用信息、截图、描述等

---

## 项目改动

### 已完成的配置

以下文件已配置好，无需修改：

#### 1. `build/entitlements.mas.plist`

Mac App Store 专用权限文件（启用沙盒）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- App Sandbox (REQUIRED for Mac App Store) -->
    <key>com.apple.security.app-sandbox</key>
    <true/>

    <!-- Network access -->
    <key>com.apple.security.network.client</key>
    <true/>

    <!-- File access - user selected files -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>

    <!-- File access - downloads folder -->
    <key>com.apple.security.files.downloads.read-write</key>
    <true/>
</dict>
</plist>
```

#### 2. `electron-builder.yml` (mas 配置段)

```yaml
# Mac App Store 配置
mas:
  target:
    - target: mas
      arch:
        - x64
        - arm64
  entitlements: build/entitlements.mas.plist
  entitlementsInherit: build/entitlements.mas.plist
  provisioningProfile: build/ImageBox_MAS.provisionprofile
```

### 需要手动添加的文件

| 文件 | 来源 | 说明 |
|------|------|------|
| `build/ImageBox_MAS.provisionprofile` | Apple Developer 下载 | Provisioning Profile |

---

## 构建命令

### 本地构建 Mac App Store 版本

```bash
# 确保证书在 Keychain 中，然后直接构建
npm run electron:build:mac -- --mac mas

# 或指定架构
npm run electron:build:mac -- --mac mas --arm64
npm run electron:build:mac -- --mac mas --x64
```

输出文件：
- `dist-electron/ImageBox-{version}-mac-arm64.pkg`
- `dist-electron/ImageBox-{version}-mac-x64.pkg`

### GitHub Actions 构建（可选）

如需在 CI 中构建 MAS 版本，添加以下 Secrets：

| Secret | 说明 |
|--------|------|
| `MAS_CSC_LINK` | Mac App Distribution 证书的 Base64 |
| `MAS_CSC_KEY_PASSWORD` | 证书密码 |
| `MAS_INSTALLER_CSC_LINK` | Mac Installer Distribution 证书的 Base64 |

---

## 上传与提交审核

### 方法 1：使用 Transporter（推荐）

1. 从 Mac App Store 下载 **Transporter** 应用
2. 登录 Apple ID
3. 拖入 `.pkg` 文件上传
4. 等待处理完成

### 方法 2：使用命令行

```bash
# 上传到 App Store Connect
xcrun altool --upload-app \
  --type macos \
  --file dist-electron/ImageBox-*.pkg \
  --apiKey YOUR_API_KEY \
  --apiIssuer YOUR_ISSUER_ID
```

### 提交审核

1. 在 App Store Connect 中选择已上传的构建版本
2. 填写审核信息
3. 提交审核

---

## 沙盒兼容性分析

### 已验证兼容

| 功能 | 状态 | 说明 |
|------|------|------|
| 数据库存储 | ✅ 兼容 | 使用 `app.getPath('userData')`，自动映射到沙盒容器 |
| 图片存储 | ✅ 兼容 | 存储在 userData/generated，沙盒内可读写 |
| 网络请求 | ✅ 兼容 | 已配置 `network.client` 权限 |
| 本地服务器 | ✅ 兼容 | localhost 监听在沙盒内允许 |
| 云端 API | ✅ 兼容 | HTTP 请求正常 |
| 本地模型 API | ✅ 兼容 | 连接 localhost 的外部服务正常 |

### 路径映射

| 模式 | userData 路径 |
|------|---------------|
| Developer ID（当前） | `~/Library/Application Support/ImageBox/` |
| Mac App Store（沙盒） | `~/Library/Containers/com.imagebox.app/Data/Library/Application Support/ImageBox/` |

**无需修改代码**，Electron 的 `app.getPath('userData')` 会自动处理沙盒路径映射。

### 无影响的功能

| 功能 | 说明 |
|------|------|
| 打开 Finder | 使用 `exec('open ...')` 命令，沙盒允许打开用户可见的目录 |
| 文件夹选择 | 使用 Electron 的 `dialog.showOpenDialog`，沙盒兼容 |

### 自动更新说明

**MAS 版本由 App Store 处理更新**，不需要 electron-updater。

当前代码中自动更新已注释（`electron/main.js` 第 585-587 行），无需改动。

如果将来启用自动更新，需要添加 MAS 检测跳过：

```javascript
// 在 main.js 中，启用自动更新时添加 MAS 检测
if (!isDev && !process.mas) {
  initAutoUpdater(mainWindow);
}
```

`process.mas` 在 MAS 构建中会自动设置为 `true`。

---

## 与其他平台的隔离

### 构建目标独立

| 命令 | 构建目标 | 证书类型 | 输出格式 |
|------|---------|---------|---------|
| `--mac dmg` | Developer ID 分发 | Developer ID Application | .dmg |
| `--mac mas` | Mac App Store | 3rd Party Mac Developer Application + Installer | .pkg |
| `--win` | Windows | 无需证书 | .exe |
| `--linux` | Linux | 无需证书 | .AppImage / .deb |

### 签名身份对照

在 Keychain 中，证书显示名称如下：

| 用途 | Keychain 中显示的名称 |
|------|---------------------|
| Developer ID 签名 | `Developer ID Application: Yixiao Wang (5CS6HUB4P2)` |
| MAS App 签名 | `3rd Party Mac Developer Application: Yixiao Wang (5CS6HUB4P2)` |
| MAS Installer 签名 | `3rd Party Mac Developer Installer: Yixiao Wang (5CS6HUB4P2)` |

验证证书：
```bash
security find-identity -v -p codesigning
```

### 配置隔离

- `mac` 配置段：用于 Developer ID 分发（DMG）
- `mas` 配置段：用于 Mac App Store（PKG）
- 两者使用不同的 entitlements 文件
- Windows/Linux 配置完全独立，不受影响

---

## 常见问题

### Q: DMG 版本和 MAS 版本的数据能共享吗？

A: **不能自动共享**。两个版本使用不同的数据路径：

| 版本 | 数据路径 |
|------|---------|
| DMG (Developer ID) | `~/Library/Application Support/ImageBox/` |
| MAS (沙盒) | `~/Library/Containers/com.imagebox.app/Data/Library/Application Support/ImageBox/` |

这是 macOS 沙盒机制的限制，无法规避。

**如果用户需要切换版本并保留数据**，可以手动迁移：

```bash
# 从 DMG 迁移到 MAS
cp -r ~/Library/Application\ Support/ImageBox/* \
  ~/Library/Containers/com.imagebox.app/Data/Library/Application\ Support/ImageBox/

# 从 MAS 迁移到 DMG
cp -r ~/Library/Containers/com.imagebox.app/Data/Library/Application\ Support/ImageBox/* \
  ~/Library/Application\ Support/ImageBox/
```

> 注意：大多数用户只会使用一个版本，这个问题很少遇到。

### Q: 沙盒会影响哪些功能？

A: ImageBox 的核心功能都已适配沙盒：
- 数据库和图片存储在 userData 目录，沙盒兼容
- 网络请求已配置权限
- 本地模型是通过 HTTP API 连接，不受影响

### Q: 审核需要多长时间？

A: 首次提交通常 1-7 天。后续更新可能更快。

### Q: 需要修改代码吗？

A: **不需要**。项目已经使用了正确的路径抽象（`app.getPath('userData')`），沙盒模式下会自动映射到容器目录。

### Q: MAS 版本和 DMG 版本可以共存吗？

A: 可以。两者使用不同的签名和分发渠道，用户可以选择任一方式安装。

### Q: 如何测试沙盒环境？

A:
```bash
# 构建 MAS 版本
npm run electron:build:mac -- --mac mas

# 安装 pkg 测试（会安装到 /Applications）
sudo installer -pkg dist-electron/ImageBox-*.pkg -target /
```

---

## 检查清单

### 上架前

- [ ] App ID 已创建（com.imagebox.app）
- [ ] Mac App Distribution 证书已安装
- [ ] Mac Installer Distribution 证书已安装
- [ ] Provisioning Profile 已下载并放到 `build/ImageBox_MAS.provisionprofile`
- [ ] App Store Connect 中已创建 App
- [ ] 应用截图已准备（至少 1280x800）
- [ ] 应用描述、关键词已填写

### 构建

- [ ] `npm run electron:build:mac -- --mac mas` 成功
- [ ] 输出 `.pkg` 文件存在

### 提交

- [ ] 使用 Transporter 上传成功
- [ ] 在 App Store Connect 选择构建版本
- [ ] 提交审核
