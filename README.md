# 8090 — Night Arcade

A provider-independent browser gaming platform built with **Next.js 16 App Router APIs, vinext, TypeScript, Tailwind CSS, Cloudflare Workers, Workflows, D1, Drizzle, Zod, Vitest and Playwright**. Original Night Arcade UI, server-rendered discovery, and a real persistent catalog/admin system.

访问统计与搜索平台配置见 [GA4、GSC 和 Bing 接入说明](docs/analytics-and-webmasters.md)。游戏列表首屏显示 60 款，向下滚动自动继续加载，保留返回时的列表与位置。

**当前更新：2026-09-20 已部署到 [games8090.online](https://games8090.online/)，[中文管理后台](https://games8090.online/admin)和 801 款真实游戏目录已上线。线上提供第三方游戏加载选择：允许后点击 Play now 开始，拒绝或撤回会关闭播放器。部署资源、验证和回退方式见 [部署记录](docs/deployment-2026-09-20.md)。**

The source repository began empty. A fresh development seed contains **24 explicitly fictional canonical games and 27 fixture sources**. The current local catalog now contains **801 real games**; its 24 older samples have been moved to drafts, so public discovery, search, saved lists and game pages no longer expose the test player. The sample data remains available in local Studio. Production contains only the 801 real games. Provider attribution/revenue verification remains separate from importing and deploying the catalog.

Open Privacy settings on a real game, choose whether to allow the third-party player, then click Play now. With `PLAYER_PERMISSION_MODE=site`, this works in local, preview and production. The choice lasts for the current tab and can be revoked from the footer; revocation closes the player. It controls loading the iframe, does not generate advertising consent strings, and preserves provider privacy controls. Use `PLAYER_PERMISSION_MODE=external` when integrating a separate CMP; an existing external bridge is never overwritten.

## Run locally

Use Node.js **22.19+** or **24+**, npm and a current browser. Tested with Node 25.9.

```sh
npm ci
npm run setup
npm run dev
```

Open **http://127.0.0.1:3000**. Studio: **http://127.0.0.1:3000/admin**.

`setup` creates `.dev.vars` with a random local admin password and session secret, applies D1 migrations, then seeds provider fixtures through the same sync engine used for live providers. It preserves an existing `.dev.vars`. Read `ADMIN_PASSWORD` from that local file to sign in; the password is deliberately not printed or committed. If you supply your own file, use the keys in `.dev.vars.example`. Do not simply copy empty admin secrets and expect login to work.

Local D1 persists in `.wrangler/state/v3/d1`. Seeding is idempotent:

```sh
npm run db:migrate
npm run db:seed
```

## What is implemented

- Responsive home, all/new/popular/category/search pages, game detail, favorites, recent, about, privacy, terms, cookies, contact and copyright.
- Original illustrated game cards, a generated racing hero, self-hosted Outfit/DM Sans fonts, collapsible desktop navigation, mobile menu/chips, loading/error/empty states and reduced-motion support.
- Four schema-validated provider adapters with pagination, account field mappings, attribution preservation, bounded HTTPS fetches and fixture/live/blocked states.
- Canonical games, many sources, conservative dedupe confidence, manual review/merge/separate/ignore and necessary donor redirects.
- Idempotent sync runs, provider locking, three-cycle disappearance protection, independent manual source disable/priority/override and contract-aware source selection.
- D1 FTS5 title/studio/category/tag search, instant keyboard suggestions and 60-card batches that append on scroll. All/new/popular/category/search collections share the same loading, retry and end states. No real-time provider fan-out.
- Click-to-mount player with reload, Fullscreen API, timeout help and manual fallback; consent bridge for approved CMP integration.
- Versioned localStorage favorites/history, first-party aggregate events, visible-page time distinct from gameplay, source reachability/load/fallback diagnostics.
- Protected Studio overview, providers, game editing and sources, deduplication, configurable homepage sections/pins/order, health, SEO and sync logs.
- Editorial indexing gate, canonical metadata, OpenGraph, VideoGame JSON-LD, production-only curated sitemap, and empty-by-default aggregated ads.txt.
- Nonce CSP and explicit origins, server-only secrets, Access JWT or secure-cookie admin authentication, CSRF checks and mutation/login throttling.
- Workers production/preview configuration, D1 migrations, durable paginated background sync with resumable 20-source batches, and a daily sync/ranking schedule.

See [architecture](docs/architecture.md), [provider integration](docs/providers.md), and [verification](docs/verification.md).

## Architecture decisions

`Provider → Zod adapter → normalizer → dedupe → canonical game + sources → ranking/curation → UI`.

The frontend uses canonical presentation types. A provider can change without changing the game's URL or its card/player/search components. Provider-specific parsing and embed permissions stay in the adapters. Titles alone never authorize an automatic merge. Noindex imports remain playable; editorial promotion is independent of catalog sync. HTTP/iframe events never masquerade as verified gameplay or revenue.

[Cloudflare's current Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) recommends vinext for new Workers projects. The pinned vinext release is **beta**; its relevant behavior is covered by the project's local and production-preview tests. This project does not require Vercel or consume `next build` output.

## Required configuration

| Variable / binding                                                          | Purpose                                                                                                           |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `CATALOG_SYNC`                                                              | Cloudflare Workflow binding, configured separately per environment; deployed with the Worker.                     |
| `DB`                                                                        | D1 binding; production is provisioned in `wrangler.jsonc`, while preview still needs its own database.             |
| `SITE_URL`, `APP_ENV`                                                       | Real HTTPS origin and `production` / `preview` / `local`. Set in Wrangler vars.                                   |
| `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`                                    | Strong server-only admin password and random session secret (32+ chars). Prefer Cloudflare Access for production. |
| `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`                                          | Optional Access JWT validation; configure both. No email/header trust shortcuts.                                  |
| `PLAYGAMA_CLID`, `PLAYGAMA_API_BASE`                                        | Your Playgama publisher ID and official complete API URL.                                                         |
| `GAMEPIX_SID`, `GAMEPIX_API_BASE`                                           | Your GamePix publisher SID and official complete API URL.                                                         |
| `GAMEMONETIZE_FEED_URL`                                                     | Feed Builder URL from your publisher account.                                                                     |
| `WGPLAYGROUND_API_BASE`                                                     | Official full feed endpoint.                                                                                      |
| `WGPLAYGROUND_PARTNER_ID`, `WGPLAYGROUND_ATTRIBUTION_PARAM`                 | Only if your actual partner agreement defines query-parameter attribution.                                        |
| `PROVIDER_MODE`                                                             | `auto` for local; `live` for preview and production.                                                              |
| `PROVIDER_MAPPING_JSON`                                                     | Verified envelope/item/category mappings for your actual feeds.                                                   |
| `PROVIDER_FRAME_ORIGINS`, `PROVIDER_ASSET_ORIGINS`, `PROVIDER_FEED_ORIGINS` | Additional exact HTTPS origins for approved players, CDN images and feeds.                                        |
| `CONSENT_REQUIRED`                                                          | Default `true`; the player waits for an explicit permission decision.                                            |
| `PLAYER_PERMISSION_MODE`                                                   | `site` enables the built-in load/deny/revoke dialog; `external` waits for an external CMP bridge.                  |
| `CONTACT_EMAIL`                                                             | Real operator contact for contact/privacy/copyright pages.                                                        |
| `ANALYTICS`                                                                 | Optional Analytics Engine dataset binding; D1 aggregate events work without it.                                   |

Never use `NEXT_PUBLIC_` for provider secrets. Details of verified provider endpoints, schemas and account uncertainties are in [docs/providers.md](docs/providers.md).

## Checks

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

`npm run check` runs lint, typecheck, unit/integration tests and production build. The fixture-based Playwright suite requires a separate freshly seeded local D1 with published samples and `.dev.vars`; it should not run against the current live catalog where those samples are deliberately drafts. It starts the dev server if port 3000 is not already running. Set `E2E_BASE_URL=http://127.0.0.1:3001` to test a compiled local-mode Worker started with `npm run preview -- --port 3001`. Screenshots are saved to `output/playwright/`; HTML report to `playwright-report/`. Tests restore source priority and curation changes. Test traces may contain your **local test admin session**, so never publish them.

## D1 migrations

```sh
# Local
npm run db:migrate

# Create real databases (requires Cloudflare login)
npx wrangler d1 create 8090-arcade
npx wrangler d1 create 8090-arcade-preview
```

Production `8090-arcade` has already been created and its real ID is in `wrangler.jsonc`; do not recreate it for routine deployments. The preview ID is still a placeholder. When provisioning another environment, copy its returned ID into the matching block and configure `SITE_URL`, `CONTACT_EMAIL`, and `account_id`.

```sh
# Remote environments: no fixture seeding
npx wrangler d1 migrations apply DB --remote --env preview
npx wrangler d1 migrations apply DB --remote --env production
```

`lib/db/schema.ts` is the Drizzle model. Ordered SQL in `migrations/0001_...sql` onward is the deployment source of truth and includes FTS5/triggers that Drizzle cannot infer. For future changes, use `npx drizzle-kit generate` to draft SQL into `migrations/generated`, inspect it against applied migrations, then add the next numbered migration to the root migration directory. Do not apply generated drafts blindly or replay already-applied schema changes.

## Deploy to Cloudflare Workers

Production was deployed with the user's authorization on 2026-09-20. It uses Worker Routes on the existing proxied root and www DNS records; the previous Pages project remains intact. Keep those DNS records proxied and retain the routes in `wrangler.jsonc`. See the deployment record for rollback details.

```sh
npx wrangler login
# Or configure CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in CI.

npx wrangler secret put ADMIN_PASSWORD --env production
npx wrangler secret put ADMIN_SESSION_SECRET --env production
# Repeat for each configured provider credential/feed URL and preview environment.
# Example:
npx wrangler secret put PLAYGAMA_CLID --env production
npx wrangler secret put PLAYGAMA_API_BASE --env production

# Apply migrations first, then build for the matching environment and deploy.
npx wrangler d1 migrations apply DB --remote --env preview
npm run deploy:preview

npx wrangler d1 migrations apply DB --remote --env production
npm run deploy:production
```

The Cloudflare Vite plugin resolves `CLOUDFLARE_ENV` at build time and emits `dist/server/wrangler.json` with the compiled Worker/assets. Deployment commands use that generated configuration; do not deploy the raw TypeScript source without a build. `npm run preview` runs the last build locally. `npm run deploy` is an alias for production deployment.

Before public launch: verify one real provider at a time in preview, copy authorized ads.txt entries into `config/ads`, connect your approved CMP, finalize legal/operator text and domain, check live gameplay and publisher attribution, then curate/index real games. The missing credentials are not a reason to invent API responses, licensing, revenue percentages or ads.txt records.

## Assets

The web-optimized hero is `public/art/night-drift.webp` (about 99 KB). The retained original hero is [public/art/night-drift.png](public/art/night-drift.png), generated using the built-in image tool. The saved prompt is [docs/artwork.md](docs/artwork.md). Development vector illustrations are authored in `scripts/make-fixtures.mjs`. They do not represent any provider's real game artwork. Live cards use validated provider thumbnails.
