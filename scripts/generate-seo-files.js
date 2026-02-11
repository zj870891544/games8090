const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const BASE_URL = "https://games8090.online";

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function loadGamesFromData() {
  const source = readUtf8(path.join(ROOT, "games-data.js"));
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context);
  const games = context.window?.GAMES8090_DATA?.GAMES;
  if (!Array.isArray(games)) {
    throw new Error("Failed to load GAMES from games-data.js");
  }
  return games;
}

function loadHiddenFilesFromIndex() {
  const source = readUtf8(path.join(ROOT, "index.js"));
  const match = source.match(
    /const\s+HIDDEN_GAME_FILES\s*=\s*new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/
  );
  if (!match) {
    return new Set();
  }

  const literal = `[${match[1]}]`;
  let hiddenArray = [];
  try {
    hiddenArray = vm.runInNewContext(literal);
  } catch (error) {
    throw new Error(`Failed to parse HIDDEN_GAME_FILES from index.js: ${error.message}`);
  }

  if (!Array.isArray(hiddenArray)) {
    return new Set();
  }
  return new Set(hiddenArray.map((item) => String(item)));
}

function buildSitemapXml(urls, lastmod) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) =>
      [
        "  <url>",
        `    <loc>${u.loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${u.changefreq}</changefreq>`,
        `    <priority>${u.priority}</priority>`,
        "  </url>"
      ].join("\n")
    ),
    "</urlset>",
    ""
  ].join("\n");
}

function buildRobotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    ""
  ].join("\n");
}

function main() {
  const games = loadGamesFromData();
  const hiddenFiles = loadHiddenFilesFromIndex();
  const whitelistedGames = games.filter((g) => !hiddenFiles.has(g.file));
  const lastmod = new Date().toISOString().slice(0, 10);

  const urls = [
    { loc: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
    ...whitelistedGames.map((g) => ({
      loc: `${BASE_URL}/games/${encodeURIComponent(g.file)}`,
      changefreq: "weekly",
      priority: "0.8"
    }))
  ];

  const sitemapXml = buildSitemapXml(urls, lastmod);
  const robotsTxt = buildRobotsTxt();

  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemapXml, "utf8");
  fs.writeFileSync(path.join(ROOT, "robots.txt"), robotsTxt, "utf8");

  console.log(`Generated sitemap.xml with ${urls.length} URLs`);
  console.log(`Whitelist games: ${whitelistedGames.length}`);
  console.log(`Hidden games excluded: ${hiddenFiles.size}`);
}

main();
