# 8090 · Midnight Arcade 设计验收

- Source visual truth: `/Users/a1111/.codex/generated_images/01a0bc78-f564-70d2-b025-b31ba089223d/exec-f0a3dbaf-3a3c-4859-89c2-6c0bd21c251b.png`（用户按展示顺序选择的第 2 张方案）。
- Implementation: `http://127.0.0.1:3001/`，现有生产应用的本地开发版本。
- CSS viewport: 1440 × 1024。源图 1487 × 1058；浏览器截图实际返回 1425 × 1013，截图工具缩放约 0.9896；最终比对将两者等比例归一到 1425 × 1013。
- State: 首页、默认深色、顶部；本地数据库 801 条已发布真实游戏，生产库数量不同，页面实时读取，不硬编码。最近游玩入口取决于本地历史。

## Comparison history

### 第一轮

- Evidence: `output/redesign/home-desktop-v1.png`，`output/redesign/comparison-v1.png`（源图与实现并列打开）。
- [P2] 首屏网格起点较源图低约 27 CSS px，标题字重与字宽偏弱。缩短标题行高、分类栏上下间距，使用更接近源图的 DM Sans 850 标题。
- [P2] 中间断点通过隐藏最后两个精选卡片维持网格，导致内容丢失。移除此规则，让所有精选游戏都在布局中。
- 修改后证据：`output/redesign/comparison-v2.png`，源图和实现归一后在同一张图片中并列查看；网格起点、比例、首屏内容密度已接近选定方案。

### 第二轮与最终复查

- 全图证据：`output/redesign/home-desktop-final.png`、`output/redesign/comparison-final.png`。首页顶部、默认深色、无搜索弹层。最近游玩显示实际最后启动的游戏，区别于源图的示例 2048。
- 细节证据：`output/redesign/header-comparison-final.png`，标题、分类栏及边线采用同一裁切区域上下比较。标题字形复用实际项目字体，并非源图中不可识别的精确字体；字宽的轻微差异为 P3，不影响层级和换行。
- 手机检查发现 [P2] `.player-inner` 的最小高度与宽高比让 339 px 容器内的播放器达到 462 px，标题和游戏画面右侧被裁切。显式设置 `width: 100%`，标题限制为父容器宽度并允许长词换行。
- 修复证据：`output/redesign/player-mobile-fixed.png`。播放器内宽现为 337 px，外框 339 px，完整标题分两行显示，无水平溢出。启动与超时提示的按钮均在容器内。
- 手机证据（CSS 390 × 844，截图 375 × 812）：`home-mobile.png`、`categories-mobile.png`、`catalog-mobile.png`、`player-mobile-fixed.png`。页面有效宽度与 scrollWidth 均为 375 px；底部导航可用，更多菜单 17 个分类完整可见。
- 平板证据（CSS 1024 × 900，截图 1009 × 887）：`home-tablet.png`。8 个右侧精选卡片全部保留，有效宽度与 scrollWidth 均为 1009 px。
- 最终无未解决的 P0/P1/P2 设计或响应式问题。上面的外部游戏加载验证限制单独列出，不据此声称已验证完整游戏内容。

## Production constraints

- 游戏名称、类别、封面和跳转全部来自现有已发布游戏库。设计稿生成的绿色赛车与 Merge Cars 实际游戏不符，使用发行商真实封面；其它卡片同样保留真实封面，不生成可能误导玩家的游戏截图。
- 字体复用现有 OFL Outfit、DM Sans；图标对照源图后使用现有 Lucide（首页、火焰、星光、网格、爱心、历史、搜索）。没有新增手绘 SVG 或 CSS 插画。
- 保留后台首页栏目设置和现有游戏权限流程；“全部游戏”的每批 60 条及连续加载保持不变。

## Required surfaces / interactions

- Fonts / typography: DM Sans 850 主标题、Outfit 品牌和其它现有字体保持清晰层级；截图确认字体已加载。长游戏名使用省略号与完整可访问名称，手机播放器标题能自然换行。源图字宽的细微差别为可接受 P3。
- Spacing / layout rhythm: 76 px 图标侧栏、80 px 顶栏、单个大推荐 + 4 × 2 卡片 + 下方 6 卡片，圆角、间距和首屏密度经全图/局部比较通过。小屏改为底部导航和双列网格。
- Colors / tokens: 石墨黑 #101113、荧光绿 #c2f477，与选定方案一致；后台样式保留。
- Image quality / fidelity: 使用清晰的真实发行商图片；首屏 15 张封面全部成功加载。
- Copy / content: 对应选定英文方案；真实数量、真实游戏、动态最近游玩。无虚构评分或访问人数。
- Desktop / tablet / mobile / keyboard / primary interactions: 搜索 2048 后方向键/回车进入详情；分类菜单和 Puzzle 跳转；Escape 关闭菜单且恢复焦点；收藏 2048 后收藏页显示；继续游玩显示最后启动的游戏；全部游戏从 60 条滚动续载到 120 条（120 个唯一链接），返回列表保留已加载数量。手机菜单与底部导航通过。
- Console: 首页、播放器和最终首页的浏览器捕获日志无 error/warn。

## Validation and limits

- `npm run lint`、`npm run typecheck`、`npm test` 通过（8 个文件，59 项测试）。
- 最终 CSS 修正后 `prettier --check`、`git diff --check` 与 `CLOUDFLARE_ENV=production npm run build` 通过。
- GamePix 的 2048 和 Playgama 的 Piece of Cake 在本地浏览器启动后都出现了第三方 iframe 加载超时；重试及关闭提示可用。Playgama 公共入口 HTTP 200，页面 CSP 已允许来源，但这些检查不能证明完整游戏能玩。本次未改动游戏来源、权限流程和 iframe 加载逻辑；完整实玩为残余验证缺口，不能以 UI 验收代替。
- 2026-09-20 设计验收阶段交付的是本地实现和预览；本报告的视觉证据来自本地。后续发布另行记录，生产数据库与 GA/GSC/Bing 配置未修改。

## Implementation checklist

- [x] 将用户选中的第 2 个方案落入现有应用。
- [x] 真实游戏封面、数据与搜索/收藏/分类/连续加载保留。
- [x] 桌面全图与细节比较、手机和平板检查。
- [x] 修复已发现的布局和裁切问题，重新截图。
- [x] 代码检查、测试与生产构建。
- [ ] 部署后另行验证第三方游戏完整实玩（不属于本地视觉验收结论）。

final result: passed
