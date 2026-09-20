export { CatalogSyncWorkflow } from "./lib/catalog-workflow";
import { recomputeRankings } from "./lib/services/ranking";
import handler from "vinext/server/app-router-entry";
import { isAdmin, sameOrigin, rateLimit } from "./lib/auth";
import { createProvider } from "./lib/providers/adapters";
import { defaultAssets, defaultFrames, origins } from "./lib/providers/config";
import { providerIds } from "./lib/types";
import { siteIntegrations } from "./lib/site-integrations";
export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const local = env.APP_ENV === "local";
    if (env.APP_ENV === "production") {
      const canonical = new URL(env.SITE_URL);
      if (url.hostname === `www.${canonical.hostname}`) {
        url.protocol = canonical.protocol;
        url.host = canonical.host;
        return Response.redirect(url, 308);
      }
    }
    if (!local && url.pathname.startsWith("/fixtures/"))
      return new Response("Not found", { status: 404 });
    if (
      (url.pathname.startsWith("/admin") && url.pathname !== "/admin/login") ||
      (url.pathname.startsWith("/api/admin/") &&
        url.pathname !== "/api/admin/login")
    ) {
      if (!(await isAdmin(request, env)))
        return url.pathname.startsWith("/api/")
          ? Response.json({ error: "请先登录管理后台" }, { status: 401 })
          : Response.redirect(new URL("/admin/login", url), 303);
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      if (!sameOrigin(request))
        return Response.json(
          { error: "不允许从其他网站提交此操作" },
          { status: 403 },
        );
      if (url.pathname.startsWith("/api/")) {
        const ip = request.headers.get("CF-Connecting-IP") || "local";
        const isLogin = url.pathname === "/api/admin/login";
        if (
          !(await rateLimit(
            env.DB,
            `${isLogin ? "login" : "api"}:${ip}`,
            isLogin ? 8 : 120,
            isLogin ? 900 : 60,
          ))
        )
          return Response.json(
            { error: "操作过于频繁，请稍后重试。" },
            { status: 429 },
          );
      }
    }
    const nonce = btoa(crypto.randomUUID());
    const analyticsOrigins = siteIntegrations(env).ga4Id
      ? " https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com"
      : "";
    const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${local ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' ${origins(env.PROVIDER_ASSET_ORIGINS, defaultAssets).join(" ")}${analyticsOrigins}; font-src 'self'; connect-src 'self'${local ? " ws://127.0.0.1:3000 ws://localhost:3000" : ""}${analyticsOrigins}; frame-src 'self' ${origins(env.PROVIDER_FRAME_ORIGINS, defaultFrames).join(" ")}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'`;
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", csp);
    const response = await handler.fetch(
      new Request(request, { headers }),
      env,
      ctx,
    );
    const secured = new Response(response.body, response);
    secured.headers.set("Content-Security-Policy", csp);
    secured.headers.set("X-Content-Type-Options", "nosniff");
    secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    secured.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    if (!local)
      secured.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/"))
      secured.headers.set("Cache-Control", "no-store");
    return secured;
  },
  async scheduled(
    _controller: ScheduledController,
    env: CloudflareEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      (async () => {
        if (env.APP_ENV === "local") return;
        for (const id of providerIds) {
          const adapter = createProvider(id, env);
          const p = await env.DB.prepare(
            "SELECT enabled FROM providers WHERE id=?",
          )
            .bind(id)
            .first<{ enabled: number }>();
          if (
            p?.enabled &&
            adapter.validateConfig().mode === "live" &&
            adapter.validateConfig().ready
          )
            try {
              if (env.CATALOG_SYNC)
                await env.CATALOG_SYNC.create({ params: { providerId: id } });
            } catch {
              /* Another job holds the provider lease; continue other providers. */
            }
        }
        await recomputeRankings(env.DB);
        await env.DB.prepare(
          "DELETE FROM rate_limits WHERE (key LIKE 'login:%' AND window<?) OR (key NOT LIKE 'login:%' AND window<?)",
        )
          .bind(
            Math.floor(Date.now() / 1000 / 900) - 192,
            Math.floor(Date.now() / 1000 / 60) - 2880,
          )
          .run();
      })(),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;
