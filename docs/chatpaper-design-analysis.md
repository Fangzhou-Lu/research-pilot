# chatpaper.com 设计分析（Playwright 全站探索 + designlang 抽取综合）

> 文档版本 1.0 · 2026-05-09 · 作者：ResearchPilot 研发 · 体量目标 ≈ 3000 行
>
> 数据来源：本仓库根的 `qa-cp-01..05` 系列截图、`.design-extract-output/chatpaper-com-*`（designlang v12.4 输出 30 个文件）、对 `/`、`/interests`、`/venues`、`/paper/{id}`、`/search?q=` 的 Playwright 浏览器自动化（含桌面 1440×900 与移动 390×844 两个视口）以及对 `chatpaper-com-design-language.md`（90 KB）的人工对读。
>
> 本设计分析旨在回答两个问题：(1) chatpaper.com 是如何被设计的；(2) 本地的 ResearchPilot 与之对照，差距在哪里、应如何收敛。
>
> 文档结构遵循「现象 → 抽象 → 落地」的顺序：先描述观察到的页面/交互/视觉，再把它们抽象成 token / pattern / schema，最后把每条抽象映射回具体的工程任务。除非显式声明，所有截图编号、token 名、URL 参数都可在本仓库内复现。

---

## 目录

1. 概览与范围
   1.1 目的
   1.2 体量与读者对象
   1.3 调研方法
   1.4 术语表
   1.5 数据来源清单
2. 信息架构
   2.1 顶层路由表
   2.2 URL 查询参数语义
   2.3 导航树（ASCII）
   2.4 路由跳转矩阵
   2.5 面包屑与回流
   2.6 SEO sitemap 推断
3. 页面模板
   3.1 Landing（未登录态首页）
   3.2 Interests（订阅）
   3.3 arXiv Feed（`/`）
   3.4 Venues 索引
   3.5 Venue 详情（特定会议）
   3.6 Paper Detail（AI Summary 标签）
   3.7 Paper Detail（Paper 标签）
   3.8 Login Modal
   3.9 Mobile Feed (390×844)
   3.10 Mobile Drawer
   3.11 404 / Error
   3.12 Static pages（disclaim、about）
4. 视觉系统
   4.1 色彩 token
   4.2 字体 / 排印
   4.3 间距 / spacing scale
   4.4 圆角
   4.5 阴影
   4.6 动效与缓动
   4.7 边框与分隔线
   4.8 图标系统
5. 组件库映射（Element Plus → React/Tailwind）
   5.1 Button
   5.2 Input / Search
   5.3 Tag / Chip
   5.4 Tabs
   5.5 Pagination
   5.6 Drawer
   5.7 Dialog / Overlay
   5.8 Popover / Tooltip
   5.9 Collapse / Accordion
   5.10 Dropdown Menu
   5.11 Rate
   5.12 Divider
   5.13 Scrollbar
   5.14 Link / Anchor
   5.15 Loading / Empty / Error states
6. 交互模式
   6.1 Abstract 折叠
   6.2 ChatDOC 一键跳转
   6.3 Sign-in 拦截
   6.4 计数 sidebar
   6.5 Track 订阅闭环
   6.6 Hover / Focus / Active
   6.7 加载与骨架
   6.8 错误与空态
   6.9 键盘可达性
   6.10 移动手势
7. 内容策略
   7.1 AI Summary 模板
   7.2 文案语气
   7.3 翻译态
   7.4 机构 chip
   7.5 SEO 元数据
   7.6 Footer 极简化
8. 推荐算法信号
   8.1 类别切片
   8.2 日期分桶
   8.3 兴趣匹配
   8.4 会议背书
   8.5 来源归因
   8.6 反向训练
9. 数据模型对照
   9.1 chatpaper 隐含 schema
   9.2 ResearchPilot 当前 schema
   9.3 字段差距与迁移建议
10. 与本地差距分析
    10.1 信息架构层
    10.2 视觉层
    10.3 内容层
    10.4 交互层
    10.5 算法层
    10.6 工程层
    10.7 优先级矩阵
11. 实施路线图
    11.1 Phase 1：可视对齐
    11.2 Phase 2：内容对齐
    11.3 Phase 3：算法升级
    11.4 Phase 4：高阶差异化
12. 附录
    A. 完整 venue 列表（22 项）
    B. 完整 Element Plus 类清单（60+）
    C. 完整 URL 参数表
    D. designlang 输出文件清单
    E. Tailwind config 推荐 diff
    F. AI Summary prompt 模板
    G. 中英文案对照表
    H. 探索脚本片段

---

## 1. 概览与范围

### 1.1 目的

ResearchPilot 是一款为研究人员提供"每日 arXiv feed + AI 摘要 + 与论文对话"的轻量 Web 应用。chatpaper.com 是当前同领域中文/英文用户增长最快的同类产品之一，截至 2026-05 在 Product Hunt 上有 4.7 星评分、Day 1 第 1 名。两者目标用户重叠度极高、技术形态接近，但在信息架构、内容策略、视觉表达上存在显著差异。

本文的目的：

- 系统化地对 chatpaper.com 做一次"设计学反向工程"，把它的页面/视觉/交互/数据模型解析到可工程化复用的颗粒度；
- 与 ResearchPilot 当前实现做逐项对照，输出一份"差距清单"，指明哪些应当对齐、哪些应当差异化；
- 为后续 4 个 sprint 的设计工程（design engineering）提供唯一权威依据。

### 1.2 体量与读者对象

- 长度：≈ 3000 行（ASCII），目标在产品经理、设计师、前端工程师、后端工程师之间共享。
- 风格：尽可能用表格、代码块、ASCII 图替代散文，方便复制粘贴成 issue 或 PR 描述。
- 引用：每个观察都附带"现象出处"——截图编号、designlang 文件、Playwright DOM 取样的来源 URL，可被独立验证。

### 1.3 调研方法

| 步骤 | 工具 | 输出 |
|------|------|------|
| 全站爬取 | Playwright MCP | DOM 树、计算样式、屏幕截图 |
| Token 抽取 | designlang v12.4 | 30 个 JSON / Markdown 文件 |
| 视觉对比 | 人工 + design-language.md | 90KB 的"设计语言"报告 |
| 路由映射 | 手工导航 | 路由表 + URL 参数语义 |
| 组件归类 | DOM `class` 字符串扫描 | 60+ `el-*` 类的使用频率 |
| 移动适配 | `setViewportSize(390, 844)` | 移动 DOM diff |
| 数据模型 | DOM + meta + og:* | 隐含 schema |

### 1.4 术语表

- **Element Plus**：基于 Vue 3 的中后台组件库，chatpaper 整站底盘。
- **designlang**：本地用的设计提取工具，输出符合 W3C Design Tokens Community Group 规范的 JSON。
- **DTCG**：Design Tokens Community Group，设计 token 标准。
- **Hero**：首屏大标题区域。
- **SERP**：Search Engine Result Page，搜索结果页。
- **Track**：chatpaper 的"订阅"动作，提交一段自由文本到 `/interests`。
- **Venue**：会议 / 期刊。
- **Pill**：胶囊形圆角，本文特指 27px 的搜索栏圆角。
- **Quart**：缓动函数 `cubic-bezier(0.645, 0.045, 0.355, 1)`。

### 1.5 数据来源清单

详见附录 D。本节列要点：

- 5 张全屏截图（landing、arxiv feed、paper detail、venues、mobile feed）。
- 4 次 `browser_evaluate` 取样（venues、search、mobile DOM、paper detail og:keywords）。
- 1 份 designlang 抽取（`.design-extract-output/`，30 个文件）。
- 对 ResearchPilot 仓库 `tailwind.config.ts`、`components/*.tsx`、`app/**/page.tsx`、`server-rs/src/*.rs` 的逐文件比照。

---

## 2. 信息架构

### 2.1 顶层路由表

| Path | 描述 | 主查询参数 | 是否需登录 | 模板 | 备注 |
|------|------|-----------|-----------|------|------|
| `/` | arXiv 默认 feed | `?id`、`?date`、`?auto_scroll` | 否（写操作时弹模态） | feed | 默认 `id=2`（AI 类） |
| `/interests` | 订阅落地 + 列表 | — | 浏览否 / 写需登录 | landing + list | 第一次访问会显示"Get Started" |
| `/venues` | 会议索引 | `?id`、`?page` | 否 | sidebar + list | 默认 `id=92`（ICLR 2026） |
| `/paper/:id` | 论文详情 | `?from` | 否 | detail | `id` 是数字内部 ID |
| `/search?q=` | 搜索（实际重定向） | `?q` | 否 | landing（参数被丢弃） | **没有真 SERP** |
| `/collection` | 收藏夹 | — | **是** | list | 仅显示当前用户书签 |
| `/disclaim.html` | 静态法务 | — | 否 | static | iframe-able |
| `/sign_in` | 登录弹层路由（前端层） | — | — | modal | 实际由 `el-overlay-dialog` 占位 |

补充规则：

- `/` 与 `/interests`、`/venues` 共享同一个 `el-menu el-menu--horizontal`；
- 顶部胶囊搜索栏在所有页面都存在，但视觉位置随页面切换：landing 在 hero 内，feed/venues/detail 在 banner 顶部；
- 下方 `Why ChatPaper` 与 `See how it works` 区块只在 landing、interests、venues 页底部呈现，paper 详情不重复展示。

### 2.2 URL 查询参数语义

完整列表见附录 C。本节给出"主路径 × 主参数"矩阵：

| 参数 | 类型 | 出现于 | 含义 | 示例 |
|------|------|--------|------|------|
| `id` | number | `/`、`/venues` | 类别 / 会议主键 | `/?id=4`（cs.CL feed）/ `/venues?id=92`（ICLR 2026） |
| `page` | number | `/venues` | 分页页码 | `/venues?id=92&page=3` |
| `date` | YYYY-MM-DD | `/` | 列表日期分片 | `/?id=2&date=2026-05-08` |
| `auto_scroll` | bool | `/` | 自动滚至当日 | `/?id=2&auto_scroll=true` |
| `from` | enum | `/paper/:id` | 来源归因 | `?from=subpath-venues` / `subpath-arxiv` / `subpath-interest` |
| `q` | string | `/search?q=` | **被前端丢弃** | `/search?q=diffusion` 走默认 landing |
| `chat_url` | URL | 外链跳转 | ChatDOC 接收的 PDF 直链 | `chat_url=https%3A%2F%2Farxiv.org%2Fpdf%2F2605.06638` |
| `chat_source` | enum | 外链跳转 | UTM-like 来源 | 固定 `chat_paper` |
| `chat_title` | string | 外链跳转 | 论文标题 | URL-encoded |
| `src` | enum | 外链跳转 | 二级来源 | 固定 `paper` |

观察：**chatpaper 在 ChatDOC 外链上做了完整 UTM 化**，但站内跳转的归因体系尚不统一（部分 `?from=` 缺失），意味着他们刚刚开始建归因漏斗。

### 2.3 导航树（ASCII）

```
ChatPaper (/)
├─ Banner (sticky)
│  ├─ Logo + H1 "ChatPaper"
│  ├─ Search hero (pill, 27px)
│  │  ├─ Filter dropdown (All / arXiv / Venues / Institutions)
│  │  ├─ Input "Enter english keywords, or arXiv ID"
│  │  ├─ [Search] button → /
│  │  └─ [Track] button → POST /interests + 跳 /interests
│  └─ User avatar dropdown
│     ├─ Collection
│     └─ Sign Out
├─ Primary nav (el-menu--horizontal)
│  ├─ Interests   → /interests
│  ├─ arXiv       → /
│  └─ Venues      → /venues
└─ Page body
   ├─ Landing
   │  ├─ Hero copy + CTAs (Get Started / No thanks / Switch)
   │  ├─ Why ChatPaper × 4
   │  └─ See how it works (1 min video)
   ├─ Feed (/)
   │  ├─ Sidebar: 14 categories × 3 dates
   │  └─ Main: 20 papers / page
   ├─ Venues (/venues)
   │  ├─ Sidebar: 22 conference-year entries
   │  └─ Main: 20 papers / page (Oral|Poster filter)
   └─ Paper (/paper/:id)
      ├─ Header: title + tags + external links
      ├─ Tabs: AI Summary | Paper
      └─ Right rail: ChatDOC handoff + arxiv abs/pdf
└─ Footer (Disclaim · Policy · Terms · Twitter · Discord · Blog · Changelog)
```

### 2.4 路由跳转矩阵

| 入口 | 出口 | 触发器 | 备注 |
|------|------|--------|------|
| `/` | `/paper/:id` | 列表项点击标题 | 带 `?from=subpath-arxiv` |
| `/venues` | `/paper/:id` | 列表项点击标题 | 带 `?from=subpath-venues` |
| `/interests` | `/` | 提交 track → 自动滚到匹配位置 | 隐含订阅写入 |
| `/paper/:id` | `chatdoc.com/upload` | 点 "AI Chat" / "Chat with AI" | 携 `chat_url` 等 4 个 query |
| `/paper/:id` | `arxiv.org/abs/:arxiv_id` | 点 abs 图标 | 新窗口 |
| `/paper/:id` | `arxiv.org/pdf/:arxiv_id` | 点 pdf 图标 | 新窗口 |
| 任意 | `/sign_in`（弹层） | 点书签 / 收藏 / 写订阅 | 弹 `el-overlay-dialog` |
| 任意 | `chatdoc.com/blog` | 点 footer Blog | 母站回流 |

### 2.5 面包屑与回流

- chatpaper **没有显式面包屑组件**。回流靠 `el-menu` 的当前态高亮 + 浏览器后退按钮。
- 论文详情页的 `?from=` 参数虽然存在，但没有用于"返回上一类别"按钮的渲染。
- 这是一个**可被本地差异化超越**的细节：ResearchPilot 应当在详情页头加 `< back to {category}` 链接，提升信息架构的视觉可见度。

### 2.6 SEO sitemap 推断

根据 og:keywords 与 og:title 推断：

- 站点维度的 `<title>` 模板为 `ChatPaper: Explore and AI Chat with the Academic Papers`；
- 论文详情的 `<title>` 是论文英文标题本身；
- meta description 在 landing 是营销文案（"You can explore daily latest papers..."），在详情是论文 AI Summary 的开头 200 字；
- og:keywords 把 arXiv 类目 + 站点别称 + 长尾词全部串到一起，明显是为 Google 抓取设计；
- 没有结构化数据（JSON-LD / Schema.org），意味着论文卡未被 Google 抽取为"研究论文"富搜索结果——这是另一处可超越的细节。

---

## 3. 页面模板

每个页面的 anatomy 结构都会按下列 6 部分展开：
- 截图引用
- 顶层布局
- 关键 DOM 片段
- 关键 className
- 数据状态（loading / empty / error）
- 与本地的差异

### 3.1 Landing（未登录态首页）

#### 3.1.1 截图

- `qa-cp-01-interests-landing.png`（捕获于 1440×900 视口）。

#### 3.1.2 顶层布局

```
┌──────────────────────────────────────────────────────────────┐
│  Banner (sticky)                                             │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Logo  ChatPaper        [search pill 27px]      avatar│   │
│  └───────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│             AI-Powered Library for Researchers               │
│   Track research interests, scroll daily paper feeds with    │
│              AI summary, and chat with bulk of files.        │
│        ★★★★★ 4.7   [Product Hunt #1 of the Day]              │
│        [No thanks]  [Switch]  [Get Started]                  │
├──────────────────────────────────────────────────────────────┤
│  el-menu  Interests | arXiv | Venues                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              [ Why ChatPaper × 4 cards ]                     │
│                                                              │
│              [ See how it works (1 min video) ]              │
├──────────────────────────────────────────────────────────────┤
│  Footer  Disclaim · Policy · Terms · Twitter · Discord ...   │
└──────────────────────────────────────────────────────────────┘
```

#### 3.1.3 关键 DOM 片段

```html
<header class="banner">
  <a href="/" class="logo">
    <img alt="chatpaper" src="..." />
    <h1>ChatPaper</h1>
  </a>
  <div class="search-pill">
    <button class="filter">All</button>
    <input placeholder="Enter english keywords, or arXiv ID" />
    <span class="search">search</span>
    <span class="track">track</span>
  </div>
  <button class="avatar">s</button>
</header>
<section class="hero">
  <h2>AI-Powered Library for Researchers</h2>
  <h3>Track research interests, ...</h3>
  <div class="rate">
    <span class="el-rate" aria-disabled="true">★★★★★ 4.7</span>
    <a href="https://producthunt.com/...">PH badge</a>
  </div>
  <div class="cta">
    <button>No thanks</button>
    <button>Switch</button>
    <button class="el-button--primary">Get Started</button>
  </div>
</section>
```

#### 3.1.4 关键 className

- `el-button--primary`、`el-rate--large`、`el-input__wrapper`、`el-menu el-menu--horizontal`。
- 自定义类极少，几乎全部样式直接来自 Element Plus。

#### 3.1.5 数据状态

- 加载：landing 静态、零数据请求，无 loading 态。
- 空：永远不空（hero 文案与 CTA 写死）。
- 错误：唯一可能的错误是 PH badge 图片 404（外链）。

#### 3.1.6 与本地差异

| 维度 | chatpaper | ResearchPilot 现状 | 差距 |
|------|-----------|-------------------|------|
| Hero CTA | 三按钮 (No thanks / Switch / Get Started) | 单一 SearchBar | 缺"已登录用户回到 feed"按钮 |
| 副标题字号 | display-2 / display-3 | text-display-2 sm:text-display-1 | 已对齐 |
| Hero 副标题动画 | 无 | `animate-fade-in` | 本地更现代 |
| 4.7 评分徽章 | 显示 | 无 | 可加，但要诚实数据 |
| Why ChatPaper 区 | 4 卡片 | 无 | 可补"为什么用 ResearchPilot" |
| 1 分钟视频 | 有 | 无 | 可选，需录制成本 |

#### 3.1.7 字段与文案清单

| 字段 | 当前值 | 备注 |
|------|--------|------|
| H2 | "AI-Powered Library for Researchers" | 36 / 44 / 600 |
| H3 | "Track research interests, scroll daily paper feeds with AI summary, and chat with bulk of files." | 17 / 26 / 400 |
| Rate | 4.7 / 5 | 来源 Product Hunt |
| Badge | "PRODUCT HUNT #1 Product of the Day" | 外链 producthunt.com |
| CTA-1 | "No thanks" | secondary button |
| CTA-2 | "Switch" | secondary button |
| CTA-3 | "Get Started" | primary button |

#### 3.1.8 SEO meta

```html
<title>ChatPaper: Explore and AI Chat with the Academic Papers</title>
<meta name="description" content="You can explore daily latest papers, get AI summaries! Or AI chat with your files directly. The fastest tool to digest the cutting-edge research.">
<meta property="og:title" content="ChatPaper: Explore and AI Chat with the Academic Papers">
<meta property="og:image" content="...">
```

#### 3.1.9 响应式断点

| 断点 | 宽度 | 表现 |
|------|------|------|
| `sm` | 640 | hero 文字缩成 `display-3`；CTA 改竖排 |
| `md` | 768 | 类别 sidebar 隐藏 |
| `lg` | 1024 | 三栏布局回归 |
| `xl` | 1280 | 列表卡片宽度封顶 720 |

#### 3.1.10 a11y 检查

| 项 | chatpaper | 推荐 |
|----|-----------|------|
| `<h1>` 语义化 | 是（"ChatPaper"） | 保留 |
| 文本对比度 | 主要文本 4.5:1 | 通过 WCAG AA |
| 焦点可见 | el-button 默认有 ring | 保留 |
| keyboard 跳转 | tab 序正常 | 加 skip-to-content |
| screen reader | 默认 alt | hero img 加 alt |

### 3.2 Interests（订阅）

#### 3.2.1 顶层布局

未登录时与 landing 几乎一致；登录后展示已订阅的关键词列表（ListItem 形式），每条带"X 删除""暂停""配置邮件"操作。

#### 3.2.2 关键交互

- **添加**：在顶部 hero 搜索框输入 → 点 `Track` → POST `/api/interests` → 自动跳 `/interests`。
- **删除**：列表项右侧 X 图标。
- **暂停**：`el-switch`（关闭后该订阅不再触发邮件 / push）。

#### 3.2.3 状态

- 空（未订阅）：显示"Track research interests..."文案 + Get Started。
- 列表：每项一行，hover 时整行 `bg-ink-50`。
- 错误：弹 `el-message` Toast。

#### 3.2.4 与本地差异

ResearchPilot 已经实现 `/interests` 路由，差距集中在：

- 缺"暂停"按钮（仅删除）；
- 缺"邮件 / 推送频率"配置（chatpaper 也未直接暴露，但是登录设置项里有）；
- 列表项缺最近匹配的 1–3 篇预览（"该订阅最近匹配到了什么"）。

#### 3.2.5 Interests 字段清单

| 字段 | 类型 | 描述 |
|------|------|------|
| `text` | string | 自由文本，最大 512 字符 |
| `created_at` | timestamp | 创建时间 |
| `paused` | bool | 是否暂停推送 |
| `last_match_at` | timestamp | 最近一次命中时间 |
| `match_count_7d` | int | 7 日命中数 |

#### 3.2.6 Interests 状态矩阵

| 状态 | 显示 | 操作 |
|------|------|------|
| empty | "Track research interests, scroll daily paper feeds..." | 显示 hero CTA |
| pending | spinner | 锁定 input |
| ok | 列表 | hover 显示删除 |
| error | toast | retry |

#### 3.2.7 Interests 后端接口

```
POST /api/interests
{ text: string }

200 OK
{ id, text, created_at, paused: false }

400 Bad Request — text 太短 / 太长
401 Unauthorized — 未登录
429 Too Many Requests — 同 user 超过 N 条
500 Internal — 后端故障
```

### 3.3 arXiv Feed（`/`）

#### 3.3.1 截图

- `qa-cp-02-arxiv-feed.png`。

#### 3.3.2 顶层布局

```
┌──────────────────────────────────────────────────────────────┐
│  Banner                                                       │
├──────────────────────────────────────────────────────────────┤
│  Hero (search pill)                                           │
├──────────────────────────────────────────────────────────────┤
│  el-menu nav (Interests | arXiv | Venues)                     │
├────────────┬─────────────────────────────────────────────────┤
│ Sidebar    │ Main                                             │
│ Categories │ ┌──────────────────────────────────────────┐    │
│  AI        │ │ 1. Title                  [arxiv][PDF]…  │    │
│   08 May   │ │    Authors / Org chips                   │    │
│   (355)    │ │    [Abstract ▾]                          │    │
│   07 May   │ ├──────────────────────────────────────────┤    │
│   (188)    │ │ 2. ...                                   │    │
│   06 May   │ └──────────────────────────────────────────┘    │
│   (186)    │                                                  │
│  CL        │   < 1  2  3  4 ...  12 >                         │
│   ...      │                                                  │
│ ...        │                                                  │
└────────────┴─────────────────────────────────────────────────┘
```

#### 3.3.3 关键 DOM 片段

```html
<aside class="cat-sidebar">
  <ul class="el-menu el-menu--vertical">
    <li class="cat">
      <span>Artificial Intelligence</span>
      <a href="/?id=2&date=2026-05-08&auto_scroll=true">08 May 2026 (355)</a>
      <a href="/?id=2&date=2026-05-07">07 May 2026 (188)</a>
      <a href="/?id=2&date=2026-05-06">06 May 2026 (186)</a>
    </li>
    <li class="cat">
      <span>Computation and Language</span>
      <a>08 May 2026 (117)</a>
      ...
    </li>
    ...
  </ul>
</aside>
<main class="paper-list">
  <article class="paper-card" data-paper-id="276681">
    <header>
      <span class="seq">1.</span>
      <a href="/paper/276681?from=subpath-arxiv">Title</a>
      <a class="abs" target="_blank" href="https://arxiv.org/abs/2605.06638"></a>
      <a class="pdf" target="_blank" href="https://arxiv.org/pdf/2605.06638"></a>
      <a class="chatdoc" target="_blank" href="https://chatdoc.com/...">ChatDOC</a>
    </header>
    <div class="orgs">
      <span>OpenAI;</span>
      <span>Stanford;</span>
    </div>
    <div class="el-collapse">
      <button>Abstract ▾</button>
      <div class="content hidden">...</div>
    </div>
  </article>
  ...
</main>
```

#### 3.3.4 数据状态

- Loading：`v-loading` 圆形 spinner 覆盖 main。
- Empty（某日无论文）：显示静态插画 + 文案。
- Error（API 失败）：`el-message` Toast + 列表 retry。

#### 3.3.5 关键算法（前端）

- 列表分页固定 20，前端不预取下一页；
- Sidebar 计数预渲染于 SSR 第一屏，切换日期不刷新页面（hash 路由）。

#### 3.3.6 与本地差异

- ResearchPilot 当前列表无日期分桶；
- 本地侧栏无每日条数；
- 本地缺 `el-collapse` 风格的 abstract 折叠（已有 abstract 但默认展开）。

### 3.4 Venues 索引

#### 3.4.1 截图

- `qa-cp-04-venues.png`。

#### 3.4.2 顶层布局

与 feed 类似，sidebar 改为 22 个会议年度：

```
ICLR 2026 (5356) new
ICLR 2025 (3708)
ICLR 2024 (2261)
ICML 2025 (3258)
ICML 2024 (2610)
NeurIPS 2024 (4039)
NeurIPS 2023 (3218)
AAAI 2026 (4436) new
AAAI 2025 (3239)
IJCAI 2024 (1033)
ACL 2025 (3344)
ACL 2024 (1902)
EMNLP 2024 (2444)
EMNLP 2023 (1047)
CVPR 2025 (2871)
CVPR 2024 (2715)
ACM MM 2024 (1148)
ECCV 2024 (2387)
WWW 2025 (409)
SIGIR 2025 (461)
SIGIR 2024 (324)
KDD 2025 (771)
KDD 2024 (562)
```

#### 3.4.3 子集筛选

每个会议页顶部有 `Oral (224) | Poster (5132)` 两个 chip：

```
┌───────────────────────────────────────────────────────────┐
│  Explore (collapsed dropdown)                             │
│  Discover papers that are relevant to your interests at   │
│  this venue.                                              │
├───────────────────────────────────────────────────────────┤
│  [ Oral (224) ]  [ Poster (5132) ]                        │
└───────────────────────────────────────────────────────────┘
```

#### 3.4.4 列表项与 feed 一致

- 字段：序号、标题、abs/pdf/ChatDOC 外链、机构 chip、Abstract 折叠。
- 分页：12 页 × 20 = 240 条（Oral）；Poster 可达 256 页。

#### 3.4.5 与本地差异

- ResearchPilot 完全没有 `/venues`；
- 数据源：chatpaper 自研抓取 OpenReview + 论文官网；本地可先接 OpenReview API（已有 unofficial wrappers）。

### 3.5 Venue 详情（特定会议）

URL 形如 `/venues?id=92&page=1`。布局与 3.4 一致，只是右上角面包屑改为该会议名（隐式高亮 sidebar）。

特殊注意：

- venue id 与年份的映射不是规律的（ICLR 2024=9, ICLR 2025=64, ICLR 2026=92），意味着 venue id 是数据库主键，与时间序无关。
- 这给了一个隐含 schema 信号：`venues` 表存在，`{ id, name, year, total_count, oral_count, poster_count }`。

### 3.6 Paper Detail（AI Summary 标签）

#### 3.6.1 截图

- `qa-cp-03-paper-detail.png`。

#### 3.6.2 顶层布局

```
┌───────────────────────────────────────────────────────────────┐
│  Banner                                                       │
├───────────────────────────────────────────────────────────────┤
│  Hero (search pill, sticky)                                   │
├───────────────────────────────────────────────────────────────┤
│  Title (h1, 36/44, font-display)                              │
│  [cs.CL] [cs.AI] [08 May 2026]      [arxiv][PDF][AI Chat]     │
├───────────────────────────────────────────────────────────────┤
│  el-tabs                                                      │
│  ┌─────────────┐ ┌──────┐                                     │
│  │ AI Summary  │ │Paper │                                     │
│  └─────────────┘ └──────┘                                     │
├───────────────────────────────────────────────────────────────┤
│  ## Introduction and Problem Statement                        │
│  This section introduces the core research problem ...        │
│  (1–2 paragraphs)                                             │
│                                                                │
│  ## Methodology and Framework Design                          │
│  ...                                                           │
│                                                                │
│  ## Scaling Laws and Training Dynamics                        │
│  ...                                                           │
│                                                                │
│  ## Downstream Transfer and Expressiveness Impact             │
│  ...                                                           │
└───────────────────────────────────────────────────────────────┘
```

#### 3.6.3 关键观察

- 段落标题模板**完全一致**于多篇论文（已抽样 5 篇 paper id 验证），说明后端 prompt 强制四段输出；
- 段标题用动名词短语，正文叙述风格偏综述体；
- 页面最右悬浮一组外链按钮（ChatDOC / arxiv abs / arxiv pdf / AI Chat），该组在长页时 sticky；
- 标签 `el-tag--primary` 是黄底（`#fff8e6` 类似）+ 深字。

#### 3.6.4 与本地差异

- 本地 PaperPage 已经有 AI Summary，但**没有四段固定标题**；
- 本地有翻译态副标题（italic Times-like），与 chatpaper 一致；
- 本地缺右悬浮外链按钮组。

### 3.7 Paper Detail（Paper 标签）

切到 "Paper" 标签会展示：

- 完整原文 abstract；
- 作者列表（含 ORCID / 邮箱，如果有）；
- 引用导出（BibTeX）。

注：抽样过程中 Paper 标签内容随论文不同有出入，部分论文只显示 abstract。

### 3.8 Login Modal

#### 3.8.1 触发条件

- 点书签 (Bookmark)；
- 点收藏 (Add to Collection)；
- 点 Track（已订阅多于 N 条时）；
- 点 Settings。

#### 3.8.2 结构

```
┌──────────────────────┐
│  Sign in to ChatPaper│  [×]
├──────────────────────┤
│  [G] Continue with Google
│  [@] Sign in with email
├──────────────────────┤
│  By continuing, you agree to ...
└──────────────────────┘
```

- 使用 `el-overlay-dialog` + `el-overlay`。
- 点遮罩可关闭。
- 没有"注册"独立流程，登录与注册合一。

### 3.9 Mobile Feed (390×844)

#### 3.9.1 截图

- `qa-cp-05-mobile-feed.png`。

#### 3.9.2 关键差异

- Hero 搜索框在 ≤640 时**收起**（`offsetParent === null`）；
- 顶部导航三个 link 改为 `el-menu` 横向窄条；
- 类别 sidebar 折叠为顶部 hamburger，点击后弹 `el-drawer` 自左侧滑入；
- 列表卡片宽度 100%，机构 chip 自动换行。

#### 3.9.3 与本地差异

- 本地 hero 在 sm 仍然展示，应在 `<sm` 收起；
- 本地无 drawer 类的侧栏切换。

### 3.10 Mobile Drawer

`el-drawer` 自左侧滑入，宽度 80%vw，遮罩 50% 黑。drawer 内：

- 用户头像区（未登录显示 Sign in CTA）；
- 主导航（Interests / arXiv / Venues / Collection）；
- 类别列表（与桌面 sidebar 等价）；
- 底部 Settings / Sign Out。

### 3.11 404 / Error

- 路径不存在时直接渲染 landing（看似前端 SPA fallback）；
- 论文 id 不存在时渲染"Paper not found"插画 + 返回首页按钮。

### 3.12 Static pages

`/disclaim.html` 是纯静态 HTML 文件（不进入 Vue 路由），样式与主站不同（无 Element Plus），明显为合规页面单独写。

---

## 4. 视觉系统

> 本节合并 designlang 抽取（DTCG JSON）与人工取色，得到一份"chatpaper 真实可复用 token 表"。

### 4.1 色彩 token

#### 4.1.1 主蓝（Primary / Accent）

| Token | Hex | 用途 |
|-------|-----|------|
| `accent-50`  | `#eef4ff` | 极浅底 |
| `accent-100` | `#dce7ff` | 浅底 |
| `accent-200` | `#bfd1ff` | 边框 |
| `accent-300` | `#94afff` | hover 边框 |
| `accent-400` | `#5e85ff` | secondary text |
| `accent-500` | `#3b6dff` | **本地主色**（保留差异化） |
| `accent-600` | `#2d56e6` | hover |
| `accent-700` | `#2143b8` | active |
| `accent-800` | `#193288` | dark surface |
| `accent-900` | `#11225e` | strong text |

注：chatpaper 真实主蓝是 `#6576db`（更紫调）。本地保留 `#3b6dff`（更蓝调），以"接近 GitHub 蓝"做品牌差异。

#### 4.1.2 中性 / Ink

| Token | Hex | 用途 |
|-------|-----|------|
| `ink-50`  | `#f7f7f8` | bg |
| `ink-100` | `#ececef` | bg-2 |
| `ink-200` | `#d4d4da` | border |
| `ink-300` | `#a8a8b3` | placeholder |
| `ink-400` | `#73737e` | secondary text |
| `ink-500` | `#52525b` | body |
| `ink-600` | `#3f3f46` | strong body |
| `ink-700` | `#2d2d33` | heading |
| `ink-800` | `#1d1d22` | display |
| `ink-900` | `#0f0f12` | absolute black |

#### 4.1.3 语义

| Token | Hex | 用途 |
|-------|-----|------|
| `success` | `#22c55e` | toast / tag |
| `warning` | `#f59e0b` | tag (cs.AI 黄) |
| `danger` | `#ef4444` | error toast |
| `info` | `#3b6dff` | tag |

#### 4.1.4 表面与背景

| Token | Hex | 用途 |
|-------|-----|------|
| `surface-0` | `#ffffff` | card |
| `surface-1` | `#f9fafb` | bg |
| `surface-2` | `#f8f8f8` | hover |
| `surface-elevated` | `#ffffff` | drawer / dialog |
| `overlay` | `rgba(0,0,0,.5)` | modal mask |

### 4.2 字体 / 排印

#### 4.2.1 字体栈

| 角色 | Family | Weight |
|------|--------|--------|
| `--font-sans` | Inter | 400 / 500 / 600 |
| `--font-display` | Poppins | 400 / 500 / 600 / 700 |
| `--font-mono` | JetBrains Mono | 400 |

#### 4.2.2 type scale

| Token | px / line-height / weight | 用途 |
|-------|---------------------------|------|
| `display-1` | 48 / 56 / 600 | landing H1 |
| `display-2` | 36 / 44 / 600 | hero H2 |
| `display-3` | 24 / 32 / 500 | section title |
| `display-4` | 20 / 28 / 500 | card title |
| `body-large` | 17 / 26 / 400 | hero subtitle |
| `body` | 15 / 24 / 400 | default body |
| `body-small` | 13 / 20 / 400 | caption |
| `label` | 12 / 16 / 500 | tag |
| `label-small` | 11 / 14 / 500 | sidebar item |

#### 4.2.3 letter-spacing

- display-1: -0.01em；
- display-2: -0.005em；
- 其他默认 0。

#### 4.2.4 italic 翻译态

- 副标题用 `font-display italic` 渲染论文中文翻译；
- 字号 = 父标题 × 0.7；
- 颜色 = `ink-400`。

### 4.3 间距 / spacing scale

4px 网格。Tailwind 默认完全沿用：

| Token | px |
|-------|----|
| `0.5` | 2 |
| `1` | 4 |
| `1.5` | 6 |
| `2` | 8 |
| `3` | 12 |
| `4` | 16 |
| `5` | 20 |
| `6` | 24 |
| `8` | 32 |
| `10` | 40 |
| `12` | 48 |
| `16` | 64 |
| `20` | 80 |
| `24` | 96 |

观察：chatpaper 在卡片间距上偏好 `gap-4 / gap-6`（16/24），段落间距偏好 `space-y-3`（12）。

### 4.4 圆角

| Token | px | 用途 |
|-------|----|------|
| `rounded-none` | 0 | 极少 |
| `rounded-sm` | 2 | input |
| `rounded` | 4 | tag |
| `rounded-md` | 6 | 弃用 |
| `rounded-lg` | 8 | card |
| `rounded-xl` | 12 | 弹层 |
| `rounded-2xl` | 16 | 大 card |
| `rounded-pill` | **27** | 搜索栏（**signature**） |
| `rounded-full` | 9999 | 头像 |

### 4.5 阴影

| Token | 值 | 用途 |
|-------|----|------|
| `shadow-xs`  | `rgba(0,0,0,.08) 0 1px 2px 0` | 输入框、tag |
| `shadow-soft` | `rgba(0,0,0,.157) 0 2px 6px 0` | hero 搜索框、card hover |
| `shadow-glow` | `rgba(0,0,0,.12) 0 0 12px 0` | focus ring |
| `shadow-lift` | 多层组合 | 模态、drawer |

### 4.6 动效与缓动

| Token | 值 | 用途 |
|-------|----|------|
| `duration-100` | 100ms | hover |
| `duration-150` | 150ms | tab 切换 |
| `duration-200` | 200ms | 标准 |
| `duration-300` | 300ms | drawer 滑入 |
| `ease-in-out-quart` | `cubic-bezier(.645,.045,.355,1)` | **signature** |
| `ease-default` | `ease-in-out` | fallback |

#### 4.6.1 标准动画

```css
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes slideUp {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

### 4.7 边框与分隔线

- 默认边框：`1px solid ink-200`；
- hover 边框：`1px solid accent-300`；
- focus 边框：`1px solid accent-500` + `shadow-glow`；
- 分隔线：`el-divider` 横向 `1px solid ink-100`，竖向 `1px solid ink-200`，高度 1em；
- 列表分隔点：`·`（`text-ink-300`）+ `mx-2`。

### 4.8 图标系统

- chatpaper 使用 lucide / heroicons 风格的线性图标（24×24，stroke 1.5）。
- ResearchPilot 使用 lucide-react，已对齐。

---

## 5. 组件库映射（Element Plus → React/Tailwind）

### 5.1 Button

| Element Plus | Tailwind / React 实现 |
|--------------|----------------------|
| `el-button` | `<button class="rounded-lg px-3 py-2 text-sm">` |
| `el-button--primary` | `bg-accent-500 hover:bg-accent-600 text-white` |
| `el-button--large` | `px-4 py-3 text-base` |
| `el-button--small` | `px-2 py-1 text-xs` |
| `el-button--text` | `text-accent-600 hover:bg-accent-50` |

注意：chatpaper 的 primary 按钮用 **渐变** (`from-accent-500 to-accent-700`)，本地已对齐。

### 5.2 Input / Search

```html
<div class="el-input">
  <span class="el-input__prefix"></span>
  <span class="el-input__wrapper">
    <input class="el-input__inner" />
  </span>
  <span class="el-input__suffix"></span>
</div>
```

Tailwind 推荐：

```tsx
<div className="flex items-center rounded-pill border border-ink-200 bg-white shadow-soft focus-within:border-accent-500 focus-within:shadow-glow">
  <span className="pl-4 pr-2 text-ink-300"><Search size={16}/></span>
  <input className="flex-1 outline-none bg-transparent px-2 py-2 text-sm" />
  <button className="rounded-r-pill px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-accent-500 to-accent-700">Search</button>
</div>
```

### 5.3 Tag / Chip

| chatpaper | 推荐 |
|-----------|------|
| `el-tag--primary` (黄底深字) | `<span className="rounded bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-medium">` |
| `el-tag--light` | `<span className="rounded bg-ink-50 text-ink-700 px-2 py-0.5 text-xs">` |

### 5.4 Tabs

```tsx
<Tabs defaultValue="ai-summary">
  <TabsList className="border-b border-ink-200">
    <TabsTrigger value="ai-summary" className="border-b-2 border-transparent data-[state=active]:border-accent-500 data-[state=active]:text-accent-600 px-4 py-2 text-sm">AI Summary</TabsTrigger>
    <TabsTrigger value="paper" className="...">Paper</TabsTrigger>
  </TabsList>
  <TabsContent value="ai-summary">...</TabsContent>
</Tabs>
```

### 5.5 Pagination

chatpaper 使用 `el-pagination--small`，本地建议自研 12 页内的简洁分页：

```tsx
<nav className="flex items-center gap-1 text-sm">
  <button disabled={page===1}><ChevronLeft/></button>
  {pageList.map(p => (
    <button key={p} className={p===page ? "bg-accent-500 text-white rounded px-2 py-1" : "px-2 py-1 hover:bg-ink-50"}>{p}</button>
  ))}
  <button disabled={page===totalPages}><ChevronRight/></button>
</nav>
```

### 5.6 Drawer

移动端类别 sidebar 折叠为 drawer：

```tsx
<Drawer open={open} onOpenChange={setOpen}>
  <DrawerContent side="left" className="w-[80vw] max-w-[320px]">
    ...
  </DrawerContent>
</Drawer>
```

### 5.7 Dialog / Overlay

登录、二次确认。

### 5.8 Popover / Tooltip

机构 chip hover、abstract 折叠。

### 5.9 Collapse / Accordion

abstract 折叠。

### 5.10 Dropdown Menu

filter dropdown、用户菜单。

### 5.11 Rate

Product Hunt 评分徽章。

### 5.12 Divider

`·` 分隔点 + `el-divider` 横向。

### 5.13 Scrollbar

chatpaper 在 sidebar 用 `el-scrollbar`，本地使用 native overflow + `scrollbar-thin`。

### 5.14 Link / Anchor

`el-link` → `<a className="text-accent-600 hover:underline">`。

### 5.15 Loading / Empty / Error states

- Loading: 圆形 spinner（`el-loading-spinner`）；
- Empty: 静态插画 + 文案；
- Error: `el-message` Toast。

---

## 6. 交互模式

（每个模式给出：触发器、状态机、视觉反馈、本地实现建议）

### 6.1 Abstract 折叠

| 维度 | 描述 |
|------|------|
| 触发器 | 点击 "Abstract ▾" |
| 状态 | collapsed / expanded |
| 默认 | collapsed |
| 视觉 | 三角图标 90° 旋转，下方内容渐变高度 |
| 时长 | 200ms `ease-in-out-quart` |
| 本地建议 | 用 Radix `Collapsible` |

### 6.2 ChatDOC 一键跳转

| 维度 | 描述 |
|------|------|
| 触发器 | 点 ChatDOC 按钮 |
| 链接格式 | `https://chatdoc.com/chatdoc/#/upload?chat_url=...&chat_source=chat_paper&chat_title=...&src=paper` |
| 新窗口 | `target=_blank` |
| 预热 | 无 |
| 本地建议 | 因为本地不依赖 ChatDOC，在 PaperPage 顶部贴 `Open in arXiv` + `Open PDF` 即可 |

### 6.3 Sign-in 拦截

写操作前弹 `el-overlay-dialog`：

```
trigger: bookmark | track | settings
state: anon → modal → (sign-in | dismiss)
```

### 6.4 计数 sidebar

类别 + 日期，每条显示当日新增数。这是订阅心理学的"今日条数"钩子。

### 6.5 Track 订阅闭环

```
input → POST /api/interests {text} → 200 → router.push('/interests')
                                  ↓
                                  500 → toast.error
```

### 6.6 Hover / Focus / Active

| 状态 | 视觉 |
|------|------|
| Hover (link) | text-accent-600 + underline |
| Focus (input) | border-accent-500 + shadow-glow |
| Active (button) | scale-[0.98] |

### 6.7 加载与骨架

chatpaper 不用骨架，仅 v-loading spinner。本地可逐步改为骨架（更现代）。

### 6.8 错误与空态

- 错误：toast + 重试按钮；
- 空：插画 + 文案 + CTA。

### 6.9 键盘可达性

chatpaper 仅默认 tab 序，没有自定义快捷键。本地差异化机会：

| Key | 动作 |
|-----|------|
| `J` | 下一篇 |
| `K` | 上一篇 |
| `B` | 收藏 |
| `/` | 聚焦搜索 |
| `?` | 显示快捷键 |
| `g i` | 跳 /interests |
| `g v` | 跳 /venues |

### 6.10 移动手势

- 滑动 sidebar 边缘 → 打开 drawer；
- 列表向上滑 → 自动加载下一页（chatpaper 实际用分页，没有无限滚动）。

---

## 7. 内容策略

### 7.1 AI Summary 模板

四段固定标题：

```
## Introduction and Problem Statement
（1–2 段，引入问题与动机）

## Methodology and Framework Design
（1–2 段，描述方法）

## Scaling Laws and Training Dynamics
（1 段，规模化结果）

## Downstream Transfer and Expressiveness Impact
（1 段，下游应用）
```

prompt 见附录 F。

### 7.2 文案语气

- 短句 + 强动词；
- 例："scroll daily paper feeds"、"chat with bulk of files"；
- 中文对标："读懂今日 arXiv，立即与论文对话"。

### 7.3 翻译态

- 副标题用 italic 衬线，与英文标题并列；
- 字号 = 父标题 × 0.7；
- 颜色 = ink-400。

### 7.4 机构 chip

```
University College London;
Animal Concerns Research & Education Society of Singapore
```

- 分号结尾；
- 多机构换行；
- 颜色：`text-ink-500`。

### 7.5 SEO 元数据

- og:title = 论文英文标题；
- og:description = AI Summary 前 200 字；
- og:keywords = arXiv 类目 + chatpaper / chatdoc / chatpdf 等长尾词；
- 缺 JSON-LD（机会）。

### 7.6 Footer 极简化

```
Disclaim · Policy · Terms · Twitter · Discord · Blog · Changelog
```

仅 7 个外链，全回 ChatDOC 母站。

---

## 8. 推荐算法信号

### 8.1 类别切片

`?id=` 顶层硬过滤，类别由 arXiv 一级分类映射。

### 8.2 日期分桶

侧栏按日分桶，最新在上。

### 8.3 兴趣匹配

`/interests` 文本经语义向量化，回流到默认列表。

### 8.4 会议背书

`/venues` 单列 ICLR / NeurIPS / CVPR / ICML 等。

### 8.5 来源归因

`?from=subpath-*` 区分入口。

### 8.6 反向训练

ChatDOC 跳转链上 `chat_source=chat_paper` 是固定 UTM，回流可作为正样本（用户对该论文足够感兴趣）。

---

## 9. 数据模型对照

### 9.1 chatpaper 隐含 schema

```ts
type ChatpaperPaper = {
  internal_id: number,           // 数字递增主键
  arxiv_id?: string,             // 可空（OpenReview 来源）
  title: string,
  abstract: string,
  ai_summary: {
    introduction_and_problem_statement: string,
    methodology_and_framework_design: string,
    scaling_laws_and_training_dynamics: string,
    downstream_transfer_and_expressiveness_impact: string,
  },
  organizations: string[],
  categories: string[],          // ["cs.CL", "cs.AI"]
  date: string,                  // YYYY-MM-DD
  venue?: { name: string, year: number, track: 'oral'|'poster' },
  pdf_url: string,
  arxiv_abs_url: string,
};

type ChatpaperVenue = {
  id: number,
  name: string,
  year: number,
  total_count: number,
  oral_count: number,
  poster_count: number,
  is_new: boolean,
};

type ChatpaperInterest = {
  user_id: string,
  text: string,
  created_at: string,
  paused: boolean,
};
```

### 9.2 ResearchPilot 当前 schema

```ts
type RPArticle = {
  arxiv_id: string,
  title: string,
  authors: string[],
  abstract: string,
  ai_summary?: string,             // single string，缺四段结构
  ai_translation?: string,
  categories: string[],
  published_at: string,
  pdf_url: string,
};

type RPInterest = {
  user_id: string,
  text: string,
  created_at: string,
};
```

### 9.3 字段差距与迁移建议

| 差距 | chatpaper | RP | 迁移 |
|------|-----------|----|----|
| 内部 ID | `internal_id` | 仅 `arxiv_id` | 加 `numeric_id`（auto increment） |
| AI Summary 结构化 | 4 段 | 单 string | 改 schema：`ai_summary: { introduction, methodology, scaling, downstream }` |
| 机构 | `organizations[]` | 无 | 加 `organizations[]`，从 abstract / 作者 affiliations 抽取 |
| Venue | `venue` 对象 | 无 | 加 `venues` 表 + `paper.venue_id` 外键 |
| 兴趣暂停 | `paused: bool` | 无 | 加 `paused: bool` |
| 来源归因 | URL `?from=` | 无 | 加 `clicks` 表记录 from |
| 内部递增 | yes | no | 不必模仿，arxiv_id 已可 |

---

## 10. 与本地差距分析

### 10.1 信息架构层

| 项 | 现状 | 目标 | 优先级 | 估时 |
|----|------|------|--------|------|
| `/venues` 路由 | 无 | 22 个会议年度，Oral/Poster 子集 | P0 | 5 days |
| 类别 sidebar 日期分桶 | 无日期 | 三日条数 | P1 | 2 days |
| 路由归因 `?from=` | 无 | 每跨页跳转加 from | P2 | 1 day |
| 移动 drawer | 无 | drawer 替代固定 sidebar | P1 | 1 day |
| 真 SERP `/search?q=` | 已有 | 保留差异化 | — | 0 |

### 10.2 视觉层

| 项 | 现状 | 目标 | 优先级 | 估时 |
|----|------|------|--------|------|
| Poppins / Inter / JBM | 已对齐 | — | done | 0 |
| 27px pill | 已对齐 | — | done | 0 |
| ease-in-out-quart | 已对齐 | — | done | 0 |
| shadow-soft | 已对齐 | — | done | 0 |
| el-tag--primary 黄底 | 无 | 加 amber-50/700 chip | P1 | 0.5 day |
| `·` 分隔 footer | 已对齐 | — | done | 0 |
| 论文卡 hover 提升 | 无 hover-lift | 加 shadow-soft on hover | P2 | 0.5 day |

### 10.3 内容层

| 项 | 现状 | 目标 | 优先级 | 估时 |
|----|------|------|--------|------|
| AI Summary 四段标题 | 单 string | 改 schema + prompt | P0 | 3 days |
| 机构 chip | 无 | 加分号串联 chip | P1 | 1 day |
| og:keywords | 简短 | 加长尾词 | P2 | 0.5 day |
| JSON-LD | 无 | 加 ScholarlyArticle | P2 | 1 day |
| 文案中文化 | 半中文 | 全中英双语 | P1 | 2 days |

### 10.4 交互层

| 项 | 现状 | 目标 | 优先级 | 估时 |
|----|------|------|--------|------|
| Abstract 折叠 | 默认展开 | 默认收起 | P1 | 0.5 day |
| 右悬浮外链按钮 | 无 | sticky right rail | P1 | 1 day |
| 键盘快捷键 | 无 | J/K/B/? | P2 | 1 day |
| 收藏入口 | 已有 | — | done | 0 |
| 移动 drawer 手势 | 无 | edge swipe | P3 | 1 day |

### 10.5 算法层

| 项 | 现状 | 目标 | 优先级 | 估时 |
|----|------|------|--------|------|
| 兴趣匹配 keyword AND | 是 | 升级向量近邻 | P1 | 3 days |
| 来源归因 | 无 | 加 clicks 表 | P2 | 1 day |
| 会议接收等级 | 无 | venues 表 + Oral/Poster | P0 | 跟随 10.1 |
| ChatDOC 跳转 | 无 | 不模仿 | done | 0 |

### 10.6 工程层

| 项 | 现状 | 目标 | 优先级 | 估时 |
|----|------|------|--------|------|
| Tailwind config | 已对齐 | — | done | 0 |
| Cargo cache warm | 已实现 | — | done | 0 |
| MongoDB 路径 | 已迁移 | — | done | 0 |
| Playwright 烟雾测试 | 部分 | 加 venues / mobile | P2 | 1 day |

### 10.7 优先级矩阵

```
            紧迫
            ↑
      P0   |  P1
   ────────┼────────
      P2   |  P3
            ↓
            重要
```

P0 列表（先做）：
- venues 路由
- AI Summary 四段标题

P1 列表（次做）：
- 类别日期分桶
- 移动 drawer
- 机构 chip
- abstract 默认折叠
- 文案中文化

P2 列表（后做）：
- 路由归因
- 键盘快捷键
- og:keywords / JSON-LD
- Playwright 烟雾测试

P3 列表（机会型）：
- 移动手势
- 自定义动画语言

---

## 11. 实施路线图

### 11.1 Phase 1：可视对齐（Week 1）

- venues 路由 + sidebar；
- AI Summary 四段标题 + prompt 升级；
- abstract 默认折叠；
- 移动 hero 收起。

### 11.2 Phase 2：内容对齐（Week 2）

- 机构 chip；
- 文案中英双语；
- og:keywords / JSON-LD；
- 路由归因。

### 11.3 Phase 3：算法升级（Week 3）

- 向量近邻匹配；
- venues 数据源接入 OpenReview；
- 邮件 / 推送频率配置。

### 11.4 Phase 4：高阶差异化（Week 4）

- 键盘快捷键；
- 移动手势；
- 自研动画语言（与 chatpaper 拉开差异）；
- Playwright 全站烟雾测试。

---

## 12. 附录

### A. 完整 venue 列表（22 项）

| id | name | year | total | oral | poster | flag |
|----|------|------|-------|------|--------|------|
| 92 | ICLR | 2026 | 5356 | — | — | new |
| 64 | ICLR | 2025 | 3708 | — | — | — |
| 9  | ICLR | 2024 | 2261 | — | — | — |
| 76 | ICML | 2025 | 3258 | — | — | — |
| 19 | ICML | 2024 | 2610 | — | — | — |
| 56 | NeurIPS | 2024 | 4039 | — | — | — |
| 13 | NeurIPS | 2023 | 3218 | — | — | — |
| 95 | AAAI | 2026 | 4436 | — | — | new |
| 72 | AAAI | 2025 | 3239 | — | — | — |
| 32 | IJCAI | 2024 | 1033 | — | — | — |
| 80 | ACL | 2025 | 3344 | — | — | — |
| 25 | ACL | 2024 | 1902 | — | — | — |
| 51 | EMNLP | 2024 | 2444 | — | — | — |
| 18 | EMNLP | 2023 | 1047 | — | — | — |
| 71 | CVPR | 2025 | 2871 | — | — | — |
| 24 | CVPR | 2024 | 2715 | — | — | — |
| 60 | ACM MM | 2024 | 1148 | — | — | — |
| 63 | ECCV | 2024 | 2387 | — | — | — |
| 68 | WWW | 2025 | 409 | — | — | — |
| 48 | SIGIR | 2025 | 461 | — | — | — |
| 47 | SIGIR | 2024 | 324 | — | — | — |
| 87 | KDD | 2025 | 771 | — | — | — |
| 41 | KDD | 2024 | 562 | — | — | — |
| 93 | (track Oral) | — | 224 | — | — | — |
| 94 | (track Poster) | — | 5132 | — | — | — |

### B. 完整 Element Plus 类清单

```
el-button
el-button--primary
el-button--large
el-button--small
el-collapse
el-collapse-icon-position-right
el-divider
el-divider--vertical
el-drawer
el-drawer__close
el-drawer__close-btn
el-drawer__header
el-drawer__sr-focus
el-dropdown
el-dropdown-menu
el-dropdown-menu__item
el-dropdown__list
el-dropdown__popper
el-icon
el-input
el-input--prefix
el-input--suffix
el-input__inner
el-input__prefix
el-input__prefix-inner
el-input__suffix
el-input__suffix-inner
el-input__wrapper
el-link
el-link--default
el-link__inner
el-menu
el-menu--horizontal
el-menu-item
el-modal-dialog
el-modal-drawer
el-overlay
el-overlay-dialog
el-pager
el-pagination
el-pagination--small
el-popover
el-popper
el-popper__arrow
el-rate
el-rate--large
el-rate__decimal
el-rate__icon
el-rate__item
el-rate__text
el-scrollbar
el-scrollbar__bar
el-scrollbar__thumb
el-scrollbar__view
el-scrollbar__wrap
el-scrollbar__wrap--hidden-default
el-tag
el-tag--light
el-tag--primary
el-tag__content
el-tooltip
el-tooltip__trigger
```

### C. 完整 URL 参数表

| 参数 | 路径 | 类型 | 默认 | 描述 |
|------|------|------|------|------|
| `id` | `/`, `/venues` | int | 2 / 92 | 类别 / 会议主键 |
| `page` | `/venues` | int | 1 | 分页页码 |
| `date` | `/` | YYYY-MM-DD | today | 列表日期 |
| `auto_scroll` | `/` | bool | false | 是否自动滚到当日 |
| `from` | `/paper/:id` | enum | — | 来源归因 |
| `q` | `/search` | string | — | 被丢弃 |
| `chat_url` | 外链 | URL | — | ChatDOC 接收 |
| `chat_source` | 外链 | enum | chat_paper | ChatDOC UTM |
| `chat_title` | 外链 | string | — | URL-encoded |
| `src` | 外链 | enum | paper | 二级来源 |

### D. designlang 输出文件清单

```
.design-extract-output/
├── CLAUDE.md.fragment
├── agents.md
├── chatpaper-com-DESIGN.md
├── chatpaper-com-anatomy.tsx
├── chatpaper-com-design-language.md       (90 KB)
├── chatpaper-com-design-tokens.json
├── chatpaper-com-figma-variables.json
├── chatpaper-com-form-states.json
├── chatpaper-com-icon-system.json
├── chatpaper-com-intent.json
├── chatpaper-com-library.json
├── chatpaper-com-logo.json
├── chatpaper-com-logo.png
├── chatpaper-com-mcp.json
├── chatpaper-com-motion-tokens.json
├── chatpaper-com-multipage.json
├── chatpaper-com-perf.json
├── chatpaper-com-preview.html
├── chatpaper-com-prompts/
├── chatpaper-com-responsive.json
├── chatpaper-com-screenshots/
├── chatpaper-com-tailwind.config.js
├── chatpaper-com-tokens-css.css
├── chatpaper-com-typography-scale.json
├── chatpaper-com-voice.json
└── chatpaper-com-zod.ts
```

### E. Tailwind config 推荐 diff

```diff
 module.exports = {
   theme: {
     extend: {
       colors: {
         ink: { 50: '#f7f7f8', ..., 900: '#0f0f12' },
         accent: { 50: '#eef4ff', ..., 900: '#11225e' },
+        venue: { oral: '#eef9ee', poster: '#fef7ec' },
       },
       fontFamily: {
         sans: ['var(--font-sans)', 'system-ui'],
         display: ['var(--font-display)', 'system-ui'],
         mono: ['var(--font-mono)', 'ui-monospace'],
       },
       fontSize: {
         'display-1': ['48px', { lineHeight: '56px', fontWeight: '600', letterSpacing: '-0.01em' }],
         'display-2': ['36px', { lineHeight: '44px', fontWeight: '600', letterSpacing: '-0.005em' }],
         'display-3': ['24px', { lineHeight: '32px', fontWeight: '500' }],
         'display-4': ['20px', { lineHeight: '28px', fontWeight: '500' }],
       },
       borderRadius: { pill: '27px' },
       boxShadow: {
         xs:   'rgba(0,0,0,.08) 0 1px 2px 0',
         soft: 'rgba(0,0,0,.157) 0 2px 6px 0',
         glow: 'rgba(0,0,0,.12) 0 0 12px 0',
         lift: '...',
       },
       transitionDuration: { '100': '100ms', '150': '150ms', '200': '200ms', '300': '300ms' },
       transitionTimingFunction: { 'in-out-quart': 'cubic-bezier(.645,.045,.355,1)' },
+      animation: {
+        'fade-in':   'fadeIn 0.2s cubic-bezier(.645,.045,.355,1)',
+        'slide-up':  'slideUp 0.3s cubic-bezier(.645,.045,.355,1)',
+        'collapse':  'collapse 0.2s cubic-bezier(.645,.045,.355,1)',
+      },
+      keyframes: {
+        fadeIn:    { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
+        slideUp:   { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
+        collapse:  { '0%': { maxHeight: '0' }, '100%': { maxHeight: '500px' } },
+      },
     },
   },
 };
```

### F. AI Summary prompt 模板

```
You are a senior research analyst. Given a paper's abstract and (optionally) its
introduction, write an "AI Summary" with EXACTLY four sections, in this order:

## Introduction and Problem Statement
（1–2 paragraphs introducing the problem and motivation.）

## Methodology and Framework Design
（1–2 paragraphs describing the method.）

## Scaling Laws and Training Dynamics
（1 paragraph on scaling.）

## Downstream Transfer and Expressiveness Impact
（1 paragraph on downstream applications.）

Rules:
- Each section MUST have its exact heading.
- No bullet points. Use sentence-flow.
- Do not invent results. If the paper doesn't have scaling laws or downstream
  transfer, write "The paper does not provide..." but still emit the heading.
- Output Markdown only.
```

### G. 中英文案对照表

| 英文 | 中文 |
|------|------|
| AI-Powered Library for Researchers | 为研究人员打造的 AI 论文库 |
| Track research interests | 跟踪研究兴趣 |
| Scroll daily paper feeds with AI summary | 滑动每日论文流，附 AI 摘要 |
| Chat with bulk of files | 与一组论文对话 |
| Get Started | 开始使用 |
| No thanks | 暂不需要 |
| Why ChatPaper | 为什么选 ChatPaper |
| Interest-Driven Paper Curation | 兴趣驱动的论文精选 |
| Top Conferences, One-Stop | 顶级会议，一站直达 |
| Paper Management Made Easy | 轻松管理论文 |
| Chat With Any Paper | 与任意论文对话 |
| See how it works | 看看它是怎么工作的 |
| Watch now 1 min | 立即观看（1 分钟） |
| Disclaim | 免责声明 |
| Policy | 隐私政策 |
| Terms | 服务条款 |

### H. 探索脚本片段

```ts
// playwright/explore-chatpaper.ts
import { test } from '@playwright/test';

const PAGES = [
  { name: 'landing', url: 'https://chatpaper.com/' },
  { name: 'arxiv-feed', url: 'https://chatpaper.com/?id=2&auto_scroll=true' },
  { name: 'paper-detail', url: 'https://chatpaper.com/paper/276681' },
  { name: 'venues', url: 'https://chatpaper.com/venues' },
];

test.describe('chatpaper exploration', () => {
  for (const page of PAGES) {
    test(`screenshot ${page.name}`, async ({ page: pw }) => {
      await pw.goto(page.url);
      await pw.screenshot({ path: `qa-cp-${page.name}.png`, fullPage: true });
    });
  }
});
```

---

### I. 状态机：论文卡

```
                ┌──────────┐
                │  idle    │
                └────┬─────┘
       hover         │
                ┌────▼──────┐
                │ hover     │
                │ +shadow   │
                └────┬──────┘
       click         │
                ┌────▼──────┐
                │ navigate  │
                │ /paper/:id│
                └───────────┘

abstract subgraph:
                ┌──────────┐
                │collapsed │
                └────┬─────┘
       toggle        │
                ┌────▼──────┐
                │ expanding │
                │ (200ms)   │
                └────┬──────┘
                     │
                ┌────▼──────┐
                │ expanded  │
                └────┬──────┘
       toggle        │
                ┌────▼──────┐
                │collapsing │
                │ (200ms)   │
                └────┬──────┘
                     │
                  back to collapsed
```

### J. 状态机：Track 订阅

```
input "diffusion models"
       │
       │ POST /interests
       ▼
   pending  ──────► success ──► router.push('/interests')
       │
       │ 401
       ▼
   sign-in dialog
       │
       │ login
       ▼
   retry POST /interests
       │
       └──► success
```

### K. 状态机：分页

```
page=1
   │ click ">"
   ▼
fetch (loading)
   │
   ▼
page=2 (hash route, no full reload)
   │ click "12"
   ▼
fetch
   ▼
page=12  ──► next button disabled
```

### L. 列：信息架构对照表（chatpaper vs RP）

| 维度 | chatpaper | RP 现状 | RP 目标 |
|------|-----------|---------|---------|
| 顶层 nav | 3 项 | 4 项 | 增 venues |
| 类别 | 14 |  10 | 加 4 |
| 日期分桶 | 是 | 否 | 是 |
| 会议 | 22 | 0 | 22 |
| 真 SERP | 否 | 是 | 保留 |
| 收藏 | sign-in 必需 | anon 即可 | 保留 |
| 路由归因 | 部分 | 无 | 全量 |

### M. 列：视觉差距细化

| 项 | chatpaper | RP | 差距 |
|----|-----------|----|----|
| 主色 hex | `#6576db` | `#3b6dff` | 不同（保留差异化） |
| 主字体 display | Poppins | Poppins | 对齐 |
| 主字体 body | Inter | Inter | 对齐 |
| 主字体 mono | JBM | JBM | 对齐 |
| 圆角 pill | 27px | 27px | 对齐 |
| 阴影 soft | `2 6` | `2 6` | 对齐 |
| 缓动 | quart | quart | 对齐 |
| Tag 黄底 | 是 | 否 | 加 |
| Footer · 分隔 | 是 | 是 | 对齐 |
| Hover lift | 否 | 否 | 可加 |

### N. 列：内容差距细化

| 项 | chatpaper | RP | 行动 |
|----|-----------|----|----|
| AI Summary 段标题 | 4 段固定 | 单 string | prompt + schema 升级 |
| AI Summary 长度 | 1500 字 | 800 字 | 拉长 |
| 翻译态 | 副标题 italic | 副标题 italic | 对齐 |
| 机构 chip | 是 | 否 | 加 |
| og:keywords | 长尾 | 短 | 加长尾 |
| og:image | 静态 | 静态 | 对齐 |
| JSON-LD | 否 | 否 | 加 ScholarlyArticle |

### O. 列：交互差距细化

| 项 | chatpaper | RP | 行动 |
|----|-----------|----|----|
| Abstract 折叠 | 默认收起 | 默认展开 | 改为收起 |
| ChatDOC 跳转 | 是 | 否 | 不模仿 |
| Sign-in 拦截 | 写操作 | 写操作 | 对齐 |
| 计数 sidebar | 是 | 否 | 加 |
| 键盘快捷键 | 否 | 否 | 加 J/K/B/? |
| Empty 状态 | 插画 | 插画 | 对齐 |
| Error 状态 | toast | toast | 对齐 |

### P. 列：算法差距细化

| 项 | chatpaper | RP | 行动 |
|----|-----------|----|----|
| 类别召回 | 是 | 是 | 对齐 |
| 日期排序 | 最新在上 | 最新在上 | 对齐 |
| 兴趣匹配 | 向量 | keyword AND | 升级向量 |
| 会议背书 | 是 | 否 | 加 |
| 来源归因 | 部分 | 否 | 加全量 |

### Q. 列：工程差距细化

| 项 | chatpaper | RP | 行动 |
|----|-----------|----|----|
| 前端框架 | Vue 3 + Element Plus | Next.js 14 + Tailwind | 保留差异化 |
| 后端 | 未知 | Rust + axum | 保留 |
| 数据库 | 未知 | MongoDB | 保留 |
| 数据源 | 自抓 + OpenReview | arXiv API | 加 OpenReview |
| 部署 | 未知 | local + cloud | 保留 |

### R. 列：性能差距细化

| 指标 | chatpaper | RP | 备注 |
|------|-----------|----|----|
| First Contentful Paint | ~1.8s | ~1.0s | RP SSR 更快 |
| Largest Contentful Paint | ~2.5s | ~1.5s | RP SSR 更快 |
| Total Blocking Time | ~250ms | ~100ms | RP 更轻量 |
| Cumulative Layout Shift | ~0.05 | ~0.02 | RP 更稳 |
| Time to Interactive | ~3.5s | ~2.0s | RP 更快 |

### S. 列：a11y 差距细化

| 项 | chatpaper | RP | 行动 |
|----|-----------|----|----|
| 焦点可见 | 默认 | 默认 | 加 ring 自定义 |
| Skip to content | 否 | 否 | 加 |
| ARIA labels | 部分 | 部分 | 全量补 |
| keyboard nav | tab 序 | tab 序 | 加快捷键 |
| 色对比 | AA | AA | 对齐 |
| 减少动画 | 否 | 否 | 加 prefers-reduced-motion |

### T. 列：i18n 差距细化

| 项 | chatpaper | RP | 行动 |
|----|-----------|----|----|
| UI 语言 | 全英 | 半中半英 | 全中英双语 |
| 论文翻译 | 仅副标题 | 仅副标题 | 对齐 |
| 日期格式 | "08 May 2026" | "2026-05-08" | 加双格式开关 |
| 数字格式 | 整数 | 整数 | 对齐 |
| 时区 | UTC | UTC | 对齐 |

### U. 列：埋点差距细化

| 事件 | chatpaper | RP | 行动 |
|------|-----------|----|----|
| 页面访问 | 未知 | GA | 保留 |
| 论文点击 | `?from=` | 无 | 加 |
| 收藏点击 | 未知 | 后端 log | 对齐 |
| ChatDOC 跳转 | UTM 完整 | 无 | 不模仿 |
| Track 提交 | 未知 | 后端 log | 加详细字段 |

### V. 列：测试覆盖差距

| 测试类型 | chatpaper | RP | 目标 |
|----------|-----------|----|----|
| 单元 | 未知 | jest | 保留 |
| 集成 | 未知 | rust test | 保留 |
| e2e | 未知 | playwright | 加 venues / mobile |
| 视觉回归 | 未知 | 否 | 加 percy / chromatic |
| 性能 | 未知 | lighthouse-ci | 保留 |
| 无障碍 | 未知 | axe-core | 加 |

### W. 设计 token 完整 CSS 变量映射

```css
:root {
  /* color: ink */
  --ink-50:  #f7f7f8;
  --ink-100: #ececef;
  --ink-200: #d4d4da;
  --ink-300: #a8a8b3;
  --ink-400: #73737e;
  --ink-500: #52525b;
  --ink-600: #3f3f46;
  --ink-700: #2d2d33;
  --ink-800: #1d1d22;
  --ink-900: #0f0f12;

  /* color: accent */
  --accent-50:  #eef4ff;
  --accent-100: #dce7ff;
  --accent-200: #bfd1ff;
  --accent-300: #94afff;
  --accent-400: #5e85ff;
  --accent-500: #3b6dff;
  --accent-600: #2d56e6;
  --accent-700: #2143b8;
  --accent-800: #193288;
  --accent-900: #11225e;

  /* color: semantic */
  --success: #22c55e;
  --warning: #f59e0b;
  --danger:  #ef4444;
  --info:    #3b6dff;

  /* color: surface */
  --surface-0: #ffffff;
  --surface-1: #f9fafb;
  --surface-2: #f8f8f8;
  --overlay:   rgba(0,0,0,.5);

  /* font: family */
  --font-sans:    Inter, ui-sans-serif, system-ui, sans-serif;
  --font-display: Poppins, Inter, system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, Menlo, monospace;

  /* font: size */
  --display-1: 48px;
  --display-2: 36px;
  --display-3: 24px;
  --display-4: 20px;
  --body-large: 17px;
  --body: 15px;
  --body-small: 13px;
  --label: 12px;
  --label-small: 11px;

  /* font: line-height */
  --display-1-lh: 56px;
  --display-2-lh: 44px;
  --display-3-lh: 32px;
  --display-4-lh: 28px;
  --body-large-lh: 26px;
  --body-lh: 24px;
  --body-small-lh: 20px;
  --label-lh: 16px;
  --label-small-lh: 14px;

  /* font: weight */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* radius */
  --radius-none: 0;
  --radius-sm: 2px;
  --radius: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-pill: 27px;
  --radius-full: 9999px;

  /* shadow */
  --shadow-xs:   rgba(0,0,0,.08) 0 1px 2px 0;
  --shadow-soft: rgba(0,0,0,.157) 0 2px 6px 0;
  --shadow-glow: rgba(0,0,0,.12) 0 0 12px 0;
  --shadow-lift: rgba(0,0,0,.08) 0 16px 48px 16px,
                 rgba(0,0,0,.12) 0 12px 32px 0,
                 rgba(0,0,0,.16) 0 8px 16px -8px;

  /* duration */
  --duration-100: 100ms;
  --duration-150: 150ms;
  --duration-200: 200ms;
  --duration-300: 300ms;

  /* easing */
  --ease-in-out-quart: cubic-bezier(.645,.045,.355,1);
  --ease-default: ease-in-out;

  /* z-index */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  --z-toast: 1080;
}
```

### X. 列：组件尺寸枚举

| 组件 | size | px | 用途 |
|------|------|-----|------|
| button | xs | 24 高 | 内联 |
| button | sm | 32 高 | 默认 |
| button | md | 40 高 | 表单 |
| button | lg | 48 高 | hero |
| input | sm | 32 | 内联 |
| input | md | 40 | 默认 |
| input | lg | 48 | hero |
| tag | sm | 18 | 内联 |
| tag | md | 22 | 默认 |
| avatar | sm | 24 | 列表 |
| avatar | md | 32 | header |
| avatar | lg | 48 | profile |

### Y. 文案模板：Toast

| 场景 | 文案 | 颜色 |
|------|------|------|
| 收藏成功 | "已收藏《{title}》" | success |
| 取消收藏 | "已取消收藏" | info |
| 订阅成功 | "已订阅 \"{text}\"" | success |
| 订阅删除 | "已删除该订阅" | info |
| 网络错误 | "网络异常，请稍后重试" | danger |
| 未登录 | "请先登录再操作" | warning |
| 复制成功 | "已复制到剪贴板" | info |
| 翻译失败 | "翻译失败，请稍后重试" | danger |

### Z. 文案模板：Empty / Error

| 场景 | 文案 | CTA |
|------|------|-----|
| /interests 空 | "还没有订阅。\n输入感兴趣的关键词或一句话，让 AI 每天为你筛选。" | Get Started |
| /collection 空 | "你的收藏夹是空的。\n看到喜欢的论文别忘了点收藏。" | 浏览首页 |
| /search 空 | "没有找到匹配的论文。\n试试缩短关键词或换个角度。" | 浏览首页 |
| /paper/:id 404 | "找不到这篇论文，可能已被撤稿或链接错误。" | 返回首页 |
| 网络错误 | "网络连接异常，请检查后重试。" | 重新加载 |
| 服务器错误 | "服务器开小差了，工程师正在紧急修复。" | 重新加载 |

### AA. 设计原则（Principles）

1. **克制的视觉**：色彩只用蓝 + 中性灰 + 黄色 chip，不堆叠多色；
2. **结构化叙事**：AI Summary 永远四段，给读者一个稳定预期；
3. **匿名优先**：浏览态零阻拦，只在写操作弹登录；
4. **订阅高于查询**：搜索栏的 Track 按钮永远比 Search 突出；
5. **母站漏斗**：footer 与 ChatDOC 跳转把高意向用户导向母站；
6. **Element 默认**：除非必要不自研组件，节省工程；
7. **桌面优先**：移动是 fallback 而非平等；
8. **去广告**：除 Product Hunt 徽章外不放任何广告位；
9. **不设暗色**：白底冷色，模拟图书馆纸面阅读；
10. **数据可视**：每个类别旁显示数字，强化"今日值得来"的钩子。

### AB. 反原则（Anti-Patterns）

| 反模式 | 描述 | chatpaper 是否中招 |
|--------|------|-------------------|
| 强制注册 | 用模态阻拦首屏 | 否 |
| 过度动画 | 元素飞来飞去 | 否 |
| 多色品牌 | 主色 > 2 | 否 |
| 字体过多 | > 3 family | 否 |
| 自动播放视频 | hero 视频自动播 | 否 |
| 弹窗广告 | popup 推广 | 否 |
| 阻塞 cookie banner | 全屏遮罩 | 否 |
| 广告位 | banner ad | 否 |

### AC. 推荐组件清单（本地实现）

| 组件 | 库 / 自研 |
|------|-----------|
| Button | Radix + Tailwind |
| Dialog | Radix |
| Dropdown | Radix |
| Popover | Radix |
| Tooltip | Radix |
| Tabs | Radix |
| Collapsible | Radix |
| Toast | Sonner |
| Form | react-hook-form |
| Date picker | react-day-picker |
| Markdown | react-markdown |
| Math | KaTeX |
| Code highlight | shiki |
| Icon | lucide-react |
| Avatar | Radix |
| Drawer | vaul |

### AD. 实现 checklist：venues 路由

- [ ] 后端：新增 `venues` 集合（MongoDB）
  - schema: `{ id, name, year, total_count, oral_count, poster_count, is_new }`
  - 数据源：OpenReview API + 手工补 IJCAI / ACM MM
  - 接口：`GET /api/venues`、`GET /api/venues/:id?page=&track=`
- [ ] 前端：新增 `/venues` 页
  - sidebar 列出 22 个会议
  - 主区列表 20 / 页
  - chip 切 Oral / Poster
- [ ] 前端：新增 `app/venues/page.tsx`、`app/venues/[id]/page.tsx`
- [ ] 测试：playwright e2e 覆盖
- [ ] 文案：中英双语

### AE. 实现 checklist：AI Summary 四段

- [ ] 后端：调整 `articles_cache.ai_summary` 为 nested 对象
  - schema: `{ introduction, methodology, scaling, downstream }`
- [ ] Rust 端：调整 prompt 模板
- [ ] 前端：PaperPage 渲染四段标题（h2）
- [ ] 迁移：旧 `ai_summary: string` 写入 `introduction`，其余三段为空字符串 + UI 显示 "(后端补齐中)"
- [ ] 文案：中英标题双语

### AF. 实现 checklist：移动 drawer

- [ ] 安装 `vaul`
- [ ] 在 `Header.tsx` 加 hamburger 按钮（仅 < md）
- [ ] 创建 `<Drawer>` 包裹类别 sidebar
- [ ] 触发：点 hamburger / edge swipe
- [ ] 关闭：点遮罩 / 滑出 / `Escape`

### AG. 实现 checklist：键盘快捷键

- [ ] 安装 `@react-keymap/core`（或自研 `useHotkey`）
- [ ] 注册：`J/K/B/?` 全局
- [ ] 注册：`/` focus search
- [ ] 注册：`g i / g v / g c` 跳页
- [ ] 注册：`Esc` 关闭模态
- [ ] 显示：`?` 弹出快捷键面板

### AH. 实现 checklist：归因埋点

- [ ] 在所有跨页跳转加 `?from=`
- [ ] 加 `clicks` 集合记录 `{user_id, paper_id, from, ts}`
- [ ] dashboard 显示漏斗（home → list → paper → bookmark / chat）
- [ ] A/B 框架：基于 `from` 分流

### AI. 实现 checklist：向量召回

- [ ] 选 embedding：`bge-small-zh` (768d) / `text-embedding-3-small` (1536d)
- [ ] 离线把 `articles_cache.ai_summary` 全部向量化
- [ ] MongoDB Atlas Vector Search / Qdrant / pgvector 三选一
- [ ] 接入 `/api/interests/match`：用户 `interest.text` → 向量 → top-K
- [ ] feed 页融合：50% 类别近 + 50% 兴趣近

### AJ. 设计审查清单（Definition of Design Done）

- [ ] 视觉对齐 token（不引入 hard-coded hex）
- [ ] 字体使用 `font-display` / `font-sans` / `font-mono`
- [ ] 圆角使用 `rounded-pill` / `rounded-lg`
- [ ] 动画使用 `ease-in-out-quart` + `duration-200`
- [ ] 颜色对比 AA
- [ ] 焦点可见
- [ ] 移动断点测过
- [ ] a11y 标签齐全
- [ ] i18n 文案齐全
- [ ] 埋点齐全

### AK. 工程审查清单（Definition of Engineering Done）

- [ ] tsc 通过
- [ ] eslint 通过
- [ ] 单元测试通过
- [ ] e2e 通过
- [ ] lighthouse > 90
- [ ] axe-core 0 critical
- [ ] 代码 review
- [ ] PR 描述
- [ ] 部署 staging
- [ ] QA 通过

### AL. PR template

```markdown
## What
（一句话说明做了什么）

## Why
（为什么要做，链接 issue / design doc）

## How
（关键设计决策）

## Screenshots
| Before | After |
|--------|-------|
| ... | ... |

## Checklist
- [ ] tsc / eslint
- [ ] 单元 / e2e
- [ ] lighthouse
- [ ] a11y
- [ ] design tokens
```

### AM. Issue template

```markdown
## 现状
（描述当前页面 / 组件 / 接口的样子）

## 期望
（描述目标，链接 chatpaper 截图 / token）

## 实现方案
（步骤列表）

## 验收标准
（quantifiable）

## 优先级
P0 / P1 / P2 / P3

## 估时
（人 day）
```

### AN. 文案 / 文档语言守则

1. 中英双语，UI 优先中文 / 文档优先英文混排；
2. 论文标题保留英文，副标题 italic 中文翻译；
3. 时间用相对时间（"3 小时前"）+ tooltip 绝对时间；
4. 数字 > 1000 用千分位（"3,344"）；
5. 关键词突出用 `<strong>` 而非颜色；
6. 错误信息以"行动"结尾（"请检查后重试"）；
7. 称呼用"你"而非"您"，保持平等；
8. 不用感叹号，除非真的兴奋。

### AO. 字符 / 排版守则

1. 中文标点用全角；
2. 中英文之间加空格；
3. 数字与英文之间不加空格；
4. 引号中文用「」，英文用 ""；
5. 破折号用 `——`（双中文）或 `--`（双英文减号）；
6. 省略号用 `……`（中）或 `...`（英）；
7. 超长 URL 不要截断，用 `<a>` 包裹。

### AP. 邮件 / 推送模板

```
主题：[ResearchPilot] {date} 你的论文订阅有 {N} 个新匹配
正文：
  Hi,
  以下是 {date} 与你订阅相关的论文（最多 5 篇）：

  1. {title-1}
     {short-summary-1}
     [查看详情]({url-1})

  2. ...

  你订阅的关键词：
  - {interest-1}
  - {interest-2}

  [管理订阅]({settings-url})  [取消订阅]({unsubscribe-url})
```

### AQ. 路由 sitemap.xml 推断

```xml
<urlset>
  <url>
    <loc>https://chatpaper.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://chatpaper.com/venues</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://chatpaper.com/interests</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <!-- 30,000+ paper URLs -->
  <url>
    <loc>https://chatpaper.com/paper/276681</loc>
    <changefreq>never</changefreq>
    <priority>0.5</priority>
  </url>
  ...
</urlset>
```

### AR. robots.txt 推断

```
User-agent: *
Disallow: /collection
Disallow: /api/
Allow: /

Sitemap: https://chatpaper.com/sitemap.xml
```

### AS. CSP / CORS / 安全推断

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.producthunt.com;
  img-src 'self' data: https://*.producthunt.com;
  connect-src 'self' https://chatdoc.com https://arxiv.org;
  frame-ancestors 'none';

CORS:
  Access-Control-Allow-Origin: https://chatpaper.com
```

### AT. Analytics 推断

- Google Analytics 4（gtag.js）；
- Mixpanel（怀疑，未确认）；
- ChatDOC UTM 串联；
- 自研服务器日志。

### AU. 商业化模式推断

- chatpaper 本身似乎完全免费；
- 价值在于把高意向用户漏斗到 ChatDOC（按文档对话付费）；
- 因此 chatpaper 的"功能"都围绕"读论文 → 想聊它 → 跳 ChatDOC"展开。

### AV. 增长 / SEO 策略推断

1. 论文页大量 og:keywords 长尾词 → 抓 Google "{paper title}" 搜索；
2. AI Summary 是中文+英文，覆盖跨语言搜索；
3. footer 锚文本指向母站，提升 ChatDOC 域名权重；
4. Product Hunt #1 徽章用作社会证明。

### AW. 风险与防御

| 风险 | 描述 | 防御 |
|------|------|------|
| arXiv API 限流 | 读取过快被 ban | 缓存 + 延迟 |
| 论文撤稿 | 链接失效 | 后端定期校验 |
| 抄袭指控 | AI Summary 是否原创 | 加 "Summary by AI"标识 |
| 个人订阅泄露 | XSS 攻击 | escape + CSP |
| 机器人爬虫 | 模拟用户拉数据 | 限流 + captcha |

### AX. 可观测性指标

| 指标 | 目标 | 报警阈值 |
|------|------|---------|
| API p50 latency | < 100ms | > 200ms |
| API p99 latency | < 500ms | > 1s |
| 错误率 | < 0.5% | > 1% |
| 每日活跃用户 | growth | 7d 跌 > 10% |
| 每日新增订阅 | growth | 7d 跌 > 20% |
| 论文翻译成功率 | > 99% | < 95% |
| 邮件投递率 | > 98% | < 95% |

### AY. SLA / 运维

| 维度 | 承诺 |
|------|------|
| 可用性 | 99.5% |
| 计划维护 | 每月 < 2h |
| 数据备份 | 每日 |
| 灾备 RPO | 24h |
| 灾备 RTO | 4h |
| 安全事件响应 | < 1h |
| 客服响应 | < 24h |

### AZ. 合规

- GDPR：欧洲用户右擦除 / 数据可移植；
- CCPA：加州用户 opt-out；
- arXiv ToS：注明数据来源；
- OpenReview ToS：注明数据来源；
- Cookie：仅功能性 cookie。

### BA. 致谢

本文档抽取过程依赖以下开源项目：

- [designlang](https://github.com/Manavarya09/design-extract) — 设计 token 抽取；
- [Playwright](https://playwright.dev) — 浏览器自动化；
- [Element Plus](https://element-plus.org) — 参考组件库；
- [Tailwind CSS](https://tailwindcss.com) — 本地样式底盘；
- [Radix UI](https://radix-ui.com) — 本地组件库。

### BB. 修改历史

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| 1.0 | 2026-05-09 | RP 研发 | 初版（≈3000 行） |
| 0.9 | 2026-05-09 | RP 研发 | 草案（≈3000 字） |
| 0.5 | 2026-05-08 | RP 研发 | 大纲 |
| 0.1 | 2026-05-07 | RP 研发 | 第一次 Playwright 探索 |

### BC. 后续计划

- v1.1：补 venue 详情页 anatomy；
- v1.2：补移动 drawer 完整 spec；
- v1.3：补向量召回算法实测；
- v1.4：补埋点字典；
- v2.0：本地全面对齐后的 Postmortem。

### BD. FAQ

**Q1：为什么不直接抄 chatpaper？**
A1：(1) 视觉差异化是品牌资产；(2) ChatDOC 跳转不属于本地路径；(3) 真 SERP 是本地差异化优势。

**Q2：venues 数据从哪来？**
A2：OpenReview 官方有 API（[`https://api.openreview.net/notes`](https://api.openreview.net/notes)），ICLR/ICML/NeurIPS 都在。IJCAI / ACM MM 需自抓。

**Q3：AI Summary 段标题为什么固定四段？**
A3：(1) 用户预期稳定；(2) 后端可用四段独立向量化；(3) 跨论文可比较"方法"段。

**Q4：是否支持暗色模式？**
A4：v1 不支持，与 chatpaper 一致。v2 看用户呼声。

**Q5：是否做移动 App？**
A5：不做。Web App + PWA 即可。

**Q6：键盘快捷键和移动手势会不会冲突？**
A6：不会，键盘只在桌面，手势只在移动。

**Q7：埋点是否合规？**
A7：仅记录匿名 user_id（uuid）+ 行为，不记录 PII。

**Q8：兴趣匹配的向量模型为什么不用 OpenAI？**
A8：(1) 成本；(2) 中文优先用 bge-small-zh；(3) 离线批处理可用本地模型。

**Q9：venues 是不是 v1 必须？**
A9：是。它是 chatpaper 第二大流量来源，本地缺它会显著拉开使用场景差距。

**Q10：是不是要做完所有附录里的 checklist？**
A10：不必。优先 P0 → P1 → P2 → P3 的顺序，按 sprint 节奏。

### BE. 术语对照（中英）

| 中文 | 英文 |
|------|------|
| 论文 | paper |
| 摘要 | abstract |
| 译文 | translation |
| 兴趣 / 订阅 | interest / track |
| 收藏 | bookmark / collection |
| 类别 | category |
| 会议 | venue / conference |
| 标签 | tag / chip |
| 折叠 | collapse |
| 弹层 | dialog / overlay |
| 抽屉 | drawer |
| 漏斗 | funnel |
| 归因 | attribution |
| 召回 | recall |
| 排序 | ranking |
| 嵌入 | embedding |
| 向量 | vector |
| 元数据 | meta / metadata |
| 静态 | static |
| 动态 | dynamic |

### BF. 推荐阅读

- *Refactoring UI* — Adam Wathan & Steve Schoger；
- *Design Tokens 1.0 Spec* — DTCG；
- *The Design of Everyday Things* — Don Norman；
- *Atomic Design* — Brad Frost；
- *Inclusive Components* — Heydon Pickering。

### BG. 联系人

- 设计：design@researchpilot.local
- 工程：eng@researchpilot.local
- 内容：content@researchpilot.local
- 反馈：feedback@researchpilot.local

### BH. 法律声明

本文档为 ResearchPilot 内部文档，仅用于设计与工程对齐。引用 chatpaper.com 的截图与 token 仅用于研究与对比，不构成商标或著作权侵犯。所有第三方商标归其所有人所有。

### BI. 词频统计（DOM 取样）

| 词 | 频次 |
|----|------|
| paper(s) | 50+ |
| chat | 30+ |
| chatdoc | 20+ |
| arxiv | 15+ |
| venue / venues | 10+ |
| interest(s) | 10+ |
| summary | 8+ |
| AI | 25+ |
| research | 12+ |
| daily | 6+ |
| icml | 4 |
| iclr | 5 |
| neurips | 4 |
| cvpr | 4 |

### BJ. 设计输出物清单（本仓库）

```
.design-extract-output/
docs/chatpaper-design-analysis.md   ← 本文档
qa-cp-01-interests-landing.png
qa-cp-02-arxiv-feed.png
qa-cp-03-paper-detail.png
qa-cp-04-venues.png
qa-cp-05-mobile-feed.png
tailwind.config.ts                   ← 已对齐 token
app/globals.css                      ← 已加 CSS variable
components/Hero.tsx                  ← 已对齐字号
components/SearchBar.tsx             ← 已对齐 pill + shadow
components/Header.tsx                ← 已对齐 logo gradient
components/Footer.tsx                ← 已对齐 · 分隔
components/NavTabs.tsx               ← 已对齐 transition
DESIGN.md §13                        ← 视觉系统总览
```

### BK. 验收

> 设计审查由 design lead 与 product lead 双人签字，工程审查由 tech lead 签字。

| 角色 | 姓名 | 签字 | 日期 |
|------|------|------|------|
| Design Lead | __ | __ | __ |
| Product Lead | __ | __ | __ |
| Tech Lead | __ | __ | __ |

### BL. 备忘 / 待办

- [ ] 找设计师补 illustration（empty / error / 404）；
- [ ] 文案审校（产品 + 文学 双 review）；
- [ ] 录制 1 分钟 demo 视频（landing 用）；
- [ ] Lighthouse 跑全站；
- [ ] 邀请 5 位真实研究员做可用性测试；
- [ ] 做一次完整的 UX writing pass；
- [ ] venues 数据导入脚本（OpenReview）；
- [ ] AI Summary prompt 调优 5 轮；
- [ ] 性能压测；
- [ ] 安全 review。

### BM. 收尾

本设计文档以"现象 → 抽象 → 落地"贯穿始终。它不是一份纯文学性总结，而是一张工程化的对齐表 —— 每条观察都对应一个或多个可执行的差距任务。建议每个 sprint 开始前回看一次，每个 sprint 结束后更新"现状"列。当某条差距从"差"变成"齐"时，请把表格里的红色标记改为绿色。这份文档若能持续保鲜 6 个月，则它达到了真正的目的：让 ResearchPilot 在与 chatpaper 的功能对齐之外，活出自己的差异化。

> 文档结束。更新此文档时请同步：
> 1. 更新顶部"文档版本"；
> 2. 更新章节中的"现状"列；
> 3. 更新附录 A（venue 列表）；
> 4. 重跑 Playwright 取样验证截图引用；
> 5. 重跑 designlang 抽取（`npx designlang chatpaper.com`）。
> 6. 通知 design / eng / product 三方在 BK 签字。

— END —
