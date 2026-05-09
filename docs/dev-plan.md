# ResearchPilot 开发计划（基于 chatpaper.com 差距分析）

> 版本 1.0 · 2026-05-09 · 与 `docs/chatpaper-design-analysis.md` 配套
>
> 目标：在 4 个 sprint（约 4 周）内把"功能差距"从"很大"收敛到"齐 + 差异化"。
> 范围：信息架构、内容、交互、视觉、算法、工程六层。
> 工作量假设：1.5 名工程师 + 0.3 名设计师 + 0.2 名内容/PM。

---

## 0. 前置确认（已实情核对）

通过对仓库的实际扫描得到下列**已对齐 / 部分对齐 / 完全缺失**三类清单。后续计划只攻击未对齐项。

### 0.1 已对齐（不再变动）

| 项 | 证据 |
|----|------|
| Tailwind token：Poppins / Inter / JBM、`pill 27px`、`shadow-soft`、`ease-in-out-quart` | `tailwind.config.ts` |
| AI Summary 后端**结构化** schema | `models.rs::AISummary { sections: Vec<SummarySection> }` |
| AI Summary 前端**按 section 渲染** | `components/AISummary.tsx` 末尾 `data.sections.map` |
| `Article.organizations` 字段已存在 | `models.rs::Article::organizations` |
| PaperCard 已渲染机构（`·` 串联） | `components/PaperCard.tsx` 行 80–84 |
| Abstract 折叠（默认收起） | `PaperCard.tsx::open` state，初始 `false` |
| `/venues` 路由已存在（占位实现） | `app/venues/page.tsx`、`lib/types.ts::VENUES` |
| `/search?q=` 真 SERP（差异化保留） | `app/search/page.tsx` |
| Footer 用 `·` 分隔 + 渐变 logo | `components/Footer.tsx` |
| Hero 使用 `font-display text-display-2` | `components/Hero.tsx` |
| 搜索栏 `rounded-pill` + `shadow-soft` | `components/SearchBar.tsx` |
| MongoDB 路径迁移完毕 | `scripts/mongo-start.sh` |
| `articles_cache` fire-and-forget warm | `routes/articles.rs`、`routes/search.rs` |

### 0.2 部分对齐（需要细化）

| 项 | 现状 | 缺口 |
|----|------|------|
| AI Summary prompt | 5 段 (Problem / Approach / Key results / Why it matters / Open questions) | chatpaper 是**4 段**且段标题是动名词长短语；段间叙述风格不同 |
| `/venues` 数据源 | `VENUES` 是 10 个 arXiv 分类（cs.AI / cs.LG…） | chatpaper 是 22 个**真实会议年度**（ICLR 2026、NeurIPS 2024…）+ Oral / Poster |
| `/interests` 列表项 | `InterestEditor`，单 input | 缺暂停开关、缺最近匹配预览、缺频率配置 |
| 移动布局 | 桌面优先，sm 仍显示 sidebar/hero | 缺 `<md` 收起 hero、缺 drawer |
| 路由归因 | 无 `?from=` | 全部跨页跳转都缺 |
| 类别 sidebar | `app/page.tsx` 没有 sidebar，仅 cat 切换在 hero 选择器 | 缺三日条数计数、缺 sticky 类别栏 |

### 0.3 完全缺失

| 项 | 优先级 |
|----|--------|
| 真实 venues 数据（OpenReview 接入） | P0 |
| AI Summary 段标题改为 chatpaper 风格 | P0 |
| `articles_cache.from_source`（归因字段） | P2 |
| `clicks` 集合（点击日志） | P2 |
| 向量召回（兴趣匹配升级） | P1 |
| 移动 drawer + hero 收起 | P1 |
| 详情页右悬浮外链按钮组 | P1 |
| 键盘快捷键 (J/K/B/?) | P2 |
| `el-tag--primary` 风格黄底标签 | P1 |
| 类别 sidebar + 日期分桶 | P1 |
| 邮件 / 推送（Daily Digest） | P3 |
| JSON-LD ScholarlyArticle | P2 |
| 中英双语 UI 文案 | P1 |
| Playwright 烟雾测试覆盖 venues / mobile | P2 |

---

## 1. 总体节奏

```
Week 1 (P0)   ► 内容核心：venues 真实数据 + AI Summary 四段
Week 2 (P1)   ► 视觉与移动：sidebar 计数 + drawer + hero 收起 + 黄底 tag + 双语
Week 3 (P1)   ► 算法：向量兴趣匹配 + 详情页右栏外链组 + Interests 暂停 + 最近匹配
Week 4 (P2)   ► 长尾：归因 + JSON-LD + 键盘快捷键 + Playwright + 性能
P3 ► 后续 ► 邮件 Digest、移动手势、暗色模式、PWA
```

里程碑：

- **M1（end of Week 1）**：venues 显示 22 个真会议；任何论文详情显示四段固定 AI Summary。
- **M2（end of Week 2）**：移动端不再溢出；类别 sidebar 显示三日条数；UI 全中英双语。
- **M3（end of Week 3）**：兴趣订阅命中率 ≥ 80%（用 5 个真实 query 抽测）；详情页右栏 sticky；Interests 列表显示最近匹配。
- **M4（end of Week 4）**：归因数据落库；JSON-LD 通过 Google Rich Results Test；Playwright e2e 跑过 venues / mobile / paper。

---

## 2. Phase 1 — 内容核心（Week 1，P0）

### 2.1 任务 P0-A：AI Summary 四段对齐

**问题**：当前 prompt 输出 5 段（Problem / Approach / Key results / Why it matters / Open questions），与 chatpaper 的"Introduction and Problem Statement / Methodology and Framework Design / Scaling Laws and Training Dynamics / Downstream Transfer and Expressiveness Impact"风格差距明显。

**实施**：

1. 修改 `server-rs/src/llm.rs::SUMMARY_SYSTEM`：

```rust
pub const SUMMARY_SYSTEM: &str = "You are a senior research analyst.\n\
Given a paper's title, authors, and abstract, write an 'AI Summary' with EXACTLY four sections, in this order, as strict JSON:\n\
{\n  \"sections\": [\n    { \"heading\": \"Introduction and Problem Statement\", \"body_md\": \"...\" },\n    { \"heading\": \"Methodology and Framework Design\", \"body_md\": \"...\" },\n    { \"heading\": \"Scaling Laws and Training Dynamics\", \"body_md\": \"...\" },\n    { \"heading\": \"Downstream Transfer and Expressiveness Impact\", \"body_md\": \"...\" }\n  ]\n}\n\
Rules:\n\
- Each heading MUST appear exactly as written.\n\
- Each body_md is 2–4 sentences, sentence-flow prose, no bullets, no nested headings.\n\
- If the abstract does not provide scaling laws or downstream transfer, write a graceful 1-sentence note (e.g. 'The abstract does not detail scaling behavior; the paper focuses on …') BUT still emit the heading.\n\
- Output strict JSON only.";
```

2. 失效旧缓存：在 `repo::get_summary` 之外加 `summary_version: i32` 字段或者直接 `db.collection("summaries").drop_all_with_old_headings()`。简单做法 — 在 `Body` 增 `force: bool`，前端按 1 次性触发重生（一次性脚本）：

```bash
# scripts/migrate-summary-v2.sh
mongo --eval 'db.summaries.deleteMany({"sections.heading": "Open questions"})'
```

3. 前端 `components/AISummary.tsx` 不变（已按 section 渲染）。

**验收**：

- 5 个不同 paper id 的详情页四段标题完全一致；
- `Open questions` / `Why it matters` 不再出现；
- tsc + cargo test 通过。

**估时**：1 day（含 prompt 调优 3 轮）。

---

### 2.2 任务 P0-B：venues 真实会议数据

**问题**：当前 `VENUES` 是 10 个 arXiv 一级分类，与 chatpaper 的 22 个会议年度差距巨大。`/venues?id=cs.AI` 实际上和 `/?cat=cs.AI` 一模一样。

**实施**：

1. **schema**（Rust + Mongo）：

```rust
// server-rs/src/models.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Venue {
    pub id: String,           // e.g. "iclr-2026"
    pub display: String,      // e.g. "ICLR 2026"
    pub year: i32,
    pub track: Vec<String>,   // ["oral", "poster"]
    pub paper_count: i64,
    pub is_new: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VenuePaperDoc {
    pub venue_id: String,
    pub article_id: String,   // 关联 articles_cache.article_id
    pub track: String,        // "oral" / "poster"
    pub openreview_id: Option<String>,
}
```

2. **数据源接入**（OpenReview API）：

```bash
# scripts/import-venues.ts
# 使用 OpenReview Python SDK / fetch
# 对每个 (venue, year)：
#   GET https://api2.openreview.net/notes?invitation=ICLR.cc/2026/Conference/-/Submission&limit=1000
#   遍历分页 → 写 Mongo `venue_papers` + 升级 `articles_cache`（如果 arxiv_id 可识别）
```

为避免 v1 引入 Python 依赖，Rust 端写一个 `routes/venues_import.rs`：

```rust
// 仅在管理员手动触发；用 reqwest 拉 openreview JSON
async fn import_venue(venue: &str, year: i32, st: &AppState) -> AppResult<usize> {
    let url = format!(
        "https://api2.openreview.net/notes?invitation={}/{}/Conference/-/Submission&limit=1000",
        venue.to_uppercase(), year
    );
    let json: Value = st.http.get(&url).send().await?.json().await?;
    // … upsert 到 venue_papers
}
```

3. **API**（Rust）：

```rust
// server-rs/src/routes/venues.rs
async fn list_venues() -> AppResult<Json<Vec<Venue>>> { ... }
async fn list_venue_papers(Path(id): Path<String>, Query(q): Query<PageQuery>)
    -> AppResult<Json<Paginated<Article>>> { ... }
```

挂载到 `routes/mod.rs`：

```rust
.route("/api/v1/venues", get(venues::list_venues))
.route("/api/v1/venues/:id/papers", get(venues::list_venue_papers))
```

4. **前端**：

- `lib/types.ts`：把 `VENUES` 改为运行时从 `/api/v1/venues` 拉取（保留少量 fallback const 给 SSR 第一屏）。
- `app/venues/page.tsx`：替换 `apiList({cat: venue.id})` 为 `apiVenuePapers(venue.id, page, track)`。
- 顶部加 `track` 切换 chip（`Oral` / `Poster`）。

5. **首批 venue 列表**（最少 22 项，与 chatpaper 一致）：

```ts
const VENUE_SEED = [
  { id: "iclr-2026", display: "ICLR 2026", year: 2026, is_new: true },
  { id: "iclr-2025", display: "ICLR 2025", year: 2025 },
  { id: "iclr-2024", display: "ICLR 2024", year: 2024 },
  { id: "icml-2025", display: "ICML 2025", year: 2025 },
  { id: "icml-2024", display: "ICML 2024", year: 2024 },
  { id: "neurips-2024", display: "NeurIPS 2024", year: 2024 },
  { id: "neurips-2023", display: "NeurIPS 2023", year: 2023 },
  { id: "aaai-2026", display: "AAAI 2026", year: 2026, is_new: true },
  { id: "aaai-2025", display: "AAAI 2025", year: 2025 },
  { id: "ijcai-2024", display: "IJCAI 2024", year: 2024 },
  { id: "acl-2025", display: "ACL 2025", year: 2025 },
  { id: "acl-2024", display: "ACL 2024", year: 2024 },
  { id: "emnlp-2024", display: "EMNLP 2024", year: 2024 },
  { id: "emnlp-2023", display: "EMNLP 2023", year: 2023 },
  { id: "cvpr-2025", display: "CVPR 2025", year: 2025 },
  { id: "cvpr-2024", display: "CVPR 2024", year: 2024 },
  { id: "acmmm-2024", display: "ACM MM 2024", year: 2024 },
  { id: "eccv-2024", display: "ECCV 2024", year: 2024 },
  { id: "www-2025", display: "WWW 2025", year: 2025 },
  { id: "sigir-2025", display: "SIGIR 2025", year: 2025 },
  { id: "sigir-2024", display: "SIGIR 2024", year: 2024 },
  { id: "kdd-2025", display: "KDD 2025", year: 2025 },
  { id: "kdd-2024", display: "KDD 2024", year: 2024 },
];
```

**v1 妥协**：先只接入 ICLR / ICML / NeurIPS（OpenReview 全 API 覆盖），其余会议显示「Coming soon」灰条。

**验收**：

- `/venues` 显示 22 项 sidebar；
- 点 ICLR 2026 → 显示真实论文（来自 OpenReview）；
- 点 IJCAI 2024 → 显示「Coming soon」灰条；
- Oral / Poster chip 切换正确。

**估时**：3 days（含 OpenReview 接入 + Mongo 迁移 + 前端切换）。

---

### 2.3 任务 P0-C：保留差异化 — 真 SERP

**问题**：chatpaper `/search?q=` 是订阅入口，本地是真 SERP。这是差异化，**不修改**，但需要在 SearchBar 加"也可订阅这个 query"的二级 CTA。

**实施**：

`components/SearchBar.tsx` 已有 `Track` 按钮，行为正确。补一处提示文案：

```tsx
<button onClick={handleTrack} className="...">
  <BellRing className="h-4 w-4" /> Track
</button>
+<span className="hidden md:inline text-xs text-ink-400 ml-2">订阅此关键词</span>
```

**验收**：搜索 "diffusion models" 后既能进 SERP 又能在 hover 时看到 Track 提示。

**估时**：0.5 day。

---

## 3. Phase 2 — 视觉与移动（Week 2，P1）

### 3.1 任务 P1-A：类别 sidebar + 三日条数

**问题**：`app/page.tsx` 没有左侧类别栏，`cat` 通过 hero 内的下拉切换，缺"今天 / 昨天 / 前天 各 N 篇"的钩子。

**实施**：

1. **后端**：新增 `GET /api/v1/categories?date=YYYY-MM-DD&days=3`，返回 `[{ cat, label, counts: [{date, count}] }]`。
2. **前端**：在 `app/page.tsx` 加左侧 `<aside>`：

```tsx
<aside className="hidden md:block w-72 shrink-0 border-r border-ink-200 sticky top-0 h-screen overflow-y-auto py-4">
  {categories.map(c => (
    <div key={c.cat} className="px-3 py-2">
      <div className="text-sm font-medium text-ink-700">{c.label}</div>
      <ul className="mt-1 space-y-0.5">
        {c.counts.map(({date, count}) => (
          <li key={date}>
            <Link href={`/?cat=${c.cat}&date=${date}`}
                  className="flex justify-between text-xs text-ink-500 hover:text-accent-600 px-2 py-0.5 rounded hover:bg-ink-50">
              <span>{fmtChinaDate(date)}</span>
              <span className="font-mono text-ink-400">({count})</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  ))}
</aside>
```

3. **改 layout**：`app/page.tsx` 主区域从 `max-w-4xl` 改为 `flex` 三栏（hero 上 / sidebar 左 / main 中）。

**估时**：1.5 day（含后端聚合 + 前端响应式）。

### 3.2 任务 P1-B：移动 drawer + hero 收起

**实施**：

1. 安装 `vaul`：`npm i vaul`
2. `components/Header.tsx` 在 `<md` 加 hamburger 按钮，点击打开 `<Drawer>`。
3. `components/Hero.tsx` 在 `<md` 加 `hidden md:block`。
4. `components/SearchBar.tsx` 在 hero 内默认隐藏，在 Header 内贴一个紧凑版（`compact` variant 已存在）。

**估时**：1 day。

### 3.3 任务 P1-C：黄底 chip（`el-tag--primary` 等价）

**问题**：chatpaper 详情页的类目 chip 是黄底深字（`#fff8e6` / `#a78a23`）。本地缺。

**实施**：

`components/PaperHeader.tsx` 把分类 chip 改为：

```tsx
<span className="rounded bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-medium">
  {article.primary_category}
</span>
```

`tailwind.config.ts` 已含 default amber，无需扩展。

**估时**：0.3 day。

### 3.4 任务 P1-D：UI 中英双语

**问题**：当前文案半中半英。

**实施**：

1. 选 `next-intl`（推荐）；安装：`npm i next-intl`。
2. 抽 `components/*.tsx` 与 `app/**/page.tsx` 内的硬编码文案到 `messages/zh.json` + `messages/en.json`。
3. 默认 `zh-CN`，URL 头部加 `?lang=en` 或 cookie 切换。
4. 详细对照表见 `chatpaper-design-analysis.md` §G。

**估时**：2 days（不含审校）。

### 3.5 任务 P1-E：抽象折叠状态默认确认

**实情**：已默认折叠（`PaperCard.tsx::open` 初始 `false`）。**保持现状**，无须改。

---

## 4. Phase 3 — 算法 & 体验（Week 3，P1）

### 4.1 任务 P1-F：向量召回（兴趣匹配升级）

**问题**：当前 `apiSearch` 是 keyword 搜，`/interests` 订阅匹配也只用关键词 AND；chatpaper 用语义近邻。

**实施**：

1. **embedding**：用 OpenAI `text-embedding-3-small` (1536d) 或本地 `bge-small-zh` (768d)。
2. **向量库**：MongoDB Atlas Vector Search（已有 Atlas）/ pgvector（如果加 PG）/ Qdrant。
   v1 推荐：直接用 MongoDB Atlas `$vectorSearch`（零额外组件）。
3. **schema**：`articles_cache` 加 `summary_embedding: Vec<f32>`、`title_embedding: Vec<f32>`。
4. **离线脚本**：`scripts/embed-articles.ts` 一次性把现有 cache 全部向量化。
5. **接口**：`POST /api/v1/interests/match` body `{ text }` → embed → `$vectorSearch` 召回 top-K。
6. **前端**：`/interests` 列表项展开时显示「最近匹配 N 篇」+ 前 3 缩略；feed 顶端可选「为你推荐」segment。

**v1 妥协**：embedding 只跑最近 30 天的论文，老论文缺 embedding 时回落到 keyword。

**估时**：3 days（含离线 batch + 接口 + 前端集成）。

### 4.2 任务 P1-G：详情页右栏 sticky 外链组

**实施**：

`app/paper/[id]/page.tsx` 主区域改为 `flex`，右侧加 `<aside className="hidden lg:block w-56 sticky top-4 self-start">`：

```tsx
<aside className="hidden lg:block w-56 sticky top-4 self-start space-y-2 ml-6">
  <a href={article.abs_url} target="_blank" className="block px-3 py-2 rounded-md border ...">
    <ExternalLink className="h-4 w-4 inline mr-2"/> arXiv abs
  </a>
  <a href={article.pdf_url} target="_blank" className="block ...">
    <FileText className="h-4 w-4 inline mr-2"/> arXiv PDF
  </a>
  <Link href={`/paper/${article.id}#chat`} className="block ...">
    <MessageSquare className="h-4 w-4 inline mr-2"/> Chat with this paper
  </Link>
</aside>
```

**估时**：0.5 day。

### 4.3 任务 P1-H：Interests 暂停 / 最近匹配

**实施**：

1. **schema**：`InterestDoc` 加 `paused: bool` + `last_match_at: DateTime<Utc>` + `match_count_7d: i64`。
2. **接口**：`PUT /api/v1/interests/:id` body `{ paused }`。
3. **UI**：`components/InterestEditor.tsx` 列表项右侧加 `<Switch>`。
4. **匹配 worker**（v1 简化）：每次新论文入库时在 `tokio::spawn` 内对所有未暂停 interest 跑一次 keyword AND（向量在 P1-F 上线后改）。

**估时**：1 day。

---

## 5. Phase 4 — 长尾 & 质量（Week 4，P2）

### 5.1 任务 P2-A：路由归因 `?from=` + clicks 集合

**实施**：

1. 所有 `<Link href="/paper/...">` 加 `?from=`：home → `subpath-home`、venues → `subpath-venues`、search → `subpath-search`、interests → `subpath-interest`、collection → `subpath-collection`。
2. `app/paper/[id]/page.tsx` 读 `searchParams.from`，在 server 调 `POST /api/v1/clicks { article_id, from, ts }`（带 `X-User-Id`）。
3. Mongo `clicks` 集合 schema：`{ user_id, article_id, from, ts }`。

**估时**：1 day。

### 5.2 任务 P2-B：JSON-LD ScholarlyArticle

**实施**：

`app/paper/[id]/page.tsx` 在 `<head>` 注入：

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline: article.title,
  abstract: article.abstract,
  datePublished: article.published,
  author: article.authors.map(a => ({ "@type": "Person", name: a })),
  identifier: { "@type": "PropertyValue", propertyID: "arxiv", value: article.arxiv_id },
  url: article.abs_url,
})}} />
```

**估时**：0.3 day。

### 5.3 任务 P2-C：键盘快捷键

**实施**：

新建 `lib/use-hotkey.ts`：

```ts
export function useHotkey(map: Record<string, () => void>) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const fn = map[e.key];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [map]);
}
```

接入：

- 列表页：`J/K` 切换当前选中卡 `data-paper-id`，`Enter` 进详情，`B` 切收藏；
- 全局：`/` focus search，`?` 弹快捷键面板，`g h / g v / g i / g c` 跳页。

**估时**：1 day。

### 5.4 任务 P2-D：Playwright 烟雾测试扩展

**实施**：

新建 `tests/e2e/smoke.spec.ts`：

```ts
import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("home renders feed", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/AI-Powered|research feed/i)).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();
  });
  test("venues sidebar 22 items", async ({ page }) => {
    await page.goto("/venues");
    const links = page.locator('aside a[href^="/venues?id="]');
    await expect(links).toHaveCount(22);
  });
  test("paper detail shows 4 sections", async ({ page }) => {
    await page.goto("/");
    await page.locator("article").first().getByRole("link").first().click();
    const headings = page.locator("section h2");
    await expect(headings).toHaveCount(4);
  });
  test("mobile hero collapses", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("section.hero")).toBeHidden();
  });
});
```

`package.json`：`"test:e2e": "playwright test"`。

**估时**：1 day。

### 5.5 任务 P2-E：Lighthouse / a11y 收尾

- 跑 `npx lighthouse http://localhost:3000 --view`，目标 ≥ 90 / 95 / 100 / 100；
- 跑 `npx @axe-core/cli http://localhost:3000`，0 critical；
- 修焦点可见、缺失 alt、对比度 < 4.5 等。

**估时**：1 day。

---

## 6. Phase 5 — P3 / 后续（不阻 Week 4 交付）

| 项 | 描述 | 估时 |
|----|------|------|
| 邮件 Daily Digest | Resend / SES，凌晨 8 点发一封 | 3 days |
| 推送 / Web Push | service worker | 2 days |
| 暗色模式 | `prefers-color-scheme` + 切换 | 2 days |
| PWA | manifest + offline cache | 1 day |
| 移动手势 | edge swipe → drawer、左右滑 → 翻页 | 1 day |
| 自研动效语言 | 区别于 Element Plus 的 motion | 2 days |
| 机构 chip 去重 / 别名 | "MIT" / "Massachusetts Institute of Technology" 合并 | 1.5 days |
| 引用导出 | BibTeX / RIS / EndNote | 0.5 day |
| 论文相关推荐 | 详情页底部 "Related papers" | 1.5 days |

---

## 7. 资源 / 风险 / 依赖

### 7.1 工程资源

- 主程：1.5 FTE 全程；
- 设计：0.3 FTE（icon / illustration / 文案审校）；
- PM / 内容：0.2 FTE（中英对照、QA、外部 API key 申请）。

### 7.2 第三方依赖

| 服务 | 用途 | 状态 |
|------|------|------|
| OpenReview API | venues 数据 | 公开 / 限流 4 req/s |
| OpenAI Embedding | 向量召回 | 已有 key（`server-rs/.env`） |
| Atlas Vector Search | 向量库 | 需开通（约 $30/mo） |
| Resend / SES | 邮件 Digest（P3） | 待开通 |
| Lighthouse CI | 性能门禁 | 已有 |

### 7.3 风险

| 风险 | 描述 | 缓解 |
|------|------|------|
| OpenReview 限流 | 大量 venue 拉取被 429 | 离线 batch + 1 秒间隔 |
| Embedding 成本 | 30 万论文 × 1536d ≈ $40 一次性 | 仅嵌最近 30 天 + 增量 |
| Atlas Vector 延迟 | 第一次 query > 1s | 预热 + cache top queries |
| Prompt 升级缓存命中率掉 | 旧 summary 失效 | 旧数据保留，按 article_id 渐进重生 |
| i18n 文案审校 | 中文质量参差 | 找 1 位母语 reviewer 抽 30% 抽审 |

---

## 8. 验收（Definition of Done）

每个任务必须满足：

- `npx tsc --noEmit` 退出码 0；
- `npm run lint` 退出码 0；
- `cargo test` 退出码 0（涉及后端时）；
- 在 `localhost:3000` 手动验证至少 3 条用户路径（feed / venue / paper）；
- 移动 390×844 视口手动测过；
- 不破坏既有 e2e。

---

## 9. 优先级矩阵（一图）

```
              紧迫
              ↑
   ┌──────────┬──────────┐
P0 │ AI 4段   │ Venues   │
   │ (1 day)  │ (3 day)  │
   ├──────────┼──────────┤
P1 │ Sidebar  │ Drawer   │
   │ Vector   │ Sticky   │
   │ i18n     │ Pause/   │
   │          │ recent   │
   ├──────────┼──────────┤
P2 │ ?from=   │ JSON-LD  │
   │ Hotkey   │ a11y     │
   │ E2E      │ Perf     │
   ├──────────┼──────────┤
P3 │ Email    │ PWA      │
   │ Dark     │ Gestures │
   └──────────┴──────────┘
              ↓
              重要
```

---

## 10. 一周交付清单（PR 维度）

### Week 1（P0）

- [ ] PR-1：`feat(summary): four-section prompt + cache invalidation`
- [ ] PR-2：`feat(venues): seed 22 venues + OpenReview ICLR/ICML/NeurIPS importer`
- [ ] PR-3：`refactor(venues): switch /venues to /api/v1/venues`
- [ ] PR-4：`feat(search): subtle Track-this-query CTA`

### Week 2（P1）

- [ ] PR-5：`feat(home): category sidebar with 3-day counts`
- [ ] PR-6：`feat(mobile): drawer + hide hero on <md`
- [ ] PR-7：`style(paper): amber chip for primary_category`
- [ ] PR-8：`feat(i18n): next-intl skeleton + zh/en messages`

### Week 3（P1）

- [ ] PR-9：`feat(embed): batch embed articles_cache`
- [ ] PR-10：`feat(match): /api/v1/interests/match via vector search`
- [ ] PR-11：`feat(paper): right rail sticky external links`
- [ ] PR-12：`feat(interest): pause toggle + last-match preview`

### Week 4（P2）

- [ ] PR-13：`feat(attribution): ?from= on all paper links + clicks collection`
- [ ] PR-14：`feat(seo): JSON-LD ScholarlyArticle`
- [ ] PR-15：`feat(a11y): keyboard hotkeys`
- [ ] PR-16：`test(e2e): smoke spec for venues / mobile / 4-section`
- [ ] PR-17：`chore(perf): lighthouse + axe fixes`

---

## 11. 决策记录（ADR-lite）

| ID | 决策 | 理由 |
|----|------|------|
| ADR-001 | 不引入 ChatDOC 跳转 | 与 ResearchPilot 自研 ChatPanel 冲突；保持差异化 |
| ADR-002 | 保留 `/search?q=` 真 SERP | 与 chatpaper 的"订阅入口"差异化是核心卖点 |
| ADR-003 | Vector 选 Atlas Vector Search | 与现有 Mongo 同栈，零运维 |
| ADR-004 | i18n 用 next-intl 而非 next-i18next | App Router 原生支持 |
| ADR-005 | venues v1 只接 OpenReview 三大会议 | 限制风险 + 80% 覆盖 |
| ADR-006 | Drawer 用 vaul 不用 Radix Dialog | 移动手势体验更好 |
| ADR-007 | 不做暗色模式 v1 | 与 chatpaper 一致；二次需求 |
| ADR-008 | `?from=` 用 server-side 写入 | 避免客户端被广告拦截器屏蔽 |

---

## 12. 后续维护

- 每个 sprint 结束 retro 一次，更新 `docs/chatpaper-design-analysis.md` §10 中"现状"列；
- 每月跑一次 designlang 重新抽取 chatpaper（chatpaper 视觉迭代不算频繁，但有变化要跟）；
- 每季度一次端到端可用性测试（5 位真实研究员）；
- 关键指标看板：`docs/metrics.md`（待建）。

— END —
