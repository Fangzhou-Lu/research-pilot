# ResearchPilot 开发计划 v2 — 缩小差距 + 拉开领先

> 版本 2.0 · 2026-05-09 · 接续 `dev-plan.md` (v1) 与 `feature-gap-comparison.md` (Round 1)
>
> 输入：v1 已落 12/17 PR (PASS)、2 PARTIAL (PR-4 已实测过、PR-13 未全量)、3 MISSING (PR-8 i18n、PR-9 embed、PR-10 match 路由)。
> 新输入：`chatpaper-deep-gap-2.md` 揭示 chatpaper 在 SERP / Related / Author / Digest / Collection 五条线上**几乎没做**或**有 Bug**——这些是反超的窗口。
>
> 范围：3 个 sprint (≈3 周)，先把可用度堵到 100%、再用差异化打赢 chatpaper。
> 工作量假设：1.5 FTE 工程 + 0.2 FTE 设计/内容。

---

## 0. 现状速览（核对 2026-05-09）

### 0.1 真实运行态（关键）

| 项 | 实测值 | 影响 |
|----|--------|------|
| `mongo researchpilot.articles_cache` | **41 文档** | 首页 feed 有结果但量极少 |
| `mongo researchpilot.summaries_cache` | **1 文档（V2 schema）** | 缓存正在累积，旧 V1 5 段已清掉 3 条 |
| `mongo researchpilot.venues` | **0 文档** | `/api/v1/venues` 走静态 fallback (lib/types.ts)；`paper_count` 永远 0 |
| `mongo researchpilot.venue_papers` | **0 文档** | ICLR/ICML/NeurIPS 详情页全部「Coming soon」 |
| `mongo researchpilot.{interests,clicks}` | 7 / 2 | 真有人在用，归因有数据点 |
| `server-rs/.env` LLM 配置 | **✅ 已接（opencode-go）** | 提供商 `["local","opencode_go"]` 加载成功；`local`(:8317) 返 401，`opencode_go` 200 工作中 |
| AI Summary 端到端 | **✅ 200** | cold 11.5s / hot 11ms；e2e 5/5 (含 4-section) |
| arXiv 拉取 cron | **不在跑** | 41 篇是历史残留；新论文不入库 |

> 备注：上次审计写「mongo chatpaper.* 全 0」是 DB 名拿错了 (`chatpaper` vs `researchpilot`)。
> 真正空的是 `venues`/`venue_papers` 两张表 —— 这是 OpenReview ingest 还没跑过；
> `articles_cache` 只有 41 篇是因为 cron 没跑。所以 v2 的 P0 重点缩窄到：
> ① arXiv cron, ② venues bootstrap + ingest, ③ local LLM 8317 proxy 修认证（非阻断）。

**结论：LLM 已通；剩下两条管道（arXiv cron + OpenReview ingest）补上后，UI 立刻全活。**

### 0.2 代码完成度（按 v1 PR-1..PR-17）

| PR | 状态 | 备注 |
|----|------|------|
| PR-1 4-section AI summary | ✅ DONE | `SUMMARY_HEADINGS_V2` + cache 自失效已落 |
| PR-2 22 venues + OpenReview | ✅ DONE (代码) / ❌ DATA | 路由全部就绪，import 端口工作但**没人执行** |
| PR-3 `/venues` 切 API | ✅ DONE | |
| PR-4 Track tooltip | ✅ DONE (审计员误报) | `SearchBar.tsx:83` 有 `title=` |
| PR-5 类别 sidebar 三日计数 | ✅ DONE (代码) / ❌ DATA | 计数全 0，因为 `articles_cache` 是空 |
| PR-6 移动 drawer / hero 隐藏 | ✅ DONE | |
| PR-7 黄底 chip | ✅ DONE | |
| PR-8 i18n next-intl | ❌ MISSING | 包没装、`messages/` 不存在 |
| PR-9 batch embed | ❌ MISSING | 没脚本、没向量索引 |
| PR-10 `/api/v1/interests/match` 向量 | 🟠 PARTIAL | handler 存在，未挂在 `routes/mod.rs` |
| PR-11 详情右栏 sticky | ✅ DONE | |
| PR-12 Interests pause + matches | ✅ DONE | |
| PR-13 `?from=` 全站归因 | 🟠 PARTIAL | home/search/interest ✅；**venues + collection ❌** |
| PR-14 JSON-LD | ✅ DONE | |
| PR-15 J/K/B/? 快捷键 | ✅ DONE | |
| PR-16 e2e smoke | ✅ DONE | 4/5 pass, 1 skip (LLM-blocked) |
| PR-17 a11y/perf | 🟢 ONGOING | 不是离散 PR |

### 0.3 chatpaper 新发现的「弱点」（v1 没覆盖）

来自 `chatpaper-deep-gap-2.md`：

| chatpaper 弱点 | 证据 | RP 反超机会 |
|---|---|---|
| `/search?q=...` **路由坏掉** | 渲染落地页而非结果页 | 真 SERP + 范围切换（Papers/Venues/Authors/Inst） — 「免费」赢 |
| 详情页**没有** Related / Cited-by | 右栏空 | 向量相似度 + Semantic Scholar/arXiv 引用图 |
| 作者/机构**纯文本死链** | `.doc-author.special` 单 text node | `/author/{slug}` + `/institution/{slug}` 页 + 链接化 |
| **无邮件 digest / RSS** | 全站零订阅入口 | Daily digest + RSS feed = 自有渠道 |
| Collection 极简陋 | 无搜、无排序、无标签、无导出 | 全栈加固即可领先 |
| Paper 仅 `AI Summary | Paper` 二段 | 子段 Core/Methods/Experiments | 镜像三段 + References + Code 双增 |
| 无通知 / bell | 全站零未读状态 | 「自上次访问起 N 篇新匹配」可后置 |
| 无 pricing/account/login surfaces | 都 302 到 `/interests` | 一个干净的 `/account` 偏好页即领先 |
| 无 API / extension 推广 | footer 仅 ChatDOC 链接 | 一个 stub `/api` 页 + Zotero/Obsidian 一键导入 |

---

## 1. 总体节奏

```
Week 1 (P0)  ► 数据管道 + 代码补齐
              ├ A. 数据：arXiv cron + venues seed + OpenReview ingest + LLM key
              └ B. 代码：?from= 收尾、vector match 路由、i18n 骨架
Week 2 (P0)  ► 反超 chatpaper：抢占破洞
              ├ C1. 真 SERP（chatpaper /search 是坏的）
              ├ C2. Related papers 右栏（chatpaper 没有）
              └ C3. Author/Institution 页（chatpaper 死链）
Week 3 (P1)  ► 高粘性 + 增长闭环
              ├ D1. Email digest + RSS（chatpaper 零渠道）
              ├ D2. Collection 加固（搜/排/标签/导出/批量）
              └ D3. Paper 详情子 tab（Core/Methods/Experiments + References + Code）
P2 后续      ► 排序下拉、bell 通知、/account、/api、Zotero 集成、Lighthouse 收尾
```

里程碑：

- **M1（Day 3）**：首页类别 sidebar 三日计数 ≠ 0；ICLR 2026 详情页有真论文列表；任意 paper 详情显示 4 段 AI Summary。
- **M2（Day 7）**：`?from=` 在 venues/collection 也写库；`/api/v1/interests/match` 200；i18n 骨架可切 zh/en（默认 zh-CN）。
- **M3（Day 12）**：`/search?q=...` 真 SERP 可用；paper 详情有 Related + Cited-by 区；`/author/{slug}` 返回作者论文列表。
- **M4（Day 18）**：每日 8:00 触发 digest 邮件；Collection 支持搜+排+标签+BibTeX；paper 详情多了 References / Code 子 tab。

---

## 2. Phase A — 数据管道（Week 1，前 3 天，P0）

> chatpaper 表面看起来「热闹」是因为它有数据。RP 的代码已经齐了，但是**库是空的**。这一阶段不写功能、只接通管道。

### A-1：arXiv 拉取定时任务（PR-18）

**问题**：`articles_cache` 长期 0；`/api/v1/categories/counts` 返 `count:0`，sidebar 看起来像坏的。

**实施**：

1. 检查 `server-rs/src/routes/articles.rs` 是否已有 `tokio_cron_scheduler` 注册或类似 fire-and-forget 任务。如果只有 manual 触发，加：

```rust
// server-rs/src/main.rs 启动时
let st = state.clone();
tokio::spawn(async move {
    let mut interval = tokio::time::interval(Duration::from_secs(3600)); // 每小时
    loop {
        interval.tick().await;
        if let Err(e) = ingest::pull_arxiv_recent(&st, 10).await {
            tracing::warn!("arxiv ingest failed: {e}");
        }
    }
});
```

2. 启动一次性 backfill：`scripts/backfill-arxiv.sh` 拉最近 7 天 × 10 个分类 ≈ 5000 篇。
3. 建索引：`articles_cache.{primary_category, published_date}` compound。

**验收**：
- `mongo chatpaper.articles_cache.countDocuments({})` ≥ 3000
- 首页 sidebar 计数 ≠ 0
- `/?cat=cs.AI&date=2026-05-08` 返回有结果的列表

**估时**：0.5 day（cron + backfill）。

### A-2：venues + venue_papers 落库（PR-19）

**问题**：`/api/v1/venues` 当前看起来工作，是因为有 fallback 到 `lib/types.ts`。但 `paper_count` 一直是 0；OpenReview 也没拉过数据。

**实施**：

1. 一次性 seed 22 个 venue 元数据进 Mongo：

```bash
# scripts/seed-venues.sh
curl -s -X POST http://localhost:8000/api/v1/admin/venues/bootstrap \
  -H "X-Admin-Token: $ADMIN_TOKEN"
```

后端 handler：

```rust
// server-rs/src/routes/venues.rs
pub async fn bootstrap_venues(State(st): State<AppState>) -> AppResult<Json<usize>> {
    let coll: Collection<Venue> = st.db.collection("venues");
    let docs = VENUE_SEED.iter().map(|v| Venue {
        id: v.id.into(),
        display: v.display.into(),
        year: v.year,
        track: vec!["oral".into(), "poster".into()],
        paper_count: 0,
        is_new: v.is_new,
    }).collect::<Vec<_>>();
    let count = coll.insert_many(docs).await?.inserted_ids.len();
    Ok(Json(count))
}
```

2. 触发 OpenReview ingest（已有的 `import_venue` route）：

```bash
for v in iclr-2026 iclr-2025 iclr-2024 icml-2025 icml-2024 neurips-2024 neurips-2023; do
  curl -s -X POST "http://localhost:8000/api/v1/venues/$v/import" \
    -H "X-Admin-Token: $ADMIN_TOKEN"
  sleep 2
done
```

3. ingest 完成后聚合更新 `venues.paper_count`：在 `import_venue` 末尾执行 `db.venues.updateOne({id}, {$set: {paper_count: count}})`。

**验收**：
- `/api/v1/venues` 返回 22 项且 ICLR 2026 `paper_count > 0`
- venues sidebar 显示 `(5356)` 类似的计数
- `/venues?id=iclr-2026` 不再「Coming soon」

**估时**：1 day（seed + 7 个会议 import + 计数刷新）。

### A-3：LLM 配置 + summary 验证（PR-20） — ✅ DONE 2026-05-09

**问题（已解决）**：`server-rs/.env` 缺 LLM 行，AI Summary 全报错；`.env.example` 已含两套凭据但未复制。

**已落地**：

1. 把 `.env.example` 的 LLM 段全量写入 `.env`：
   - `LLM_MODEL=deepseek-v4-flash`
   - `LLM_BASE_URL=http://localhost:8317/v1` + `LLM_API_KEY=...`（local proxy）
   - `OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1` + `OPENCODE_API_KEY=...`（fallback）
2. 重启 backend，启动日志确认 `LLM providers configured: ["local", "opencode_go"]`。
3. 端到端 POST `/api/v1/summarize` 返回 200 且 4 段标题完全匹配 V2 spec。
4. Mongo `summaries_cache` 拉到 4 段 V2 doc；旧 5 段 V1 数据清掉 3 条（`Open questions` / `Why it matters` 等）。
5. e2e 5/5 pass（含原本 skip 的 `paper detail shows 4 AI summary sections`）。

**已知尾巴（非阻断）**：
- 本地 :8317 proxy 返 **401**（认证不匹配或服务未起）。当前流量全部由 opencode-go fallback 承接，UX 无影响。
- 修复路径（PR-20.1，0.5 h）：
  - 检查本地 `LLM_API_KEY` 是否对应 :8317 服务实际接受的 token
  - 或在 docker-compose / launchd 起一个 LiteLLM/Caddy proxy on :8317 转发到真正的 OpenAI / Anthropic / DeepSeek
  - 或干脆从 `.env` 删掉 `LLM_BASE_URL/LLM_API_KEY` 让 opencode-go 成为唯一 provider

### A-4：兜底脚本一键 boot（PR-21）

**实施**：把 A-1/A-2/A-3 + 现有的 `mongo-start.sh` 合成 `scripts/dev-bootstrap.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail
./scripts/mongo-start.sh
(cd server-rs && cargo run --release &)
sleep 3
./scripts/seed-venues.sh
./scripts/backfill-arxiv.sh
./scripts/import-openreview-3.sh
./scripts/verify-summary-v2.sh
echo "✅ ready: open http://localhost:3000"
```

**估时**：0.5 day。

**Phase A 总估时：2.5 day。**

---

## 3. Phase B — 代码补齐（Week 1，后 2 天，P0/P1）

### B-1：`?from=` 全量收口（PR-22）

**问题（实测）**：
- `app/venues/page.tsx:182` `<PaperCard ... />` 缺 `from`
- `components/CollectionView.tsx:66` 用裸 `<Link href="/paper/${a.article_id}">` 不走 PaperCard，更没归因

**实施**：

1. `app/venues/page.tsx`：

```tsx
- <PaperCard key={a.id} article={a} index={...} />
+ <PaperCard key={a.id} article={a} index={...} from="venue" />
```

2. `components/CollectionView.tsx`：换成 PaperCard，或者就地补：

```tsx
- href={`/paper/${a.article_id}`}
+ href={`/paper/${a.article_id}?from=collection`}
```

3. `app/paper/[id]/page.tsx` 已读 `searchParams.from`，server 端写 `clicks`——验证一次端到端。

**验收**：
- 在 `/venues?id=iclr-2026` 点 paper → URL 含 `?from=venue`
- `/collection` 点 paper → URL 含 `?from=collection`
- `mongo chatpaper.clicks.find({}).limit(5)` 显示 `from: "home"|"search"|"venue"|"collection"|"interest"` 五种来源

**估时**：0.3 day。

### B-2：vector-match 路由挂载（PR-23）

**问题**：`routes/interests.rs::matches` handler 已写，**未挂到 `routes/mod.rs`** 的 router。

**实施**：

```rust
// server-rs/src/routes/mod.rs
.route("/api/v1/interests/match", post(interests::match_query))
```

handler 已有；只是没注册。再检查一次 query 输入 schema：

```rust
#[derive(Deserialize)]
pub struct MatchBody { pub text: String, pub limit: Option<usize> }

pub async fn match_query(State(st): State<AppState>, Json(b): Json<MatchBody>)
    -> AppResult<Json<Vec<Article>>> { ... }
```

**v1 妥协**：还没向量化数据，先用 token-AND fallback（与现有 `/interests/:id/matches` 复用）。

**验收**：
- `curl -X POST /api/v1/interests/match -d '{"text":"diffusion models"}'` 返 200 + 至少 5 篇
- 接入 `components/InterestEditor.tsx` 的「试一下」按钮

**估时**：0.5 day。

### B-3：i18n 骨架（PR-24）

**问题**：UI 半中半英；chatpaper 支持 7 种语言，RP 需要至少 zh-CN / en。

**实施**：

1. `npm i next-intl@latest`
2. `next.config.mjs` 加 `next-intl/plugin`
3. 新建 `i18n/request.ts` + `messages/zh.json` + `messages/en.json`
4. 抽取 9 个常用文案：`Header`/`NavTabs`/`Hero`/`SearchBar`/`PaperCard`/`Footer` 各 3-5 条
5. URL 路径用 `?lang=` 简化（先不做 `[locale]` 段，避免 17 路由级联改动）

**v1 妥协**：仅完成骨架 + 9 条核心文案；其他文案下个 sprint 再过。

**验收**：
- `?lang=en` 全站英文核心文案
- `?lang=zh` 中文回到 chatpaper 风格
- 默认 cookie `rp:lang=zh-CN`

**估时**：1.5 day（不含审校）。

**Phase B 总估时：2.3 day。**

---

## 4. Phase C — 反超 chatpaper（Week 2，5 天，P0）

> chatpaper 在 SERP / Related / Author 三处**有 Bug 或没做**。这是窗口期，先吃下来。

### C-1：真 SERP（PR-25） ★高ROI

**问题**：chatpaper `/search?q=diffusion+models` 渲染落地页而非结果——它的搜索框是死的。

**实施**：

1. `app/search/page.tsx` 已有 SERP；扩展为 4 个 scope：

```tsx
type Scope = "papers" | "venues" | "authors" | "institutions";
```

URL：`/search?q=...&scope=papers|venues|authors|institutions&year=2025&venue=iclr-2026`

2. 后端三个新路由：

```rust
.route("/api/v1/search/venues", get(search::search_venues))      // 新
.route("/api/v1/search/authors", get(search::search_authors))    // 新
.route("/api/v1/search/institutions", get(search::search_inst))  // 新
```

3. UI：顶部 segmented chip `Papers (123) | Venues (5) | Authors (89) | Institutions (12)`；右侧筛 `year` + `venue` 下拉；零结果时 inline `Track this query` CTA（已有）。

4. 复刻 chatpaper 的 scope 文案：`All Papers / arXiv Papers / Venues Papers / Institution Papers`，但补真实计数（chatpaper 只有 dropdown 没有数）。

**验收**：
- `/search?q=diffusion` 显示 ≥ 20 篇 paper 结果 + scope 切换 + 分页
- `/search?q=hinton&scope=authors` 列出包含该作者的 paper 集
- chatpaper 同 query 显示落地页 → RP 显示结果 → 截图对比放进 release notes

**估时**：2 day。

### C-2：Related papers + Cited-by 右栏（PR-26）

**问题**：chatpaper 详情页右栏只放外链，**没有任何召回**。RP 已有 sticky aside（PR-11），把 Related 加进去就甩一条街。

**实施**：

1. 后端：`GET /api/v1/papers/:id/related?k=8`：
   - 优先：`articles_cache.summary_embedding` 走 Atlas Vector `$vectorSearch` 取 top-K（预装到 PR-9/10）
   - Fallback：同 `primary_category` + 时间窗内最近 8 篇

2. 后端：`GET /api/v1/papers/:id/cited-by`（v1 简化）：
   - 调 Semantic Scholar API：`https://api.semanticscholar.org/graph/v1/paper/arXiv:{arxiv_id}/citations?fields=title,authors,externalIds&limit=10`
   - 缓存 7 天到 `cited_by_cache` 集合

3. 前端：`app/paper/[id]/page.tsx` 在右栏 sticky aside 下方增 `<RelatedPapers/>` + `<CitedBy/>` 两个折叠 section：

```tsx
<aside className="...sticky...">
  <ExternalLinks />
  <RelatedPapers articleId={article.id} />  {/* 新 */}
  <CitedBy arxivId={article.arxiv_id} />    {/* 新 */}
</aside>
```

**验收**：
- 任一 paper 详情右栏有 8 篇 Related + Top 5 Cited-by
- chatpaper 同 paper 右栏空 → RP 截图对比

**估时**：1.5 day（含 SS API 限流 + 缓存）。

### C-3：Author + Institution 页（PR-27）

**问题**：chatpaper 作者/机构是纯文本死链——任何点击都不出。

**实施**：

1. **新路由（前端）**：
   - `app/author/[slug]/page.tsx`
   - `app/institution/[slug]/page.tsx`

2. **slug 规范**：`name.toLowerCase().replace(/[^a-z0-9]+/g, "-")`，例如 `geoffrey-hinton`、`google-deepmind`。

3. **后端**：
   ```rust
   .route("/api/v1/authors/:slug/papers", get(search::author_papers))
   .route("/api/v1/institutions/:slug/papers", get(search::institution_papers))
   ```
   实现：`articles_cache.find({ "authors.slug": slug })` 或回退 case-insensitive regex。

4. **链接化**：
   - `components/PaperCard.tsx`：作者用 `<Link href="/author/{slug}">`
   - `components/PaperHeader.tsx`：机构同样
   - `app/paper/[id]/page.tsx` 头部作者列表点击跳 author 页

5. **页面布局**：
   ```
   ─ author/{slug}
   │  H1: 作者全名
   │  meta: 18 papers · 2024-2026 · cs.LG, cs.AI
   │  filter chip: All Years | 2026 | 2025 | 2024
   │  paper list (PaperCard)
   ```

**验收**：
- 任一 paper 详情点作者名 → `/author/geoffrey-hinton` 列出 18 篇 paper
- 同样跳 institution
- chatpaper 不可点 → RP 链接化截图对比

**估时**：1.5 day。

**Phase C 总估时：5 day。**

---

## 5. Phase D — 闭环 + 加固（Week 3，5 天，P1）

### D-1：Daily Digest + RSS（PR-28） ★粘性

**问题**：chatpaper 完全没有出站交付（无 email、无 RSS、无 Push）。RP 占据这个领地。

**实施**：

1. **Schema**：`subscribers { user_id, email, freq: "daily"|"weekly", channels: ["email","rss"], unsubscribe_token, last_sent_at }`
2. **API**：
   - `POST /api/v1/digest/subscribe { email, freq }` → 写库 + 触发 confirm email
   - `GET /api/v1/digest/unsubscribe?t=...` → 标记 inactive
   - `GET /rss/interests/:id?t=token` → RSS feed（最近 30 篇）
3. **Worker**：`scripts/send-digest.ts` cron 8:00 UTC 每天：
   - 对每个 active 订户 → 跑 interest match → 取 top-10 paper → 渲染 MJML 模板 → Resend API 发送
4. **UI**：
   - `components/InterestEditor.tsx` 列表项加「📧 Subscribe to digest」按钮
   - `app/digest/page.tsx` 给非登录访客订阅
   - 头部右侧偏好下拉「My digest」link 到 `/digest`

5. **服务**：[Resend](https://resend.com) 免费 100/day；prod 升 $20/mo 50k/月。

**验收**：
- 自己邮箱注册 → 收到欢迎邮件
- 8:00 自动收到 digest（5 篇 paper）
- `/rss/interests/abc?t=xxx` 返回有效 Atom XML
- Unsubscribe 链接生效

**估时**：2 day（含模板 + 发送 worker）。

### D-2：Collection 加固（PR-29）

**问题**：chatpaper `/collection` 是单列裸列表——零 affordance。RP 加 5 件就甩一条街。

**实施**：

1. **搜索框**：`<input placeholder="Search in your collection">` → 客户端 fuse.js 全文搜
2. **排序下拉**：`Saved date desc / Saved date asc / Published date desc / Venue` (4 选 1)
3. **标签**：`bookmarks` schema 加 `tags: Vec<String>`；UI 上方 tag chip 多选过滤
4. **批量**：每行 checkbox + 顶部 `Delete N / Add tag / Export`
5. **导出**：选中后下拉 `BibTeX / RIS / CSV / Markdown`，纯前端生成下载（无需后端）

**验收**：
- 搜「diffusion」筛出含该词的 bookmark
- 排序下拉 4 选 1 工作
- 加标签 `important` 后筛 chip
- 批量勾选 5 篇 → 导出 BibTeX 文件成功
- chatpaper 全无 → RP 5 项截图对比

**估时**：2 day（前端为主，后端只加 `tags` 字段 + 一个 `PUT /bookmarks/:id/tags` 路由）。

### D-3：Paper 详情子 tab（PR-30）

**问题**：chatpaper 详情仅 `AI Summary | Paper`，子 tab 是 `Core Points / Methods / Experiments`。RP 多加 `References` + `Code` 双增。

**实施**：

1. `components/PaperWorkspace.tsx` 顶部加 segmented control：

```tsx
type Tab = "summary" | "abstract" | "references" | "code";
```

2. **References**：调 Semantic Scholar `/paper/arXiv:{id}/references?fields=title,authors,externalIds&limit=50` 缓存 30 天
3. **Code**：
   - 优先：`PapersWithCode` API → `https://paperswithcode.com/api/v1/papers/?arxiv_id={id}`
   - Fallback：抓 PDF 文本搜 `github.com\/[\w-]+\/[\w-]+`（quick_xml + regex）
4. AI Summary 内部子段（呼应 chatpaper 的 Core/Methods/Experiments）：v1 把已有 4 section 重映射成 3 子段：

| chatpaper sub-tab | RP map |
|---|---|
| Core Points | `Introduction and Problem Statement` |
| Methods | `Methodology and Framework Design` |
| Experiments | `Scaling Laws and Training Dynamics` + `Downstream Transfer …` 合并 |

仅在 UI 渲染层做映射，不改 prompt。

**验收**：
- 任一 paper 详情有 4 tab：Summary / Abstract / References / Code
- References 列出 ≥ 10 条带 arXiv 链接
- 含官方代码的 paper（如 LLaMA、Stable Diffusion）显示 GitHub 仓库卡

**估时**：1.5 day（SS API 已经在 PR-26 缓存好了，复用）。

**Phase D 总估时：5.5 day（裁掉 References 子模块剩 4 day 也行）。**

---

## 6. Phase E — 长尾（Week 4+，P2）

按 ROI 降序：

| PR | 描述 | 估时 |
|----|------|------|
| PR-31 | 首页排序下拉 `Newest / Trending / Most Cited` | 1 day |
| PR-32 | 通知 bell：「自上次访问起 N 篇新匹配」 | 1.5 day |
| PR-33 | `/account` 偏好（语言/digest 频率/默认 cat/视图） | 1 day |
| PR-34 | `/api` stub 文档 + `Open in Zotero / Obsidian` 按钮 | 0.5 day |
| PR-35 | 向量 embedding pipeline (PR-9 真做) + Atlas Vector | 3 day |
| PR-36 | 暗色模式（chatpaper 是暗，RP 加切换即对齐） | 1.5 day |
| PR-37 | Lighthouse / axe 收尾（≥90/95/100/100） | 1 day |
| PR-38 | i18n 全文案（继续 PR-24，剩余 ~80 条） | 2 day |
| PR-39 | 移动手势：edge swipe drawer / 左右滑翻页 | 1 day |
| PR-40 | Chrome 扩展：选中→"Send to ResearchPilot" | 3 day |

总 ≈ 16 day，作为 Q2 backlog。

---

## 7. 优先级矩阵（一图）

```
              用户可见度 →
        低                          高
    ┌──────────┬──────────┬──────────┐
紧迫│ A-3 LLM  │ A-1 arXiv│ C-1 SERP │
高 │ key      │ cron     │ (chatpaper│
    │          │ A-2 OR   │  BUG)    │
    │          │ ingest   │ C-2 Rel  │
    ├──────────┼──────────┼──────────┤
紧迫│ B-2 vec  │ B-1 from=│ C-3 Auth │
中 │ route    │ venues+  │ pages    │
    │          │ collect  │ D-1 Email│
    │          │ B-3 i18n │ digest   │
    ├──────────┼──────────┼──────────┤
紧迫│ PR-37    │ D-2 Coll │ D-3 4 tab│
低 │ a11y     │ 加固     │ PR-31 sort│
    └──────────┴──────────┴──────────┘
```

---

## 8. 一周交付清单（PR 维度）

### Week 1 — 数据 + 代码补齐（P0）

- [ ] PR-18 `chore(ingest): hourly arxiv cron + 7-day backfill`
- [ ] PR-19 `chore(venues): seed 22 venues + import 7 OpenReview confs`
- [ ] PR-20 `feat(llm): wire OPENAI_API_KEY + verify 4-section schema`
- [ ] PR-21 `chore(scripts): dev-bootstrap one-shot`
- [ ] PR-22 `fix(attribution): from= on venues/collection paper links`
- [ ] PR-23 `feat(api): mount /interests/match + token-AND fallback`
- [ ] PR-24 `feat(i18n): next-intl skeleton + 9 core copies`

### Week 2 — 反超 chatpaper（P0）

- [ ] PR-25 `feat(search): real SERP with 4 scopes + facets`
- [ ] PR-26 `feat(paper): Related + Cited-by right rail`
- [ ] PR-27 `feat(routes): author/{slug} + institution/{slug} pages`

### Week 3 — 闭环 + 加固（P1）

- [ ] PR-28 `feat(digest): daily email + RSS subscription`
- [ ] PR-29 `feat(collection): search + sort + tags + bulk + export`
- [ ] PR-30 `feat(paper): References + Code tabs (SS + PWC)`

### Week 4+ — 长尾（P2）

- [ ] PR-31..PR-40 见 §6

---

## 9. 决策记录（ADR-lite，扩展自 v1）

| ID | 决策 | 理由 |
|----|------|------|
| ADR-009 | Digest 用 Resend 不用 SES | 100/day 免费、API 简单、template DX |
| ADR-010 | Cited-by 用 Semantic Scholar 不用 OpenCitations | SS 索引广 + 速率合理（100 req/5min） |
| ADR-011 | Author slug 用 lowercase-dash 不用 ID | URL 可读 + SEO 友好；歧义时附 `?id=` 二级匹配 |
| ADR-012 | Related papers 优先向量后回退分类 | 向量未就绪时不阻塞 ship |
| ADR-013 | i18n v2.0 仅 9 条核心文案 + skeleton | 避免 17 路由级联，剩余 80 条放 PR-38 |
| ADR-014 | `/account` 不做支付 v1 | chatpaper 也没做，无紧迫；先做偏好即可 |
| ADR-015 | Code tab 优先 PWC 后正则 PDF | PWC 覆盖率 ~30%，正则保底 |
| ADR-016 | Digest worker 用 Node 不用 Rust | 复用 React MJML email 模板更简单 |
| ADR-017 | RSS 用 query 参数 token 而非 path 段 | 与现有 axum 路由匹配，免新依赖 |

---

## 10. 风险 / 依赖

### 10.1 第三方服务

| 服务 | 用途 | 月成本 | 阻断风险 |
|------|------|--------|---------|
| OpenAI / Anthropic | AI Summary + Embedding | $20-100 | 🟡 配额阻 PR-20 + PR-35 |
| OpenReview API | venues 数据 | 免费（4 req/s 限速） | 🟢 重试可解 |
| Semantic Scholar | Cited-by + References | 免费（100/5min） | 🟡 速率阻 C-2/D-3 高峰 |
| PapersWithCode | Code link | 免费 | 🟢 |
| Resend | Email digest | $20 | 🟢 |
| Atlas Vector | 向量召回 | $30 | 🟡 PR-35 才需要 |
| arXiv API | 拉取论文 | 免费（每 3 秒 1 req） | 🟢 |

### 10.2 工程风险

| 风险 | 缓解 |
|------|------|
| OpenReview 大批量被 429 | 每 venue 间 sleep 2s，失败 retry 2 次 |
| LLM 成本爆炸（cache miss） | 7 天 LRU + cache key 含 prompt version 散列 |
| SS API 限速影响详情页延迟 | 后台 fire-and-forget 缓存，UI 显示「Loading citations…」 |
| author slug 冲突（同名作者） | 后置 `?id=` 二级匹配；v1 接受 80% 准确度 |
| i18n 字符串遗漏 | typecheck `messages/zh.json` ⊆ `messages/en.json` 用 ts-pattern 校验 |
| Mongo Atlas Vector 延迟 | 预热 + cache 热门 query；冷启动 5s |

---

## 11. 验收（Definition of Done）

每个 PR 必须满足：

- `npx tsc --noEmit` 退出码 0
- `npm run lint` 退出码 0
- `cargo check --release` 退出码 0
- `cargo test`（涉及后端时）退出码 0
- `tests/e2e/smoke.spec.ts` 4/5 pass（PR-20 后 5/5）
- 手动 QA：home / venues / paper / search / interests / collection 六条路径走通
- 移动 390×844 视口手测（drawer 仍打得开、无横向溢出）
- 不破坏 v1 既有 PR
- 加新数据库字段时附 migration script

---

## 12. 关键指标看板（建议）

> 此前 v1 §12 提到 `docs/metrics.md` 待建。这里补建议指标。

| 维度 | 指标 | 数据源 |
|------|------|--------|
| Discovery | DAU / WAU、首页 → paper CTR | nginx log + `clicks` 集合 |
| Engagement | 平均 session 内 paper 数、AI Summary 阅读率 | `clicks.from` 分桶 |
| Retention | 7 天留存、digest 点击率 | `subscribers` + clicks.utm |
| Growth | digest 订阅总数、unsubscribe 率 | `subscribers.active` |
| Quality | Lighthouse 分数、首屏加载 P75 | Lighthouse CI |
| 内容 | venue 论文数、AI Summary 缓存命中 | mongo countDocuments |

---

— END v2 —
