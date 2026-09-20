import { getEnv } from "../../lib/db/client";
export function GET() {
  const env = getEnv();
  return new Response(
    env.APP_ENV === "production"
      ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nDisallow: /fixtures\nSitemap: ${env.SITE_URL}/sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n",
    { headers: { "Content-Type": "text/plain" } },
  );
}
