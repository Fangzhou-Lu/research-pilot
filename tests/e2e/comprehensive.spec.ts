import { test, expect, type Page } from "@playwright/test";

// Comprehensive coverage of pages and the chatpaper.com-style features
// added recently (arxiv sidebar, EN/中 toggle, Q&A tabs, 3-pane chat).
// Each test records a screenshot to test-results/<name>.png so we can
// inspect against chatpaper.com side-by-side after the run.
//
// Notes on selectors:
// - PaperChatLayout uses `title=` (not aria-label) on its panel toggles,
//   so getByRole won't find them — use [title="..."] instead.
// - PaperRightRail uses icon buttons with `title=` and a "Chat with AI" link.
// - PaperCard hides its Q&A tabs behind an expand-toggle (`open` state),
//   so we must click the chevron before tabs render.

test.setTimeout(60_000);

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: false });
}

async function pickFirstPaperHref(page: Page): Promise<string | null> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const link = page.locator('a[href^="/paper/"]').first();
  await link.waitFor({ timeout: 10_000 }).catch(() => null);
  if (!(await link.count())) return null;
  const href = await link.getAttribute("href");
  if (!href) return null;
  // Strip any query string (e.g. "?from=home") and trailing /chat — we want
  // a clean /paper/{id} path that callers can extend with /chat themselves.
  const path = href.split("?")[0].split("#")[0];
  return path.replace(/\/chat$/, "");
}

test.describe("home / arxiv feed", () => {
  test("arxiv sidebar lists CS categories with date counts", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();
    const csRow = page
      .locator("aside")
      .getByText(/Artificial Intelligence|Machine Learning|cs\.(AI|LG|CL|CV)/i)
      .first();
    await expect(csRow).toBeVisible({ timeout: 10000 });
    await shot(page, "home-arxiv-sidebar");
  });

  test("paper card supports EN/中 abstract toggle", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("article", { timeout: 10000 });
    const firstCard = page.locator("article").first();
    const toggle = firstCard.getByRole("button", { name: /^(EN|中)$/ }).first();
    if (!(await toggle.count())) {
      test.info().annotations.push({
        type: "missing",
        description: "PaperCard EN/中 toggle not found",
      });
      await shot(page, "home-card-no-toggle");
      return;
    }
    await toggle.click();
    await page.waitForTimeout(200);
    await shot(page, "home-card-toggle-after");
  });

  test("paper card exposes Core Points / Methods / Experiments tabs after expand", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("article", { timeout: 10000 });
    await page.waitForTimeout(800); // give React time to hydrate
    const card = page.locator("article").first();
    // The expand button is a text-button labelled "Abstract" with a chevron.
    await card.getByRole("button", { name: "Abstract" }).first().click();
    await page.waitForTimeout(500);
    // After expand the card grows tabs whose labels include Core Points etc.
    await expect(card.getByText("Core Points", { exact: true })).toBeVisible({
      timeout: 5000,
    });
    await expect(card.getByText("Methods", { exact: true })).toBeVisible();
    await expect(card.getByText("Experiments", { exact: true })).toBeVisible();
    await shot(page, "home-card-tabs-expanded");
  });
});

test.describe("paper detail view", () => {
  test("right rail shows PDF / arXiv / Share + Chat with AI CTA", async ({
    page,
  }) => {
    const href = await pickFirstPaperHref(page);
    test.skip(!href, "No paper available");
    await page.goto(href!, { waitUntil: "domcontentloaded" });

    await expect(page.locator('[title="Download PDF"]').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[title="View on arXiv"]').first()).toBeVisible();
    await expect(page.locator('[title="Copy link"]').first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /chat with ai/i }).first()
    ).toBeVisible();
    await shot(page, "detail-right-rail");
  });

  test("Core / Methods / Experiments tabs render in detail right rail", async ({
    page,
  }) => {
    const href = await pickFirstPaperHref(page);
    test.skip(!href, "No paper available");
    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Core Points", { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Methods", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Experiments", { exact: true }).first()
    ).toBeVisible();
    // Switch to Methods tab.
    await page.getByText("Methods", { exact: true }).first().click();
    await page.waitForTimeout(300);
    await shot(page, "detail-tabs-methods");
  });
});

test.describe("paper chat workspace", () => {
  test("3-pane layout renders with toolbar + iframe + chat", async ({ page }) => {
    const href = await pickFirstPaperHref(page);
    test.skip(!href, "No paper available");
    await page.goto(`${href}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200); // hydrate

    await expect(page.getByRole("link", { name: /back/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("iframe").first()).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('input[placeholder*="Type a question"]').first()
    ).toBeVisible({ timeout: 10_000 });
    await shot(page, "chat-3pane-default");
  });

  test("left files panel can be toggled hidden / shown", async ({ page }) => {
    const href = await pickFirstPaperHref(page);
    test.skip(!href, "No paper available");
    await page.goto(`${href}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200); // hydrate
    const hideBtn = page.locator('[title="Hide files panel"]');
    await expect(hideBtn).toBeVisible({ timeout: 10_000 });
    await hideBtn.click();
    await page.waitForTimeout(500);
    await shot(page, "chat-left-collapsed");
    await expect(
      page.locator('aside input[placeholder*="Search papers"]')
    ).toHaveCount(0);
    await expect(page.locator('[title="Show files panel"]').first()).toBeVisible();
  });

  test("right chat panel can be toggled hidden / shown", async ({ page }) => {
    const href = await pickFirstPaperHref(page);
    test.skip(!href, "No paper available");
    await page.goto(`${href}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200); // hydrate
    const hideBtn = page.locator('[title="Hide chat panel"]');
    await expect(hideBtn).toBeVisible({ timeout: 10_000 });
    await hideBtn.click();
    await page.waitForTimeout(500);
    await shot(page, "chat-right-collapsed");
    await expect(page.locator('[title="Show chat panel"]').first()).toBeVisible();
  });
});

test.describe("other pages", () => {
  test("interests page loads", async ({ page }) => {
    await page.goto("/interests", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading").first()).toBeVisible();
    await shot(page, "interests");
  });

  test("collection page loads", async ({ page }) => {
    await page.goto("/collection", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await shot(page, "collection");
  });

  test("search page loads and accepts a query", async ({ page }) => {
    await page.goto("/search?q=transformer", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await shot(page, "search-transformer");
  });

  test("venues page lists conferences and links to a venue detail", async ({
    page,
  }) => {
    await page.goto("/venues", { waitUntil: "domcontentloaded" });
    const link = page.locator('a[href^="/venues?id="]').first();
    await link.waitFor({ timeout: 10_000 });
    expect(await link.count()).toBeGreaterThan(0);
    await shot(page, "venues-list");
    await link.click();
    await page.waitForLoadState("domcontentloaded");
    await shot(page, "venues-detail");
  });
});
