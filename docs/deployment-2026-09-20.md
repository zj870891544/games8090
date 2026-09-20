# 2026-09-20 生产部署记录

网站：https://games8090.online/
管理后台：https://games8090.online/admin

## 已发布资源

- Cloudflare Worker：`8090-night-arcade`。
- 初次 Worker 版本：`8f62f854-dc4a-4ba8-8454-bfd23b6ebcc5`，当时流量 100%。后续已发布[播放修复版本](online-playback-2026-09-20.md)。
- 初次部署 ID：`4ba24097-d3b6-48ae-b955-45551561d6d4`。
- D1：`8090-arcade`，ID `79c083a1-1371-4a7d-ae84-9ef90ec1e180`。
- 已应用迁移 `0001` 至 `0005`；没有把演示游戏或本地测试统计迁入生产。
- Workflow：`8090-catalog-sync`。每日 `03:00 UTC`（北京时间 11:00）计划触发同步及排名更新；本次确认配置已发布，未额外运行一次完整远程同步。
- 生产后台密码和会话密钥独立生成，供应商配置均写入 Worker secrets。密码保存在本机 `.wrangler/deployment/production-admin.txt`，权限 `0600`、已被 Git 忽略，不写入本文或前端。

## 域名接管与回退

原域名绑定在 Pages 项目 `games8090`，直接创建 Worker Custom Domain 因 Pages 管理的 CNAME 冲突失败。随后成功部署两个 Worker Routes：

```text
games8090.online/*       → 8090-night-arcade
www.games8090.online/*   → 8090-night-arcade
```

区域 ID 为 `b9dc8e7608666e38b22e9e8a022b883d`。保留原来的 Pages 项目、域名绑定与代理 DNS 记录，未删除或改动这些资源。应用将 www 请求用 308 跳转到主域名，并保留路径和查询参数。

若需恢复旧站，在 Cloudflare 的该 Worker 路由设置中移除上面两个路由，访问将回到仍保留的 Pages 项目；无需删除 D1 或 Worker。后续要保持回退状态时，也应同步修改 `wrangler.jsonc`，避免下次部署重新添加路由。部署前路由列表、Pages 域名资料和旧首页保存在已忽略的 `.wrangler/deployment/` 中。

## 目录迁移

| 来源 | 真实游戏 / 来源数 |
| --- | ---: |
| Playgama | 350 |
| GamePix | 350 |
| GameMonetize | 101 |
| 合计 | 801 |

生产另有 1,048 条分类关联、53 条待审重复候选、801 条健康记录。健康记录保留诊断备注，重置本地播放器测试计数。FTS 搜索记录 801 条，外键检查无错误。全部导入游戏保留 `noindex`，没有生成虚假的人工精选或评分。导入日志标为部分目录，避免把有限导入误认为全量同步。

## 验证

- 发布前 lint、TypeScript 检查、42 项单元/集成测试和生产构建通过。
- 构建产物检查未包含本地或生产后台密码及会话密钥。
- 线上首页、中文登录页、2048 详情、搜索接口均返回 200；首页引用的 20 个 JS/CSS 资源全部返回 200 且类型正确。
- 实际浏览器完成首页渲染、搜索 2048 和进入详情检查，控制台未发现错误。
- 2048 页面打开隐私设置后显示“隐私管理服务暂未就绪”，第三方 iframe 数量为 0，与生产暂停策略一致。
- 未登录访问后台跳转登录页；生产密码登录返回安全会话 Cookie（Secure / HttpOnly / SameSite=Strict），认证后的中文后台显示 801 款游戏。
- www 的路径与查询参数在 308 跳转后保持不变。
- sitemap、robots、ads.txt 可访问；演示播放器 `/fixtures/player` 返回 404。
- 旧演示详情 `/game/pocket-planet` 不显示游戏或开发播放器，输出 `Game unavailable` 和框架 404 标记；当前 vinext 流式响应的 HTTP 状态仍为 200。后续可单独修正该失效详情的 HTTP 状态，本次不将它计作正确的 HTTP 404。

HTTP 检查结果保存于 `.wrangler/deployment/online-smoke.json`。此次部署不重新运行依赖演示数据的旧 Playwright 套件。

## 初次部署的边界（后续播放修复已替换暂停状态）

`APP_ENV=production`、`PROVIDER_MODE=live`、`CONSENT_REQUIRED=true`。本地预览授权弹窗不会在生产开启；正式隐私管理服务（CMP）未配置，因此线上游戏 iframe 保持暂停。本站、目录和后台已上线，尚不能宣称完成线上实玩验证。

用户随后反馈线上无法玩，已补齐生产加载选择，详见[线上播放修复](online-playback-2026-09-20.md)。上方的暂停检查是初次发布的历史记录，不代表修复后的状态。

WGPlayground 仍受上游 403 防护限制。运营联系邮箱、正式隐私服务和供应商认可的 ads.txt 内容仍待提供；未伪造账号协议、广告销售商或收入归因验证。

## 后续部署

```sh
npx wrangler d1 migrations apply DB --remote --env production
npm run deploy:production
```

常规发布不需要再次导入本次 `catalog.sql`。该 SQL 是首次空库迁移文件，不可重复执行。
