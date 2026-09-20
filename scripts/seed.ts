import { getPlatformProxy } from "wrangler";
import { createProvider } from "../lib/providers/adapters";
import { providerIds } from "../lib/types";
import { syncProvider } from "../lib/services/sync";
const platform = await getPlatformProxy<CloudflareEnv>({
  configPath: "wrangler.jsonc",
  persist: { path: ".wrangler/state/v3" },
});
try {
  for (const id of providerIds) {
    const result = await syncProvider(
      platform.env.DB,
      createProvider(id, { APP_ENV: "local", PROVIDER_MODE: "fixture" }),
    );
    console.log(
      `${id}: ${result.status} — ${result.received} received, ${result.inserted} inserted, ${result.updated} updated`,
    );
    if (result.status === "failed")
      throw new Error("Fixture seeding failed. Inspect sync_runs.");
  }
  await platform.env.DB.prepare(
    "UPDATE games SET featured=1 WHERE slug IN ('neon-drift','block-party','pocket-planet') AND is_fixture=1",
  ).run();
  console.log("Local catalog seeded. All samples remain noindex.");
} finally {
  await platform.dispose();
}
