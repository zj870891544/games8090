import { build } from "vite";
import { execFileSync } from "node:child_process";

execFileSync(process.execPath, ["scripts/build-ads.mjs"], { stdio: "inherit" });
await build({ configFile: "vite.static.config.ts" });
await build({
  configFile: "vite.static.config.ts",
  build: { ssr: "static/render.tsx" },
});
const { renderSite } = await import("../dist/static-render/render.js");
await renderSite();
