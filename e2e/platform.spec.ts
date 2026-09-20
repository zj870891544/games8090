import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .split("\n")
    .filter((v) => v.includes("="))
    .map((v) => {
      const i = v.indexOf("=");
      return [v.slice(0, i), v.slice(i + 1)];
    }),
);
async function login(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill(vars.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "登录后台" }).click();
  await expect(
    page.getByRole("heading", { name: "运营概览", exact: true }),
  ).toBeVisible();
}
test("Chinese admin labels, errors, categories and mobile layout remain usable", async ({
  page,
}) => {
  await page.goto("/admin/login?error=Incorrect%20password.");
  await expect(page.getByRole("alert")).toHaveText(
    "管理员密码错误，请重新输入。",
  );
  await login(page);
  await page.goto("/admin/games?q=Neon");
  await expect(
    page.getByLabel("游戏分类（可填写中文，以逗号分隔）").first(),
  ).toHaveValue(/竞速/);
  await expect(
    page.getByLabel("搜索引擎收录").first().locator('option[value="noindex"]'),
  ).toHaveText("不允许收录");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/providers");
  await expect(
    page.getByRole("heading", { name: "游戏供应商", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  mkdirSync("output/playwright", { recursive: true });
  await page.screenshot({
    path: "output/playwright/admin-zh-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin");
  await page.screenshot({
    path: "output/playwright/admin-zh-current.png",
    fullPage: true,
  });
});
test("home is server rendered, original discovery cards and no provider iframe", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const response = await request.get("/");
  const html = await response.text();
  expect(html).toContain("Less scrolling.");
  expect(response.headers()["content-security-policy"]).toContain("frame-src");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Less scrolling. More playing." }),
  ).toBeVisible();
  await expect(page.locator(".game-card").first()).toBeVisible();
  expect(await page.locator("iframe").count()).toBe(0);
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.locator(".site-shell")).toHaveClass(/is-collapsed/);
  expect(errors).toEqual([]);
});
test("instant search supports keyboard selection; results and category use catalog", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "Search games" });
  await input.fill("Neon");
  await expect(page.getByRole("listbox")).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/game\/neon-drift/);
  await page.goto("/search?q=Pocket");
  await expect(page.locator(".game-card")).toHaveCount(1);
  await expect(page.locator(".game-card")).toContainText("Pocket Planet");
  await page.goto("/category/racing");
  await expect(
    page.getByRole("heading", { name: "Racing. Your way." }),
  ).toBeVisible();
  await expect(page.locator(".game-card").first()).toBeVisible();
  await page.goto("/search?q=nonexistent123");
  await expect(
    page.getByRole("heading", { name: "No games here just yet." }),
  ).toBeVisible();
});
test("player mounts after click, fullscreen, reload, fallback, favorite and recent persist", async ({
  page,
}) => {
  await page.goto("/game/neon-drift");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await page.getByRole("button", { name: "Favorite", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Favorited", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /source=playgama/,
  );
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "All set for a good break." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await page.getByRole("button", { name: "Reload game" }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
  await page.getByRole("button", { name: "Game not loading?" }).click();
  await expect(
    page.getByRole("heading", { name: "This game is having trouble loading." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Try Another Source", exact: true })
    .click();
  await expect(page.locator("iframe")).toHaveAttribute("src", /source=gamepix/);
  await page.goto("/favorites");
  await expect(page.locator(".game-card")).toContainText("Neon Drift");
  await page.reload();
  await expect(page.locator(".game-card")).toContainText("Neon Drift");
  await page.goto("/recent");
  await expect(page.locator(".game-card")).toContainText("Neon Drift");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Jump back in" }),
  ).toBeVisible();
});
test("admin auth, navigation, priority edits and curation are persisted", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const unauth = await request.post("/api/admin/source", {
    form: { id: "playgama:demo-1", priority: "900" },
    headers: { Origin: "http://127.0.0.1:3000" },
  });
  expect(unauth.status()).toBe(401);
  await login(page);
  await expect(page.locator(".admin-site-shell")).toHaveAttribute(
    "lang",
    "zh-CN",
  );
  await expect(
    page.getByRole("link", { name: "返回网站", exact: true }),
  ).toBeVisible();
  mkdirSync("output/playwright", { recursive: true });
  await page.screenshot({
    path: "output/playwright/admin-zh-desktop.png",
    fullPage: true,
  });
  const cookie = (await page.context().cookies()).find(
    (c) => c.name === "arcade_admin",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Strict");
  for (const [path, title] of [
    ["providers", "游戏供应商"],
    ["dedupe", "重复游戏审核"],
    ["curation", "首页编排"],
    ["health", "异常来源检查"],
    ["seo", "搜索收录管理"],
    ["sync", "同步日志"],
  ]) {
    await page.goto(`/admin/${path}`);
    await expect(
      page.getByRole("heading", { name: title, exact: true }).first(),
    ).toBeVisible();
  }
  await page.goto("/admin/games?q=Neon");
  const priority = page.getByLabel("GamePix 手动优先级");
  await priority.fill("500");
  await priority
    .locator("xpath=ancestor::form")
    .getByRole("button", { name: "保存来源设置" })
    .click();
  await expect(page.getByRole("status")).toContainText("来源设置已保存");
  await page.goto("/game/neon-drift");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await expect(page.locator("iframe")).toHaveAttribute("src", /source=gamepix/);
  await page.goto("/admin/games?q=Neon");
  await page.getByLabel("GamePix 手动优先级").fill("");
  await page
    .getByLabel("GamePix 手动优先级")
    .locator("xpath=ancestor::form")
    .getByRole("button", { name: "保存来源设置" })
    .click();
  await page.goto("/admin/curation");
  const section = page
    .locator("details")
    .filter({ has: page.locator('input[name="id"][value="trending"]') });
  await section.locator("summary").click();
  const previousPins = await section
    .getByLabel("置顶游戏标识（每行一个，按展示顺序填写）")
    .inputValue();
  await section
    .getByLabel("置顶游戏标识（每行一个，按展示顺序填写）")
    .fill("pocket-planet\nneon-drift");
  await section.getByRole("button", { name: "保存栏目设置" }).click();
  await expect(page.getByRole("status")).toContainText("首页栏目设置已保存");
  await page.goto("/");
  const trending = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Trending now", exact: true }),
  });
  await expect(trending.locator(".game-card").first()).toContainText(
    "Pocket Planet",
  );
  await page.goto("/admin/curation");
  const restore = page
    .locator("details")
    .filter({ has: page.locator('input[name="id"][value="trending"]') });
  await restore.locator("summary").click();
  await restore
    .getByLabel("置顶游戏标识（每行一个，按展示顺序填写）")
    .fill(previousPins);
  await restore.getByRole("button", { name: "保存栏目设置" }).click();
  // Browser history is already populated by the player above. Its section
  // must obey the same admin ordering as server-rendered catalog sections.
  const recentSection = page.locator("details").filter({
    has: page.locator('input[name="id"][value="continue"]'),
  });
  await recentSection.locator("summary").click();
  const previousPosition = await recentSection
    .getByLabel("展示顺序（数字越小越靠前）")
    .inputValue();
  try {
    await recentSection.getByLabel("展示顺序（数字越小越靠前）").fill("99");
    await recentSection.getByRole("button", { name: "保存栏目设置" }).click();
    await expect(page.getByRole("status")).toContainText("首页栏目设置已保存");
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Jump back in", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".home-page > .section").last()).toContainText(
      "Jump back in",
    );
  } finally {
    await page.goto("/admin/curation");
    await recentSection.locator("summary").click();
    await recentSection
      .getByLabel("展示顺序（数字越小越靠前）")
      .fill(previousPosition);
    await recentSection.getByRole("button", { name: "保存栏目设置" }).click();
    await expect(page.getByRole("status")).toContainText("首页栏目设置已保存");
  }
  await page.goto("/admin/providers");
  await page
    .getByRole("button", {
      name: vars.GAMEMONETIZE_FEED_URL ? "同步 GameMonetize" : "同步 Playgama",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("后台同步已排队");
  const runId = (await page.getByRole("status").innerText()).match(
    /[（(]([^）)]+)[）)]/,
  )![1];
  await expect
    .poll(
      async () => {
        await page.reload();
        const row = page.locator(`tr[data-run-id="${runId}"]`);
        return (await row.count()) ? await row.innerText() : "";
      },
      { timeout: 60000 },
    )
    .toMatch(/同步成功|部分目录已同步/);
});
test("CSRF is rejected and sitemap excludes development games", async ({
  request,
}) => {
  const response = await request.post("/api/admin/login", {
    form: { password: "irrelevant" },
    headers: { Origin: "https://foreign.example" },
  });
  expect(response.status()).toBe(403);
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("/game/");
  const ads = await request.get("/ads.txt");
  expect(ads.ok()).toBe(true);
  expect((await ads.text()).trim()).toBe("");
});
for (const width of [360, 390, 768, 1024, 1440, 1920])
  test(`responsive homepage and game player at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await page.goto("/");
    await expect(page.locator(".game-card").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    mkdirSync("output/playwright", { recursive: true });
    await page.screenshot({
      path: `output/playwright/home-${width}.png`,
      fullPage: false,
    });
    if (width < 600) {
      await page.getByRole("button", { name: "Toggle navigation" }).click();
      await expect(
        page.getByRole("navigation", { name: "Main navigation" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close navigation" }).click();
    }
    await page.goto("/game/neon-drift");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Play now", exact: true }).click();
    await expect(page.locator("iframe")).toBeVisible();
    await page.screenshot({
      path: `output/playwright/player-${width}.png`,
      fullPage: false,
    });
  });

test("portrait player and landscape mobile remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/game/pocket-planet");
  await expect(page.locator(".portrait-player")).toBeVisible();
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await expect(page.locator("iframe")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/game/neon-drift");
  await page.getByRole("button", { name: "Play now", exact: true }).click();
  await expect(page.locator("iframe")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
