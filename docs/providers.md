# Provider integration and provenance

Updated 20 September 2026 after publisher configuration and deployment authorization were supplied. The provided Playgama CLID, GamePix SID and GameMonetize feed are stored in the ignored local `.dev.vars` and deployed as production Worker secrets. Local admin secrets were preserved; production uses separate credentials. WGPlayground is configured for its public feed without a partner ID. No partner agreements were accepted or provider account dashboards accessed.

## 当前接入状态

后续实测已修复本地启动流程：24 款旧演示游戏已转为草稿；真实游戏通过本地隐私选择后可启动，三家各有一款进入实际游戏并完成操作检查。个别来源的上游资源异常与验证范围见[真实游戏启动记录](live-playback-2026-09-20.md)。

本地当前共有 **801 个真实来源、801 款真实游戏**：Playgama 350 个、GamePix 350 个、GameMonetize 101 个。其中首批为 301 个，本次按用户要求再新增 500 个（Playgama、GamePix 各 250 个），均通过官方接口获取并按来源编号去重。有限数量导入均标记为部分目录，新游戏保持不收录；后续可从后台发起完整同步。原有 24 款演示游戏未移除，因此本地后台的独立游戏总数为 825。详见[本次导入记录](import-500-2026-09-20.md)。

- 管理后台的登录页、导航、表单、选项、状态、反馈与异常提示均已中文化，时间按北京时间显示。游戏名称、供应商原始介绍以及可编辑的前台栏目标题保留原文，避免自动改动前台内容。
- **Playgama**：旧文档的 `GET /api/v1/games/export-list` 当前返回 404。已根据[官方目录工具](https://widgets.playgama.com)实际使用的接口接入 `POST https://playgama.com/api/v1/partner/export/catalogue/games`，请求体使用 `pagination.limit / offset`；本次完整目录为 2,218 条，全部通过校验。保留旧接口兼容逻辑。归因 CLID 按官方导出工具的方式附加到原始 `gameURL`，不改变游戏 SDK。
- **GamePix**：真实响应使用 `data` 数组，已配置映射；首批 100 条通过校验，保留 SID。图片域名为 `games.assets.gamepix.com`。
- **GameMonetize**：用户提供的目录本次返回 101 条，全部通过校验，保留原始 `.co` 游戏地址。它是有限条目的最新游戏列表，始终按“部分目录”同步，不用于自动停用未出现的来源。
- **WGPlayground**：不要求合作伙伴 ID，但公开接口在当前网络返回 403 防护页面。失败会记入日志，不会用演示数据冒充接入成功，也不会绕过访问防护。
- **生产域名**：已发布到 [games8090.online](https://games8090.online/)。独立生产 D1 已迁入 801 款真实游戏；`www` 自动跳转主域名。Worker Routes 接管现有代理域名，旧 Pages 项目和 DNS 记录保留。线上启用站点自己的“允许加载第三方游戏 / 暂不加载 / 撤回”流程；不生成广告同意字符串，不替换供应商自身隐私选项。详见[部署记录](deployment-2026-09-20.md)。

The Playgama request shape and field structure were checked against its [official catalogue client](https://widgets.playgama.com/static/js/main.3c8e45db310add46feb6.js) and live responses, not guessed. Explicit external player origins observed in this catalogue are maintained in `config/providers/playgama-frame-origins.json`; new origins still require review. The API client does not follow redirects, using Workers-compatible `redirect: manual` and rejecting non-success responses.

## Official references

- [Playgama API reference](https://playgama.com/partners-api): `https://playgama.com/api/v1/games/export-list`, one-based `page`, `pageSize`, required `clid`, optional `category`.
- [Playgama catalog import](https://wiki.playgama.com/playgama/for-partners/import-the-game-catalog): documented `gameURL` player field; account exports carry CLID.
- [GamePix integration](https://games.gamepix.com/gameinfo/): publisher catalog `/games`, `sid`, `limit`, `offset`, documented metadata fields including `thumbnailUrl`, `rkScore`, `touch`, `hwcontrols`.
- [GameMonetize Feed Builder](https://gamemonetize.com/rss-builder): generates a publisher-selected JSON/RSS feed. Only the URL you generate is fetched; no hidden endpoint is assumed.
- [WGPlayground publisher documentation](https://www.wgplayground.com/publishers): official `featured`, `latest`, `get_games`, and `get_games/limit/offset` feeds; publisher player permissions `fullscreen; autoplay`.

WG's blocked response was not used as a schema sample; its schema remains a representative development contract. Playgama, GamePix and GameMonetize field structures were checked against the supplied live configuration.

## How live mode is selected

`PROVIDER_MODE=auto` + `APP_ENV=local` uses fixtures only if none of a provider's required configuration is set. Partially configured providers fail closed instead of silently falling back. `PROVIDER_MODE=live` never falls back to fixtures. Production and preview do not automatically enable fixture mode. Production discovery, game pages, and sitemap exclude `is_fixture` records even if fixtures were accidentally imported. The fixture player returns 404 outside `APP_ENV=local`.

Use `PROVIDER_MODE=fixture` explicitly to force local development samples. Samples are 24 fictional canonical games and 27 sources, including Neon Drift with three sources and one same-title/different-studio review candidate. Their local player is a connection diagnostic, not a licensed game or a new game-hosting product.

## Account configuration

| Provider     | Required values                      | Attribution and completeness                                                                                                                                                                                                         |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Playgama     | `PLAYGAMA_CLID`, `PLAYGAMA_API_BASE` | Current catalogue uses POST with `pagination.limit=100` and `offset`, returning `games` and `totalCount`; legacy export-list uses GET. Retains existing player query parameters and required CLID; mismatched CLID fails validation. |
| GamePix      | `GAMEPIX_SID`, `GAMEPIX_API_BASE`    | Uses `limit=100`, `offset`, `sid`; keeps all supplied URL parameters. Mismatched SID fails validation.                                                                                                                               |
| GameMonetize | `GAMEMONETIZE_FEED_URL`              | Your generated feed URL is requested unchanged. JSON array or RSS `rss.channel.item` with explicit mappings. Default is **partial** because a Feed Builder selection is not necessarily the entire catalog.                          |
| WGPlayground | `WGPLAYGROUND_API_BASE`              | Set a documented full endpoint, e.g. `https://www.wgplayground.com/api/games_api/get_games`. Pagination appends `/100/offset` only to `/get_games`. Featured/latest selections are partial.                                          |

`WGPLAYGROUND_PARTNER_ID` is optional for public embedding. If provided, `WGPLAYGROUND_ATTRIBUTION_PARAM` becomes required. Set that name only if your actual account documentation specifies query-parameter attribution. If your contract instead uses signed URLs, hostname attribution, or a header, leave the ID unset and implement the documented mechanism in this adapter; do not substitute a guessed parameter.

CLID/SID are publisher attribution identifiers: they necessarily appear in the selected playable URL when the provider requires them. Admin passwords, session secrets, feed URL credentials and server configuration never appear in client bundles. URLs with userinfo are rejected. For a private signed embed URL, its signing credentials stay server-side even though the resulting playable URL must reach the iframe.

## Configure the actual feed shape

The default supported item fields are the Zod schemas in `lib/providers/adapters.ts`. An array is the default envelope. There is no permissive fallback that mistakes an unfamiliar error response for an empty successful catalog.

Set `PROVIDER_MAPPING_JSON` (Worker secret if account details are sensitive) to map your verified response. The following is a **mapping example**, not a real provider response:

```json
{
  "playgama": {
    "itemsPath": "payload.games",
    "fields": {
      "id": "gameId",
      "title": "title",
      "description": "description",
      "developer": "studio.name",
      "gameURL": "gameURL",
      "thumbnail": "assets.cover",
      "categories": "genres"
    }
  },
  "gamepix": {
    "itemsPath": "games",
    "categoryMap": { "YOUR_VERIFIED_CATEGORY_ID": "Puzzle" }
  },
  "gamemonetize": {
    "fullCatalog": false,
    "fields": {
      "id": "guid",
      "title": "title",
      "description": "description",
      "url": "game_url",
      "thumb": "thumbnail",
      "category": "category"
    }
  }
}
```

When `fields` exists, all required canonical _adapter schema fields_ must be mapped. Paths are read as data, never evaluated. Map numeric category IDs only using your provider's documented category taxonomy. Arrays of category objects or a new nested format should get an explicit Zod transform in the adapter. Invalid data aborts the sync before catalog mutation and cannot trigger disappearance handling.

Live URLs must be HTTPS and match exact origins from the allowlists. Add the actual publisher asset CDN origins to `PROVIDER_ASSET_ORIGINS`, playable origins to `PROVIDER_FRAME_ORIGINS`, and generated feed origins to `PROVIDER_FEED_ORIGINS`. The same configuration drives URL validation and CSP. Redirects are not followed; feed redirects fail validation and health checks record the response status. Configure the verified final endpoint. Pages have a 45-second request timeout and are capped at 20 MB, 500 pages, and 50,000 records. Hitting a cap is an error, not a complete catalog.

## First live provider rollout

1. Get a publisher account, accepted agreement and approved site domain. Configure one provider and the exact feed schema/origins.
2. Keep imported games `noindex`. Sync in preview and inspect the run counters and source metadata.
3. Open several real games on mobile and desktop. Verify Play, fullscreen, fallback and account attribution in the provider dashboard. An iframe load or HTTP 200 is not a gameplay test.
4. Paste the authorized ads.txt entries from your agreement/dashboard into `config/ads/<provider>.txt` and rebuild. No seller IDs were invented or copied into this project.
5. Install the approved CMP bridge, finalize operator identity/contact and legal text, then allow live players where appropriate.
6. Publish a curated group with verified instructions and substantive editorial content. Promote eligible games individually in Studio. The code does not invent 500–1,000 curated entries when no real catalog was provided.

## Adding provider five

Implement `GameProvider` (or extend `BaseProvider`), register its ID and factory, define configuration/allowlists and a Zod schema, and seed its provider/contract row with a migration. Add a fixture and parsing/sync tests. `GameCard`, `GamePlayer`, search and category UI only consume canonical types and do not need to change. Admin provider names are registry data.
