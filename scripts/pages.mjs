import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// vinext writes a Worker config redirect in the repository root. Give Pages
// its own nearer redirect so it cannot inherit the backend's D1/workflows.
await mkdir("static/.wrangler/deploy", { recursive: true });
await writeFile(
  "static/.wrangler/deploy/config.json",
  JSON.stringify({ configPath: "../../wrangler.jsonc" }),
);
const result = spawnSync(
  "../node_modules/.bin/wrangler",
  ["pages", ...process.argv.slice(2)],
  {
    cwd: "static",
    stdio: "inherit",
  },
);
process.exitCode = result.status ?? 1;
