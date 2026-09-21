import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { desc, eq, like, sql } from "drizzle-orm";
import { ShieldCheck, ArrowUpRight, Info } from "lucide-react";
import { getDb, getEnv, getBinding } from "../../../lib/db/client";
import * as s from "../../../lib/db/schema";
import { getProviders, getContracts } from "../../../lib/db/repository";
import { isAdmin } from "../../../lib/auth";
import { createProvider } from "../../../lib/providers/adapters";
import { providerNames } from "../../../lib/providers/config";
import { taxonomy, categorySlug } from "../../../lib/normalize";
import type { ProviderId } from "../../../lib/types";
import { siteIntegrations } from "../../../lib/site-integrations";
import {
  adminLabel,
  adminMessage,
  adminCategory,
  adminDate,
  adminSectionTitle,
} from "../../../lib/admin-language";
const navigation = [
  ["", "运营概览"],
  ["providers", "游戏供应商"],
  ["games", "游戏管理"],
  ["dedupe", "重复游戏审核"],
  ["curation", "首页编排"],
  ["health", "异常来源检查"],
  ["seo", "搜索收录管理"],
  ["sync", "同步日志"],
];
export const metadata = {
  title: "管理后台",
  robots: { index: false, follow: false },
};
function Input({
  name,
  label,
  value = "",
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input name={name} defaultValue={value} type={type} required={required} />
    </label>
  );
}
function Textarea({
  name,
  label,
  value = "",
  rows = 4,
}: {
  name: string;
  label: string;
  value?: string;
  rows?: number;
}) {
  return (
    <label>
      {label}
      <textarea name={name} defaultValue={value} rows={rows} />
    </label>
  );
}
function Check({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="check-label">
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );
}
function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={value}>
        {options.map((o) => (
          <option value={o} key={o}>
            {adminLabel(o)}
          </option>
        ))}
      </select>
    </label>
  );
}
function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
function Status({ value }: { value: string }) {
  return (
    <span
      className={`status-pill ${["failed", "partial", "blocked", "noindex", "pending", "fixture"].includes(value) ? "warning" : ""}`}
    >
      {adminLabel(value)}
    </span>
  );
}
const date = adminDate;
export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<{
    q?: string;
    notice?: string;
    error?: string;
    page?: string;
  }>;
}) {
  const { path = [] } = await params;
  const current = path.join("/");
  const query = await searchParams;
  const env = getEnv();
  const requestHeaders = await headers();
  const authenticated = await isAdmin(
    new Request(env.SITE_URL, { headers: requestHeaders }),
    env,
  );
  if (current === "login") {
    if (authenticated) redirect("/admin");
    return (
      <div className="page">
        <section className="admin-panel login-panel">
          <span className="eyebrow">
            <ShieldCheck size={15} /> 8090 管理后台
          </span>
          <h1>登录管理后台</h1>
          <p>在这里管理游戏、配置供应商、编排首页并查看同步状态。</p>
          {query.error && (
            <div className="flash error" role="alert">
              {adminMessage(query.error)}
            </div>
          )}
          {env.ACCESS_TEAM_DOMAIN || env.ACCESS_AUD ? (
            <p>请通过已配置的 Cloudflare Access 访问验证登录。</p>
          ) : (
            <form method="post" action="/api/admin/login">
              <label>
                管理员密码
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="button primary" type="submit">
                登录后台 <ArrowUpRight size={16} />
              </button>
            </form>
          )}
          <p className="admin-note">
            {env.APP_ENV === "local"
              ? "本地管理员密码保存在项目的 .dev.vars 文件中。"
              : "仅限本站管理员访问。"}
          </p>
        </section>
      </div>
    );
  }
  if (!authenticated) redirect("/admin/login");
  if (!navigation.some(([p]) => p === current)) notFound();
  const db = getDb();
  let content: React.ReactNode;
  if (current === "") {
    const [totals, pending, runs, starts] = await Promise.all([
      db
        .select({
          count: sql<number>`count(*)`,
          indexable: sql<number>`sum(case when index_status='index' then 1 else 0 end)`,
        })
        .from(s.games)
        .get(),
      db
        .select({ count: sql<number>`count(*)` })
        .from(s.dedupeCandidates)
        .where(eq(s.dedupeCandidates.status, "pending"))
        .get(),
      db.select().from(s.syncRuns).orderBy(desc(s.syncRuns.startedAt)).limit(8),
      db
        .select({ count: sql<number>`coalesce(sum(count),0)` })
        .from(s.gameMetricsDaily)
        .where(eq(s.gameMetricsDaily.event, "game_start"))
        .get(),
    ]);
    content = (
      <>
        <div className="stat-grid">
          {[
            ["独立游戏总数", totals?.count || 0],
            ["允许收录的页面", totals?.indexable || 0],
            ["待审核的重复游戏", pending?.count || 0],
            ["本站记录的游戏启动次数", starts?.count || 0],
          ].map(([label, count]) => (
            <div className="stat" key={label}>
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
        <div className="admin-panel">
          <h2>管理游戏内容与收录质量</h2>
          <form method="post" action="/api/admin/ranking">
            <button className="button">重新计算游戏排名</button>
          </form>
          <p>
            新导入的游戏默认不允许搜索引擎收录。补充有价值的编辑介绍并核实操作方式后，再开放收录。演示数据只在本地环境显示。
          </p>
          <div className="button-row">
            <Link className="button primary" href="/admin/providers">
              管理供应商
            </Link>
            <Link className="button" href="/admin/dedupe">
              审核重复游戏
            </Link>
            <Link className="button" href="/admin/seo">
              管理搜索收录
            </Link>
          </div>
        </div>
        <div className="admin-panel">
          <h2>最近同步记录</h2>
          <SyncTable runs={runs} />
        </div>
      </>
    );
  } else if (current === "providers") {
    const [providers, contracts, runs] = await Promise.all([
      getProviders(),
      getContracts(),
      db
        .select()
        .from(s.syncRuns)
        .orderBy(desc(s.syncRuns.startedAt))
        .limit(200),
    ]);
    content = (
      <>
        <div className="health-note">
          <Info size={16} /> 接入凭据保存在服务端配置中，本页仅显示接入状态。
        </div>
        <div className="provider-grid">
          {providers.map((p) => {
            const state = createProvider(
                p.id as ProviderId,
                env,
              ).validateConfig(),
              contract = contracts.find((c) => c.providerId === p.id),
              run = runs.find((r) => r.providerId === p.id);
            return (
              <section className="admin-panel" key={p.id}>
                <div className="provider-summary">
                  <h2>{p.name}</h2>
                  <Status value={state.mode} />
                </div>
                <p>{adminMessage(state.note)}</p>
                {state.missing.length > 0 && (
                  <p>
                    <strong>缺少配置：</strong>{" "}
                    <code>
                      {state.missing
                        .map((name) => adminCategory(name || ""))
                        .join("，")}
                    </code>
                  </p>
                )}
                <p className="admin-note">上次同步： {date(p.lastSyncAt)}</p>
                <div className="provider-stats">
                  {[
                    ["收到条目", run?.received || 0],
                    ["新增来源", run?.inserted || 0],
                    ["更新来源", run?.updated || 0],
                    ["本轮未发现", run?.missing || 0],
                    ["错误数", run?.errors || 0],
                    ["运行状态", run?.status || "尚未运行"],
                  ].map(([label, v]) => (
                    <div key={label}>
                      <strong>
                        {typeof v === "string" ? adminLabel(v) : v}
                      </strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <form method="post" action="/api/admin/sync">
                  <Hidden name="provider" value={p.id} />
                  <button
                    type="submit"
                    className="button primary"
                    disabled={!state.ready || !p.enabled}
                  >
                    同步 {p.name}
                  </button>
                  {p.syncLock && <Status value="running" />}
                </form>
                <details className="source-form">
                  <summary>供应商与协议设置</summary>
                  <form
                    method="post"
                    action="/api/admin/provider"
                    style={{ display: "block", marginTop: 20 }}
                  >
                    <Hidden name="provider" value={p.id} />
                    <Check
                      name="enabled"
                      label="启用此供应商"
                      checked={p.enabled}
                    />
                    <Check
                      name="contractEnabled"
                      label="允许按此协议选择游戏来源"
                      checked={contract?.enabled || false}
                    />
                    <Input
                      name="priority"
                      label="供应商优先级（数字越大越优先）"
                      value={p.priority}
                      type="number"
                    />
                    <Select
                      name="exclusivity"
                      label="协议独占方式"
                      value={contract?.exclusivity || "non_exclusive"}
                      options={["non_exclusive", "exclusive"]}
                    />
                    <Textarea
                      name="notes"
                      label="协议备注（请勿填写密钥）"
                      value={contract?.notes || ""}
                      rows={2}
                    />
                    <button className="button">保存供应商设置</button>
                  </form>
                </details>
              </section>
            );
          })}
        </div>
      </>
    );
  } else if (current === "games") {
    const page = Math.max(1, Number(query.page) || 1);
    const games = await db
      .select()
      .from(s.games)
      .where(
        query.q ? like(s.games.title, `%${query.q.slice(0, 100)}%`) : undefined,
      )
      .orderBy(s.games.title)
      .limit(21)
      .offset((page - 1) * 20);
    content = (
      <>
        <form className="admin-search" action="/admin/games">
          <input
            name="q"
            type="search"
            defaultValue={query.q || ""}
            placeholder="输入游戏名称"
            aria-label="搜索游戏目录"
          />
          <button className="button primary">搜索</button>
        </form>
        {await Promise.all(
          games.slice(0, 20).map(async (g) => {
            const [sources, cats] = await Promise.all([
              db
                .select()
                .from(s.gameSources)
                .where(eq(s.gameSources.gameId, g.id))
                .orderBy(desc(s.gameSources.manualPriority)),
              db
                .select()
                .from(s.gameCategories)
                .where(eq(s.gameCategories.gameId, g.id)),
            ]);
            return (
              <details
                className="admin-panel"
                key={g.id}
                open={Boolean(query.q)}
              >
                <summary>
                  {g.title} <Status value={g.indexStatus} />
                </summary>
                <p>
                  <Link href={`/game/${g.slug}`} target="_blank">
                    /game/{g.slug} ↗
                  </Link>{" "}
                  · {sources.length} 个来源
                  {g.isFixture ? " · 演示数据" : ""}
                </p>
                <form method="post" action="/api/admin/game">
                  <Hidden name="id" value={g.id} />
                  <div className="form-grid">
                    <Input
                      name="title"
                      label="游戏名称"
                      value={g.title}
                      required
                    />
                    <Input
                      name="categories"
                      label="游戏分类（可填写中文，以逗号分隔）"
                      value={cats
                        .map((c) =>
                          taxonomy.find(
                            (t) => categorySlug(t) === c.categoryId,
                          ),
                        )
                        .map((name) => adminCategory(name || ""))
                        .join("，")}
                    />
                    <div className="full">
                      <Textarea
                        name="description"
                        label="原始介绍"
                        value={g.description}
                      />
                      <Textarea
                        name="editorial"
                        label="编辑介绍（补充真实、有用的内容）"
                        value={g.editorialDescription}
                      />
                      <Textarea
                        name="howToPlay"
                        label="玩法说明"
                        value={g.howToPlay}
                      />
                      <Textarea
                        name="controls"
                        label="已核实的操作方式"
                        value={g.controls}
                      />
                    </div>
                    <Select
                      name="publishStatus"
                      label="发布状态"
                      value={g.publishStatus}
                      options={["published", "draft", "unavailable"]}
                    />
                    <Select
                      name="indexStatus"
                      label="搜索引擎收录"
                      value={g.indexStatus}
                      options={["noindex", "index"]}
                    />
                  </div>
                  <Check
                    name="featured"
                    label="设为精选游戏"
                    checked={g.featured}
                  />
                  <button className="button primary" type="submit">
                    保存游戏
                  </button>
                </form>
                <h3 className="source-form">可用游戏来源</h3>
                <p>
                  手动优先级数字越大越优先；留空则使用供应商优先级。停用设置在后续同步时仍会保留。替换地址必须保留原有收益归因参数。
                </p>
                {sources.map((source) => (
                  <form
                    key={source.id}
                    className="source-form"
                    method="post"
                    action="/api/admin/source"
                  >
                    <Hidden name="id" value={source.id} />
                    <div className="source-meta">
                      <strong>
                        {providerNames[source.providerId as ProviderId]} ·{" "}
                        {source.sourceTitle}
                      </strong>
                      <Status
                        value={
                          source.isActive && !source.manuallyDisabled
                            ? "active"
                            : "inactive"
                        }
                      />
                    </div>
                    <div className="form-grid">
                      <Input
                        name="priority"
                        label={`${providerNames[source.providerId as ProviderId]} 手动优先级`}
                        value={source.manualPriority ?? ""}
                        type="number"
                      />
                      <Input
                        name="override"
                        label="替换游戏嵌入地址（须经供应商允许）"
                        value={source.overrideUrl || ""}
                      />
                    </div>
                    <Check
                      name="disabled"
                      label="停用此来源"
                      checked={source.manuallyDisabled}
                    />
                    <p className="admin-note">
                      最近发现： {date(source.lastSeenAt)} · 连续未发现轮数：{" "}
                      {source.missingCycles}
                    </p>
                    <button className="button" type="submit">
                      保存来源设置
                    </button>
                  </form>
                ))}
              </details>
            );
          }),
        )}
        {games.length === 0 && (
          <div className="admin-empty">
            没有找到匹配的游戏。可先到供应商页面同步游戏目录。
          </div>
        )}
        <div className="pagination">
          {page > 1 && (
            <Link
              className="button"
              href={`/admin/games?q=${encodeURIComponent(query.q || "")}&page=${page - 1}`}
            >
              上一页
            </Link>
          )}
          {games.length > 20 && (
            <Link
              className="button"
              href={`/admin/games?q=${encodeURIComponent(query.q || "")}&page=${page + 1}`}
            >
              下一页
            </Link>
          )}
        </div>
      </>
    );
  } else if (current === "dedupe") {
    const candidates = await db
      .select()
      .from(s.dedupeCandidates)
      .where(eq(s.dedupeCandidates.status, "pending"))
      .orderBy(desc(s.dedupeCandidates.confidence))
      .limit(50);
    content = (
      <>
        <div className="admin-panel">
          <h2>同名游戏不一定是同一款游戏</h2>
          <p>
            请对照两侧游戏信息。合并后保留左侧游戏的网址，迁移右侧的全部来源和统计，并将已有的右侧网址跳转到左侧。
          </p>
        </div>
        {await Promise.all(
          candidates.map(async (c) => {
            const sources = await Promise.all(
              [c.sourceA, c.sourceB].map((id) =>
                db
                  .select({ source: s.gameSources, slug: s.games.slug })
                  .from(s.gameSources)
                  .innerJoin(s.games, eq(s.gameSources.gameId, s.games.id))
                  .where(eq(s.gameSources.id, id))
                  .get(),
              ),
            );
            return (
              <section className="admin-panel" key={c.id}>
                <h3>{Math.round(c.confidence * 100)}% 匹配置信度</h3>
                <p>{adminMessage(c.reason)}</p>
                <div className="dedupe-pair">
                  {sources.map(
                    (v, i) =>
                      v && (
                        <div className="dedupe-card" key={v.source.id}>
                          <img
                            src={v.source.thumbnailUrl}
                            alt=""
                            width="640"
                            height="360"
                            loading="lazy"
                          />
                          <small>
                            {i === 0 ? "保留此游戏的网址" : "合并到左侧游戏"} ·{" "}
                            {v.source.providerId}
                          </small>
                          <h3>{v.source.sourceTitle}</h3>
                          <p>开发者： {v.source.sourceDeveloper || "未提供"}</p>
                          <p>{v.source.sourceDescription}</p>
                          <a href={`/game/${v.slug}`}>/game/{v.slug} ↗</a>
                        </div>
                      ),
                  )}
                </div>
                <form
                  className="button-row"
                  method="post"
                  action="/api/admin/dedupe"
                >
                  <Hidden name="id" value={c.id} />
                  <button
                    className="button primary"
                    name="decision"
                    value="merge"
                  >
                    合并到左侧游戏
                  </button>
                  <button className="button" name="decision" value="separate">
                    保留为不同游戏
                  </button>
                  <button className="button" name="decision" value="ignored">
                    忽略此候选
                  </button>
                </form>
              </section>
            );
          }),
        )}
        {!candidates.length && (
          <div className="admin-panel admin-empty">
            当前没有待审核的重复游戏。
          </div>
        )}
      </>
    );
  } else if (current === "curation") {
    const sections = await db
      .select()
      .from(s.homepageSections)
      .orderBy(s.homepageSections.position);
    content = (
      <>
        <div className="admin-panel">
          <h2>编排首页展示内容</h2>
          <p>
            自动栏目按排名展示，并优先显示置顶游戏；手动栏目只展示指定游戏。请按展示顺序填写游戏网址末尾的标识。“继续游玩”使用当前浏览器的游玩记录。
          </p>
        </div>
        {await Promise.all(
          sections.map(async (section) => {
            const pins = await db
              .select({ slug: s.games.slug })
              .from(s.homepageSectionGames)
              .innerJoin(s.games, eq(s.homepageSectionGames.gameId, s.games.id))
              .where(eq(s.homepageSectionGames.sectionId, section.id))
              .orderBy(s.homepageSectionGames.position);
            return (
              <details className="admin-panel" key={section.id}>
                <summary>
                  {section.position + 1}. {adminSectionTitle(section.title)}{" "}
                  <Status value={section.enabled ? "enabled" : "disabled"} />
                </summary>
                <form method="post" action="/api/admin/curation">
                  <Hidden name="id" value={section.id} />
                  <div className="form-grid">
                    <Input
                      name="title"
                      label="前台栏目标题（保存后同步修改前台）"
                      value={section.title}
                    />
                    <Input
                      name="position"
                      label="展示顺序（数字越小越靠前）"
                      value={section.position}
                      type="number"
                    />
                    <Select
                      name="kind"
                      label="内容选择方式"
                      value={section.kind}
                      options={["auto", "manual"]}
                    />
                    <Select
                      name="rule"
                      label="自动排序或游戏分类"
                      value={section.rule}
                      options={[
                        "recent",
                        "popular",
                        "trending",
                        "new",
                        "quality",
                        ...taxonomy.map((t) => `category:${categorySlug(t)}`),
                      ]}
                    />
                    <Input
                      name="limit"
                      label="展示游戏数量（1–24）"
                      value={section.limit}
                      type="number"
                    />
                    <Check
                      name="enabled"
                      label="显示此栏目"
                      checked={section.enabled}
                    />
                  </div>
                  <Textarea
                    name="pins"
                    label="置顶游戏标识（每行一个，按展示顺序填写）"
                    value={pins.map((p) => p.slug).join("\n")}
                  />
                  <button className="button primary">保存栏目设置</button>
                </form>
              </details>
            );
          }),
        )}
      </>
    );
  } else if (current === "health") {
    const rows = await getBinding()
      .prepare(
        `SELECT h.*,s.provider_id,s.game_id,s.is_active,s.manually_disabled,s.missing_cycles,g.title,g.slug FROM game_sources s JOIN games g ON g.id=s.game_id LEFT JOIN game_health h ON h.source_id=s.id ORDER BY (coalesce(h.fallback_events,0)*5 + CASE WHEN h.http_status>=400 OR h.http_status=0 THEN 10 ELSE 0 END + s.missing_cycles*10) DESC LIMIT 100`,
      )
      .all<{
        source_id: string;
        title: string;
        slug: string;
        provider_id: string;
        http_status: number | null;
        iframe_attempts: number;
        iframe_loads: number;
        fallback_events: number;
        missing_cycles: number;
        last_reachability_at: string | null;
      }>();
    content = (
      <>
        <div className="admin-panel">
          <h2>检查异常信号，不能据此认定游戏正常</h2>
          <p>
            网络响应只能说明地址可访问，嵌入页面加载完成也不能证明游戏正常运行。请结合切换来源次数、连续未发现轮数和网络错误，再决定是否停用。
          </p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "游戏 / 来源",
                  "网络响应",
                  "加载尝试 / 页面加载完成",
                  "切换来源次数",
                  "连续未发现轮数",
                  "检查操作",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.results.map((r) => (
                <tr key={r.source_id}>
                  <td>
                    <Link
                      href={`/admin/games?q=${encodeURIComponent(r.title)}`}
                    >
                      <strong>{r.title}</strong>
                      <br />
                      {r.provider_id}
                    </Link>
                  </td>
                  <td>{r.http_status ?? "尚未检查"}</td>
                  <td>
                    {r.iframe_attempts || 0} / {r.iframe_loads || 0}
                  </td>
                  <td>{r.fallback_events || 0}</td>
                  <td>{r.missing_cycles}</td>
                  <td>
                    <form method="post" action="/api/admin/health">
                      <Hidden name="id" value={r.source_id} />
                      <button className="button">检查网络连通性</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  } else if (current === "seo") {
    const integrations = siteIntegrations(env);
    const [games, cats] = await Promise.all([
      db.select().from(s.games).orderBy(desc(s.games.qualityScore)).limit(100),
      db.select().from(s.categories),
    ]);
    content = (
      <>
        <div className="admin-panel">
          <h2>访问统计与站长平台</h2>
          <p>正式网址：{env.SITE_URL} · 站点地图：{env.SITE_URL}/sitemap.xml</p>
          <p>Google Analytics：{integrations.ga4Id ? `已配置 ${integrations.ga4Id}，访客允许访问统计后生效` : "未启用（需要正式环境和 GA4 衡量 ID）"}</p>
          <p>Google Search Console：{integrations.google ? "验证标签已配置" : "未配置验证标签"}</p>
          <p>Bing 网站管理员工具：{integrations.bing ? "验证标签已配置" : "未配置验证标签"}</p>
          <p>验证标签是否已通过审核、站点地图抓取和实际收录进度，请在对应平台查看。</p>
          <div className="button-row">
            <a className="button" href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">打开谷歌统计 ↗</a>
            <a className="button" href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(`${env.SITE_URL}/`)}`} target="_blank" rel="noopener noreferrer">打开谷歌站长平台 ↗</a>
            <a className="button" href={`https://www.bing.com/webmasters/home?siteUrl=${encodeURIComponent(`${env.SITE_URL}/`)}`} target="_blank" rel="noopener noreferrer">打开必应站长平台 ↗</a>
          </div>
        </div>
        <div className="admin-panel">
          <h2>有质量的内容才开放搜索收录</h2>
          <p>
            建议先精选 500–1,000
            款真实游戏。所有导入内容默认不开放收录；只有已发布的真实游戏，补全编辑介绍、玩法说明和已核实的操作方式后，才可开放收录。不得虚构评分、开发者或发布日期。
          </p>
          <p>
            <Link className="button" href="/sitemap.xml" target="_blank">
              查看站点地图 ↗
            </Link>
          </p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>游戏</th>
                <th>发布状态</th>
                <th>收录状态</th>
                <th>编辑介绍</th>
                <th>审核操作</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td>
                    <strong>{g.title}</strong>
                    {g.isFixture && " · 演示数据"}
                  </td>
                  <td>{adminLabel(g.publishStatus)}</td>
                  <td>
                    <Status value={g.indexStatus} />
                  </td>
                  <td>{g.editorialDescription.length} 个字符</td>
                  <td>
                    <Link
                      className="button"
                      href={`/admin/games?q=${encodeURIComponent(g.title)}`}
                    >
                      编辑并审核
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-panel">
          <h2>分类页面收录设置</h2>
          <p>
            分类下还需至少有一款允许收录的真实游戏，该分类才会进入站点地图。
          </p>
          <div className="form-grid">
            {cats.map((c) => (
              <form
                action="/api/admin/category"
                method="post"
                className="button-row"
                key={c.id}
              >
                <Hidden name="id" value={c.id} />
                <Check
                  name="indexable"
                  label={adminCategory(c.name)}
                  checked={c.indexable}
                />
                <button className="button">保存</button>
              </form>
            ))}
          </div>
        </div>
      </>
    );
  } else {
    const runs = await db
      .select()
      .from(s.syncRuns)
      .orderBy(desc(s.syncRuns.startedAt))
      .limit(100);
    content = (
      <div className="admin-panel">
        <h2>同步任务记录</h2>
        <p>
          只有连续三次完整同步成功后仍未发现的来源，才会自动停用。失败或部分目录的同步不会增加未发现轮数。
        </p>
        <SyncTable runs={runs} />
      </div>
    );
  }
  return (
    <div className="page admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">8090 / 管理后台</p>
          <h1>{navigation.find(([p]) => p === current)?.[1]}</h1>
          <p>管理游戏内容、来源与运营状态。</p>
        </div>
        <form method="post" action="/api/admin/logout">
          <button className="button">退出登录</button>
        </form>
      </div>
      <nav className="admin-nav" aria-label="后台功能导航">
        {navigation.map(([p, label]) => (
          <Link
            key={p}
            href={`/admin${p ? `/${p}` : ""}`}
            className={p === current ? "active" : ""}
          >
            {label}
          </Link>
        ))}
      </nav>
      {getEnv().STATIC_PUBLIC_SITE === "true" && (
        <div className="flash" role="status">
          网站采用静态发布。游戏、来源、首页编排和收录设置保存后，会在下次网站发布时生效。
        </div>
      )}
      {query.notice && (
        <div className="flash" role="status">
          {adminMessage(query.notice)}
        </div>
      )}
      {query.error && (
        <div className="flash error" role="alert">
          {adminMessage(query.error)}
        </div>
      )}
      {content}
    </div>
  );
}
function SyncTable({ runs }: { runs: (typeof s.syncRuns.$inferSelect)[] }) {
  return runs.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {[
              "供应商",
              "开始时间（北京时间）",
              "状态 / 数据模式",
              "收到条目",
              "新增来源",
              "更新来源",
              "本轮未发现",
              "错误数",
            ].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} data-run-id={r.id}>
              <td>
                <strong>{providerNames[r.providerId as ProviderId]}</strong>
              </td>
              <td>{date(r.startedAt)}</td>
              <td>
                <Status value={r.status} />
                <br />
                {adminLabel(r.mode)}
              </td>
              <td>{r.received}</td>
              <td>{r.inserted}</td>
              <td>{r.updated}</td>
              <td>{r.missing}</td>
              <td title={adminMessage(r.errorSummary) || undefined}>
                {r.errors}
                {r.errorSummary && <p>{adminMessage(r.errorSummary)}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="admin-empty">
      暂无同步记录，请先到“游戏供应商”页面发起同步。
    </div>
  );
}
