import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { renderToString, renderToStaticMarkup } from "react-dom/server";
import { StaticApp, type PageData } from "./App";
import type { PublishedSnapshot } from "./snapshot";
import { jsonForHtml } from "./public-data";
import { pageTitles } from "../components/InfoContent";
import { queryCatalog } from "../lib/static-catalog";
import { catalogPageSize } from "../lib/catalog-pagination";
import { defaultAssets, defaultFrames } from "../lib/providers/config";
import type { BrowseContentProps } from "../components/BrowseContent";

const output = "dist/static";
const description =
  "Little breaks. Big play energy. Discover instant browser games across racing, puzzles, action, and more.";

export async function renderSite() {
  const snapshot = JSON.parse(
    await readFile("static/published-catalog.json", "utf8"),
  ) as PublishedSnapshot;
  if (
    !snapshot.games.length ||
    snapshot.games.some(
      ({ props }) =>
        props.game.isFixture ||
        !props.sources.length ||
        props.sources.some((s) => s.fixture),
    )
  )
    throw new Error(
      "Static catalog must contain published real games and approved sources.",
    );
  const manifest = JSON.parse(
    await readFile(`${output}/.vite/manifest.json`, "utf8"),
  );
  const entry = manifest["static/client.tsx"] as {
    file: string;
    css: string[];
  };
  const catalog = JSON.stringify(snapshot.catalog);
  const catalogUrl = `/catalog/${createHash("sha256").update(catalog).digest("hex").slice(0, 16)}.json`;
  await mkdir(`${output}/catalog`, { recursive: true });
  await writeFile(output + catalogUrl, catalog);
  await mkdir(`${output}/art`, { recursive: true });
  await cp("public/art/fallback.svg", `${output}/art/fallback.svg`);
  await cp("public/ads.txt", `${output}/ads.txt`);
  let pageCount = 0;
  async function page(
    data: PageData,
    title: string,
    indexable = true,
    details = description,
    image?: string,
    canonical = data.path,
  ) {
    if (!/^\/(?:[a-z0-9-]+\/?)*$/.test(data.path))
      throw new Error(`Unsafe static path: ${data.path}`);
    const head = renderToStaticMarkup(
      <>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={details.slice(0, 160)} />
        <meta
          name="robots"
          content={indexable ? "index, follow" : "noindex, follow"}
        />
        <link rel="canonical" href={snapshot.siteUrl + canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={details.slice(0, 160)} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={snapshot.siteUrl + canonical} />
        {image && <meta property="og:image" content={image} />}
        <meta name="google-site-verification" content={snapshot.google} />
        <meta name="msvalidate.01" content={snapshot.bing} />
        <meta name="8090-catalog" content={catalogUrl} />
        {entry.css.map((css) => (
          <link key={css} rel="stylesheet" href={`/${css}`} />
        ))}
      </>,
    );
    const html = `<!doctype html><html lang="en"><head>${head}</head><body><div id="root">${renderToString(<StaticApp data={data} />)}</div><script id="page-data" type="application/json">${jsonForHtml(data)}</script><script type="module" src="/${entry.file}"></script></body></html>`;
    const file = join(
      output,
      data.path === "/" ? "index.html" : `${data.path.slice(1)}.html`,
    );
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html);
    pageCount++;
  }
  const base = { ga4Id: snapshot.ga4Id };
  await page(
    { ...base, path: "/", kind: "home", props: snapshot.home },
    "8090 — Find your next favorite game",
  );
  async function collection(
    path: string,
    props: Omit<BrowseContentProps, "games">,
    indexable: boolean,
  ) {
    const games = queryCatalog(snapshot.catalog, props.options);
    const count = Math.max(1, Math.ceil(games.length / catalogPageSize));
    for (let currentPage = 1; currentPage <= count; currentPage++) {
      await page(
        {
          ...base,
          path: currentPage === 1 ? path : `${path}/page/${currentPage}`,
          kind: "browse",
          props: {
            ...props,
            basePath: path,
            currentPage,
            games: games.slice(
              (currentPage - 1) * catalogPageSize,
              currentPage * catalogPageSize + 1,
            ),
          },
        },
        `${props.title} · 8090`,
        indexable && currentPage === 1,
        props.description,
        undefined,
        path,
      );
    }
  }
  for (const id of ["games", "new", "popular"])
    await collection(
      `/${id}`,
      {
        title: pageTitles[id],
        description:
          id === "new"
            ? "New discoveries. Fresh challenges. Your next “just one more.”"
            : "From quick little escapes to your next big obsession.",
        options: { sort: id },
      },
      true,
    );
  for (const c of snapshot.categories)
    await collection(
      `/category/${c.id}`,
      {
        title: `${c.name}. Your way.`,
        description: `A little ${c.name.toLowerCase()}. A lot to discover. Pick a game and get into it.`,
        options: { category: c.id },
        event: "category_view",
      },
      c.indexable,
    );
  for (const game of snapshot.games)
    await page(
      {
        ...base,
        path: `/game/${game.props.game.slug}`,
        kind: "game",
        props: game.props,
      },
      `${game.props.game.title} — Play online · 8090`,
      game.indexable,
      game.props.game.editorialDescription || game.props.game.description,
      game.props.game.thumbnail,
    );
  for (const id of Object.keys(pageTitles).filter(
    (id) => !["games", "new", "popular"].includes(id),
  ))
    await page(
      {
        ...base,
        path: `/${id}`,
        kind: "info",
        props: { page: id, email: snapshot.email },
      },
      `${pageTitles[id]} · 8090`,
      !["favorites", "recent"].includes(id),
    );
  await page(
    {
      ...base,
      path: "/search",
      kind: "browse",
      props: {
        title: "Found your next favorite?",
        description: "Search the collection by game, studio, category, or tag.",
        basePath: "/search",
        games: [],
        event: "search",
      },
    },
    "Search games · 8090",
    false,
  );
  await page(
    { ...base, path: "/404", kind: "404" },
    "Page not found · 8090",
    false,
  );
  const indexedGames = snapshot.games.filter((g) => g.indexable);
  const paths = [
    "/",
    ...snapshot.categories
      .filter(
        (c) =>
          c.indexable &&
          indexedGames.some((g) => g.props.game.categories.includes(c.id)),
      )
      .map((c) => `/category/${c.id}`),
    ...indexedGames.map((g) => `/game/${g.props.game.slug}`),
  ];
  await writeFile(
    `${output}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${snapshot.siteUrl}${path}</loc></url>`).join("")}</urlset>`,
  );
  await writeFile(
    `${output}/robots.txt`,
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nDisallow: /fixtures\nSitemap: ${snapshot.siteUrl}/sitemap.xml\n`,
  );
  await writeFile(
    `${output}/_redirects`,
    `${snapshot.redirects.map((r) => `${r.from} ${r.to} 301`).join("\n")}\n`,
  );
  const analytics =
    "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com";
  const csp = `default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' ${defaultAssets.join(" ")} ${analytics}; font-src 'self'; connect-src 'self' ${analytics}; frame-src 'self' ${defaultFrames.join(" ")}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'`;
  await writeFile(
    `${output}/_headers`,
    `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Strict-Transport-Security: max-age=31536000; includeSubDomains\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/catalog/*\n  Cache-Control: public, max-age=31536000, immutable\nhttps://:project.pages.dev/*\n  X-Robots-Tag: noindex\nhttps://:version.:project.pages.dev/*\n  X-Robots-Tag: noindex\n`,
  );
  await writeFile(
    `${output}/release.json`,
    JSON.stringify({
      mode: "static",
      generatedAt: snapshot.generatedAt,
      games: snapshot.games.length,
      pages: pageCount,
      catalog: catalogUrl,
    }),
  );
  await rm(`${output}/.vite`, { recursive: true });
  console.log(
    `Generated ${pageCount} static HTML pages for ${snapshot.games.length} games. No Pages Functions or public SSR.`,
  );
}
