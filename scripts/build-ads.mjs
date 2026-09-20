import { readFileSync, writeFileSync } from "node:fs";
import { aggregateAds } from "../lib/ads.mjs";
const files = ["playgama", "gamepix", "gamemonetize", "wgplayground", "custom"];
writeFileSync(
  "public/ads.txt",
  aggregateAds(files.map((f) => readFileSync(`config/ads/${f}.txt`, "utf8"))),
);
