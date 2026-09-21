# 免费静态发布

公开站使用 Cloudflare Pages 项目 `games8090`，域名仍为 <https://games8090.online/>。用户于 2026-09-21 选择保留免费方案，替代超过免费 Worker CPU 限制的公开页面 SSR。

## 发布内容与边界

- 775 款已发布真实游戏，857 个预生成 HTML 页面，含详情、分类、分页、法律说明和 404。
- 首屏 60 款，向下继续加载；搜索、收藏与最近游玩读取带内容哈希的静态目录，不请求公开 D1 查询接口。
- 所有游戏仍须在用户允许后点击播放才加载外部 iframe；保留来源选择、广告归属参数、隐私撤回和全屏。
- 保留 GA `G-0HQR7PNXDP`、GSC 和 Bing 验证标记。GA 仍需用户单独允许；没有建立新属性。
- 只有原本允许收录的游戏进入 sitemap，未将全部导入游戏自动改成 index。
- 后台、汇总事件计数、定时同步仍使用现有 Worker/D1 免费资源；其额度不保证无限。公开静态页面不再运行 SSR，计数接口失败不会阻塞浏览、搜索或游戏加载。

`static/published-catalog.json` 是可提交的公开快照，不含供应商密钥、后台口令、内部合同记录、原始来源 metadata、草稿或演示游戏。构建仅复制最终 HTML、公开 JSON、脚本、字体、样式、fallback 图片和 ads.txt 到 `dist/static`，没有 Pages Functions。

## 常规代码发布

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build:static
npm run preview:static
```

预览地址 <http://127.0.0.1:3002>。该服务只读本地静态文件，事件计数返回空响应，不修改生产数据库。现有 `npm run dev` 和中文本地后台保持可用。

提交后推送 `master`：Pages 自动执行 `npm run build:static`，输出目录 `dist/static`，Node 22。构建使用已提交快照，无需给 Pages CI 添加 D1 或供应商密钥。

手动发布：`npm run deploy:production`（或 `npm run deploy:static`）。需要已有的 Wrangler 登录。`scripts/pages.mjs` 将 Pages 与 vinext 生成的 Worker 配置隔离，避免部署错服务。

## 后台修改游戏后的发布

```sh
npm run catalog:export
# 审核 static/published-catalog.json 的变化，提交并推送 master。
# 也可立刻发布当前快照：
npm run deploy:static
```

导出命令只读生产 D1。它按已有合同、供应商启用状态、来源优先级和 URL 白名单计算可播放来源；如果读取失败、目录为空或某个已发布游戏没有有效来源，会停止并保留旧快照。先在后台处理该游戏再导出。

`npm run publish:catalog` 可一次完成导出和手动发布，随后仍应提交/推送新快照，避免下一次自动构建用回旧目录。每天同步只更新数据库；新增、下架、来源停用、首页编排、收录设置均在重新导出发布后反映到公开站。需要紧急下架时也必须立即发布快照。

## 后台路由与恢复

Worker `8090-night-arcade` 仅保留以下路由：

```text
games8090.online/admin*
games8090.online/api/admin/*
games8090.online/api/events
games8090.online/_next/*
www.games8090.online/*
```

www 由现有轻量跳转逻辑返回 308 到主域名，不进入 SSR。`/_next/*` 保留后台脚本和样式。返回公开站使用普通链接，避免后台路由器请求静态页面的 RSC 数据。

修改后台后使用 `npm run deploy:backend`。不要重新添加 `games8090.online/*`，否则会覆盖 Pages 并重新触发公开 SSR 的 CPU 问题。数据库、密钥、DNS 和 Pages 自定义域名绑定均保留。

静态版本出问题时，在 Pages 项目的部署记录回滚至上一静态成功版本；不需要回退数据库。首次切换前的 Worker 恢复版本为 `fe5a64b9-c920-43c1-ba49-2a127697a9dc`，但恢复公开 SSR 会重新面临免费 CPU 限制，不作为长期方案。

官方依据：[Pages 静态页面服务](https://developers.cloudflare.com/pages/configuration/serving-pages/)、[Pages 响应头](https://developers.cloudflare.com/pages/configuration/headers/)、[Pages 费用](https://developers.cloudflare.com/pages/functions/pricing/)。

## 2026-09-21 上线验收

- 代码提交 `60b0c18` 已推送 `origin/master`。手动 Pages 发布 `4f361109-076c-449b-9d81-1353ff6ba74b` 成功；随后 Git 自动构建 `5bc8309b-1eee-49ee-a1ee-c7322f6ebcf4` 成功，API 确认 `uses_functions: false`。
- 后台 Worker 版本 `43fa4fe3-8b69-45cb-8b60-91bdec835e85` 已生效；API 确认公开 apex 通配路由已移除，只保留上文列出的五条路由。
- ESLint、TypeScript、65 项测试、后台生产构建和静态构建通过。
- 正式域名首页、列表、独立第二页、Puzzle 分类、2048/蛋糕合并详情、搜索、收藏、中文登录、robots、sitemap、release.json 均 HTTP 200。不存在的游戏和演示播放器返回 404。
- 正式列表从 60 连续加载到 120、180 款；精确搜索 2048 排首位并进入详情。预览站验证收藏跨页面保留。公开 `/api/games` 已为 404，浏览器列表和搜索仍正常运行。
- 2048 加载真实 GamePix 棋盘，方向键触发移动与合并，得分由 28 增至 56；没有将仅显示播放器外壳算作游戏验证。其他 774 款未逐一实玩。
- 首页 JS/CSS 与静态目录返回 200；目录使用内容哈希与 immutable 缓存。列表连续八次 HTTP 请求全为 200。www 路径/参数完整 308 跳转，未登录后台 303 跳转。
- 原 GA/GSC/Bing 标记、CSP 和安全响应头仍在；未变更付费订阅、数据库数据或供应商密钥。

本地验证证据：`output/static-deployment-2026-09-21/`，含 HTTP 检查、Cloudflare 发布/路由快照、首页和 2048 实玩截图。该目录按仓库规则不提交。
