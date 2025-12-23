# Dashboard UI 规范

> 适用: `/dashboard/**`, `/admin/**` 页面

## 设计理念

**Soft Travel/Lifestyle** 美学：友好、宽敞、极致干净，与 Marketing 页面保持一致的设计语言

## 技术栈
- UI: shadcn/ui (New York style) + Tailwind CSS 4
- 图标: Lucide React
- 主题: Light Mode (统一使用浅色主题)

## 色彩系统

### 页面层次
| 层级 | 元素 | Tailwind Class | 说明 |
|------|------|----------------|------|
| L1 | 页面背景 | `bg-[#F8F9FB]` | 与 Marketing 一致 |
| L2 | Sidebar | `bg-white` | 纯白侧边栏 |
| L3 | 卡片/容器 | `bg-white` | 纯白卡片 |

### 颜色定义
```css
/* 主色系 */
--primary: #F97316;           /* orange-500 */
--primary-hover: #EA580C;     /* orange-600 */

/* 文本色 */
--text-primary: #111827;      /* gray-900 */
--text-secondary: #6B7280;    /* gray-500 */
--text-tertiary: #9CA3AF;     /* gray-400 */

/* 背景色 */
--bg-page: #F8F9FB;           /* 页面背景 */
--bg-card: #FFFFFF;           /* 卡片背景 */
--bg-hover: #F9FAFB;          /* gray-50 */

/* 边框色 */
--border: #E5E7EB;            /* gray-200 */
--border-light: #F3F4F6;      /* gray-100 */

/* 语义色彩 */
--success: #059669;           /* emerald-600 */
--success-bg: #D1FAE5;        /* emerald-100 */
--warning: #D97706;           /* amber-600 */
--warning-bg: #FEF3C7;        /* amber-100 */
--error: #DC2626;             /* red-600 */
--error-bg: #FEE2E2;          /* red-100 */
```

### 实际应用
```tsx
// 主色调
className="bg-orange-500 text-white"

// 成功状态
className="bg-emerald-50 text-emerald-600 border-emerald-100"

// 警告状态
className="bg-amber-50 text-amber-600 border-amber-100"

// 错误状态
className="bg-red-50 text-red-600 border-red-100"
```

## 圆角系统

| 元素 | 圆角类 | 说明 |
|------|--------|------|
| 主卡片 | `rounded-[24px]` | 与 Marketing 一致 |
| 子卡片/内嵌容器 | `rounded-2xl` | 16px |
| 图标容器 | `rounded-2xl` 或 `rounded-lg` | 根据大小 |
| 按钮 | `rounded-full` | 完全圆形 |
| Input | `rounded-full` 或 `rounded-xl` | 根据上下文 |
| Badge | `rounded-full` | 完全圆形 |
| Table 容器 | `rounded-lg` | 12px |

## 阴影系统

```tsx
// 卡片基础阴影
shadow-sm shadow-black/[0.02]

// Hover 阴影
hover:shadow-md

// 主按钮阴影
shadow-lg shadow-orange-500/25

// 模态框阴影
shadow-2xl

// 边框替代阴影（表格等）
border border-gray-100
```

## 布局

### AppLayout 结构
```tsx
<div className="flex min-h-screen bg-[#F8F9FB]">
  {/* Sidebar - 固定左侧 */}
  <Sidebar />

  {/* Main Content */}
  <main className="flex-1 overflow-y-auto">
    {/* Mobile Header (lg:hidden) */}
    <MobileHeader />

    {/* Page Content Container */}
    <div className="p-6 md:p-8 lg:p-12 pb-24 max-w-[1600px] mx-auto">
      {children}
    </div>
  </main>
</div>
```

**重要说明：**
- **Padding宽松原则**: `p-6 md:p-8 lg:p-12` - 提供充足的呼吸感
  - 移动端 (< 768px): `24px` - 舒适的基础留白
  - 中屏 (≥ 768px): `32px` - 适度增加
  - 大屏 (≥ 1024px): `48px` - 宽松舒适的间距
- Max Width: `max-w-[1600px]` - 大屏幕下的最大宽度，保持阅读体验
- Bottom Padding: `pb-24` - 额外的底部间距，避免内容被遮挡
- **⚠️ 避免双层Padding**: 页面内容组件不应再添加外层padding（如 `p-6`），直接使用 `space-y-*` 管理内部间距

### Sidebar 规范
```tsx
<aside className="fixed lg:static top-0 left-0 z-50 h-full w-[280px] bg-white border-r border-gray-100">
  <div className="flex flex-col h-full p-6">
    {/* 用户信息 */}
    <div className="flex items-center gap-3 mb-8">
      <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden ring-2 ring-white shadow-lg">
        <img src="..." alt="User" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-gray-900 truncate">用户名</h3>
        <p className="text-xs text-gray-500 truncate">Pro Plan</p>
      </div>
      <button className="p-2 text-gray-400 hover:text-gray-600">
        <ChevronDown size={16} />
      </button>
    </div>

    {/* 主操作按钮 */}
    <button className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium shadow-lg shadow-orange-500/20 transition-all active:scale-95 mb-8">
      <Plus size={20} />
      New Report
    </button>

    {/* 导航菜单 */}
    <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar">
      {/* Main 菜单组 */}
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">Main</h4>
        <nav className="space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          {/* 活动状态 */}
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium bg-orange-50 text-orange-600 transition-colors">
            <Library size={20} />
            Libraries
          </button>
        </nav>
      </div>

      {/* System 菜单组 */}
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">System</h4>
        <nav className="space-y-1">
          {/* ... */}
        </nav>
      </div>
    </div>

    {/* 底部信息 */}
    <div className="pt-6 mt-6 border-t border-gray-100">
      <div className="bg-gray-50 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gray-900">Credits</span>
          <span className="text-xs font-medium text-orange-600">2,450 left</span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 w-[70%] rounded-full" />
        </div>
      </div>
    </div>
  </div>
</aside>
```

### 页面容器

**标准页面布局**（已包含在AppLayout的padding中，无需额外外层padding）：
```tsx
{/* 标准页面 - 无外层padding */}
<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
  {/* Page Header */}
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">页面标题</h1>
      <p className="text-gray-500 mt-1">页面描述</p>
    </div>
    <button className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium shadow-lg shadow-orange-500/25 transition-all">
      <Plus size={20} />
      新建
    </button>
  </div>

  {/* Content Grid/List */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* Cards... */}
  </div>
</div>
```

**间距系统：**
- 页面级间距: `space-y-6` (24px) - 页面header与内容区的间距
- 卡片网格间距: `gap-6` (24px) - 卡片之间的间距
- 特殊情况: 复杂页面可以使用 `space-y-8` (32px)，但要保持一致性

**⚠️ 避免双层Padding陷阱：**
```tsx
// ❌ 错误 - 双层padding导致留白过大
<div className="p-4 md:p-5 lg:p-6 max-w-[1600px] mx-auto"> {/* AppLayout */}
  <div className="p-6 space-y-8 max-w-[1200px] mx-auto"> {/* 页面组件 - 多余！ */}
    {/* Content */}
  </div>
</div>

// ✅ 正确 - 仅AppLayout提供padding
<div className="p-4 md:p-5 lg:p-6 max-w-[1600px] mx-auto"> {/* AppLayout */}
  <div className="space-y-6"> {/* 页面组件 - 无padding */}
    {/* Content */}
  </div>
</div>
```

## 卡片

**核心原则：**
- 统一使用 `p-6` (24px) 作为卡片内边距
- 圆角: `rounded-[24px]` - 大圆角，柔和友好
- 边框: `border border-gray-100` - 极浅色边框
- 阴影: `shadow-sm shadow-black/[0.02]` - 极柔和的阴影
- 内部元素间距: `mb-4` (16px) 或 `mb-6` (24px)

### 使用 shadcn Card 组件
```tsx
import { Card } from "@/components/ui/card"

{/* Card组件已内置 p-6，无需额外padding */}
<Card className="cursor-pointer hover:shadow-md hover:border-orange-200 transition-all">
  {/* 直接放内容，Card已有padding */}
  <div className="flex items-start justify-between mb-4">
    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
      <Library size={28} />
    </div>
  </div>
  <h3 className="text-xl font-bold text-gray-900 mb-2">Card Title</h3>
  <p className="text-sm text-gray-500">Card description...</p>
</Card>
```

### 基础卡片（原生div）
```tsx
<div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-sm shadow-black/[0.02]">
  <h3 className="text-lg font-bold text-gray-900 mb-4">卡片标题</h3>
  <p className="text-gray-500">卡片内容...</p>
</div>
```

### 统计卡片（单行极简式）
**核心原则：极简、完全单行、去除多余装饰，符合 Soft Travel/Lifestyle 美学**

```tsx
{/* 推荐：完全单行水平布局 - Dashboard 顶部统计卡片 */}
<Card
  onClick={() => router.push('/libraries')}
  className="!flex-row items-center gap-3 cursor-pointer hover:border-orange-200 transition-all group"
>
  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform shrink-0">
    <Library size={20} />
  </div>
  <h3 className="text-2xl font-bold text-gray-900 shrink-0">24</h3>
  <p className="text-sm text-gray-500 truncate min-w-0">Libraries</p>
</Card>
```

**设计规范：**
- **布局**: `!flex-row items-center gap-3` - 完全单行水平布局，垂直居中对齐
  - ⚠️ **重要**: 使用 `!flex-row` 覆盖 Card 组件默认的 `flex-col` 样式
  - 使用 `items-center` 确保图标、数字、文案垂直居中对齐
- **排列**: 图标 → 数字 → 标签（从左到右）
- **Flex 优化**（防止文字被截断）:
  - 图标容器: `shrink-0` - 图标不压缩
  - 数字: `shrink-0` - 数字不压缩（优先显示完整）
  - 标签: `min-w-0` - 允许压缩，配合 `truncate` 优雅截断
- **图标容器**: `p-2.5 rounded-2xl shrink-0` - 紧凑内边距，大圆角，防止压缩
- **图标尺寸**: `size={20}` - 中等尺寸，保持紧凑
- **数字**: `text-2xl font-bold text-gray-900 shrink-0` - 醒目但不过分，不允许压缩
- **标签**: `text-sm text-gray-500 truncate min-w-0` - 小字灰色，允许截断
- **间距**: `gap-3` (12px) - 紧凑而不拥挤
- **数据格式化**:
  - 整数: 直接显示（如 24）
  - Credits: `Math.floor(balance).toLocaleString()` - 抹零取整，节省空间
- **文案简化**:
  - ✅ "Libraries", "Sources", "Credits" - 简洁直接
  - ❌ "Credits Remaining" - 避免冗长导致截断
- **交互**: hover 时边框变橙色，图标微放大
- **去除**: ❌ 徽章（+12%、+80 new）、❌ Pro Plan 标签、❌ 渐变装饰

**完整实例（三卡片）：**
```tsx
{/* Dashboard 顶部统计卡片区域 */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Libraries Card */}
  <Card
    onClick={() => router.push('/libraries')}
    className="!flex-row items-center gap-3 cursor-pointer hover:border-orange-200 transition-all group"
  >
    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform shrink-0">
      <Library size={20} />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 shrink-0">{stats.libraries.total}</h3>
    <p className="text-sm text-gray-500 truncate min-w-0">Libraries</p>
  </Card>

  {/* Sources Card */}
  <Card
    onClick={() => router.push('/sources')}
    className="!flex-row items-center gap-3 cursor-pointer hover:border-orange-200 transition-all group"
  >
    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform shrink-0">
      <Database size={20} />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 shrink-0">{stats.sources.total}</h3>
    <p className="text-sm text-gray-500 truncate min-w-0">Sources</p>
  </Card>

  {/* Credits Card */}
  <Card
    onClick={() => router.push('/credits')}
    className="!flex-row items-center gap-3 cursor-pointer hover:border-orange-200 transition-all group"
  >
    <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl group-hover:scale-110 transition-transform shrink-0">
      <CreditCard size={20} />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 shrink-0">
      {Math.floor(stats.credit.balance).toLocaleString()}
    </h3>
    <p className="text-sm text-gray-500 truncate min-w-0">Credits</p>
  </Card>
</div>
```

**配色方案：**
| 卡片 | 背景色 | 文字色 | 说明 |
|------|--------|--------|------|
| Libraries | `bg-blue-50` | `text-blue-600` | 蓝色系 |
| Sources | `bg-purple-50` | `text-purple-600` | 紫色系 |
| Credits | `bg-orange-50` | `text-orange-600` | 橙色系（主色） |

**高度特征：**
- 卡片高度由内容自适应（Card 默认 p-6）
- 预计高度约 72-80px（p-6 上下各24px + 内容~24-32px）
- 比传统双行布局（h-40 = 160px）节省约 50% 空间

**响应式适配：**
```tsx
// 移动端: 单列垂直堆叠
// 中屏及以上 (≥768px): 三等分横向排列
grid-cols-1 md:grid-cols-3
```

### 图表卡片标题
**重要：图表卡片使用统一的标题样式，确保视觉一致性**

```tsx
<Card className="flex flex-col">
  {/* 标题区 - 使用 h2 标签，不使用 CardHeader/CardTitle */}
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-lg font-bold text-gray-900">
      Credit Spending Trend
    </h2>
    <ActivityIcon className="h-4 w-4 text-muted-foreground" />
  </div>

  <CardContent className="pb-2">
    {/* 图表内容 */}
  </CardContent>
</Card>
```

**标题样式规范：**
- **HTML标签**: `<h2>` (不使用 CardHeader/CardTitle)
- **文字样式**: `text-lg font-bold text-gray-900`
- **间距**: `mb-6` (24px) - 与图表内容的间距
- **英文标题**: 使用 **Title Case** (每个主要单词首字母大写)
  - ✅ "Credit Spending Trend"
  - ✅ "Content Collection Trend"
  - ✅ "Task Status Distribution"
  - ❌ "Credit spending trend" (sentence case - 不标准)

**为什么使用 Title Case?**
- 遵循 Apple Human Interface Guidelines 和 Microsoft Fluent Design System
- Dashboard UI 的行业标准做法
- 提升专业感和视觉层次感

### 图表卡片高度规范
**重要：图表高度应根据卡片宽度（列数）调整，保持合理的长宽比**

```tsx
{/* 双列宽度图表 (lg:col-span-2) - 280px */}
<Card className="lg:col-span-2">
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-lg font-bold text-gray-900">Credit Spending Trend</h2>
    <ActivityIcon className="h-4 w-4 text-muted-foreground" />
  </div>
  <CardContent className="pb-2">
    <ChartContainer config={chartConfig} className="h-[280px] w-full">
      {/* Area Chart / Line Chart */}
    </ChartContainer>
  </CardContent>
</Card>

{/* 单列宽度图表 - 240px */}
<Card>
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-lg font-bold text-gray-900">Content Collection Trend</h2>
    <FileText className="h-4 w-4 text-muted-foreground" />
  </div>
  <CardContent className="pb-2">
    <ChartContainer config={chartConfig} className="h-[240px] w-full">
      {/* Bar Chart / Pie Chart */}
    </ChartContainer>
  </CardContent>
</Card>
```

**高度规范：**
- **双列图表** (`lg:col-span-2`): `h-[280px]`
  - 适用于: Area Chart, Line Chart, 复杂趋势图
  - 长宽比: 约 4.2:1 (宽卡片，适合横向数据展示)

- **单列图表**: `h-[240px]`
  - 适用于: Bar Chart, Pie Chart, 简单统计图
  - 长宽比: 约 2.4:1 (窄卡片，保持视觉平衡)

**设计原则：**
- ✅ 图表主体占据足够空间，图例/坐标轴清晰可读
- ✅ 移除图表内的大数字展示，保持极简风格
- ✅ 数据详情通过 tooltip 悬停显示
- ✅ 不同宽度的卡片使用不同高度，避免长宽比失衡
- ❌ 避免所有图表使用相同高度（忽略宽度差异）
- ❌ 避免在图表上方显示大数字（与极简理念冲突）

### 列表卡片（完整示例）
```tsx
<Card className="group cursor-pointer hover:shadow-md hover:border-orange-200 transition-all min-h-[240px] flex flex-col">
  {/* Icon & Actions - mb-4/mb-6 控制与下方内容间距 */}
  <div className="flex items-start justify-between mb-4">
    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
      <Library size={28} />
    </div>
    <button className="p-2 text-gray-300 hover:text-gray-600 rounded-full hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
      <MoreHorizontal size={20} />
    </button>
  </div>

  {/* Main Content - flex-1 让footer自动对齐底部 */}
  <div className="flex-1">
    <h3 className="text-xl font-bold text-gray-900 mb-2">Card Title</h3>

    {/* Stats - mb-6 与footer保持距离 */}
    <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
      <span className="flex items-center gap-1">
        <FileText size={14} /> 1,240 items
      </span>
      <span className="flex items-center gap-1">
        <Database size={14} /> 8 sources
      </span>
    </div>
  </div>

  {/* Footer - mt-auto确保在底部 */}
  <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
    <span className="text-xs font-medium text-gray-400">Updated 10 min ago</span>
    <span className="text-xs font-bold text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
      View Details <ArrowUpRight size={12} />
    </span>
  </div>
</Card>
```

**卡片内部间距规范：**
- 顶部图标/元素与标题: `mb-4` (16px)
- 标题与描述: `mb-2` (8px)
- 描述/统计与footer: `mb-6` (24px)
- Footer上边界: `pt-4` (16px)
- 使用 `flex-1` 和 `mt-auto` 确保footer对齐底部

## 表格

### 表格容器
```tsx
<div className="border rounded-lg bg-white overflow-hidden">
  {/* 筛选器区域 */}
  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
    <select className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-100">
      <option>All Status</option>
      <option>Active</option>
      <option>Paused</option>
    </select>
    <button className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
      Clear Filters
    </button>
  </div>

  {/* 表格 */}
  <table className="w-full text-left border-collapse">
    <thead>
      <tr className="border-b border-gray-100 bg-gray-50/50">
        <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">列名</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="group hover:bg-orange-50/30 transition-colors cursor-pointer">
        <td className="py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              <Activity size={14} />
            </div>
            <div>
              <p className="font-bold text-gray-900">主要内容</p>
              <p className="text-xs text-gray-400">次要信息</p>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  {/* 分页/加载更多 */}
  <div className="p-4 border-t border-gray-100 flex justify-center">
    <button className="text-sm text-gray-500 hover:text-orange-600 font-medium">Load More</button>
  </div>
</div>
```

### 响应式表格
```tsx
{/* 移动端隐藏次要列 */}
<th className="hidden md:table-cell">次要列</th>
<th className="hidden lg:table-cell">辅助列</th>
<th className="hidden xl:table-cell">详细列</th>
```

## 按钮

### Button 组件
```tsx
{/* 主要按钮 */}
<button className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium shadow-lg shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
  <Plus size={20} />
  Create New
</button>

{/* 次要按钮 */}
<button className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-100 rounded-full font-medium shadow-sm transition-all">
  <Download size={20} />
  Export
</button>

{/* Ghost 按钮 */}
<button className="inline-flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-full transition-all">
  View All
</button>

{/* 危险按钮 */}
<button className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium shadow-lg shadow-red-500/25 transition-all">
  <Trash2 size={20} />
  Delete
</button>

{/* 加载状态 */}
<button disabled className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-full font-medium opacity-50">
  <Loader2 size={20} className="animate-spin" />
  Loading...
</button>

{/* 小尺寸 */}
<button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium shadow-md shadow-orange-500/25 transition-all">
  <Plus size={16} />
  Add
</button>

{/* 图标按钮 */}
<button className="p-3 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
  <Settings size={20} />
</button>
```

## Badge

```tsx
{/* 成功 */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
  <CheckCircle2 className="mr-1 h-3 w-3" />
  Active
</span>

{/* 警告 */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
  Pending
</span>

{/* 错误 */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
  Failed
</span>

{/* 灰色/中性 */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-100">
  Paused
</span>

{/* 主色调 */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-100">
  Featured
</span>
```

## 表单

### Input
```tsx
{/* 标准 Input */}
<div className="space-y-2">
  <label className="text-sm font-bold text-gray-900">Field Name</label>
  <input
    type="text"
    placeholder="Enter value..."
    className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 shadow-sm transition-all"
  />
  <p className="text-xs text-gray-500">Helper text goes here</p>
</div>

{/* 搜索框 */}
<div className="relative">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
  <input
    type="text"
    placeholder="Search..."
    className="pl-11 pr-4 py-3 w-full bg-white rounded-full border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 shadow-sm"
  />
</div>

{/* Textarea */}
<textarea
  placeholder="Enter description..."
  rows="4"
  className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 shadow-sm resize-none transition-all"
/>
```

### Select
```tsx
<select className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 shadow-sm">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Switch/Toggle
```tsx
<div className="flex items-center justify-between">
  <div>
    <p className="font-medium text-gray-900">Toggle Label</p>
    <p className="text-sm text-gray-500">Toggle description</p>
  </div>
  <div className="w-12 h-6 rounded-full bg-orange-500 p-1 cursor-pointer">
    <div className="w-4 h-4 rounded-full bg-white shadow-sm translate-x-6 transition-transform" />
  </div>
</div>
```

## 模态框

```tsx
<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
  {/* Overlay */}
  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" />

  {/* Modal */}
  <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    {/* Header */}
    <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
      <h3 className="text-xl font-bold text-gray-900">Modal Title</h3>
      <button className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
        <X size={20} />
      </button>
    </div>

    {/* Content */}
    <div className="p-8">
      {/* Modal content... */}
    </div>

    {/* Footer */}
    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-8 py-6 flex justify-end gap-3">
      <button className="px-6 py-3 text-gray-700 hover:bg-gray-50 rounded-full font-medium transition-all">
        Cancel
      </button>
      <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium shadow-lg shadow-orange-500/25 transition-all">
        Confirm
      </button>
    </div>
  </div>
</div>
```

## Toast/通知

```tsx
// 使用 Sonner
import { toast } from "sonner"

toast.success('Operation completed successfully')
toast.error('Something went wrong')
toast.info('Information message')
toast.warning('Warning message')

// 自定义样式（如需）
toast.custom(
  <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-lg">
    <CheckCircle className="text-emerald-600" size={20} />
    <div>
      <p className="font-bold text-gray-900">Success!</p>
      <p className="text-sm text-gray-500">Your changes have been saved.</p>
    </div>
  </div>
)
```

## 空状态

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
    <Inbox size={32} />
  </div>
  <h3 className="text-lg font-bold text-gray-900 mb-2">No items yet</h3>
  <p className="text-gray-500 mb-6 max-w-sm">
    Get started by creating your first item.
  </p>
  <button className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-medium shadow-lg shadow-orange-500/25 transition-all">
    <Plus size={20} />
    Create First Item
  </button>
</div>
```

## 加载状态

```tsx
{/* 页面级加载 */}
<div className="flex items-center justify-center h-64">
  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
</div>

{/* 卡片骨架屏 */}
<div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-sm animate-pulse">
  <div className="w-14 h-14 rounded-2xl bg-gray-200 mb-4" />
  <div className="h-6 bg-gray-200 rounded-lg mb-2 w-3/4" />
  <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
</div>
```

## 响应式

### 断点策略

**核心原则：保持桌面端最小2列网格，避免窄窗口触发手机单列布局**

Tailwind 断点：
- `< 640px`: 移动端（真正的手机小屏）
- `≥ 640px (sm)`: 平板/大屏手机横屏/窄桌面
- `≥ 768px (md)`: 平板横屏/中等桌面
- `≥ 1024px (lg)`: 标准桌面
- `≥ 1280px (xl)`: 大屏桌面
- `≥ 1536px (2xl)`: 超大屏

### 卡片网格布局

```tsx
{/* ✅ 推荐：使用 sm 断点保持桌面最小2列 */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">...</div>

{/* 断点说明：
  - < 640px: 1列（仅真正的手机小屏）
  - ≥ 640px: 2列（平板、窄桌面窗口仍显示2列）
  - ≥ 1024px: 3列（标准桌面）
  - ≥ 1536px: 4列（大屏）
*/}

{/* ❌ 避免：使用 md 断点会导致桌面窄窗口变单列 */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">...</div>
{/* 问题：桌面窗口 < 768px 时会变成单列手机布局 */}
```

### 固定3列统计卡片

```tsx
{/* Dashboard 顶部统计卡片（Libraries, Sources, Credits） */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
  {/* 3个固定卡片 */}
</div>

{/* 断点说明：
  - < 640px: 1列垂直堆叠（手机）
  - ≥ 640px: 3列横向排列（平板及以上，包括窄桌面）
*/}
```

### 其他响应式模式

```tsx
{/* 容器 */}
<div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12">...</div>

{/* 显示/隐藏 */}
<div className="hidden lg:block">Desktop Only</div>
<div className="lg:hidden">Mobile Only</div>

{/* 按钮组 */}
<div className="flex flex-col sm:flex-row gap-3">...</div>

{/* 表格列 */}
<th className="hidden md:table-cell">Desktop Column</th>
```

### 设计理念

1. **真实设备检测 vs 窗口宽度**
   - 当前方案：基于窗口宽度（简单实用）
   - 640px 是一个合理的分界点：
     - iPhone SE (375px): 单列 ✓
     - iPhone 14 Pro (393px): 单列 ✓
     - 大部分手机横屏 (≥640px): 2列 ✓
     - 桌面窄窗口 (≥640px): 2列 ✓（解决用户反馈的问题）

2. **未来优化方向**（可选）
   - 使用 CSS 媒体查询 `@media (hover: hover)` 区分触摸设备
   - 使用 JS 设备检测（增加复杂度，暂不推荐）


## 禁止

- ❌ 使用深色主题
- ❌ 方形/小圆角元素
- ❌ 尖锐的视觉元素
- ❌ 深色/鲜艳的阴影
- ❌ 拥挤的布局
- ❌ CSS Variables 方式（必须使用 Tailwind 类）

## 必须

- ✅ 与 Marketing 页面保持统一的设计语言
- ✅ 大量留白和呼吸感
- ✅ 圆润的视觉元素（大圆角）
- ✅ 柔和的阴影
- ✅ 清晰的视觉层次
- ✅ 友好的配色（主要是橙色）
- ✅ 流畅的动画过渡
- ✅ 使用 Tailwind 类而非 CSS Variables

## Chat 页面布局规范

### 整体布局结构

Chat 页面采用**独立卡片布局**（全屏模式，脱离 AppLayout 的 padding）：

```
┌──────────────────────────────────────────────────────────┐
│  [F8F9FB 背景 + p-6 padding]                              │
│  ┌────────────────┐  ┌────────────────────────────────┐  │
│  │ 会话列表卡片    │  │ 聊天详情卡片                    │  │
│  │ w-80 (320px)   │  │ flex-1                         │  │
│  │                │  │                                │  │
│  │ [白色卡片]      │  │ [白色卡片]                      │  │
│  │ rounded-[24px] │  │ rounded-[24px]                 │  │
│  │                │  │                                │  │
│  └────────────────┘  └────────────────────────────────┘  │
│  ← gap-6 (24px) →                                        │
└──────────────────────────────────────────────────────────┘
```

**设计特点：**
- **独立卡片**：两个白色卡片，有圆角、阴影、边框
- **外层间距**：`bg-[#F8F9FB] p-6` - 周围留白，卡片不贴边
- **卡片间距**：`gap-6` (24px) - 两个卡片之间的间距
- **与demo一致**：清晰的视觉层次，友好的间距感

**布局容器：**
```tsx
// chat-page-content.tsx - 脱离 AppLayout padding，全屏模式
<div className="fixed inset-0 top-0 lg:left-[280px] bg-[#F8F9FB] z-0">
  <ChatPanel libraryId={libraryId} />
</div>

// chat-panel.tsx - 卡片式布局
<div className="flex h-full bg-[#F8F9FB] p-6 gap-6">
  {/* 会话列表卡片 */}
  <div className="w-80 bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
    ...
  </div>

  {/* 聊天详情卡片 */}
  <div className="flex-1 bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
    ...
  </div>
</div>
```

### 会话列表卡片

**核心特征：**
- 宽度：`w-80` (320px) - 固定宽度
- 卡片样式：`bg-white rounded-[24px] shadow-sm border border-gray-100`
- 结构：`flex flex-col overflow-hidden` - 垂直布局，防止内容溢出
- **不可折叠** - 始终显示，无折叠按钮

```tsx
<div className="w-80 bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
  {/* Header: 标题 + New Chat 按钮（右对齐） */}
  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <MessageSquarePlus className="w-5 h-5 text-orange-600" />
      <h2 className="text-base font-bold text-gray-900">Chat History</h2>
    </div>
    {/* New Chat 按钮 - 右对齐 */}
    <Button
      onClick={handleNewChat}
      size="sm"
      className="rounded-full"
      title="New Chat"
    >
      <MessageSquarePlus className="w-4 h-4" />
    </Button>
  </div>

  {/* 筛选器（可选） */}
  <div className="px-6 py-3 border-b border-gray-100">
    <LibraryFilterDropdown />
  </div>

  {/* 会话列表 */}
  <div className="flex-1 overflow-y-auto p-3">
    <ChatSessionList sessions={sessions} ... />
  </div>
</div>
```

**设计说明：**
- **Header布局**：`flex items-center justify-between` - 标题左对齐，按钮右对齐
- **New Chat按钮**：`size="sm"` 小尺寸，只显示图标，节省空间
- **移除底部按钮区域**：不再在列表底部显示 New Chat 按钮，避免与右侧输入框视觉冲突

**会话列表项样式：**
```tsx
<button className="w-full flex flex-col gap-1 px-4 py-3 rounded-2xl text-left hover:bg-gray-50 transition-colors group">
  {/* 标题行 */}
  <div className="flex items-center justify-between gap-2">
    <h3 className="text-sm font-semibold text-gray-900 truncate flex-1">
      Conversation Title
    </h3>
    <button className="p-1.5 text-gray-300 hover:text-red-600 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>

  {/* 时间戳 */}
  <p className="text-xs text-gray-400">2 hours ago</p>

  {/* 库标签（如有） */}
  {libraryName && (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <Library className="w-3 h-3" />
      <span className="truncate">{libraryName}</span>
    </div>
  )}
</button>

{/* 活动状态 */}
<button className="... bg-orange-50 border-l-2 border-orange-500">
  {/* 活动会话样式 */}
</button>
```

### 聊天详情卡片

**核心特征：**
- 卡片样式：`flex-1 bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col overflow-hidden`
- **无顶部header**：直接从消息区域开始，符合demo设计
- **配置标签位置**：在输入框上方显示（模型/库/联网搜索）
- **Artifacts预览**：通过消息中的按钮触发，无全局切换按钮

聊天详情卡片根据是否有 Artifacts 预览，分为**单栏模式**和**双栏模式**：

#### 单栏模式（无 Artifacts）

```tsx
<div className="flex-1 bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
  {/* 无库模式提示（可选） */}
  {!selectedLibraryId && messages.length === 0 && (
    <div className="px-6 pt-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No library selected. Using general chat mode.
        </AlertDescription>
      </Alert>
    </div>
  )}

  {/* 消息区域 - 直接开始，无header */}
  <div className="flex-1 overflow-y-auto px-6 py-6">
    {isLoadingMessages ? (
      <div className="flex justify-center items-center h-full">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading chat history...</p>
        </div>
      </div>
    ) : messages.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-6">
          <MessageSquarePlus className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          No Messages Yet
        </h3>
        <p className="text-gray-500 max-w-md">
          Start a conversation by typing a message below
        </p>
      </div>
    ) : (
      <ChatMessageList messages={messages} isLoading={isSending} onArtifactClick={handleArtifactClick} />
    )}
  </div>

  {/* 输入区域 */}
  <div className="border-t border-gray-100 bg-white px-6 py-4">
    {/* 会话配置标签 - 在输入框上方 */}
    {sessionConfig && (
      <div className="flex items-center gap-2 text-sm mb-3">
        {sessionConfig.modelName && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
            <span>🤖</span>
            <span>{sessionConfig.modelName}</span>
          </span>
        )}
        {sessionConfig.webSearchEnabled && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span>🌐</span>
            <span>Web Search</span>
          </span>
        )}
        {sessionConfig.libraryName && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <span>📚</span>
            <span>{sessionConfig.libraryName}</span>
          </span>
        )}
      </div>
    )}

    <ChatInput ... />
  </div>
</div>
```

#### 双栏模式（有 Artifacts）

```tsx
<div className="flex-1 bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
  <ResizablePanelGroup direction="horizontal" className="flex-1">
    {/* 左侧：聊天消息 */}
    <ResizablePanel defaultSize={40} minSize={30}>
      <div className="h-full flex flex-col">
        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ChatMessageList messages={messages} isLoading={isSending} onArtifactClick={handleArtifactClick} />
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-100 bg-white px-6 py-4">
          {/* 会话配置标签 */}
          {sessionConfig && (
            <div className="flex items-center gap-2 text-sm mb-3">
              {/* ... 同单栏模式 ... */}
            </div>
          )}

          <ChatInput ... />
        </div>
      </div>
    </ResizablePanel>

    {/* 分隔符 */}
    <ResizableHandle withHandle className="bg-gray-100 hover:bg-orange-200 transition-colors" />

    {/* 右侧：Artifacts 预览 */}
    <ResizablePanel defaultSize={60} minSize={40}>
      <div className="h-full bg-white flex flex-col">
        {/* Artifacts 标题栏 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Preview</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setArtifactsOpen(false)}
            title="Close preview"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Artifacts 内容 */}
        <div className="flex-1 overflow-auto p-6">
          <ArtifactRenderer artifact={selectedArtifact} />
        </div>
      </div>
    </ResizablePanel>
  </ResizablePanelGroup>
</div>
```

**设计说明：**
- **无header设计**：移除顶部标题栏，消息区域直接从卡片顶部开始
- **配置标签位置**：从header移到输入框上方，`mb-3` 与输入框保持间距
- **Artifacts触发方式**：用户点击消息中的artifacts按钮触发预览，无全局切换按钮
- **关闭预览**：Artifacts预览右上角有关闭按钮（X），点击关闭预览面板

### 输入区域规范

```tsx
<div className="border-t border-gray-100 bg-white px-6 py-4 space-y-3">
  {/* 配置栏（仅新对话显示，锁定后隐藏） */}
  {!isConfigLocked && (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 模型选择 */}
      <Select value={modelId} onChange={...} className="...">
        <option>Select Model</option>
        <option value="gpt-4">GPT-4</option>
      </Select>

      {/* 库选择 */}
      <Select value={libraryId} onChange={...} className="...">
        <option>No Library (General Chat)</option>
        <option value="lib1">Tech Library</option>
      </Select>

      {/* 联网搜索开关 */}
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={webSearchEnabled}
          onChange={...}
          className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
        />
        Web Search
      </label>
    </div>
  )}

  {/* 输入框 */}
  <div className="relative">
    <textarea
      value={input}
      onChange={...}
      placeholder="Type your message..."
      rows={3}
      className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all"
    />
    <button
      type="submit"
      disabled={!input.trim() || isLoading}
      className="absolute right-2 bottom-2 p-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl transition-all"
    >
      <Send className="w-4 h-4" />
    </button>
  </div>

  {/* 底部信息栏 */}
  <div className="flex items-center justify-between text-xs text-gray-400">
    <span>Estimated cost: ~10 credits</span>
    <span>AI can make mistakes. Please verify important information.</span>
  </div>
</div>
```

### 消息样式规范

```tsx
{/* 用户消息 */}
<div className="flex justify-end">
  <div className="max-w-[70%] px-4 py-3 bg-orange-500 text-white rounded-2xl rounded-tr-sm">
    <p className="text-sm leading-relaxed">{content}</p>
  </div>
</div>

{/* AI 消息 */}
<div className="flex justify-start">
  <div className="flex gap-3 max-w-[85%]">
    {/* AI 头像 */}
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      AI
    </div>

    {/* 消息内容 */}
    <div className="flex-1 space-y-3">
      {/* Markdown 内容 */}
      <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm">
        <ReactMarkdown className="prose prose-sm max-w-none">
          {content}
        </ReactMarkdown>
      </div>

      {/* Artifacts 列表（如有） */}
      {artifacts && artifacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {artifacts.map(artifact => (
            <button
              onClick={() => onArtifactClick(artifact)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-medium text-blue-700 transition-colors"
            >
              <FileCode className="w-4 h-4" />
              {artifact.title}
            </button>
          ))}
        </div>
      )}

      {/* 元数据（token、credit） */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>💳 10 credits</span>
        <span>📊 2,450 tokens</span>
        <button className="hover:text-gray-600 transition-colors">
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</div>
```

### 空状态设计

```tsx
{/* 无消息时 */}
<div className="flex flex-col items-center justify-center h-full text-center px-6">
  <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-6">
    <MessageSquarePlus className="w-10 h-10" />
  </div>
  <h3 className="text-2xl font-bold text-gray-900 mb-3">
    No Messages Yet
  </h3>
  <p className="text-gray-500 max-w-md mb-6">
    Start a conversation by typing a message below
  </p>

  {/* 快捷提示（可选） */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
    <button className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-orange-200 hover:shadow-md transition-all text-left group">
      <p className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
        Analyze my content
      </p>
      <p className="text-xs text-gray-500">
        Ask AI to analyze documents in your library
      </p>
    </button>
    <button className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-orange-200 hover:shadow-md transition-all text-left group">
      <p className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
        General chat
      </p>
      <p className="text-xs text-gray-500">
        Have a conversation without selecting a library
      </p>
    </button>
  </div>
</div>

{/* 无会话时 */}
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
    <MessageSquarePlus className="w-8 h-8" />
  </div>
  <h3 className="text-lg font-bold text-gray-900 mb-2">
    No Conversations Yet
  </h3>
  <p className="text-sm text-gray-500 mb-6 max-w-xs">
    Start a new chat to begin
  </p>
  <Button onClick={handleNewChat} className="rounded-full">
    <Plus className="w-4 h-4 mr-2" />
    New Chat
  </Button>
</div>
```

### Badge 样式（会话配置标签）

```tsx
{/* 模型标签 */}
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
  <span>🤖</span>
  <span>GPT-4</span>
</span>

{/* 库标签 */}
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
  <span>📚</span>
  <span>Tech Library</span>
</span>

{/* 联网搜索标签 */}
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
  <span>🌐</span>
  <span>Web Search</span>
</span>
```

### 响应式适配

```tsx
{/* 移动端：隐藏会话列表卡片，添加浮动按钮 */}
<div className="flex h-full bg-[#F8F9FB] p-6 gap-6">
  {/* 会话列表卡片（桌面端固定显示，移动端隐藏） */}
  <div className="hidden lg:flex w-80 bg-white rounded-[24px] shadow-sm border border-gray-100 flex-col overflow-hidden">
    {/* 会话列表内容 */}
  </div>

  {/* 移动端：浮动按钮打开会话列表 */}
  <button className="lg:hidden fixed bottom-20 right-6 z-50 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center">
    <MessageSquarePlus className="w-6 h-6" />
  </button>

  {/* 聊天详情卡片（flex-1） */}
  <div className="flex-1 bg-white rounded-[24px] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
    {/* ... */}
  </div>
</div>
```

### 关键设计原则

1. **独立卡片布局** - 两个白色卡片（会话列表 + 聊天详情），周围有padding和间距
2. **与demo一致** - 清晰的视觉层次，友好的间距感，大圆角设计
3. **无header设计** - 聊天详情卡片直接从消息区域开始，无顶部标题栏
4. **配置标签位置** - 在输入框上方显示（模型/库/联网搜索）
5. **New Chat按钮位置** - 在会话列表header右侧，避免与输入框视觉冲突
6. **Artifacts触发方式** - 通过消息中的按钮触发，无全局切换按钮
7. **大圆角卡片** - 卡片使用 `rounded-[24px]`（24px），消息气泡使用 `rounded-2xl`（16px）
8. **橙色主题** - 主要操作按钮使用 `bg-orange-500`
9. **清晰层次** - 通过背景色、边框、阴影建立清晰的视觉层次
10. **Title Case** - 所有英文标题使用 Title Case（主要单词首字母大写）

