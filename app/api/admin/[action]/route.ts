import { getEnv } from "../../../../lib/db/client";
import {
  isAdmin,
  sameOrigin,
  safeEqual,
  createSession,
  cookieName,
} from "../../../../lib/auth";
import { adminMutation } from "../../../../lib/services/admin";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const env = getEnv();
  const { action } = await params;
  if (!sameOrigin(request))
    return Response.json(
      { error: "不允许从其他网站提交此操作" },
      { status: 403 },
    );
  if (Number(request.headers.get("content-length")) > 64000)
    return new Response("提交内容过大", { status: 413 });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("表单格式不正确", { status: 400 });
  }
  const redirect = (path: string, cookie?: string) =>
    new Response(null, {
      status: 303,
      headers: {
        Location: new URL(path, request.url).href,
        ...(cookie ? { "Set-Cookie": cookie } : {}),
        "Cache-Control": "no-store",
      },
    });
  const secure = env.APP_ENV === "local" ? "" : "; Secure";
  if (action === "login") {
    if (env.ACCESS_TEAM_DOMAIN || env.ACCESS_AUD)
      return redirect(
        "/admin/login?error=Use%20Cloudflare%20Access%20to%20sign%20in.",
      );
    if (
      !env.ADMIN_PASSWORD ||
      !env.ADMIN_SESSION_SECRET ||
      env.ADMIN_SESSION_SECRET.length < 32
    )
      return redirect(
        "/admin/login?error=Admin%20secrets%20are%20not%20configured.",
      );
    if (
      !(await safeEqual(String(form.get("password") || ""), env.ADMIN_PASSWORD))
    )
      return redirect("/admin/login?error=Incorrect%20password.");
    const token = await createSession(env.ADMIN_SESSION_SECRET);
    return redirect(
      "/admin",
      `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}`,
    );
  }
  if (!(await isAdmin(request, env)))
    return new Response("请先登录管理后台", { status: 401 });
  if (action === "logout")
    return redirect(
      "/admin/login",
      `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
    );
  try {
    const result = await adminMutation(action, form, env);
    return redirect(
      `${result.path}${result.path.includes("?") ? "&" : "?"}notice=${encodeURIComponent(result.message)}`,
    );
  } catch (error) {
    const message =
      error instanceof Error && error.name !== "ZodError"
        ? error.message
        : "Please check the submitted fields.";
    const allowed =
      /^(Indexing requires|Override must|Candidate has|A pinned|Use up to|Source not|Game not|Reachability checks|Unknown action|Provider is)/.test(
        message,
      )
        ? message
        : "Unable to save. Check the submitted fields, provider configuration, and permitted origins.";
    return redirect(`/admin?error=${encodeURIComponent(allowed)}`);
  }
}
