import { getEnv } from "../../../lib/db/client";
export function GET() {
  if (getEnv().APP_ENV !== "local")
    return new Response("Not found", { status: 404 });
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>8090 development player</title><link rel="stylesheet" href="/fixture-player.css"></head><body><main><span class="pill">DEVELOPMENT PLAYER</span><div class="orb">▶</div><h1>All set for a good break.</h1><p>The player connection is ready. This local fixture verifies loading, fullscreen, and source switching.</p><strong>Real gameplay requires a licensed provider feed.</strong><p class="small">No ads. No tracking SDK. No third-party requests.</p></main></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
