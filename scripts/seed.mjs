import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "scripts/seed.ts"],
  { stdio: "inherit" },
);
process.exit(result.status || 0);
