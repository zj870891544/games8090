# Verification — 2026-09-20

## 中文后台与真实接入更新

管理后台已完成中文化：独立中文页面框架、所有功能页、表单选项、反馈与错误、分类输入，以及北京时间格式。后台显示中文名称，数据库仍保留原有状态和分类键；游戏原始内容及前台栏目标题不会被自动翻译覆盖。

本轮检查：40 项单元/集成测试通过，原有 12 项浏览器测试在编译后的 Worker 上通过，新增的中文错误、分类选项和 390px 后台布局测试也通过，共 13 项。已验证 GameMonetize 的真实后台工作流同步成功；有限目录按“部分目录已同步”显示，避免误判其他来源下架。Playgama 全目录 2,218 条及 GamePix 首批 100 条通过解析校验。本地数据库已导入 Playgama 100 个、GamePix 100 个、GameMonetize 101 个真实来源，共 301 个，均保持不收录。

修复了真实接入才会触发的 Workers 兼容问题：原 `redirect: error` 在 workerd 中不受支持；现使用 `manual` 并拒绝目录接口的 3xx，继续防止跳转到未批准的地址。同步错误经过脱敏后用中文显示。生产域名和自定义域名路由已配置，尚未发布远程服务。

以下记录为首次交付时的基线验证；最新接入状态见 [`providers.md`](providers.md)。

Validated on macOS with Node 25.9, Chromium, local Cloudflare workerd/D1 and the pinned vinext release. No remote resources were deployed and no real provider account was used.

| Check                                                          | Result                                                                                                                                                               |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                 | Passed.                                                                                                                                                              |
| `npm run typecheck`                                            | Passed with strict TypeScript.                                                                                                                                       |
| `npm test`                                                     | 34 tests passed across 4 files.                                                                                                                                      |
| `npm run build`                                                | All five vinext build stages passed.                                                                                                                                 |
| `CLOUDFLARE_ENV=production npm run build`                      | Production Worker, assets and environment configuration generated.                                                                                                   |
| `wrangler deploy --config dist/server/wrangler.json --dry-run` | Passed; D1, assets and Workflow bindings recognized. This does not deploy.                                                                                           |
| D1 migrations                                                  | All five numbered migrations applied successfully in local development and a separate empty local database using the production binding.                             |
| Playwright                                                     | All 12 tests passed on the dev server and compiled Worker preview in local mode. The final Continue Playing ordering correction also passed the expanded admin test. |
| Client secret check                                            | Neither generated local admin secret occurred in any of the 62 public build files. Server secrets remain outside the public asset directory.                         |
| Dependency audit                                               | Production dependency audit reported zero vulnerabilities at verification time.                                                                                      |

## Covered behavior

- Four validated fixture adapters import **27 sources into 24 canonical games**. One Neon Drift from the same fictional studio has three providers at one URL; a same-title game from another fictional studio remains separate and generates a review candidate.
- Normalization, taxonomy aliases, conservative dedupe, manual merges with source/metric/pin preservation, source priority/disable persistence, three-cycle disappearance, failed-feed preservation and D1 FTS5 triggers are exercised against the SQL migrations.
- Durable sync tests stage 51 records across three pages before mutation, import batches of at most 20, preserve the catalog after a later page fails, and safely retry imports/finalization. The browser admin test also starts and observes a real local Cloudflare Workflow reaching `success`.
- Browser checks cover server-rendered discovery, keyboard search, categories/empty results, delayed iframe mounting, actual fullscreen entry/exit, reload, manual fallback, favorites and recent history.
- Admin checks cover authentication, HttpOnly/SameSite cookies, protected navigation, source priority changes, ordered pins and configurable Continue Playing position. Test mutations are restored. Access configuration tests fail closed on partial configuration; foreign-origin mutations are rejected.
- Homepage and player checks at **360, 390, 768, 1024, 1440 and 1920 px** assert no horizontal overflow and save screenshots. Portrait games and landscape mobile at 844 × 390 are covered. Desktop and mobile screenshots were visually reviewed.
- Production-mode runtime smoke checks passed: homepage/search/robots/sitemap/ads.txt respond, the development player returns 404, unauthenticated admin redirects, CSP contains a nonce and no `unsafe-eval`, HSTS is present, the empty catalog sitemap contains only the homepage, and ads.txt contains no invented sellers.

Screenshots: [`output/playwright`](../output/playwright/). The hero master, optimized asset and generation prompt are documented in [`artwork.md`](artwork.md).

## Reproduce

```sh
npm ci
npm run setup
npx playwright install chromium
npm run check
npm run test:e2e

# Validate the compiled Worker against seeded local fixtures.
npm run preview -- --port 3001
# In another terminal:
E2E_BASE_URL=http://127.0.0.1:3001 npm run test:e2e

# Build the real production configuration without publishing.
CLOUDFLARE_ENV=production npm run build
npx wrangler deploy --config dist/server/wrangler.json --dry-run
```

Use the local build for fixture browser tests. A production build intentionally blocks the development player. Production runtime checks use an empty, migrated local database; they do not verify remote Cloudflare permissions, domain routing or production credentials.

## Remaining external integration

Supply the account details listed in [`providers.md`](providers.md), real Cloudflare D1 IDs/domain, production admin or Access configuration, approved CMP integration, authorized ads.txt records and final operator/legal information. Then validate one live provider at a time: feed mapping, import, playable URL attribution, game behavior, consent, and the provider dashboard's attribution/revenue report.

The fixture iframe is a connection diagnostic, not a hosted game. Real gameplay, private feed schemas, partner contracts, ad revenue attribution, CMP approval, large-catalog load/quotas and field Core Web Vitals remain unverified. vinext is pinned to a beta release; browser coverage is Chromium, not a Safari/Firefox certification.
