# Games8090

HTML 小游戏集合站点，支持快速展示与管理多个独立小游戏页面。

## 目录结构

- `games/`: 各个独立小游戏 HTML 文件
- `index.html` + `index.css` + `index.js`: 首页（搜索、分类、卡片列表）
- `play.html` + `play.css` + `play.js`: 播放页（iframe 承载游戏）
- `games-data.js`: 游戏元数据（新增游戏主要改这里）
- `start-local.ps1`: 本地一键启动静态服务器

## 如何新增小游戏

1. 将新的 `.html` 文件放进 `games/`
2. 在 `games-data.js` 的 `GAMES` 数组追加一条记录：

```js
{
  name: "新游戏名称",
  file: "新游戏文件名.html",
  category: "puzzle",
  icon: "🎯",
  desc: "一句话描述"
}
```

`category` 建议使用：`puzzle`、`action`、`classic`、`casual`。

## 本地运行（推荐）

直接双击 `index.html` 也能打开，但部分浏览器在 `file://` 下会限制交互行为。
建议在项目根目录运行：

```powershell
.\start-local.ps1 -Port 8080
```

然后访问 `http://localhost:8080`。
