# IP地址获取优化修复

## 问题描述

在桌面应用（Electron）启动时，远程访问设置中显示的外部访问地址和授权码中的快捷登录链接的IP地址不正确。原因是简单的IP获取逻辑可能选择了错误的网络接口（如虚拟网络、VPN、Docker等）。

## 修复内容

### 1. 改进IP地址获取逻辑 (`app/actions/tokens.ts`)

**原有问题：**
- 只返回找到的第一个非内部IPv4地址，可能是虚拟网络接口
- 没有优先级排序
- 无法过滤掉Docker、VirtualBox等虚拟网络接口

**改进方案：**
- ✅ 优先选择物理网络接口（Wi-Fi、以太网）
- ✅ 过滤掉常见虚拟网络接口（docker、vbox、vmware等）
- ✅ 优先选择私有IP地址范围（192.168.x.x、10.x.x.x、172.16-31.x.x）
- ✅ 支持跨平台（macOS、Windows、Linux）
- ✅ 智能优先级排序算法

**优先级规则：**
1. **物理接口名称** (+100分)：
   - macOS: `en0`、`en1`（Wi-Fi/以太网）
   - Windows: `Ethernet`、`Wi-Fi`
   - Linux: `eth0`、`wlan0`、`enp`、`wlp`

2. **私有IP范围** (+20-30分)：
   - `192.168.x.x` (+30分) - 最常见的家庭/办公网络
   - `10.x.x.x` (+20分)
   - `172.16-31.x.x` (+20分)

3. **连接类型** (+10-15分)：
   - 以太网 (+15分) - 稳定优先
   - Wi-Fi (+10分)

**过滤规则：**
- 跳过内部地址（127.x.x.x）
- 跳过链路本地地址（169.254.x.x）
- 跳过虚拟网络接口（docker、vbox、vmware、virtualbox、veth、br-）

### 2. 添加手动刷新IP功能 (`app/settings/page.tsx`)

**新增功能：**
- ✅ 在远程访问设置中添加了刷新IP地址按钮
- ✅ 点击刷新按钮时重新获取最新的局域网IP地址
- ✅ 刷新时显示加载动画
- ✅ 支持实时更新显示的外部访问地址和快捷登录链接
- ✅ 完整的国际化支持（13种语言）

**使用场景：**
- 网络切换后（Wi-Fi ↔ 以太网）
- DHCP重新分配IP地址
- 检测到IP地址不正确时手动刷新

## 技术细节

### IP地址选择算法

```typescript
// 为每个候选IP计算优先级分数
priority = 0

// 1. 物理接口名称匹配（最重要）
if (匹配平台推荐接口名) {
  priority += 100
}

// 2. 私有IP地址范围
if (192.168.x.x) {
  priority += 30
} else if (10.x.x.x 或 172.16-31.x.x) {
  priority += 20
}

// 3. 连接类型
if (以太网) {
  priority += 15
} else if (Wi-Fi) {
  priority += 10
}

// 按分数降序排序，返回最高分的IP地址
```

### 示例输出

**修复前：**
```
172.20.10.2 (可能是VPN或错误接口)
```

**修复后：**
```
192.168.1.100 (正确的局域网IP)
```

## 测试建议

1. **多网络接口测试**：
   - 同时连接Wi-Fi和以太网，验证优先选择以太网
   - 开启VPN或Docker后，验证不会选择虚拟接口

2. **IP刷新测试**：
   - 切换网络后点击刷新按钮
   - 验证显示的IP地址和快捷登录链接都正确更新

3. **跨平台测试**：
   - macOS: 验证正确识别 `en0`（Wi-Fi）、`en1`（以太网）
   - Windows: 验证正确识别 `Ethernet`、`Wi-Fi`
   - Linux: 验证正确识别 `eth0`、`wlan0`

## 影响范围

- ✅ 桌面应用（Electron）
- ✅ 远程访问功能
- ✅ 授权码快捷登录链接
- ✅ 跨平台兼容（macOS、Windows、Linux）

## 向后兼容

- ✅ 完全向后兼容，不影响现有功能
- ✅ 如果没有找到合适的IP，仍然fallback到 `localhost`
- ✅ 不需要数据库迁移

## 后续优化建议

1. **多IP选择**：如果检测到多个可用IP，允许用户手动选择
2. **IP变化检测**：自动检测IP地址变化并提醒用户刷新
3. **IPv6支持**：未来可以添加IPv6地址支持
4. **自定义IP**：允许用户手动输入IP地址（适用于特殊网络环境）

### 3. 国际化支持 (`lib/i18n/index.ts`)

**新增翻译：**
- ✅ 添加了 `settings.remoteAccess.refreshIp` 翻译键
- ✅ 支持13种语言：
  - English: "Refresh IP address"
  - 中文: "刷新IP地址"
  - 繁體中文: "刷新IP地址"
  - 日本語: "IPアドレスを更新"
  - Deutsch: "IP-Adresse aktualisieren"
  - Français: "Actualiser l'adresse IP"
  - Русский: "Обновить IP-адрес"
  - Português: "Atualizar endereço IP"
  - Español: "Actualizar dirección IP"
  - Italiano: "Aggiorna indirizzo IP"
  - العربية: "تحديث عنوان IP"
  - Norsk: "Oppdater IP-adresse"
  - Svenska: "Uppdatera IP-adress"

## 相关文件

- `app/actions/tokens.ts` - IP地址获取逻辑
- `app/settings/page.tsx` - 设置页面UI和刷新功能
- `lib/i18n/index.ts` - 国际化翻译
- `electron-src/main.ts` - Electron主进程（无修改）
- `electron-src/preload.ts` - Electron预加载脚本（无修改）
