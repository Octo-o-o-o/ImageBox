# Models 页面重构方案

> 日期: 2025-12-25
> 状态: ✅ 已实施

## 1. 背景与问题

### 当前痛点
1. **信息过载**: 所有内置服务商（Google Gemini, OpenRouter, GRSAI, Ark 等）都直接铺在 Models 页面，即使用户未配置 API Key，也会显示带有黄色警告的卡片
2. **扩展性差**: 后续将增加更多 Provider，当前一字排开的结构会导致页面越来越拥挤
3. **认知负担**: 用户需要在大量卡片中找到自己需要的服务商，体验不佳

### 用户期望
- 只看到自己已激活（配置了 API Key）的服务商
- 添加新服务商时，能从预置列表中快速选择，无需手动填写 baseUrl 等参数
- 对于预置服务商，能够选择需要的模型，而不是全部添加

## 2. 方案设计

### 2.1 核心理念

**从"展示所有预置"转变为"按需激活"**

- 预置服务商不再自动创建到数据库
- 只有用户明确选择并配置了 API Key 的服务商才会出现在列表中
- 用户自定义的服务商保持原有逻辑

### 2.2 交互流程

```
┌─────────────────────────────────────────────────────────────┐
│  Models 页面                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Providers]                              [+ 新增服务商]       │
│  ├─ Google Gemini  ✓ (已配置)                                 │
│  └─ My Custom Provider                                        │
│                                                               │
│  [Models]                                 [+ 新增模型]         │
│  ├─ Nano Banana Pro (Google Gemini)                          │
│  └─ ...                                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘

点击 [+ 新增服务商] 后：

┌─────────────────────────────────────────────────────────────┐
│  新增服务商                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  选择服务商类型：                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ○ 内置服务商                                              │ │
│  │   从预置列表中选择，只需填写 API Key                        │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ○ 手动添加                                                │ │
│  │   完全自定义服务商配置                                      │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ ○ 本地服务                                                │ │
│  │   连接本地推理服务 (ComfyUI, stable-diffusion.cpp)         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘

选择 [内置服务商] 后：

┌─────────────────────────────────────────────────────────────┐
│  添加内置服务商                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  选择服务商：                                                  │
│  ┌─────────────────────────┐ ┌─────────────────────────┐     │
│  │ Google Gemini           │ │ OpenRouter              │     │
│  │ 官方 Gemini API         │ │ 多模型代理              │     │
│  └─────────────────────────┘ └─────────────────────────┘     │
│  ┌─────────────────────────┐ ┌─────────────────────────┐     │
│  │ GRSAI                   │ │ Ark (火山引擎)          │     │
│  │ Nano Banana 服务         │ │ OpenAI 兼容接口         │     │
│  └─────────────────────────┘ └─────────────────────────┘     │
│                                     (未来可继续扩展)          │
│                                                               │
│  ─────────────────────────────────────────────────────────── │
│                                                               │
│  API Key: [sk-xxxx....xxxx]           [获取 API Key ↗]       │
│                                                               │
│  ─────────────────────────────────────────────────────────── │
│                                                               │
│  包含的模型：                               [全选] [全不选]   │
│  ☑ Nano Banana Pro        (gemini-3-pro-image-preview)       │
│  ☑ Nano Banana            (gemini-2.5-flash-image)           │
│  ☐ Gemini 3 Flash         (gemini-3-flash-preview) [TEXT]    │
│                                                               │
│  ─────────────────────────────────────────────────────────── │
│                                   [取消]    [添加服务商]      │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 数据模型变更

**无需变更数据库 Schema**，仅调整初始化逻辑：

```typescript
// 当前逻辑 (lib/presetProviders.ts + app/actions/providers.ts)
// ❌ 所有预置 Provider 和 Model 启动时自动创建

// 新逻辑
// ✅ 预置定义保留在代码中作为"模板"
// ✅ 只有用户明确激活时才创建到数据库
// ✅ 激活时可选择包含哪些 Model
```

### 2.4 组件设计

#### 新增组件

1. **`AddProviderModal`** - 新增服务商入口弹窗
   - 提供三种选择：内置服务商 / 手动添加 / 本地服务
   - 选择后进入对应的详细配置流程

2. **`PresetProviderSelector`** - 内置服务商选择器
   - 展示所有可用的预置服务商卡片
   - 高亮显示已激活的（提示用户已添加）
   - 点击选中后显示配置区域

3. **`ProviderModelSelector`** - 模型多选器
   - 根据选中的 Provider 显示对应的预置 Model 列表
   - 支持全选/反选
   - 默认全选 IMAGE 类型模型

#### 修改组件

1. **`app/models/page.tsx`**
   - 移除自动显示所有预置服务商的逻辑
   - "新增服务商"按钮触发 `AddProviderModal`
   - Provider 列表只显示数据库中存在 apiKey 或 type=LOCAL 的记录

2. **`components/SetupWizard.tsx`**
   - 保持现有 UI 不变
   - 内部逻辑调整：选择 Provider 并填写 API Key 后，自动激活该 Provider 并添加其所有预置 Model

### 2.5 详细实现步骤

#### Phase 1: 基础架构调整

1. **修改 `ensurePresetProvidersAndModels`**
   - 不再自动创建所有预置 Provider 和 Model
   - 只保留数据库初始化标记逻辑

2. **新增辅助函数 `activatePresetProvider`**
   ```typescript
   // app/actions/providers.ts
   export async function activatePresetProvider(
     providerId: string, 
     apiKey: string,
     selectedModelIds?: string[]  // 未传则使用全部预置 Model
   ): Promise<void>
   ```

3. **新增辅助函数 `getAvailablePresetProviders`**
   ```typescript
   // lib/presetProviders.ts
   export function getAvailablePresetProviders(): PresetProvider[]
   // 返回尚未激活的预置服务商列表
   ```

#### Phase 2: UI 组件开发

1. **创建 `components/models/AddProviderModal.tsx`**
2. **创建 `components/models/PresetProviderSelector.tsx`**
3. **创建 `components/models/ProviderModelSelector.tsx`**

#### Phase 3: 页面整合

1. **更新 `app/models/page.tsx`**
   - 集成新组件
   - 调整 Provider 列表过滤逻辑

2. **更新 `components/SetupWizard.tsx`**
   - 使用新的 `activatePresetProvider` 函数
   - 确保向后兼容

#### Phase 4: 测试与优化

1. 新用户首次使用流程测试
2. 老用户升级兼容性测试
3. 多服务商激活/删除测试

## 3. 方案评审

### 3.1 优点

1. **用户体验提升**
   - 只看到自己需要的服务商，减少视觉噪音
   - 添加预置服务商流程简化，只需填写 API Key
   - 支持按需选择模型，避免添加不需要的模型

2. **扩展性良好**
   - 新增预置服务商只需修改 `presetProviders.ts`
   - 无需修改 UI 组件
   - 未来可支持服务商分类、搜索等功能

3. **向后兼容**
   - 老用户已有的服务商和模型数据不受影响
   - SetupWizard 功能保持稳定

### 3.2 潜在问题与解决方案

| 问题 | 解决方案 |
|------|---------|
| 老用户升级后看不到预置服务商 | 检测 apiKey 字段，有值的继续显示，无值的隐藏但保留数据 |
| 用户删除了预置服务商后想重新添加 | 从"内置服务商"列表中可以重新激活 |
| 预置模型参数更新 | 只影响新激活的模型，不影响已有模型 |
| 新用户首次打开 Models 页面显示空白 | 显示引导提示卡片，引导用户添加第一个服务商 |
| 用户已激活服务商但删除了所有模型 | Provider 仍然显示，用户可在编辑中重新添加模型 |
| 预置服务商 baseUrl 更新 | 更新时检查，提示用户可选择更新（不强制） |
| 多语言环境下服务商描述 | 描述从 i18n 文件读取，而非硬编码在 presetProviders.ts |

### 3.3 迁移策略（老用户兼容）

```typescript
// app/actions/providers.ts - 新增迁移逻辑

export async function migrateExistingProviders() {
  // 1. 获取所有现有的预置 Provider
  const existingPresets = await prisma.provider.findMany({
    where: { id: { startsWith: 'preset-' } }
  });
  
  // 2. 对于有 apiKey 的，保持显示
  // 3. 对于无 apiKey 的，标记为 inactive 或直接删除（可配置）
  for (const provider of existingPresets) {
    if (!provider.apiKey) {
      // 选项 A: 软删除（保留数据但不显示）
      // await prisma.provider.update({ where: { id: provider.id }, data: { active: false } });
      
      // 选项 B: 硬删除（推荐，保持数据库干净）
      await prisma.provider.delete({ where: { id: provider.id } });
      // 同时删除关联的 models
      await prisma.aIModel.deleteMany({ where: { providerId: provider.id } });
    }
  }
}
```

### 3.4 国际化考虑

当前 `presetProviders.ts` 中的 `description` 字段是硬编码的中文，需要改为 i18n key：

```typescript
// lib/presetProviders.ts - 修改
export const PRESET_PROVIDERS: PresetProvider[] = [
  {
    id: `${PRESET_ID_PREFIX}google-gemini`,
    name: 'Google Gemini',
    type: 'GEMINI',
    baseUrl: 'https://generativelanguage.googleapis.com',
    descriptionKey: 'presets.provider.gemini.desc', // 改用 i18n key
    apiKeyApplyUrl: 'https://aistudio.google.com/app/apikey',
  },
  // ...
];

// lib/i18n/locales/en.json - 添加
{
  "presets": {
    "provider": {
      "gemini": { "desc": "Official Gemini API, requires API Key" },
      "openrouter": { "desc": "Multi-model proxy, requires API Key" },
      // ...
    }
  }
}
```

### 3.5 不采用的方案

1. **折叠/收起预置服务商** ❌
   - 问题：仍然占用空间，且交互繁琐
   - 原因：未解决根本的"展示所有"问题

2. **标签页分离预置/自定义** ❌
   - 问题：增加导航层级，割裂用户认知
   - 原因：服务商本应是统一概念

3. **仅在设置中配置 API Key** ❌
   - 问题：用户需要在多处操作
   - 原因：不符合"服务商管理"的直觉

## 4. 实施时间线

| 阶段 | 任务 | 预估工时 |
|------|------|---------|
| Phase 1 | 基础架构调整 | 2h |
| Phase 2 | UI 组件开发 | 4h |
| Phase 3 | 页面整合 | 2h |
| Phase 4 | 测试与优化 | 2h |
| **总计** | | **10h** |

## 5. 后续扩展

1. **服务商分类**：按类型（云端/本地）、按能力（图像生成/文本）分类展示
2. **服务商状态监控**：显示 API 可用性、配额使用情况
3. **一键切换**：快速在同类服务商间切换
4. **导入/导出**：支持导出服务商配置（不含 API Key）供他人使用

---

## 附录：数据流图

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  presetProviders │ ──► │  AddProviderModal │ ──► │   Database       │
│  (模板定义)       │     │  (用户选择+配置)   │     │  (实际存储)       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                 │
                                 ▼
                         ┌──────────────────┐
                         │  Models Page     │
                         │  (只显示已激活)   │
                         └──────────────────┘
```

---

## 附录：与 SetupWizard 的关系

### 当前 SetupWizard 工作流程
```
用户选择 Provider → 填写 API Key → 保存 Provider（含 API Key）到数据库
```

### 重构后 SetupWizard 工作流程
```
用户选择 Provider → 填写 API Key → 调用 activatePresetProvider()
                                       ├─ 创建/更新 Provider（含 API Key）
                                       └─ 自动创建该 Provider 下的所有预置 Model
```

### 关键代码变更

```typescript
// components/SetupWizard.tsx - handleFinish 函数

// 当前逻辑（第 124-131 行）
if (imagePreset) {
  promises.push(saveProvider({
    id: imagePreset.id,
    name: imagePreset.name,
    type: imagePreset.type,
    baseUrl: imagePreset.baseUrl,
    apiKey: imageApiKey,
  }));
}

// 重构后逻辑
if (imagePreset) {
  promises.push(activatePresetProvider(
    imagePreset.id,
    imageApiKey,
    // undefined = 使用该 provider 下的所有预置 model
  ));
}
```

这样确保了：
1. SetupWizard 的用户体验保持不变
2. 配置 API Key 后，相关 models 自动可用
3. 与 Models 页面的新增流程保持一致
