# Games8090.online — HTML 小游戏集合网站

将现有的 17 个独立 HTML 小游戏文件整合为一个精美的游戏集合网站，支持便捷地添加新游戏。

## Proposed Changes

### 项目重构

#### [NEW] [games/](file:///d:/AICoding/Antigravity/games8090/games)
将所有游戏 HTML 文件移动到 `games/` 子目录中，保持主目录整洁。

---

### 首页（游戏列表页）

#### [NEW] [index.html](file:///d:/AICoding/Antigravity/games8090/index.html)
主页结构：
- **顶部导航栏**：网站 Logo + 名称 "Games8090"，搜索框
- **Hero 区域**：动态渐变背景 + 标题 + 游戏数量统计
- **分类筛选栏**：按游戏类型筛选（益智、动作、经典、休闲）
- **游戏卡片网格**：响应式瀑布流布局，每张卡片包含游戏缩略图/图标、名称、分类标签
- **底部**：版权信息 + 域名

#### [NEW] [index.css](file:///d:/AICoding/Antigravity/games8090/index.css)
设计系统：
- 暗色主题 + 霓虹色调渐变（深紫/蓝紫/青色）
- 游戏卡片悬停时发光动效 + 缩放
- Glassmorphism 风格卡片
- 完整移动端响应式（1-4列自适应）
- 流畅的 CSS 动画（卡片入场、hover 效果）

#### [NEW] [index.js](file:///d:/AICoding/Antigravity/games8090/index.js)
核心逻辑：
- **游戏目录 `GAMES` 数组**：集中管理所有游戏信息（名称、文件名、分类、图标 emoji、描述）。添加新游戏只需在此数组中追加一条记录
- 动态渲染游戏卡片
- 搜索功能：实时模糊匹配游戏名称
- 分类筛选功能
- 卡片交错入场动画

---

### 游戏播放页

#### [NEW] [play.html](file:///d:/AICoding/Antigravity/games8090/play.html)
通过 URL 参数 `?game=文件名` 加载对应游戏：
- 使用 `<iframe>` 全屏嵌入游戏 HTML
- 顶部工具栏：返回首页按钮 + 游戏名称 + 全屏按钮
- 自动适配 iframe 尺寸

---

## 如何添加新游戏

> [!TIP]
> 只需两步即可添加新游戏：
> 1. 将新的 `.html` 游戏文件放入 `games/` 目录
> 2. 在 `index.js` 的 `GAMES` 数组中添加一条记录：
> ```js
> { name: '新游戏', file: '新游戏.html', category: 'puzzle', icon: '🎮', desc: '游戏描述' }
> ```

## Verification Plan

### Browser Test
- 在浏览器中打开 `index.html`，验证：
  1. 首页正确显示所有 17 个游戏卡片
  2. 搜索框能实时过滤游戏
  3. 分类筛选正常工作
  4. 点击游戏卡片跳转到 `play.html?game=xxx`
  5. 游戏在 iframe 中正常加载运行
  6. 返回首页按钮正常工作
  7. 移动端响应式布局正确
