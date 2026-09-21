# 2026-09-21 界面改版发布与回退

后续进展：用户选择保持免费，已完成公开页面静态化并上线。当前发布方式与验收见 [静态发布说明](static-publishing.md)。以下保留首次 SSR 发布回退的历史记录。

- 网站：<https://games8090.online/>。
- 应用代码提交：`2ba17ca`，已推送至 `origin/master`。
- Cloudflare Worker：`8090-night-arcade`。
- 改版发布版本：`3dcd3239-9081-481d-98be-dc9c7a3c92f1`；后续验证发现 CPU 限制错误，已回退。
- 当前线上版本：`fe5a64b9-c920-43c1-ba49-2a127697a9dc`，Cloudflare 确认已恢复到 100% 流量；浏览器确认旧版首页重新出现。
- 状态：提交和推送完成，改版尚未稳定上线，等待运行资源方案决定。

## 本次变化

采用用户选择的第二套设计：紧凑图标导航、深色游戏墙、大推荐与密集游戏卡片、横向分类、继续游玩入口；手机使用底部导航和双列布局。同时修复手机播放器被宽高比撑宽而裁切的问题。真实游戏数据、连续加载、收藏、搜索和中文后台保留。

## 发布与验证

- ESLint、TypeScript、59 项测试、生产构建和 Git 空白检查全部通过。
- 使用生成的生产配置部署；未迁移或重新导入数据库，未修改供应商密钥与 GA/GSC/Bing 配置。
- 首页、全部游戏、Puzzle 分类、2048 详情、中文登录页、robots、sitemap、搜索接口均返回 HTTP 200。
- 首页引用的 23 个 JS/CSS 资源全部 HTTP 200。
- 线上 HTML 包含新版 `arcade-shell`、首页标题、GA `G-0HQR7PNXDP` 及原 GSC/Bing 验证标记。
- www 入口 308 跳转到主域名并保留路径和参数；未登录后台 303 跳转到登录页。
- 浏览器实际打开新版首页，展示生产库 775 款已发布游戏；搜索 2048 后通过键盘进入详情，隐私选择可操作。
- GamePix 2048 进入实际棋盘，四个方向键触发移动和合并，得分从 12 增加到 28。截图 `output/deployment-2026-09-21/2048-played.png`。这验证了一个游戏的实玩，不代表所有供应商和游戏都完成验收。

## 阻碍稳定发布的问题

首次 HTTP 检查成功后，同一浏览器的连续加载失败，回到首页出现 Cloudflare 1102。Worker 日志复现 `outcome: exceededCpu`、`cpuTime: 10`、HTTP 503，异常为 `Worker exceeded CPU time limit.`。另一些获准完成的请求记录为：首页 130 ms CPU，目录接口 16 ms CPU，列表页面 33 ms CPU。不能将偶尔返回 200 当成稳定通过。

[Cloudflare 官方限制](https://developers.cloudflare.com/workers/platform/limits/)规定免费请求 CPU 为 10 ms；此次运行限制与该门槛一致。现有动态服务端渲染超过这一预算。Workers 付费方案的[官方价格](https://developers.cloudflare.com/workers/platform/pricing/)为每月 5 美元起，超量另计。没有替用户开通付费服务，也没有修改订阅或扩展访问权限。

已将线上回退到发布前的 Worker 版本，数据库、密钥和 Git 中的新设计均保留。新设计稳定上线需要用户选择：开通 Workers Paid 后重新发布与复验，或者保留免费方案并授权改为静态发布。回退不等于证明旧版永远不会触发同一运行限制。

HTTP 检查证据：`output/deployment-2026-09-21/http-smoke.json`；线上首页截图：`output/deployment-2026-09-21/home.png`。本地设计与响应式验收见项目根目录 `design-qa.md`。
