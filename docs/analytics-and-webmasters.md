# 访问统计与站长平台

正式网址：https://games8090.online/

## Google Analytics 4

- 账号：samzhang；媒体资源：8090 Games；网站数据流：8090 Games Web。
- 媒体资源 ID：`555091517`；[实时报告](https://analytics.google.com/analytics/web/#/a361490566p555091517/realtime/overview)。
- 衡量 ID：`G-0HQR7PNXDP`；数据流 ID：`15810740163`。
- 中国时区；使用网站手动发送的 `page_view`，数据流的增强型衡量已关闭，避免单页跳转重复统计。
- 页面跳转记录浏览事件；游戏开始、重载、切换来源、卡片点击、收藏记录独立事件。
- 仅正式环境加载；后台不参与统计。页面地址去掉查询参数和片段；不发送站内搜索词。
- 访客在页脚“Privacy settings · 隐私设置”中单独选择“允许访问统计”。允许前不加载 Google 脚本，不影响是否允许第三方游戏。选择保存在当前标签页，撤回立即停止后续统计。
- 广告存储、广告用户数据、广告个性化均保持拒绝，Google Signals 关闭。
- GA 实时报告用于验收；标准报表可能延迟。浏览器屏蔽统计脚本或访客未授权时不产生 GA 数据。

## Google Search Console 和 Bing

- 为 `https://games8090.online/` 使用网址前缀资源；旧 `https://www.games8090.online/` 资源已于 2026-09-20 按要求从当前 Search Console 账号移除。
- 验证标签由根布局直接输出在 HTML `<head>` 中，非正式环境不输出。
- Google 标签沿用旧站并经当前 Search Console 验证向导确认；Bing 标签来自该站点的验证向导。
- 两个平台都提交 `https://games8090.online/sitemap.xml`。验证成功不代表已收录，抓取与收录状态以平台为准。
- 站点地图仍遵循编辑审核策略，只包含允许收录的真实内容，不批量解除导入游戏的 `noindex`。

## 配置与维护

`wrangler.jsonc` 的正式环境配置包含以下公开标识（它们不是账号密码）：

| 变量 | 用途 |
| --- | --- |
| `GA4_MEASUREMENT_ID` | GA4 网站数据流衡量 ID |
| `GOOGLE_SITE_VERIFICATION` | Google HTML 验证标签的 content 值 |
| `BING_SITE_VERIFICATION` | Bing `msvalidate.01` 标签的 content 值 |

后台“搜索收录管理”显示配置状态和平台入口。更换账号时应使用新平台实际提供的标识，保留仍在使用的所有权验证。

部署仍使用 Cloudflare Worker 路由；旧 Pages 项目和仓库历史保留。管理员密码、会话密钥、`.dev.vars`、`.wrangler` 和浏览器测试产物不进入仓库。

参考：[GA 单页应用](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)、[手动页面浏览](https://developers.google.com/analytics/devguides/collection/ga4/views)、[Google 网站验证](https://support.google.com/webmasters/answer/9008080)、[Bing 网站验证](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b)。

## 2026-09-20 线上验收

- 已推送现有 GitHub 仓库 `zj870891544/games8090` 的 `master`，沿用并保留旧提交历史。
- 部署代码提交：`0fede8a`；Cloudflare Worker 版本：`fe5a64b9-c920-43c1-ba49-2a127697a9dc`。
- lint、TypeScript、59 项单元测试、production 构建通过；敏感值扫描通过，密码与测试产物未提交。
- 正式首页的 HTML head 已包含 Google、Bing 的真实验证标签；首页、游戏列表、robots、sitemap 均返回 HTTP 200。地图为合法 XML，当前只有首页符合已有审核策略。
- 浏览器授权前 GA 脚本数量为 0；授权后加载实际衡量 ID；撤回后重新打开页面脚本数量回到 0。列表仍首屏显示 60 张游戏卡片。
- GA 实时报告确认：1 位测试访客、3 次 page_view，Privacy、All games、Piece of Cake 各 1 次；另收到 game_card_click、game_start、first_visit、session_start。
- Google Search Console 的非 www 资源已通过 HTML 标签验证，站点地图已提交。报表首次显示“无法抓取”；重新提交后，在 17:19:22 的 Google 实际网址检查中确认“是否允许抓取：是；网页抓取：成功”。地图报表仍待平台重新处理，不等同于已完成收录。
- Bing 站点已通过标签验证，站点地图最终显示 Success：发现 1 个网址，0 错误、0 警告。
- 清理旧资源：Search Console 资源列表已确认仅保留非 www 的游戏站资源；当前验证标签仍用于此资源，继续保留。GA 仅确认新资源 `555091517`，尚未识别出旧站对应的资源，未删除其他站点的 GA 资源。
