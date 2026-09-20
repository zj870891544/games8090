import { categorySlug, taxonomy } from "./normalize";

const categories: Record<string, string> = {
  Action: "动作",
  Adventure: "冒险",
  Arcade: "街机",
  Puzzle: "益智",
  Racing: "竞速",
  Driving: "驾驶",
  Sports: "体育",
  Shooter: "射击",
  Strategy: "策略",
  Simulation: "模拟",
  Casual: "休闲",
  Multiplayer: "多人",
  "2 Player": "双人",
  Platform: "平台跳跃",
  ".io": "在线竞技",
  Horror: "恐怖",
  Card: "纸牌",
  Board: "棋盘",
  Kids: "儿童",
  Educational: "教育",
  "Dress Up": "装扮",
  Cooking: "烹饪",
};
const labels: Record<string, string> = {
  published: "已发布",
  draft: "草稿",
  unavailable: "暂不可用",
  index: "允许收录",
  noindex: "不允许收录",
  active: "可用",
  inactive: "已停用",
  enabled: "已启用",
  disabled: "已禁用",
  pending: "待审核",
  running: "同步中",
  success: "同步成功",
  partial: "部分目录已同步",
  failed: "同步失败",
  skipped: "已跳过",
  fixture: "演示数据",
  live: "真实目录",
  blocked: "配置不完整",
  merged: "已合并",
  separate: "保留为不同游戏",
  ignored: "已忽略",
  non_exclusive: "非独占",
  exclusive: "独占",
  auto: "自动选择",
  manual: "手动指定",
  recent: "继续游玩",
  popular: "热门程度",
  trending: "近期热度",
  new: "最新导入",
  quality: "综合质量",
};
export function adminCategory(value: string) {
  return categories[value] || value;
}
export function categoryFromAdmin(value: string) {
  return (
    Object.entries(categories).find(([, label]) => label === value)?.[0] ||
    value
  );
}
export function adminLabel(value: string) {
  if (value.startsWith("category:")) {
    const category = taxonomy.find((t) => categorySlug(t) === value.slice(9));
    return `分类：${category ? adminCategory(category) : "未识别分类"}`;
  }
  return labels[value] || value;
}
const sectionTitles: Record<string, string> = {
  "Jump back in": "继续游玩",
  "Trending now": "近期热门",
  "Fresh off the press": "最新游戏",
  "The crowd favorites": "大家都在玩",
  "A little break, a great game": "休闲小游戏",
  "Better together": "多人游戏",
  "Bring your player two": "双人游戏",
  "Give your brain a playground": "益智游戏",
  "Find your next gear": "竞速游戏",
  "Straight into the action": "动作游戏",
  "Make your next move": "体育游戏",
};
export const adminSectionTitle = (value: string) =>
  sectionTitles[value] || value;
export const adminDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("zh-CN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Shanghai",
      })
    : "暂无记录";

const messages: Record<string, string> = {
  "Provider request failed.": "无法读取供应商目录，请检查网络和接口地址。",
  "Provider request timed out.": "读取供应商目录超时，请稍后重试。",
  "Provider data validation failed.":
    "供应商目录字段未通过校验，请检查数据结构和字段映射。",
  "Provider configuration is incomplete.":
    "供应商接入配置不完整，请先补全所需参数。",
  "URL origin is not configured. Review provider allowlists.":
    "目录中包含尚未允许的游戏或图片域名，请核实后添加到允许列表。",
  "Development samples, not licensed catalog data.":
    "当前使用演示数据，尚未读取真实游戏目录。",
  "Complete server-side credentials before syncing.":
    "请先补全服务端接入配置，再同步游戏目录。",
  "Live feed; verify account schema, attribution and contract before publication.":
    "已配置真实目录。首次同步后请核对游戏内容、收益归因和授权协议。",
  "Discovery rankings refreshed from provider rank and local engagement.":
    "已根据供应商排名和本站互动数据重新计算游戏排名。",
  "Provider configuration saved.": "供应商设置已保存。",
  "Game updated. Canonical URL preserved.":
    "游戏已保存，原有游戏网址保持不变。",
  "Source settings saved. Higher manual priority is preferred.":
    "来源设置已保存，手动优先级较高的来源会优先使用。",
  "Merged sources into the left canonical game. Its URL is preserved.":
    "已将全部来源合并到左侧游戏，并保留左侧游戏网址。",
  "Review decision saved.": "审核结果已保存。",
  "Homepage section saved.": "首页栏目设置已保存。",
  "Category indexing preference saved. Sitemap inclusion also requires indexable games.":
    "分类收录设置已保存。该分类下还需有允许收录的真实游戏，才会进入站点地图。",
  "Sync failed. Review Sync Logs for configuration details.":
    "同步失败，请到同步日志查看原因并检查接入配置。",
  "Indexing requires a real published game, 120+ characters of editorial value, controls, instructions and categories.":
    "开放收录需满足：真实且已发布的游戏、至少 120 个字符的编辑介绍，以及完整的操作方式、玩法说明和分类。",
  "Override must preserve the publisher attribution identifier.":
    "替换地址必须保留原有的收益归因标识。",
  "Candidate has already been resolved.": "此重复游戏候选已处理，请刷新页面。",
  "A pinned slug is missing or not published.":
    "某个置顶游戏标识不存在，或对应游戏尚未发布。",
  "Use up to 30 unique game slugs.":
    "最多填写 30 个不同的游戏标识，请移除重复项。",
  "Source not found.": "未找到此游戏来源。",
  "Game not found.": "未找到此游戏。",
  "Reachability checks apply only to live provider sources.":
    "网络连通性检查仅适用于真实游戏来源。",
  "Unknown action.": "无法识别此操作。",
  "Provider is disabled or a sync is already running":
    "此供应商已禁用，或已有同步任务正在运行。",
  "Games already share a canonical identity": "这两个来源已经属于同一款游戏。",
  "Game no longer exists": "该游戏已不存在，请刷新页面。",
  "Background sync binding is missing.":
    "未配置后台同步服务，请检查工作流绑定。",
  "Use Cloudflare Access to sign in.":
    "请通过 Cloudflare Access 访问验证登录。",
  "Admin secrets are not configured.": "尚未配置管理员密码或会话密钥。",
  "Incorrect password.": "管理员密码错误，请重新输入。",
  "Please check the submitted fields.": "请检查表单内容后重试。",
  "Exact title and verified matching developer":
    "名称完全一致，且开发者信息高度匹配。",
  "Very close title, same developer, and matching description":
    "名称高度相似、开发者相同，且介绍内容匹配。",
  "Similar title; developer missing or different. Manual review required.":
    "名称相似，但开发者信息缺失或不同，需要人工审核。",
  "Similar title; insufficient corroborating metadata.":
    "名称相似，但其他信息不足以确认是同一款游戏。",
  "Previous sync exceeded its lease; review before retrying.":
    "上次同步超时，请检查任务记录后重试。",
  "Lease expired before completion; next sync can resume source upserts.":
    "上次同步在完成前超时，下次同步可继续更新已有来源。",
  "Feed validation or import failed. Check mappings, permitted origins, attribution, and catalog completeness.":
    "目录校验或导入失败，请检查字段映射、允许的域名、归因参数和目录完整性。",
  "Background sync failed after retries. Check feed mappings, origins and account configuration; successful source upserts are retained.":
    "后台同步重试后仍失败，请检查目录字段、允许的域名及账号配置。此前成功更新的来源已保留。",
};
export function adminMessage(value: string | null | undefined): string {
  if (!value) return "";
  if (messages[value]) return messages[value];
  const queued = value.match(
    /^Background sync queued \(([^)]+)\)\. Refresh this page for progress\.$/,
  );
  if (queued) return `后台同步已排队（${queued[1]}），刷新本页可查看进度。`;
  const http = value.match(/^Provider returned HTTP (\d+)$/);
  if (http)
    return `供应商接口返回网络错误（${http[1]}），请检查接口地址和账号权限。`;
  if (value.startsWith("Missing configuration:"))
    return `缺少接入配置：${value.slice(22).trim()}`;
  const health = value.match(
    /^HTTP (\d+|unreachable)\. This does not verify gameplay\.$/,
  );
  if (health)
    return `网络检查结果：${health[1] === "unreachable" ? "无法访问" : health[1]}。此结果不能证明游戏正常运行。`;
  const sync = value.match(
    /^Sync (\w+): (\d+) received, (\d+) new sources, (\d+) updated\.$/,
  );
  if (sync)
    return `${adminLabel(sync[1])}：收到 ${sync[2]} 条，新增 ${sync[3]} 个来源，更新 ${sync[4]} 个来源。`;
  return "操作未完成，请检查表单、供应商配置和允许访问的域名。";
}
